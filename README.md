# Aster Nastya — full-stack site + admin

Полноценная версия сайта мастера по ресницам и бровям: публичный fashion-лендинг, backend, SQLite, защищённая админка, загрузка изображений, портфолио и заявки.

## Стек

- React 19 + Vite
- TanStack Query для server-state и мутаций
- Node.js + Express 5
- SQLite (`better-sqlite3`) с WAL и SQL-миграциями
- HttpOnly session cookie, bcrypt, rate-limit, Helmet, Zod
- Multer для загрузки JPG/PNG/WebP

SQLite здесь выбран осознанно: для сайта одного мастера он проще в эксплуатации, чем отдельный PostgreSQL, и отлично подходит по нагрузке. Для запуска в Docker/VPS нужны persistent volumes для `data/` и `uploads/`.

## Возможности админки

Открой `/admin`.

- обзор и новые заявки;
- смена текста первого экрана;
- загрузка реального фото и установка его в hero одним действием;
- переключение обратно на абстрактную графику;
- CRUD услуг и цен;
- CRUD отзывов;
- CRUD фактов/цифр;
- медиа-библиотека;
- портфолио из загруженных изображений;
- заявки с фильтрами и статусами: новая / связались / подтверждена / завершена / отменена;
- Telegram, город и внешняя ссылка онлайн-записи.

## Локальный запуск

Требуется Node.js 22+.

```bash
npm install
cp .env.example .env
npm run dev
```

Открыть:

- сайт: `http://localhost:5173`
- админка: `http://localhost:5173/admin`
- API: `http://localhost:8787/api/health`

### Dev-доступ по умолчанию

Если `.env` не менялся:

- Email: `admin@aster.local`
- Пароль: `AsterDev123!`

Это только dev-учётка. **Перед публикацией обязательно поменяй `ADMIN_EMAIL` и `ADMIN_PASSWORD`.** При `NODE_ENV=production` сервер не запустится с дефолтным паролем.

## Production без Docker

```bash
npm install
npm run build
NODE_ENV=production npm start
```

В production Express раздаёт `dist/` и API с одного origin. В `.env` укажи:

```env
PORT=8787
APP_ORIGIN=https://your-domain.com
DATABASE_PATH=./data/aster.db
UPLOAD_DIR=./uploads
ADMIN_EMAIL=your-admin@example.com
ADMIN_PASSWORD=very-long-unique-password
SESSION_DAYS=14
MAX_UPLOAD_MB=8
```

Папки `data/` и `uploads/` должны быть постоянными и доступными на запись.

## Docker

1. Создай `.env` на основе `.env.example` и обязательно замени пароль.
2. Запусти:

```bash
docker compose up -d --build
```

Сайт/API будут на `http://localhost:8787`. В compose уже созданы persistent volumes для базы и изображений.

## Безопасность

- пароль хранится как bcrypt hash;
- сессия — случайный opaque token; в БД лежит только SHA-256 hash токена;
- cookie: `HttpOnly`, `SameSite=Lax`, `Secure` в production;
- state-changing запросы проверяют Origin;
- rate-limit на login и публичные заявки;
- JSON body ограничен по размеру;
- upload принимает только JPG/PNG/WebP, ограничен по размеру и дополнительно проверяет magic bytes файла;
- входные данные валидируются Zod;
- SQL выполняется через prepared statements;
- Helmet выставляет security headers.

Для публичного проекта также включи HTTPS на reverse proxy (например, Caddy/Nginx).

## Хранение фото

Файлы лежат в `uploads/`, метаданные — в SQLite. Удалить файл, который используется в hero или портфолио, админка/API не даст. Это защищает сайт от случайно сломанных изображений.

Если позже нужен serverless/Vercel, локальное файловое хранилище нужно заменить на S3/R2/Cloudinary, а SQLite — на Turso/Neon/PostgreSQL.

## Проверка

```bash
npm test
npm run build
# или всё сразу
npm run check
```

## Структура

```text
index.html
src/
  main.jsx
  api.js
  components/
    PublicSite.jsx
    AdminApp.jsx
  styles.css
server/
  index.js
  config.js
  db.js
  security.js
  validation.js
  routes/
    public.js
    auth.js
    admin.js
  db/migrations/
    001_init.sql
data/       # SQLite database, не коммитится
uploads/    # реальные фото, не коммитятся
```

Created By Deerflow подпись сохранена в публичном интерфейсе согласно исходному frontend skill.
