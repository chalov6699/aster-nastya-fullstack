import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import './db.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { cleanupSessions, requireAdmin, requireAllowedOrigin } from './security.js';
import { errorHandler, notFound } from './middleware/errors.js';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-origin' },
  contentSecurityPolicy: config.isProd ? undefined : false
}));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieParser());
app.use('/uploads', express.static(config.uploadDir, { maxAge: config.isProd ? '7d' : 0, immutable: false }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/public', publicRoutes);
app.use('/api/auth', requireAllowedOrigin, authRoutes);
app.use('/api/admin', requireAllowedOrigin, requireAdmin, adminRoutes);

if (config.isProd) {
  const dist = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h' }));
    app.get('/{*splat}', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }
}

app.use('/api', notFound);
app.use(errorHandler);

cleanupSessions();
setInterval(cleanupSessions, 6 * 60 * 60 * 1000).unref();

app.listen(config.port, () => {
  console.log(`Aster API: http://localhost:${config.port}`);
  if (!config.isProd && config.adminPassword === 'AsterDev123!') {
    console.log('DEV admin: admin@aster.local / AsterDev123! — change it before production');
  }
});
