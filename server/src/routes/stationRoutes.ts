import { Router } from 'express';
import { stationController, categoryController, equipmentController } from '../controllers/stationController.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();

// Station - GET is public, write ops require auth
router.get('/stations', stationController.getAll);
router.post('/stations', auth, requireRole('admin', 'manager'), stationController.create);
router.get('/stations/:id', stationController.getById);
router.put('/stations/:id', auth, requireRole('admin', 'operator', 'manager'), stationController.update);
router.delete('/stations/:id', auth, requireRole('admin', 'manager'), stationController.delete);

// EquipmentCategory
router.get('/stations/:stationId/categories', auth, categoryController.getByStation);
router.get('/categories', auth, categoryController.getAll);
router.post('/categories', auth, requireRole('admin', 'manager'), categoryController.create);
router.put('/categories/:id', auth, requireRole('admin', 'manager'), categoryController.update);
router.delete('/categories/:id', auth, requireRole('admin', 'manager'), categoryController.delete);

// Equipment
router.get('/equipments', auth, equipmentController.getAll);
router.post('/equipments', auth, requireRole('admin', 'manager'), equipmentController.create);
router.get('/equipments/:id', auth, equipmentController.getById);
router.put('/equipments/:id', auth, requireRole('admin', 'operator', 'manager'), equipmentController.update);
router.delete('/equipments/:id', auth, requireRole('admin', 'manager'), equipmentController.delete);
router.get('/stations/:stationId/tree', equipmentController.getByStation);

export { router as stationRoutes };
