import { Router } from 'express';
const router = Router();
router.get('/', (req, res) => { res.json({ message: 'User routes - to be implemented' }); });
export default router;
