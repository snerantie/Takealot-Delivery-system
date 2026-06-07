import { Server } from 'socket.io';
import { NotificationPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: Record<string, unknown>;
  actionUrl?: string;
  sentVia?: string[];
}

/**
 * Create a single in-app notification and push it in real time to the user's
 * socket room (`user:<id>`). Best-effort: socket emission never throws.
 */
export const createNotification = async (
  io: Server | undefined,
  params: CreateNotificationParams
) => {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority ?? 'medium',
      data: params.data as object | undefined,
      actionUrl: params.actionUrl,
      sentVia: params.sentVia ?? ['in_app'],
    },
  });

  try {
    io?.to(`user:${params.userId}`).emit('notification:new', notification);
  } catch {
    /* ignore socket errors */
  }

  return notification;
};

/**
 * Create notifications for many users efficiently (one bulk insert) and emit a
 * live event to each user's room.
 */
export const createBulkNotifications = async (
  io: Server | undefined,
  userIds: string[],
  base: Omit<CreateNotificationParams, 'userId'>
) => {
  if (userIds.length === 0) return { count: 0 };

  const result = await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: base.type,
      title: base.title,
      message: base.message,
      priority: base.priority ?? 'medium',
      data: base.data as object | undefined,
      actionUrl: base.actionUrl,
      sentVia: base.sentVia ?? ['in_app'],
    })),
  });

  try {
    const payload = { type: base.type, title: base.title, message: base.message };
    for (const userId of userIds) {
      io?.to(`user:${userId}`).emit('notification:new', payload);
    }
  } catch {
    /* ignore socket errors */
  }

  return result;
};
