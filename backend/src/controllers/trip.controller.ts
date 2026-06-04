import { Response } from 'express';
import { Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  CreateTripInput,
  UpdateTripInput,
  UpdateTripStatusInput,
  TripMilestoneInput,
} from '../lib/validation';

// Generate a readable, time-sortable trip number e.g. TRP-20260604-AB12CD
const generateTripNumber = (): string => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRP-${ymd}-${rand}`;
};

// Resolve the driver record for the currently authenticated driver user
const getDriverForUser = async (userId: string) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError('Driver profile not found', 404);
  return driver;
};

// Emit a socket event to a driver room and the admin room (best-effort)
const emitTripEvent = (req: AuthRequest, event: string, payload: unknown, driverId?: string | null) => {
  const io = req.app.get('io');
  if (!io) return;
  if (driverId) io.to(`driver:${driverId}`).emit(event, payload);
  io.to('admin').emit(event, payload);
};

const isAdmin = (req: AuthRequest) =>
  req.user?.role === 'admin' || req.user?.role === 'super_admin';


// ============================================================================
// POST /api/trips  (admin) — create a trip, optionally assign + add items
// ============================================================================
export const createTrip = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as CreateTripInput;

  if (input.driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
    if (!driver) throw new AppError('Assigned driver not found', 404);
    if (driver.status !== 'active') throw new AppError('Cannot assign to an inactive driver', 400);
  }

  const initialStatus: TripStatus = input.driverId ? 'assigned' : 'pending';

  const trip = await prisma.trip.create({
    data: {
      tripNumber: generateTripNumber(),
      status: initialStatus,
      assignedBy: req.user!.id,
      driverId: input.driverId,
      pickupAddress: input.pickupAddress,
      pickupLat: input.pickupLat,
      pickupLng: input.pickupLng,
      pickupContactName: input.pickupContactName,
      pickupContactPhone: input.pickupContactPhone,
      scheduledPickup: input.scheduledPickup,
      deliveryAddress: input.deliveryAddress,
      deliveryLat: input.deliveryLat,
      deliveryLng: input.deliveryLng,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      scheduledDelivery: input.scheduledDelivery,
      distanceKm: input.distanceKm,
      deliveryFee: input.deliveryFee,
      paymentMethod: input.paymentMethod,
      codAmount: input.codAmount,
      priority: input.priority,
      specialInstructions: input.specialInstructions,
      notes: input.notes,
      items: input.items?.length ? { create: input.items } : undefined,
      statusHistory: {
        create: { status: initialStatus, changedBy: req.user!.id, notes: 'Trip created' },
      },
    },
    include: { items: true, driver: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });

  emitTripEvent(req, 'trip:created', trip, trip.driverId);
  res.status(201).json({ success: true, message: 'Trip created', data: trip });
});


// ============================================================================
// GET /api/trips — role-aware list with status filter, search & pagination
// ============================================================================
export const listTrips = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const status = req.query.status as TripStatus | undefined;
  const search = (req.query.search as string) || '';

  const where: Prisma.TripWhereInput = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { tripNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { deliveryAddress: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Drivers are scoped to their own trips
  if (!isAdmin(req)) {
    const driver = await getDriverForUser(req.user!.id);
    where.driverId = driver.id;
  }

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        driver: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { items: true } },
      },
    }),
    prisma.trip.count({ where }),
  ]);

  res.json({
    success: true,
    data: trips,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});


// Helper: load a trip and enforce that drivers can only touch their own trips
const loadTripForActor = async (req: AuthRequest, tripId: string) => {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new AppError('Trip not found', 404);
  if (!isAdmin(req)) {
    const driver = await getDriverForUser(req.user!.id);
    if (trip.driverId !== driver.id) throw new AppError('Not authorized for this trip', 403);
  }
  return trip;
};

// ============================================================================
// GET /api/trips/stats — dashboard summary (role-aware)
// ============================================================================
export const getTripStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const base: Prisma.TripWhereInput = {};
  if (!isAdmin(req)) {
    const driver = await getDriverForUser(req.user!.id);
    base.driverId = driver.id;
  }

  const [pending, assigned, inProgress, completed, cancelled] = await Promise.all([
    prisma.trip.count({ where: { ...base, status: 'pending' } }),
    prisma.trip.count({ where: { ...base, status: 'assigned' } }),
    prisma.trip.count({ where: { ...base, status: 'in_progress' } }),
    prisma.trip.count({ where: { ...base, status: 'completed' } }),
    prisma.trip.count({ where: { ...base, status: 'cancelled' } }),
  ]);

  res.json({
    success: true,
    data: {
      pending,
      assigned,
      inProgress,
      completed,
      cancelled,
      total: pending + assigned + inProgress + completed + cancelled,
      active: assigned + inProgress,
    },
  });
});

// ============================================================================
// GET /api/trips/:id — full detail with items, driver & status history
// ============================================================================
export const getTrip = asyncHandler(async (req: AuthRequest, res: Response) => {
  await loadTripForActor(req, req.params.id);

  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      driver: { include: { user: { select: { firstName: true, lastName: true, phoneNumber: true } } } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      codCollection: true,
      deliveryProof: true,
    },
  });

  res.json({ success: true, data: trip });
});


// ============================================================================
// PUT /api/trips/:id  (admin) — edit trip details
// ============================================================================
export const updateTrip = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as UpdateTripInput;
  const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Trip not found', 404);
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError('Cannot edit a completed or cancelled trip', 400);
  }

  const trip = await prisma.trip.update({
    where: { id: req.params.id },
    data: input,
    include: { items: true },
  });

  emitTripEvent(req, 'trip:updated', trip, trip.driverId);
  res.json({ success: true, message: 'Trip updated', data: trip });
});

// ============================================================================
// PUT /api/trips/:id/assign  (admin) — assign or reassign a driver
// ============================================================================
export const assignTrip = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { driverId } = req.body as { driverId: string };

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw new AppError('Driver not found', 404);
  if (driver.status !== 'active') throw new AppError('Driver is not active', 400);

  const existing = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Trip not found', 404);
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError('Cannot assign a completed or cancelled trip', 400);
  }

  const trip = await prisma.trip.update({
    where: { id: req.params.id },
    data: {
      driverId,
      assignedBy: req.user!.id,
      status: existing.status === 'pending' ? 'assigned' : existing.status,
      statusHistory: {
        create: {
          status: 'assigned',
          changedBy: req.user!.id,
          notes: `Assigned to driver ${driver.driverCode}`,
        },
      },
    },
  });

  emitTripEvent(req, 'trip:assigned', trip, driverId);
  res.json({ success: true, message: 'Trip assigned', data: trip });
});


// Allowed status transitions to keep the lifecycle sane
const allowedTransitions: Record<TripStatus, TripStatus[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ============================================================================
// PUT /api/trips/:id/status — generic status transition (driver or admin)
// ============================================================================
export const updateTripStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as UpdateTripStatusInput;
  const trip = await loadTripForActor(req, req.params.id);

  if (trip.status === input.status) {
    throw new AppError(`Trip is already ${input.status}`, 400);
  }
  if (!allowedTransitions[trip.status].includes(input.status)) {
    throw new AppError(`Cannot change status from ${trip.status} to ${input.status}`, 400);
  }

  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: {
      status: input.status,
      ...(input.status === 'cancelled'
        ? { cancelledAt: new Date(), cancellationReason: input.notes }
        : {}),
      statusHistory: {
        create: {
          status: input.status,
          changedBy: req.user!.id,
          notes: input.notes,
          locationLat: input.locationLat,
          locationLng: input.locationLng,
        },
      },
    },
  });

  emitTripEvent(req, 'trip:status', updated, updated.driverId);
  res.json({ success: true, message: `Trip ${input.status}`, data: updated });
});


// ============================================================================
// POST /api/trips/:id/pickup — record pickup; moves trip to in_progress
// ============================================================================
export const markPickup = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as TripMilestoneInput;
  const trip = await loadTripForActor(req, req.params.id);

  if (trip.status !== 'assigned') {
    throw new AppError('Trip must be assigned before pickup can be recorded', 400);
  }

  const pickupTime = input.timestamp ?? new Date();
  const updated = await prisma.trip.update({
    where: { id: trip.id },
    data: {
      status: 'in_progress',
      actualPickup: pickupTime,
      statusHistory: {
        create: {
          status: 'in_progress',
          changedBy: req.user!.id,
          notes: input.notes ?? 'Package picked up',
          locationLat: input.locationLat,
          locationLng: input.locationLng,
        },
      },
    },
  });

  emitTripEvent(req, 'trip:pickup', updated, updated.driverId);
  res.json({ success: true, message: 'Pickup recorded', data: updated });
});

// ============================================================================
// POST /api/trips/:id/deliver — record delivery; completes the trip
// ============================================================================
export const markDelivered = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as TripMilestoneInput;
  const trip = await loadTripForActor(req, req.params.id);

  if (trip.status !== 'in_progress') {
    throw new AppError('Trip must be in progress before delivery can be recorded', 400);
  }

  const deliveryTime = input.timestamp ?? new Date();
  const durationMin = trip.actualPickup
    ? Math.max(0, Math.round((deliveryTime.getTime() - new Date(trip.actualPickup).getTime()) / 60000))
    : null;

  const [updated] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: trip.id },
      data: {
        status: 'completed',
        actualDelivery: deliveryTime,
        completedAt: deliveryTime,
        actualDuration: durationMin ?? undefined,
        statusHistory: {
          create: {
            status: 'completed',
            changedBy: req.user!.id,
            notes: input.notes ?? 'Delivered',
            locationLat: input.locationLat,
            locationLng: input.locationLng,
          },
        },
      },
    }),
    ...(trip.driverId
      ? [
          prisma.driver.update({
            where: { id: trip.driverId },
            data: { totalDeliveries: { increment: 1 } },
          }),
        ]
      : []),
  ]);

  emitTripEvent(req, 'trip:delivered', updated, updated.driverId);
  res.json({ success: true, message: 'Delivery recorded', data: updated });
});

// ============================================================================
// GET /api/trips/:id/history — status timeline
// ============================================================================
export const getTripHistory = asyncHandler(async (req: AuthRequest, res: Response) => {
  await loadTripForActor(req, req.params.id);
  const history = await prisma.tripStatusHistory.findMany({
    where: { tripId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: history });
});
