export function notFound(req, res) {
  res.status(404).json({ error: 'Не найдено' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Файл слишком большой' });
  if (err?.message === 'UNSUPPORTED_IMAGE') return res.status(415).json({ error: 'Разрешены JPG, PNG и WebP' });
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
