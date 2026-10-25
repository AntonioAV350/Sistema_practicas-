const { z } = require('zod');

const texto = (max, msg) => z.string({ error: msg }).trim().min(1, msg).max(max);
const opcional = (max) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const matricula = z
  .string({ error: 'La matrícula es obligatoria' })
  .trim()
  .regex(/^[A-Za-z0-9-]{4,30}$/, 'La matrícula solo lleva letras, números o guiones (4 a 30 caracteres)');
const grupo = z.string({ error: 'El grupo es obligatorio' }).trim().min(1, 'El grupo es obligatorio').max(10);
const periodo = z.coerce.number({ error: 'Indica el periodo que cursas' }).int().min(1).max(12);

const registroSchema = z.object({
  nombre: texto(100, 'El nombre es obligatorio'),
  apellidoPaterno: texto(100, 'El apellido paterno es obligatorio'),
  apellidoMaterno: opcional(100),
  telefono: opcional(20),
  email: z.string({ error: 'El correo es obligatorio' }).trim().toLowerCase().pipe(z.email('Correo inválido')),
  password: z
    .string({ error: 'La contraseña es obligatoria' })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72),
  matricula,
  idCarrera: z.coerce.number({ error: 'Elige tu carrera' }).int().positive('Elige tu carrera'),
  grupo,
  numeroPeriodo: periodo,
});

const misDatosSchema = z.object({
  nombre: texto(100, 'El nombre es obligatorio').optional(),
  apellidoPaterno: texto(100, 'El apellido paterno es obligatorio').optional(),
  apellidoMaterno: opcional(100),
  telefono: opcional(20),
  matricula: matricula.optional(),
  idCarrera: z.coerce.number().int().positive().optional(),
  grupo: grupo.optional(),
  numeroPeriodo: periodo.optional(),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

const listarQuery = z.object({
  q: z.string().trim().max(100).optional(),
  idCarrera: z.coerce.number().int().positive().optional(),
});

module.exports = { registroSchema, misDatosSchema, idParam, listarQuery };
