const { z } = require('zod');

// SIGEA-27: correo válido, campos requeridos y contraseña mínima
const texto = (max, msg) => z.string({ error: msg }).trim().min(1, msg).max(max);
const opcional = (max) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const email = z.string({ error: 'El correo es obligatorio' }).trim().toLowerCase().pipe(z.email('Correo inválido'));
const password = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72);

const datosPersona = {
  nombre: texto(100, 'El nombre es obligatorio'),
  apellidoPaterno: texto(100, 'El apellido paterno es obligatorio'),
  apellidoMaterno: opcional(100),
  telefono: opcional(20),
  email,
};

const subrol = z.enum(['ADMIN_ACADEMICO', 'ADMIN_DOCUMENTAL'], { error: 'Elige el tipo de administrador' });
const tipoOfertador = z.enum(['EXTERNO', 'INTERNO'], { error: 'Elige si el ofertador es externo o interno' });

const crearAdminSchema = z.object({ ...datosPersona, password, subrol });

const crearOfertadorSchema = z
  .object({
    ...datosPersona,
    password,
    tipo: tipoOfertador,
    idEmpresa: z.coerce.number().int().positive().optional().nullable(),
    puesto: opcional(100),
  })
  .refine((d) => d.tipo === 'INTERNO' || d.idEmpresa, {
    message: 'Un ofertador externo necesita una empresa',
    path: ['idEmpresa'],
  });

const actualizarSchema = z.object({
  nombre: datosPersona.nombre.optional(),
  apellidoPaterno: datosPersona.apellidoPaterno.optional(),
  apellidoMaterno: opcional(100),
  telefono: opcional(20),
  email: email.optional(),
  subrol: subrol.optional(),
  tipo: tipoOfertador.optional(),
  idEmpresa: z.coerce.number().int().positive().optional().nullable(),
  puesto: opcional(100),
});

const activoSchema = z.object({ activo: z.boolean({ error: 'Indica si la cuenta queda activa' }) });
const passwordSchema = z.object({ password });

const empresaSchema = z.object({
  nombre: texto(200, 'El nombre de la empresa es obligatorio'),
  descripcion: opcional(2000),
  direccion: opcional(255),
  telefono: opcional(30),
  correo: z.string().trim().max(150).optional().nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Correo inválido'),
  contactoNombre: opcional(150),
  contactoPuesto: opcional(100),
  activa: z.boolean().optional(),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

const listarQuery = z.object({
  rol: z.enum(['ESTUDIANTE', 'OFERTADOR', 'ADMIN', 'SUPERADMIN']).optional(),
  q: z.string().trim().max(100).optional(),
});

module.exports = {
  crearAdminSchema, crearOfertadorSchema, actualizarSchema, activoSchema, passwordSchema,
  empresaSchema, empresaParcialSchema: empresaSchema.partial(), idParam, listarQuery,
};
