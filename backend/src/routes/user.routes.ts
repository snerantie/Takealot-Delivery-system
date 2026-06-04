import { Router } from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '../lib/validation';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', validateBody(updateProfileSchema), updateProfile);
router.put('/me/password', validateBody(changePasswordSchema), changePassword);

export default router;
