import { z } from 'zod';

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phoneNumber: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20)
    .optional(),
  role: z.enum(['driver', 'admin', 'super_admin']).default('driver'),
  // Driver-specific fields (required when role === 'driver')
  vehicleType: z.enum(['car', 'bike', 'van']).optional(),
  licenseNumber: z.string().max(50).optional(),
  vehicleRegNumber: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// USER / PROFILE SCHEMAS
// ============================================================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().min(10).max(20).optional(),
  profilePictureUrl: z.string().url().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================================================
// DRIVER SCHEMAS
// ============================================================================

export const updateDriverSchema = z.object({
  vehicleType: z.enum(['car', 'bike', 'van']).optional(),
  licenseNumber: z.string().max(50).optional(),
  vehicleRegNumber: z.string().max(20).optional(),
  vehicleMake: z.string().max(100).optional(),
  vehicleModel: z.string().max(100).optional(),
  vehicleYear: z.number().int().min(1900).max(2100).optional(),
  bankAccountNumber: z.string().max(50).optional(),
  bankAccountHolder: z.string().max(255).optional(),
  bankName: z.string().max(100).optional(),
  branchCode: z.string().max(20).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;


// ============================================================================
// TRIP SCHEMAS
// ============================================================================

const tripItemSchema = z.object({
  itemDescription: z.string().min(1, 'Item description is required').max(500),
  itemQuantity: z.number().int().positive().default(1),
  itemValue: z.number().nonnegative().optional(),
  trackingNumber: z.string().max(100).optional(),
});

export const createTripSchema = z
  .object({
    // Pickup
    pickupAddress: z.string().min(1, 'Pickup address is required').max(500),
    pickupLat: z.number().min(-90).max(90).optional(),
    pickupLng: z.number().min(-180).max(180).optional(),
    pickupContactName: z.string().max(255).optional(),
    pickupContactPhone: z.string().max(20).optional(),
    scheduledPickup: z.coerce.date().optional(),
    // Delivery
    deliveryAddress: z.string().min(1, 'Delivery address is required').max(500),
    deliveryLat: z.number().min(-90).max(90).optional(),
    deliveryLng: z.number().min(-180).max(180).optional(),
    customerName: z.string().max(255).optional(),
    customerPhone: z.string().max(20).optional(),
    customerEmail: z.string().email().optional().or(z.literal('')),
    scheduledDelivery: z.coerce.date().optional(),
    // Metrics & payment
    distanceKm: z.number().nonnegative().optional(),
    deliveryFee: z.number().nonnegative().optional(),
    paymentMethod: z.enum(['prepaid', 'cod']).default('prepaid'),
    codAmount: z.number().nonnegative().default(0),
    priority: z.number().int().min(0).max(5).default(0),
    specialInstructions: z.string().max(2000).optional(),
    notes: z.string().max(2000).optional(),
    // Optional assignment at creation time
    driverId: z.string().uuid().optional(),
    items: z.array(tripItemSchema).optional(),
  })
  .refine((d) => d.paymentMethod !== 'cod' || d.codAmount > 0, {
    message: 'COD trips must have a COD amount greater than 0',
    path: ['codAmount'],
  });


export const updateTripSchema = z.object({
  pickupAddress: z.string().min(1).max(500).optional(),
  pickupContactName: z.string().max(255).optional(),
  pickupContactPhone: z.string().max(20).optional(),
  scheduledPickup: z.coerce.date().optional(),
  deliveryAddress: z.string().min(1).max(500).optional(),
  customerName: z.string().max(255).optional(),
  customerPhone: z.string().max(20).optional(),
  scheduledDelivery: z.coerce.date().optional(),
  distanceKm: z.number().nonnegative().optional(),
  deliveryFee: z.number().nonnegative().optional(),
  priority: z.number().int().min(0).max(5).optional(),
  specialInstructions: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const assignTripSchema = z.object({
  driverId: z.string().uuid('A valid driver id is required'),
});

export const updateTripStatusSchema = z.object({
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'cancelled']),
  notes: z.string().max(2000).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

// Used for both pickup and delivery confirmation timestamps
export const tripMilestoneSchema = z.object({
  timestamp: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type UpdateTripStatusInput = z.infer<typeof updateTripStatusSchema>;
export type TripMilestoneInput = z.infer<typeof tripMilestoneSchema>;


// ============================================================================
// COD COLLECTION SCHEMAS
// ============================================================================

export const recordCodCollectionSchema = z.object({
  tripId: z.string().uuid('A valid trip id is required'),
  amountCollected: z.number().positive('Amount collected must be greater than 0'),
  collectionNotes: z.string().max(2000).optional(),
});

export const recordDepositSchema = z.object({
  atmReference: z
    .string()
    .min(4, 'ATM reference must be at least 4 characters')
    .max(100)
    .regex(/^[A-Za-z0-9-]+$/, 'ATM reference may only contain letters, numbers and dashes'),
  bankName: z.string().min(1, 'Bank name is required').max(100),
  atmLocation: z.string().max(255).optional(),
  atmDepositTime: z.coerce.date().optional(),
});

// Admin manual override / dispute resolution
export const resolveCodSchema = z.object({
  approve: z.boolean(),
  verifiedAmount: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
});

export type RecordCodCollectionInput = z.infer<typeof recordCodCollectionSchema>;
export type RecordDepositInput = z.infer<typeof recordDepositSchema>;
export type ResolveCodInput = z.infer<typeof resolveCodSchema>;


// ============================================================================
// BROADCAST SCHEMAS
// ============================================================================

export const createBroadcastSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(255),
    message: z.string().min(1, 'Message is required').max(5000),
    targetAudience: z.enum(['all_drivers', 'active_drivers', 'specific_drivers', 'admins']),
    targetDriverIds: z.array(z.string().uuid()).optional(),
    deliveryMethod: z.array(z.enum(['in_app', 'push', 'sms', 'email'])).default(['in_app']),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  })
  .refine(
    (d) => d.targetAudience !== 'specific_drivers' || (d.targetDriverIds && d.targetDriverIds.length > 0),
    { message: 'Select at least one driver for a specific-driver broadcast', path: ['targetDriverIds'] }
  );

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;
