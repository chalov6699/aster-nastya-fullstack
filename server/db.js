import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

const migrationDir = new URL('./db/migrations/', import.meta.url);
for (const filename of fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort()) {
  const already = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ?').get(filename);
  if (already) continue;
  const sql = fs.readFileSync(new URL(filename, migrationDir), 'utf8');
  db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations(name) VALUES (?)').run(filename);
  })();
}

const seed = db.transaction(() => {
  const settings = db.prepare('SELECT id FROM settings WHERE id = 1').get();
  if (!settings) {
    db.prepare(`INSERT INTO settings (
      id, brand, city, telegram, online_booking_url, hero_mode,
      hero_kicker, hero_title_top, hero_title_bottom, hero_description, about_text, about_note
    ) VALUES (1, ?, ?, ?, ?, 'art', ?, ?, ?, ?, ?, ?)`)
      .run(
        'Aster Nastya',
        'Мариуполь',
        'https://t.me/',
        '',
        'LASHES • BROWS • МАРИУПОЛЬ',
        'Aster',
        'Nastya',
        'Ресницы и брови с fashion-характером — точная форма, чистая работа, выразительный результат без перегруза.',
        'Я не рисую новое лицо. Я усиливаю то, что уже твоё. Геометрия бровей, изгиб ресниц и плотность — под черты, привычки и настроение.',
        'ASTER NASTYA — beauty with attitude'
      );
  }

  if (db.prepare('SELECT COUNT(*) AS c FROM services').get().c === 0) {
    const insert = db.prepare('INSERT INTO services(name,note,price,sort_order) VALUES (?,?,?,?)');
    [
      ['Наращивание ресниц','Классика / 2D','1 600 ₽'],
      ['Объёмное наращивание','3D / 4D','2 000 ₽'],
      ['Ламинирование ресниц','Изгиб + уход','1 500 ₽'],
      ['Архитектура бровей','Форма + окрашивание','1 200 ₽'],
      ['Ламинирование бровей','Укладка + коррекция','1 500 ₽'],
      ['Beauty combo','Лами ресниц + бровей','2 700 ₽']
    ].forEach((item, i) => insert.run(...item, i));
  }

  if (db.prepare('SELECT COUNT(*) AS c FROM stats').get().c === 0) {
    const insert = db.prepare('INSERT INTO stats(value,label,sort_order) VALUES (?,?,?)');
    [['4+','года в beauty'],['700+','процедур'],['90%','возвращаются снова']].forEach((item, i) => insert.run(...item, i));
  }

  if (db.prepare('SELECT COUNT(*) AS c FROM reviews').get().c === 0) {
    const insert = db.prepare('INSERT INTO reviews(name,text,rating,sort_order) VALUES (?,?,5,?)');
    [
      ['Алина','Наконец-то тот самый эффект: заметно, но очень аккуратно. Носка идеальная.'],
      ['Мария','Форму бровей подобрали под лицо, а не по шаблону. Очень нравится результат.'],
      ['София','Красиво, быстро и спокойно. Уже записалась на следующий визит.']
    ].forEach((item, i) => insert.run(...item, i));
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(config.adminEmail);
  if (!user) {
    const hash = bcrypt.hashSync(config.adminPassword, 12);
    db.prepare('INSERT INTO users(email,password_hash,role) VALUES (?,?,?)').run(config.adminEmail, hash, 'admin');
  }
});
seed();

export function mediaUrl(row) {
  return row ? `/uploads/${row.filename}` : null;
}

export function getSiteData({ admin = false } = {}) {
  const settings = db.prepare(`
    SELECT s.*, m.filename AS hero_filename, m.alt_text AS hero_alt
    FROM settings s LEFT JOIN media m ON m.id = s.hero_media_id WHERE s.id = 1
  `).get();
  const activeClause = admin ? '' : 'WHERE is_active = 1';
  const services = db.prepare(`SELECT * FROM services ${activeClause} ORDER BY sort_order, id`).all();
  const stats = db.prepare(`SELECT * FROM stats ${activeClause} ORDER BY sort_order, id`).all();
  const reviews = db.prepare(`SELECT * FROM reviews ${activeClause} ORDER BY sort_order, id`).all();
  const portfolio = db.prepare(`
    SELECT p.*, m.filename, m.alt_text, m.original_name
    FROM portfolio p JOIN media m ON m.id = p.media_id
    ${admin ? '' : 'WHERE p.is_active = 1'}
    ORDER BY p.sort_order, p.id
  `).all().map((row) => ({ ...row, image_url: mediaUrl(row) }));

  return {
    settings: {
      ...settings,
      hero_image_url: settings?.hero_filename ? `/uploads/${settings.hero_filename}` : null
    },
    services,
    stats,
    reviews,
    portfolio
  };
}
