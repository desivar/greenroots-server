import { Router } from 'express';
import { register, login, refreshToken, forgotPassword, resetPassword, getMe } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

router.post('/register',               register);
router.post('/login',                  login);
router.post('/refresh',                refreshToken);
router.post('/forgot-password',        forgotPassword);
router.post('/reset-password/:token',  resetPassword);
router.get('/me', protect,             getMe);

export default router;
