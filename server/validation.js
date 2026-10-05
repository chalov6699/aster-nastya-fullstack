import { z } from 'zod';

const short = z.string().trim().min(1).max(120);
const optionalUrl = z.string().trim().max(500).refine((v) => v === '' || /^https?:\/\//i.test(v), 'Нужна ссылка http(s)');

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200)
});

export const bookingSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contact: z.string().trim().min(3).max(120),
  service_id: z.coerce.number().int().positive().nullable().optional(),
  desired_date: z.string().trim().max(80).optional().default(''),
  comment: z.string().trim().max(1000).optional().default(''),
  website: z.string().max(0).optional().default('')
});

export const settingsSchema = z.object({
  brand: short,
  city: short,
  telegram: optionalUrl,
  online_booking_url: optionalUrl,
  hero_mode: z.enum(['art','image']),
  hero_media_id: z.coerce.number().int().positive().nullable().optional(),
  hero_kicker: z.string().trim().min(1).max(180),
  hero_title_top: z.string().trim().min(1).max(80),
  hero_title_bottom: z.string().trim().min(1).max(80),
  hero_description: z.string().trim().min(1).max(700),
  about_text: z.string().trim().min(1).max(1200),
  about_note: z.string().trim().max(220)
});

export const serviceSchema = z.object({
  name: short,
  note: z.string().trim().max(180).default(''),
  price: z.string().trim().min(1).max(80),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  is_active: z.boolean().default(true).transform((v) => v ? 1 : 0)
});

export const statSchema = z.object({
  value: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(120),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  is_active: z.boolean().default(true).transform((v) => v ? 1 : 0)
});

export const reviewSchema = z.object({
  name: short,
  text: z.string().trim().min(3).max(1200),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  is_active: z.boolean().default(true).transform((v) => v ? 1 : 0)
});

export const portfolioSchema = z.object({
  title: short,
  category: z.string().trim().max(100).default(''),
  media_id: z.coerce.number().int().positive(),
  sort_order: z.coerce.number().int().min(0).max(10000).default(0),
  is_active: z.boolean().default(true).transform((v) => v ? 1 : 0)
});

export const bookingUpdateSchema = z.object({
  status: z.enum(['new','contacted','confirmed','done','cancelled'])
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(8).max(200),
  new_password: z.string().min(12).max(200)
    .regex(/[A-ZА-Я]/, 'Добавьте заглавную букву')
    .regex(/[a-zа-я]/, 'Добавьте строчную букву')
    .regex(/\d/, 'Добавьте цифру')
});

export const mediaMetaSchema = z.object({
  alt_text: z.string().trim().max(200).default('')
});

export function parse(schema, data, res) {
  const result = schema.safeParse(data);
  if (!result.success) {
    res.status(400).json({ error: 'Проверьте поля', details: result.error.flatten() });
    return null;
  }
  return result.data;
}
