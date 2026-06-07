import { Router } from 'express';
import {
  recordCollection,
  recordDeposit,
  listCollections,
  getPending,
  getCodStats,
  getCollection,
  resolveCollection,
} from '../controllers/cod.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  recordCodCollectionSchema,
  recordDepositSchema,
  resolveCodSchema,
} from '../lib/validation';

const router = Router();

router.use(authenticate);

// Listing, stats and admin queue (specific routes before /:id)
router.get('/', listCollections);
router.get('/stats', getCodStats);
router.get('/pending', authorize('admin', 'super_admin'), getPending);

// Driver actions
router.post('/', validateBody(recordCodCollectionSchema), recordCollection);
router.put('/:id/deposit', validateBody(recordDepositSchema), recordDeposit);

// Single collection
router.get('/:id', getCollection);

// Admin manual resolution / override
router.post('/:id/verify', authorize('admin', 'super_admin'), validateBody(resolveCodSchema), resolveCollection);

export default router;
