const { z } = require('zod');

const loginSchema = z.object({
  email: z.string({ error: 'El correo es obligatorio' })
    .trim()
    .min(1, 'El correo es obligatorio')
    .pipe(z.email('Correo inválido')),
  password: z.string({ error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});

const cambioPasswordSchema = z.object({
  actual: z.string({ error: 'Escribe tu contraseña actual' }).min(1, 'Escribe tu contraseña actual'),
  nueva: z
    .string({ error: 'Escribe la nueva contraseña' })
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(72),
});

module.exports = { loginSchema, cambioPasswordSchema };
