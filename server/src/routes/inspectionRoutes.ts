import { Router } from 'express';
import { inspectionController } from '../controllers/inspectionController.js';

const router = Router();

router.get('/plans', inspectionController.getPlans);
router.get('/plans/:id', inspectionController.getPlanById);
router.post('/plans', inspectionController.createPlan);
router.put('/plans/:id', inspectionController.updatePlan);
router.delete('/plans/:id', inspectionController.deletePlan);

router.get('/records', inspectionController.getRecords);
router.post('/records', inspectionController.createRecord);

router.get('/stats', inspectionController.getStats);

export { router as inspectionRoutes };
