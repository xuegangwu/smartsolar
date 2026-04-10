import { Router } from 'express';
import { inspectionTemplateController } from '../controllers/inspectionTemplateController.js';

const router = Router();

router.get('/', inspectionTemplateController.getAll);
router.get('/:id', inspectionTemplateController.getById);
router.post('/', inspectionTemplateController.create);
router.put('/:id', inspectionTemplateController.update);
router.delete('/:id', inspectionTemplateController.delete);

export { router as inspectionTemplateRoutes };
