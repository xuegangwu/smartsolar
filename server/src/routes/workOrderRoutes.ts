import { Router } from 'express';
import { workOrderController } from '../controllers/workOrderController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', workOrderController.getAll);
router.post('/', auth, requireRole('admin', 'operator', 'manager'), workOrderController.create);
router.get('/:id', workOrderController.getById);
router.put('/:id', auth, requireRole('admin', 'operator', 'manager'), workOrderController.update);
router.patch('/:id/status', auth, requireRole('admin', 'operator', 'manager'), workOrderController.updateStatus);
router.delete('/:id', auth, requireRole('admin', 'manager'), workOrderController.delete);

export { router as workOrderRoutes };
