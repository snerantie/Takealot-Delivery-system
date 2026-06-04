import { Router } from 'express';

const router = Router();

// Routes will be implemented in Task #3
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// POST /api/auth/refresh
// POST /api/auth/forgot-password
// POST /api/auth/reset-password

router.get('/', (req, res) => {
  res.json({ message: 'Auth routes - to be implemented' });
});

export default router;
