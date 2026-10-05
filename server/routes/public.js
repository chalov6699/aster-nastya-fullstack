import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db, getSiteData } from '../db.js';
import { bookingSchema, parse } from '../validation.js';

const router = Router();
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Слишком много заявок. Попробуйте немного позже.' }
});

router.get('/site', (req, res) => {
  res.json(getSiteData());
});

router.post('/bookings', bookingLimiter, (req, res) => {
  const data = parse(bookingSchema, req.body, res);
  if (!data) return;
  if (data.website) return res.status(200).json({ ok: true });

  let serviceName = '';
  if (data.service_id) {
    const service = db.prepare('SELECT id, name FROM services WHERE id = ? AND is_active = 1').get(data.service_id);
    if (!service) return res.status(400).json({ error: 'Выбранная услуга недоступна' });
    serviceName = service.name;
  }

  const result = db.prepare(`
    INSERT INTO bookings(name,contact,service_id,service_name,desired_date,comment)
    VALUES (?,?,?,?,?,?)
  `).run(data.name, data.contact, data.service_id || null, serviceName, data.desired_date, data.comment);

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

export default router;
