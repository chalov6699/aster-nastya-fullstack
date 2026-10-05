import crypto from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

const COOKIE_NAME = 'aster_session';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createSession(res, userId) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const id = hashToken(raw);
  const expires = new Date(Date.now() + config.sessionDays * 86400000);
  db.prepare('INSERT INTO sessions(id,user_id,expires_at) VALUES (?,?,?)').run(id, userId, expires.toISOString());
  res.cookie(COOKIE_NAME, raw, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
    path: '/',
    expires
  });
}

export function destroySession(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) db.prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax', secure: config.isProd });
}

export function getSessionUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT u.id, u.email, u.role, s.expires_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ? AND s.expires_at > ?
  `).get(hashToken(token), now);
  return row || null;
}

export function requireAdmin(req, res, next) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'admin') return res.status(401).json({ error: 'Требуется вход в админку' });
  req.user = user;
  next();
}

export function requireAllowedOrigin(req, res, next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const allowed = new Set([config.appOrigin]);
  if (!config.isProd) {
    allowed.add('http://localhost:5173');
    allowed.add('http://127.0.0.1:5173');
  }
  if (origin && !allowed.has(origin)) return res.status(403).json({ error: 'Недопустимый источник запроса' });
  next();
}

export function cleanupSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString());
}
