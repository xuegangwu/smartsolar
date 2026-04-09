import { Router } from 'express';
import { workOrderController } from '../controllers/workOrderController.js';

const router = Router();

router.get('/', workOrderController.getAll);
router.post('/', workOrderController.create);
router.get('/:id', workOrderController.getById);
router.put('/:id', workOrderController.update);
router.patch('/:id/status', workOrderController.updateStatus);
router.delete('/:id', workOrderController.delete);

export { router as workOrderRoutes };
