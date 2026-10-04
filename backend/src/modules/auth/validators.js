const { z } = require('zod');

const loginSchema = z.object({
  email: z.string({ error: 'El correo es obligatorio' })
    .trim()
    .min(1, 'El correo es obligatorio')
    .pipe(z.email('Correo inválido')),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});

module.exports = { loginSchema };
