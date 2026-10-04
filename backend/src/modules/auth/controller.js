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

module.exports = { login, refresh };
