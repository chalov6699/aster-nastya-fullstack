import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { createSession, destroySession, getSessionUser } from '../security.js';
import { loginSchema, parse } from '../validation.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const data = parse(loginSchema, req.body, res);
  if (!data) return;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  if (!user || !(await bcrypt.compare(data.password, user.password_hash))) {
    return res.status(401).json({ error: 'Неверный email или пароль' });
  }
  destroySession(req, res);
  createSession(res, user.id);
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Нет активной сессии' });
  res.json({ user: { id: user.id, email: user.email, role: user.role } });
});

export default router;
