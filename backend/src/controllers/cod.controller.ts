import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { verifyDeposit } from '../services/codVerification';
import {
  RecordCodCollectionInput,
  RecordDepositInput,
  ResolveCodInput,
} from '../lib/validation';

const isAdmin = (req: AuthRequest) =>
  req.user?.role === 'admin' || req.user?.role === 'super_admin';

const getDriverForUser = async (userId: string) => {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) throw new AppError('Driver profile not found', 404);
  return driver;
};

const emit = (req: AuthRequest, event: string, payload: unknown, driverId?: string | null) => {
  const io = req.app.get('io');
  if (!io) return;
  if (driverId) io.to(`driver:${driverId}`).emit(event, payload);
  io.to('admin').emit(event, payload);
};

// Create an in-app notification (best-effort; never blocks the main flow)
const notify = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  priority: 'low' | 'medium' | 'high' = 'medium'
) => {
  try {
    await prisma.notification.create({ data: { userId, type, title, message, priority } });
  } catch {
    /* swallow */
  }
};

const toNum = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'number' ? v : Number(v);


// ============================================================================
// POST /api/cod-collections — driver records cash collected for a COD trip
// ============================================================================
export const recordCollection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as RecordCodCollectionInput;
  const driver = await getDriverForUser(req.user!.id);

  const trip = await prisma.trip.findUnique({
    where: { id: input.tripId },
    include: { codCollection: true },
  });
  if (!trip) throw new AppError('Trip not found', 404);
  if (trip.driverId !== driver.id) throw new AppError('This trip is not assigned to you', 403);
  if (trip.paymentMethod !== 'cod') throw new AppError('This trip is not a cash-on-delivery trip', 400);
  if (trip.status !== 'completed') {
    throw new AppError('Record the collection only after the trip is delivered', 400);
  }
  if (trip.codCollection) throw new AppError('A collection already exists for this trip', 409);

  const expected = toNum(trip.codAmount);
  const collection = await prisma.codCollection.create({
    data: {
      tripId: trip.id,
      driverId: driver.id,
      amountCollected: input.amountCollected,
      collectionNotes: input.collectionNotes,
      depositStatus: 'pending',
      verificationStatus: 'pending',
      // Flag immediately if the collected cash differs from the order COD amount
      discrepancyAmount: Number((input.amountCollected - expected).toFixed(2)),
      discrepancyReason:
        input.amountCollected !== expected
          ? `Order COD amount is R${expected.toFixed(2)} but R${input.amountCollected.toFixed(2)} was collected`
          : null,
    },
  });

  emit(req, 'cod:collected', collection, driver.id);
  res.status(201).json({
    success: true,
    message: 'Cash collection recorded. Deposit at an ATM and capture the reference to verify.',
    data: collection,
  });
});


// ============================================================================
// PUT /api/cod-collections/:id/deposit — driver captures ATM deposit ref;
// triggers automated verification against the bank provider.
// ============================================================================
export const recordDeposit = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as RecordDepositInput;
  const driver = await getDriverForUser(req.user!.id);

  const collection = await prisma.codCollection.findUnique({ where: { id: req.params.id } });
  if (!collection) throw new AppError('COD collection not found', 404);
  if (collection.driverId !== driver.id) throw new AppError('Not authorized for this collection', 403);
  if (collection.verificationStatus === 'verified') {
    throw new AppError('This deposit has already been verified', 400);
  }

  const depositTime = input.atmDepositTime ?? new Date();

  // Run automated verification
  const outcome = await verifyDeposit({
    atmReference: input.atmReference,
    amountCollected: toNum(collection.amountCollected),
    bankName: input.bankName,
    depositTime,
  });

  const updated = await prisma.codCollection.update({
    where: { id: collection.id },
    data: {
      atmReference: input.atmReference,
      bankName: input.bankName,
      atmLocation: input.atmLocation,
      atmDepositTime: depositTime,
      depositStatus: outcome.depositStatus,
      verificationStatus: outcome.verificationStatus,
      verifiedAmount: outcome.verifiedAmount ?? undefined,
      verifiedAt: outcome.verifiedAt ?? undefined,
      discrepancyAmount: outcome.discrepancyAmount,
      discrepancyReason: outcome.discrepancyReason,
      verificationNotes: `Auto: ${outcome.message}`,
    },
  });

  // Notify the driver of the result
  await notify(
    req.user!.id,
    outcome.verificationStatus === 'verified' ? 'cod_verified' : 'cod_flagged',
    outcome.verificationStatus === 'verified' ? 'Deposit verified' : 'Deposit needs attention',
    outcome.message,
    outcome.verificationStatus === 'verified' ? 'low' : 'high'
  );

  emit(req, 'cod:verified', updated, driver.id);
  res.json({ success: true, message: outcome.message, data: updated });
});


// ============================================================================
// GET /api/cod-collections — role-aware list with optional status filters
// ============================================================================
export const listCollections = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

  const where: Prisma.CodCollectionWhereInput = {};
  if (req.query.depositStatus) where.depositStatus = req.query.depositStatus as Prisma.CodCollectionWhereInput['depositStatus'];
  if (req.query.verificationStatus)
    where.verificationStatus = req.query.verificationStatus as Prisma.CodCollectionWhereInput['verificationStatus'];

  if (!isAdmin(req)) {
    const driver = await getDriverForUser(req.user!.id);
    where.driverId = driver.id;
  }

  const [items, total] = await Promise.all([
    prisma.codCollection.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { collectionTime: 'desc' },
      include: {
        trip: { select: { tripNumber: true, customerName: true, codAmount: true } },
        driver: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.codCollection.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ============================================================================
// GET /api/cod-collections/pending  (admin) — deposits awaiting attention
// ============================================================================
export const getPending = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const items = await prisma.codCollection.findMany({
    where: {
      OR: [{ verificationStatus: 'pending' }, { verificationStatus: 'failed' }, { depositStatus: 'disputed' }],
    },
    orderBy: { collectionTime: 'asc' },
    include: {
      trip: { select: { tripNumber: true, customerName: true, codAmount: true } },
      driver: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  res.json({ success: true, data: items });
});


// ============================================================================
// GET /api/cod-collections/stats — totals by status (role-aware)
// ============================================================================
export const getCodStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: Prisma.CodCollectionWhereInput = {};
  if (!isAdmin(req)) {
    const driver = await getDriverForUser(req.user!.id);
    where.driverId = driver.id;
  }

  const [agg, pending, verified, disputed] = await Promise.all([
    prisma.codCollection.aggregate({ where, _sum: { amountCollected: true } }),
    prisma.codCollection.count({ where: { ...where, verificationStatus: 'pending' } }),
    prisma.codCollection.count({ where: { ...where, verificationStatus: 'verified' } }),
    prisma.codCollection.count({ where: { ...where, depositStatus: 'disputed' } }),
  ]);

  res.json({
    success: true,
    data: {
      totalCollected: toNum(agg._sum.amountCollected),
      awaitingVerification: pending,
      verified,
      disputed,
    },
  });
});

// ============================================================================
// GET /api/cod-collections/:id — detail (role-aware)
// ============================================================================
export const getCollection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const collection = await prisma.codCollection.findUnique({
    where: { id: req.params.id },
    include: {
      trip: { select: { tripNumber: true, customerName: true, codAmount: true, deliveryAddress: true } },
      driver: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!collection) throw new AppError('COD collection not found', 404);

  if (!isAdmin(req)) {
    const driver = await getDriverForUser(req.user!.id);
    if (collection.driverId !== driver.id) throw new AppError('Not authorized for this collection', 403);
  }

  res.json({ success: true, data: collection });
});


// ============================================================================
// POST /api/cod-collections/:id/verify  (admin) — manual approve / reject,
// used to resolve disputes or override the automated outcome.
// ============================================================================
export const resolveCollection = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as ResolveCodInput;

  const collection = await prisma.codCollection.findUnique({ where: { id: req.params.id } });
  if (!collection) throw new AppError('COD collection not found', 404);

  const updated = await prisma.codCollection.update({
    where: { id: collection.id },
    data: {
      verificationStatus: input.approve ? 'verified' : 'failed',
      depositStatus: input.approve ? 'verified' : 'disputed',
      verifiedAmount: input.approve
        ? input.verifiedAmount ?? toNum(collection.amountCollected)
        : undefined,
      verifiedAt: input.approve ? new Date() : null,
      verifiedBy: req.user!.id,
      verificationNotes: `Manual (${req.user!.email}): ${input.notes ?? (input.approve ? 'Approved' : 'Rejected')}`,
      discrepancyResolved: input.approve,
    },
  });

  await notify(
    collection.driverId ? (await prisma.driver.findUnique({ where: { id: collection.driverId } }))!.userId : req.user!.id,
    input.approve ? 'cod_verified' : 'cod_rejected',
    input.approve ? 'Deposit approved' : 'Deposit rejected',
    input.approve
      ? 'An admin has verified your COD deposit.'
      : `An admin flagged your COD deposit. ${input.notes ?? ''}`.trim(),
    input.approve ? 'low' : 'high'
  );

  emit(req, 'cod:resolved', updated, collection.driverId);
  res.json({
    success: true,
    message: input.approve ? 'Deposit verified' : 'Deposit rejected',
    data: updated,
  });
});
