import { Router } from 'express';
import { sparePartController } from '../controllers/sparePartController.js';

const router = Router();

router.get('/', sparePartController.getAll);
router.get('/stats', sparePartController.getStats);
router.get('/:id', sparePartController.getById);
router.post('/', sparePartController.create);
router.put('/:id', sparePartController.update);
router.delete('/:id', sparePartController.delete);

router.post('/consume', sparePartController.consume);
router.get('/consume-records', sparePartController.getConsumeRecords);

export { router as sparePartRoutes };
