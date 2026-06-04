import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { UpdateProfileInput } from '../lib/validation';

const SALT_ROUNDS = 12;

// ============================================================================
// GET /api/users/me
// ============================================================================
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      profilePictureUrl: true,
      emailVerified: true,
      phoneVerified: true,
      createdAt: true,
      lastLogin: true,
      driver: {
        select: {
          id: true,
          driverCode: true,
          vehicleType: true,
          vehicleRegNumber: true,
          licenseNumber: true,
          status: true,
          rating: true,
          totalDeliveries: true,
          bankName: true,
          bankAccountNumber: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ success: true, data: user });
});

// ============================================================================
// PUT /api/users/me
// ============================================================================
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as UpdateProfileInput;

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      profilePictureUrl: input.profilePictureUrl,
    },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      phoneNumber: true,
      profilePictureUrl: true,
    },
  });

  res.json({ success: true, message: 'Profile updated', data: user });
});

// ============================================================================
// PUT /api/users/me/password
// ============================================================================
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    // Revoke all refresh tokens to force re-login on other devices
    prisma.refreshToken.updateMany({
      where: { userId: user.id, isRevoked: false },
      data: { isRevoked: true },
    }),
  ]);

  res.json({ success: true, message: 'Password changed successfully' });
});
