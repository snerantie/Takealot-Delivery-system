import { Router } from 'express';
import {
  createTrip,
  listTrips,
  getTripStats,
  getTrip,
  updateTrip,
  assignTrip,
  updateTripStatus,
  markPickup,
  markDelivered,
  getTripHistory,
} from '../controllers/trip.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTripSchema,
  updateTripSchema,
  assignTripSchema,
  updateTripStatusSchema,
  tripMilestoneSchema,
} from '../lib/validation';

const router = Router();

router.use(authenticate);

// Listing & stats (role-aware inside the controller)
router.get('/', listTrips);
router.get('/stats', getTripStats);

// Create (admin only)
router.post('/', authorize('admin', 'super_admin'), validateBody(createTripSchema), createTrip);

// Single trip
router.get('/:id', getTrip);
router.get('/:id/history', getTripHistory);

// Admin edits & assignment
router.put('/:id', authorize('admin', 'super_admin'), validateBody(updateTripSchema), updateTrip);
router.put('/:id/assign', authorize('admin', 'super_admin'), validateBody(assignTripSchema), assignTrip);

// Status transitions (driver or admin)
router.put('/:id/status', validateBody(updateTripStatusSchema), updateTripStatus);
router.post('/:id/pickup', validateBody(tripMilestoneSchema), markPickup);
router.post('/:id/deliver', validateBody(tripMilestoneSchema), markDelivered);

export default router;
