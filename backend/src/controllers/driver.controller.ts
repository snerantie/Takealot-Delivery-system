import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { UpdateDriverInput } from '../lib/validation';

// ============================================================================
// GET /api/drivers  (admin) — list with pagination, search & status filter
// ============================================================================
export const listDrivers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const search = (req.query.search as string) || '';
  const status = req.query.status as string | undefined;

  const where: Prisma.DriverWhereInput = {
    ...(status ? { status: status as Prisma.DriverWhereInput['status'] } : {}),
    ...(search
      ? {
          OR: [
            { driverCode: { contains: search, mode: 'insensitive' } },
            { user: { firstName: { contains: search, mode: 'insensitive' } } },
            { user: { lastName: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.driver.count({ where }),
  ]);

  res.json({
    success: true,
    data: drivers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ============================================================================
// GET /api/drivers/:id  (admin, or the driver themselves)
// ============================================================================
export const getDriver = asyncHandler(async (req: AuthRequest, res: Response) => {
  const driver = await prisma.driver.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          profilePictureUrl: true,
          isActive: true,
        },
      },
    },
  });

  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  res.json({ success: true, data: driver });
});

// ============================================================================
// PUT /api/drivers/me  — driver updates their own vehicle/banking details
// ============================================================================
export const updateMyDriverProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as UpdateDriverInput;

  const existing = await prisma.driver.findUnique({
    where: { userId: req.user!.id },
  });
  if (!existing) {
    throw new AppError('Driver profile not found', 404);
  }

  const driver = await prisma.driver.update({
    where: { id: existing.id },
    data: input,
  });

  res.json({ success: true, message: 'Driver profile updated', data: driver });
});

// ============================================================================
// POST /api/drivers/:id/suspend  (admin)
// ============================================================================
export const suspendDriver = asyncHandler(async (req: AuthRequest, res: Response) => {
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: { status: 'suspended' },
  });

  res.json({ success: true, message: 'Driver suspended', data: driver });
});

// ============================================================================
// POST /api/drivers/:id/activate  (admin)
// ============================================================================
export const activateDriver = asyncHandler(async (req: AuthRequest, res: Response) => {
  const driver = await prisma.driver.update({
    where: { id: req.params.id },
    data: { status: 'active' },
  });

  res.json({ success: true, message: 'Driver activated', data: driver });
});
