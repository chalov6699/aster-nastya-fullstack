import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingSchema, serviceSchema, settingsSchema } from './validation.js';

test('booking rejects too-short contact', () => {
  assert.equal(bookingSchema.safeParse({ name: 'Настя', contact: '1' }).success, false);
});

test('service accepts editable price strings', () => {
  const result = serviceSchema.safeParse({ name: 'Лами', note: '', price: '1 500 ₽', sort_order: 0, is_active: true });
  assert.equal(result.success, true);
});

test('settings reject javascript links', () => {
  const result = settingsSchema.safeParse({
    brand: 'Aster Nastya', city: 'Мариуполь', telegram: 'javascript:alert(1)', online_booking_url: '',
    hero_mode: 'art', hero_media_id: null, hero_kicker: 'LASHES', hero_title_top: 'Aster', hero_title_bottom: 'Nastya',
    hero_description: 'Описание', about_text: 'Текст о мастере', about_note: ''
  });
  assert.equal(result.success, false);
});
