import { Router } from 'express';
import { inspectionController } from '../controllers/inspectionController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// Public read - no auth needed
router.get('/plans', inspectionController.getPlans);
router.get('/plans/:id', inspectionController.getPlanById);
router.get('/records', inspectionController.getRecords);
router.get('/stats', inspectionController.getStats);

// Protected - require auth
router.post('/plans', auth, requireRole('admin', 'operator', 'manager'), inspectionController.createPlan);
router.put('/plans/:id', auth, requireRole('admin', 'operator', 'manager'), inspectionController.updatePlan);
router.delete('/plans/:id', auth, requireRole('admin', 'manager'), inspectionController.deletePlan);

router.post('/records', auth, requireRole('admin', 'operator', 'manager', 'technician'), inspectionController.createRecord);

export { router as inspectionRoutes };
