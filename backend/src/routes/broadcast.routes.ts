import { Router } from 'express';
import {
  createBroadcast,
  listBroadcasts,
  getBroadcast,
} from '../controllers/broadcast.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createBroadcastSchema } from '../lib/validation';

const router = Router();

router.use(authenticate);

// All broadcast management is admin-only
router.use(authorize('admin', 'super_admin'));

router.get('/', listBroadcasts);
router.post('/', validateBody(createBroadcastSchema), createBroadcast);
router.get('/:id', getBroadcast);

export default router;
