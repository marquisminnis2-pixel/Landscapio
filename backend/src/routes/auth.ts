import { Router } from 'express';
import { register, login, getMe, changePassword, forgotPassword, verifyEmail } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/verify-email', verifyEmail);
router.get('/me', authMiddleware, getMe);
router.post('/change-password', authMiddleware, changePassword);
router.post('/forgot-password', forgotPassword);

export default router;
