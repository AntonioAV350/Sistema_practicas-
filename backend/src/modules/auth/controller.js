const service = require('./service');
const { loginSchema } = require('./validators');

function handleAuthError(err, res, next) {
  if (err instanceof service.AuthError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  return next(err);
}

// POST /api/auth/login
async function login(req, res, next) {
  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Correo y contraseña son obligatorios',
      details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  try {
    const result = await service.login(parsed.data.email, parsed.data.password);
    return res.status(200).json(result);
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

// POST /api/auth/refresh (requiere token vigente)
async function refresh(req, res, next) {
  try {
    const result = await service.refresh(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

// POST /api/auth/registro (body ya validado por registroSchema)
async function registro(req, res) {
  res.status(201).json(await service.registro(req.body));
}

// GET /api/auth/me
async function me(req, res, next) {
  try {
    return res.json(await service.me(req.user.id));
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

// PATCH /api/auth/password
async function cambiarPassword(req, res, next) {
  try {
    await service.cambiarPassword(req.user.id, req.body.actual, req.body.nueva);
    return res.status(204).end();
  } catch (err) {
    return handleAuthError(err, res, next);
  }
}

module.exports = { login, refresh, registro, me, cambiarPassword };
