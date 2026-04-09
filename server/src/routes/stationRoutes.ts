import { Router } from 'express';
import { stationController, categoryController, equipmentController } from '../controllers/stationController.js';

const router = Router();

// Station
router.get('/stations', stationController.getAll);
router.post('/stations', stationController.create);
router.get('/stations/:id', stationController.getById);
router.put('/stations/:id', stationController.update);
router.delete('/stations/:id', stationController.delete);

// EquipmentCategory
router.get('/stations/:stationId/categories', categoryController.getByStation);
router.post('/categories', categoryController.create);
router.put('/categories/:id', categoryController.update);
router.delete('/categories/:id', categoryController.delete);

// Equipment
router.get('/equipments', equipmentController.getAll);
router.post('/equipments', equipmentController.create);
router.get('/equipments/:id', equipmentController.getById);
router.put('/equipments/:id', equipmentController.update);
router.delete('/equipments/:id', equipmentController.delete);
router.get('/stations/:stationId/tree', equipmentController.getByStation);

export { router as stationRoutes };
