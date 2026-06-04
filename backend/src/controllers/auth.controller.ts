import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { addDays } from 'date-fns';
import { prisma } from '../lib/prisma';
import { generateTokens, verifyRefreshToken } from '../lib/jwt';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { RegisterInput } from '../lib/validation';

const SALT_ROUNDS = 12;

/**
 * Generate a unique, human-readable driver code, e.g. DRV-7F3A9C.
 */
const generateDriverCode = (): string => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DRV-${random}`;
};

/**
 * Persist a refresh token so it can be revoked on logout.
 */
const storeRefreshToken = async (userId: string, token: string) => {
  await prisma.refreshToken.create({
    data: {
      userId,
      token,
      expiresAt: addDays(new Date(), 7),
    },
  });
};

const sanitizeUser = (user: {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  phoneNumber: user.phoneNumber,
  profilePictureUrl: user.profilePictureUrl,
});

// ============================================================================
// POST /api/auth/register
// ============================================================================
export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as RegisterInput;

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Drivers must provide a vehicle type
  if (input.role === 'driver' && !input.vehicleType) {
    throw new AppError('Vehicle type is required for driver accounts', 400);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create the user (and driver profile in one transaction when applicable)
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
      },
    });

    if (input.role === 'driver') {
      await tx.driver.create({
        data: {
          userId: createdUser.id,
          driverCode: generateDriverCode(),
          vehicleType: input.vehicleType!,
          licenseNumber: input.licenseNumber,
          vehicleRegNumber: input.vehicleRegNumber,
        },
      });
    }

    return createdUser;
  });

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  await storeRefreshToken(user.id, tokens.refreshToken);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      user: sanitizeUser(user),
      ...tokens,
    },
  });
});

// ============================================================================
// POST /api/auth/login
// ============================================================================
export const login = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });

  // Use the same error for "no user" and "wrong password" to avoid user enumeration
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact your administrator.', 403);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  await storeRefreshToken(user.id, tokens.refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: sanitizeUser(user),
      ...tokens,
    },
  });
});

// ============================================================================
// POST /api/auth/refresh
// ============================================================================
export const refresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body as { refreshToken: string };

  // Validate signature/expiry first
  const payload = verifyRefreshToken(refreshToken);

  // Ensure the token is known and not revoked
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });
  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  // Rotate: revoke the old token and issue a fresh pair
  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt: addDays(new Date(), 7),
      },
    }),
  ]);

  res.json({
    success: true,
    data: tokens,
  });
});

// ============================================================================
// POST /api/auth/logout
// ============================================================================
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================================
// GET /api/auth/me
// ============================================================================
export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new AppError('Not authenticated', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      driver: {
        select: {
          id: true,
          driverCode: true,
          vehicleType: true,
          status: true,
          rating: true,
          totalDeliveries: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: {
      ...sanitizeUser(user),
      driver: user.driver,
    },
  });
});
