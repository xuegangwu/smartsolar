import { Router } from 'express';
import { personnelController } from '../controllers/personnelController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', auth, personnelController.getAll);
router.get('/technicians', auth, personnelController.getTechnicians);
router.get('/:id', auth, personnelController.getById);
router.post('/', auth, requireRole('admin', 'manager'), personnelController.create);
router.put('/:id', auth, requireRole('admin', 'operator', 'manager'), personnelController.update);
router.delete('/:id', auth, requireRole('admin', 'manager'), personnelController.delete);
router.put('/:id/work-status', auth, requireRole('admin', 'operator', 'manager'), personnelController.updateWorkStatus);

export { router as personnelRoutes };
