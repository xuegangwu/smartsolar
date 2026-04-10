import { Router } from 'express';
import { sparePartController } from '../controllers/sparePartController.js';

const router = Router();

router.get('/', sparePartController.getAll);
router.get('/stats', sparePartController.getStats);
router.post('/', sparePartController.create);
router.post('/consume', sparePartController.consume);
router.get('/consume-records', sparePartController.getConsumeRecords);
router.get('/:id', sparePartController.getById);
router.put('/:id', sparePartController.update);
router.delete('/:id', sparePartController.delete);

export { router as sparePartRoutes };
