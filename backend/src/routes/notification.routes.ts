import { Router } from 'express';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

export default router;
