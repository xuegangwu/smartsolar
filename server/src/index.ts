import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { writeFileSync } from 'fs';
import http from 'http';
import * as Sentry from '@sentry/node';
import { stationRoutes } from './routes/stationRoutes.js';
import { workOrderRoutes } from './routes/workOrderRoutes.js';
import { alertRoutes } from './routes/alertRoutes.js';
import { alertSyncRoutes } from './routes/alertSyncRoutes.js';
import { inspectionRoutes } from './routes/inspectionRoutes.js';
import authRoutes from './routes/authRoutes.js';
import emsLiveRoutes from './routes/emsLiveRoutes.js';
import { sparePartRoutes } from './routes/sparePartRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { personnelRoutes } from './routes/personnelRoutes.js';
import { inspectionTemplateRoutes } from './routes/inspectionTemplateRoutes.js';
import { healthScoreRoutes } from './routes/healthScoreRoutes.js';
import { aiRoutes } from './routes/aiRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import distributorRoutes from './routes/distributorRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import settlementRoutes from './routes/settlementRoutes.js';
import installerStatsRoutes from './routes/installerStatsRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import commissionRoutes from './routes/commissionRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';
import opportunityRoutes from './routes/opportunityRoutes.js';
import { startDailyHealthJob } from './jobs/dailyHealthJob.js';
import { startTelemetryCollector } from './services/telemetryCollector.js';
import { seedAllTelemetry } from './seed/seedTelemetry.js';
import { seedPartners } from './seed/seedPartners.js';

dotenv.config();

const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI;
const USE_MEMORY = process.env.MONGO_MEMORY === 'true' || !MONGO_URI;

// ─── Sentry 错误监控初始化 (v10 API) ──────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.expressIntegration(),
    ],
  });
}

const app = express();

// ─── Sentry 请求处理中间件 (v10) ──────────────────────────────────────────
// v10: expressIntegration 在 init() 中设置，这里不再需要手动 add requestHandler

// Shared MongoDB Memory Server instance (for dev mode)
let _memServer: MongoMemoryServer | null = null;
const MEM_SERVER_FILE = '/tmp/smartsolar-mongo-uri.txt';

async function getMongoUri(): Promise<string> {
  if (MONGO_URI) return MONGO_URI;
  if (!_memServer) {
    _memServer = await MongoMemoryServer.create();
  }
  const uri = _memServer.getUri();
  writeFileSync(MEM_SERVER_FILE, uri);
  return uri;
}

app.use(cors());
app.use(express.json());

// Routes - ORDER MATTERS! More specific routes MUST come before /api (stationRoutes)
app.use('/api/auth', authRoutes);
app.use('/api/ems', emsLiveRoutes);
app.use('/api/inspection', inspectionRoutes);         // Must be BEFORE /api
app.use('/api/inspection/templates', inspectionTemplateRoutes); // Must be BEFORE /api
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ems-sync', alertSyncRoutes);  // EMS → SmartSolar 告警同步
app.use('/api/notifications', notificationRoutes);
app.use('/api/spare-parts', sparePartRoutes);  // 备件仓库
app.use('/api/personnel', personnelRoutes);      // 人员档案
app.use('/api/partners', partnerRoutes);       // 渠道商 + 积分体系
app.use('/api/distributor', distributorRoutes);  // 分销商指挥塔（ITER-12）
app.use('/api/leads', leadRoutes);              // 客户线索/报备
app.use('/api/settlements', settlementRoutes);    // 月度结算
app.use('/api/installer-stats', installerStatsRoutes); // 安装商业绩统计
app.use('/api/projects', projectRoutes);               // 项目建设管理
app.use('/api/commissions', commissionRoutes);   // 佣金管理（PartnerHub）
app.use('/api/approvals', approvalRoutes);        // 审批引擎（PartnerHub）
app.use('/api/opportunities', opportunityRoutes);    // 商机/销售漏斗（PartnerHub）
app.use('/api/orders', orderRoutes);                    // 订单管理
app.use('/api', aiRoutes);                    // AI 运维助手
app.use('/api', healthScoreRoutes);           // 健康分 + 预测告警
app.use('/api', stationRoutes);  // Catch-all, MUST be LAST

// ─── Sentry 错误处理中间件 (v10) ─────────────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app, {
    shouldHandleError: () => true,
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: USE_MEMORY ? 'memory' : 'remote',
  });
});

async function start() {
  const mongoUri = await getMongoUri();
  if (USE_MEMORY) {
    console.log('📦 Starting MongoDB Memory Server...');
    console.log(`   Memory server ready: ${mongoUri.slice(0, 40)}...`);
  }

  await mongoose.connect(mongoUri);
  console.log(`✅ MongoDB connected: ${USE_MEMORY ? 'memory' : MONGO_URI}`);

  // HTTP server（支持 WebSocket）
  const httpServer = http.createServer(app);

  // 启动 WebSocket
  try {
    const { setupWebSocket } = await import('./services/websocketService.js');
    setupWebSocket(httpServer);
  } catch (e) {
    console.warn('[WS] WebSocket setup failed:', e);
  }

  httpServer.listen(PORT, async () => {
    console.log(`🚀 SmartSolar server running on http://localhost:${PORT}`);

    // 如果没有遥测数据，先填充7天历史数据
    const { Telemetry } = await import('./models/healthScore.js');
    const count = await Telemetry.countDocuments();
    if (count === 0) {
      console.log('[Init] No telemetry data found, seeding 7-day history...');
      await seedAllTelemetry();
      console.log('[Init] Historical telemetry seeded.');
    }

    startTelemetryCollector();
    startDailyHealthJob();

    // 初始化渠道商和积分数据
    await seedPartners();
  });
}

start().catch((err) => {
  console.error('❌ Server start error:', err);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err);
    // flush 是异步的，不需要 await
    Sentry.flush(2000).catch(() => {});
  }
  process.exit(1);
});
