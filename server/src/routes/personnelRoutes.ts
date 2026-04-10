import { Router } from 'express';
import { personnelController } from '../controllers/personnelController.js';

const router = Router();

router.get('/', personnelController.getAll);
router.get('/technicians', personnelController.getTechnicians);
router.get('/:id', personnelController.getById);
router.post('/', personnelController.create);
router.put('/:id', personnelController.update);
router.delete('/:id', personnelController.delete);
router.put('/:id/work-status', personnelController.updateWorkStatus);

export { router as personnelRoutes };
