import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// ============================================================================
// GET /api/notifications — current user's notifications (paginated)
// ============================================================================
export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const unreadOnly = req.query.unread === 'true';

  const where: Prisma.NotificationWhereInput = {
    userId: req.user!.id,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
  ]);

  res.json({
    success: true,
    data: items,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ============================================================================
// GET /api/notifications/unread-count
// ============================================================================
export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });
  res.json({ success: true, data: { count } });
});


// ============================================================================
// PUT /api/notifications/:id/read — mark one as read
// ============================================================================
export const markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    throw new AppError('Notification not found', 404);
  }

  const notification = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true, readAt: new Date() },
  });

  res.json({ success: true, data: notification });
});

// ============================================================================
// PUT /api/notifications/read-all — mark all of the user's as read
// ============================================================================
export const markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true, data: { updated: result.count } });
});

// ============================================================================
// DELETE /api/notifications/:id
// ============================================================================
export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user!.id) {
    throw new AppError('Notification not found', 404);
  }
  await prisma.notification.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Notification deleted' });
});
