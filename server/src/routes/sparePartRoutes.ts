import { Router } from 'express';
import { sparePartController } from '../controllers/sparePartController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, sparePartController.getAll);
router.get('/stats', auth, sparePartController.getStats);
router.post('/', auth, requireRole('admin', 'manager'), sparePartController.create);
router.post('/consume', auth, requireRole('admin', 'operator', 'manager'), sparePartController.consume);
router.get('/consume-records', auth, sparePartController.getConsumeRecords);
router.get('/:id', auth, sparePartController.getById);
router.put('/:id', auth, requireRole('admin', 'manager'), sparePartController.update);
router.delete('/:id', auth, requireRole('admin', 'manager'), sparePartController.delete);

export { router as sparePartRoutes };
