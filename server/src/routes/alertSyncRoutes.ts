import { Router } from 'express';
import { alertSyncController } from '../controllers/alertSyncController.js';

const router = Router();

// EMS → SmartSolar 告警同步
router.post('/alerts', alertSyncController.syncAlert);
router.post('/alerts/batch', alertSyncController.syncBatch);

export { router as alertSyncRoutes };
