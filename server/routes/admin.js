import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { hasValidImageSignature } from '../file-validation.js';
import { db, getSiteData, mediaUrl } from '../db.js';
import {
  bookingUpdateSchema, mediaMetaSchema, passwordChangeSchema, parse, portfolioSchema,
  reviewSchema, serviceSchema, settingsSchema, statSchema
} from '../validation.js';

const router = Router();

const extensionFor = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const storage = multer.diskStorage({
  destination: config.uploadDir,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${extensionFor[file.mimetype] || ''}`)
});
const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => extensionFor[file.mimetype] ? cb(null, true) : cb(new Error('UNSUPPORTED_IMAGE'))
});

router.post('/password', async (req, res) => {
  const data = parse(passwordChangeSchema, req.body, res); if (!data) return;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !(await bcrypt.compare(data.current_password, user.password_hash))) {
    return res.status(400).json({ error: 'Текущий пароль неверный' });
  }
  const hash = await bcrypt.hash(data.new_password, 12);
  db.transaction(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
  })();
  res.clearCookie('aster_session', { path: '/', sameSite: 'lax', secure: config.isProd });
  res.json({ ok: true });
});

router.get('/dashboard', (req, res) => {
  const counts = {
    new_bookings: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status = 'new'").get().c,
    total_bookings: db.prepare('SELECT COUNT(*) c FROM bookings').get().c,
    services: db.prepare('SELECT COUNT(*) c FROM services').get().c,
    media: db.prepare('SELECT COUNT(*) c FROM media').get().c
  };
  const recent = db.prepare(`SELECT id,name,contact,service_name,status,created_at FROM bookings ORDER BY id DESC LIMIT 6`).all();
  res.json({ counts, recent });
});

router.get('/site', (req, res) => res.json(getSiteData({ admin: true })));

router.put('/settings', (req, res) => {
  const data = parse(settingsSchema, req.body, res);
  if (!data) return;
  if (data.hero_media_id && !db.prepare('SELECT id FROM media WHERE id = ?').get(data.hero_media_id)) {
    return res.status(400).json({ error: 'Изображение не найдено' });
  }
  db.prepare(`UPDATE settings SET
    brand=@brand, city=@city, telegram=@telegram, online_booking_url=@online_booking_url,
    hero_mode=@hero_mode, hero_media_id=@hero_media_id, hero_kicker=@hero_kicker,
    hero_title_top=@hero_title_top, hero_title_bottom=@hero_title_bottom,
    hero_description=@hero_description, about_text=@about_text, about_note=@about_note,
    updated_at=CURRENT_TIMESTAMP WHERE id=1
  `).run({ ...data, hero_media_id: data.hero_media_id || null });
  res.json(getSiteData({ admin: true }).settings);
});

function crud(resource, table, schema, fields) {
  router.post(`/${resource}`, (req, res) => {
    const data = parse(schema, req.body, res); if (!data) return;
    const names = fields.join(',');
    const placeholders = fields.map((f) => `@${f}`).join(',');
    const result = db.prepare(`INSERT INTO ${table}(${names}) VALUES (${placeholders})`).run(data);
    res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid));
  });
  router.put(`/${resource}/:id`, (req, res) => {
    const data = parse(schema, req.body, res); if (!data) return;
    const set = fields.map((f) => `${f}=@${f}`).join(',');
    const result = db.prepare(`UPDATE ${table} SET ${set}${table === 'services' ? ', updated_at=CURRENT_TIMESTAMP' : ''} WHERE id=@id`).run({ ...data, id: req.params.id });
    if (!result.changes) return res.status(404).json({ error: 'Запись не найдена' });
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id));
  });
  router.delete(`/${resource}/:id`, (req, res) => {
    const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Запись не найдена' });
    res.json({ ok: true });
  });
}

crud('services','services',serviceSchema,['name','note','price','sort_order','is_active']);
crud('stats','stats',statSchema,['value','label','sort_order','is_active']);
crud('reviews','reviews',reviewSchema,['name','text','rating','sort_order','is_active']);

router.get('/media', (req, res) => {
  const items = db.prepare('SELECT * FROM media ORDER BY id DESC').all().map((row) => ({ ...row, url: mediaUrl(row) }));
  res.json({ items });
});

router.post('/media', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Выберите изображение' });
  const signature = fs.readFileSync(req.file.path).subarray(0, 16);
  if (!hasValidImageSignature(signature, req.file.mimetype)) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(415).json({ error: 'Содержимое файла не соответствует формату изображения' });
  }
  const meta = parse(mediaMetaSchema, { alt_text: req.body.alt_text || '' }, res);
  if (!meta) { fs.rmSync(req.file.path, { force: true }); return; }
  const result = db.prepare(`INSERT INTO media(filename,original_name,mime_type,size_bytes,alt_text) VALUES (?,?,?,?,?)`)
    .run(req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, meta.alt_text);
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...row, url: mediaUrl(row) });
});

router.delete('/media/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM media WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Изображение не найдено' });
  const hero = db.prepare('SELECT 1 FROM settings WHERE hero_media_id = ?').get(row.id);
  const portfolio = db.prepare('SELECT 1 FROM portfolio WHERE media_id = ? LIMIT 1').get(row.id);
  if (hero || portfolio) return res.status(409).json({ error: 'Сначала уберите изображение из hero или портфолио' });
  db.prepare('DELETE FROM media WHERE id = ?').run(row.id);
  fs.rmSync(path.join(config.uploadDir, row.filename), { force: true });
  res.json({ ok: true });
});

router.post('/portfolio', (req, res) => {
  const data = parse(portfolioSchema, req.body, res); if (!data) return;
  if (!db.prepare('SELECT id FROM media WHERE id = ?').get(data.media_id)) return res.status(400).json({ error: 'Изображение не найдено' });
  const result = db.prepare('INSERT INTO portfolio(title,category,media_id,sort_order,is_active) VALUES (@title,@category,@media_id,@sort_order,@is_active)').run(data);
  res.status(201).json({ id: result.lastInsertRowid });
});
router.put('/portfolio/:id', (req, res) => {
  const data = parse(portfolioSchema, req.body, res); if (!data) return;
  const result = db.prepare('UPDATE portfolio SET title=@title,category=@category,media_id=@media_id,sort_order=@sort_order,is_active=@is_active WHERE id=@id').run({ ...data, id: req.params.id });
  if (!result.changes) return res.status(404).json({ error: 'Работа не найдена' });
  res.json({ ok: true });
});
router.delete('/portfolio/:id', (req, res) => {
  const result = db.prepare('DELETE FROM portfolio WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Работа не найдена' });
  res.json({ ok: true });
});

router.get('/bookings', (req, res) => {
  const status = String(req.query.status || 'all');
  const rows = status === 'all'
    ? db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 250').all()
    : db.prepare('SELECT * FROM bookings WHERE status = ? ORDER BY id DESC LIMIT 250').all(status);
  res.json({ items: rows });
});
router.patch('/bookings/:id', (req, res) => {
  const data = parse(bookingUpdateSchema, req.body, res); if (!data) return;
  const result = db.prepare('UPDATE bookings SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(data.status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Заявка не найдена' });
  res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
});

export default router;
