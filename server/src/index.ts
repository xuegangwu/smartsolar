import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { stationRoutes } from './routes/stationRoutes.js';
import { workOrderRoutes } from './routes/workOrderRoutes.js';
import { alertRoutes } from './routes/alertRoutes.js';
import { alertSyncRoutes } from './routes/alertSyncRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI;
const USE_MEMORY = process.env.MONGO_MEMORY === 'true' || !MONGO_URI;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', stationRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/ems-sync', alertSyncRoutes);  // EMS → SmartSolar 告警同步

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: USE_MEMORY ? 'memory' : 'remote',
  });
});

async function start() {
  let mongoUri = MONGO_URI;

  if (USE_MEMORY) {
    console.log('📦 Starting MongoDB Memory Server...');
    const memServer = await MongoMemoryServer.create();
    mongoUri = memServer.getUri();
    console.log(`   Memory server ready: ${mongoUri.slice(0, 40)}...`);
  }

  await mongoose.connect(mongoUri!);
  console.log(`✅ MongoDB connected: ${USE_MEMORY ? 'memory' : MONGO_URI}`);

  app.listen(PORT, () => {
    console.log(`🚀 SmartSolar server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('❌ Server start error:', err);
  process.exit(1);
});
