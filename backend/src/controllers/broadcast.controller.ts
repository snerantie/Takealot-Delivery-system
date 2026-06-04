import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { createBulkNotifications } from '../services/notificationService';
import { CreateBroadcastInput } from '../lib/validation';

/**
 * Resolve the set of recipient user IDs for a broadcast audience.
 */
const resolveRecipientUserIds = async (input: CreateBroadcastInput): Promise<string[]> => {
  switch (input.targetAudience) {
    case 'all_drivers': {
      const drivers = await prisma.driver.findMany({ select: { userId: true } });
      return drivers.map((d) => d.userId);
    }
    case 'active_drivers': {
      const drivers = await prisma.driver.findMany({
        where: { status: 'active' },
        select: { userId: true },
      });
      return drivers.map((d) => d.userId);
    }
    case 'specific_drivers': {
      const drivers = await prisma.driver.findMany({
        where: { id: { in: input.targetDriverIds ?? [] } },
        select: { userId: true },
      });
      return drivers.map((d) => d.userId);
    }
    case 'admins': {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['admin', 'super_admin'] } },
        select: { id: true },
      });
      return admins.map((u) => u.id);
    }
    default:
      return [];
  }
};


// ============================================================================
// POST /api/broadcasts  (admin) — compose and send a broadcast
// ============================================================================
export const createBroadcast = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = req.body as CreateBroadcastInput;
  const io = req.app.get('io');

  const recipientIds = await resolveRecipientUserIds(input);
  if (recipientIds.length === 0) {
    throw new AppError('No recipients match the selected audience', 400);
  }

  // Persist the broadcast record
  const broadcast = await prisma.broadcastMessage.create({
    data: {
      createdBy: req.user!.id,
      title: input.title,
      message: input.message,
      targetAudience: input.targetAudience,
      targetDriverIds: input.targetDriverIds ?? [],
      deliveryMethod: input.deliveryMethod,
      status: 'sent',
      sentAt: new Date(),
      totalRecipients: recipientIds.length,
    },
  });

  // Fan out in-app notifications + real-time events
  await createBulkNotifications(io, recipientIds, {
    type: 'broadcast',
    title: input.title,
    message: input.message,
    priority: input.priority,
    data: { broadcastId: broadcast.id },
  });

  // Track per-recipient delivery rows
  await prisma.broadcastRecipient.createMany({
    data: recipientIds.map((userId) => ({
      broadcastId: broadcast.id,
      userId,
      deliveredAt: new Date(),
    })),
    skipDuplicates: true,
  });

  await prisma.broadcastMessage.update({
    where: { id: broadcast.id },
    data: { totalDelivered: recipientIds.length },
  });

  // NOTE: push/SMS/email channels are persisted on the broadcast for when those
  // providers (FCM/Twilio/SendGrid) are wired up; in-app is delivered now.
  res.status(201).json({
    success: true,
    message: `Broadcast sent to ${recipientIds.length} recipient(s)`,
    data: { ...broadcast, totalDelivered: recipientIds.length },
  });
});


// ============================================================================
// GET /api/broadcasts  (admin) — list sent broadcasts
// ============================================================================
export const listBroadcasts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

  const [items, total] = await Promise.all([
    prisma.broadcastMessage.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        _count: { select: { recipients: true } },
      },
    }),
    prisma.broadcastMessage.count(),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ============================================================================
// GET /api/broadcasts/:id  (admin) — detail with read/delivery stats
// ============================================================================
export const getBroadcast = asyncHandler(async (req: AuthRequest, res: Response) => {
  const broadcast = await prisma.broadcastMessage.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { firstName: true, lastName: true } },
      _count: { select: { recipients: true } },
    },
  });
  if (!broadcast) throw new AppError('Broadcast not found', 404);

  const readCount = await prisma.broadcastRecipient.count({
    where: { broadcastId: broadcast.id, readAt: { not: null } },
  });

  res.json({ success: true, data: { ...broadcast, readCount } });
});
