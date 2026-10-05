import path from 'node:path';

const root = process.cwd();
const env = process.env;
const isProd = env.NODE_ENV === 'production';

if (isProd && (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD === 'AsterDev123!')) {
  throw new Error('ADMIN_PASSWORD must be set to a strong production password');
}

export const config = {
  port: Number(env.PORT || 8787),
  appOrigin: env.APP_ORIGIN || 'http://localhost:5173',
  databasePath: path.resolve(root, env.DATABASE_PATH || './data/aster.db'),
  uploadDir: path.resolve(root, env.UPLOAD_DIR || './uploads'),
  adminEmail: env.ADMIN_EMAIL || 'admin@aster.local',
  adminPassword: env.ADMIN_PASSWORD || 'AsterDev123!',
  sessionDays: Number(env.SESSION_DAYS || 14),
  maxUploadMb: Number(env.MAX_UPLOAD_MB || 8),
  isProd
};
