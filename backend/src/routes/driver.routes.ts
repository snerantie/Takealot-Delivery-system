import { Router } from 'express';
import {
  listDrivers,
  getDriver,
  updateMyDriverProfile,
  suspendDriver,
  activateDriver,
} from '../controllers/driver.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateDriverSchema } from '../lib/validation';

const router = Router();

router.use(authenticate);

// Driver self-service (must come before /:id to avoid route shadowing)
router.put('/me', validateBody(updateDriverSchema), updateMyDriverProfile);

// Admin-only management
router.get('/', authorize('admin', 'super_admin'), listDrivers);
router.get('/:id', getDriver);
router.post('/:id/suspend', authorize('admin', 'super_admin'), suspendDriver);
router.post('/:id/activate', authorize('admin', 'super_admin'), activateDriver);

export default router;
