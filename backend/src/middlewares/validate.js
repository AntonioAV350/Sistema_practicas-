const { badRequest } = require('../utils/AppError');

// validate({ body, params, query }) con esquemas zod.
// Deja los datos ya parseados en req.body / req.params / req.datosQuery.
function validate(esquemas) {
  return (req, res, next) => {
    for (const parte of ['params', 'query', 'body']) {
      const esquema = esquemas[parte];
      if (!esquema) continue;
      const r = esquema.safeParse(req[parte] ?? {});
      if (!r.success) {
        const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
        return next(badRequest(details[0]?.message || 'Datos inválidos', details));
      }
      if (parte === 'query') req.datosQuery = r.data;
      else req[parte] = r.data;
    }
    return next();
  };
}

module.exports = validate;
