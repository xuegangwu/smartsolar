import { Router } from 'express';
import { alertController } from '../controllers/alertController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, alertController.getAll);
router.get('/stats', auth, alertController.getStats);
router.post('/:id/acknowledge', auth, requireRole('admin', 'operator', 'manager'), alertController.acknowledge);
router.post('/acknowledge-batch', auth, requireRole('admin', 'operator', 'manager'), alertController.acknowledgeBatch);

export { router as alertRoutes };
