import { Router } from 'express';
import { alertController } from '../controllers/alertController.js';

const router = Router();

router.get('/', alertController.getAll);
router.get('/stats', alertController.getStats);
router.post('/:id/acknowledge', alertController.acknowledge);
router.post('/acknowledge-batch', alertController.acknowledgeBatch);

export { router as alertRoutes };
