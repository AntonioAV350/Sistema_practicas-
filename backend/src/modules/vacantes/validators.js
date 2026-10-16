const { z } = require('zod');

const opcional = (max) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
const fechaCierre = z
  .union([z.string().trim(), z.null()])
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Fecha de cierre inválida');

const vacanteSchema = z.object({
  titulo: z.string({ error: 'El título es obligatorio' }).trim().min(3, 'El título es muy corto').max(200),
  descripcion: z.string({ error: 'La descripción es obligatoria' }).trim().min(10, 'Describe un poco más la vacante').max(5000),
  requisitos: opcional(3000),
  idTipoPractica: z.coerce.number({ error: 'Elige el tipo de práctica' }).int().positive(),
  modalidadTrabajo: z.enum(['PRESENCIAL', 'REMOTO', 'MIXTO']).optional().nullable().transform((v) => v ?? null),
  cupoTotal: z.coerce.number({ error: 'Indica el cupo' }).int().min(1, 'El cupo mínimo es 1').max(100),
  cierraEn: fechaCierre,
});

const vacanteParcialSchema = vacanteSchema.partial();

const estadoSchema = z.object({
  estado: z.enum(['ABIERTA', 'CERRADA', 'CANCELADA'], { error: 'Estado inválido' }),
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

const abiertasQuery = z.object({
  q: z.string().trim().max(100).optional(),
  idTipoPractica: z.coerce.number().int().positive().optional(),
  modalidad: z.enum(['PRESENCIAL', 'REMOTO', 'MIXTO']).optional(),
});

const todasQuery = z.object({
  estado: z.enum(['ABIERTA', 'CERRADA', 'CANCELADA']).optional(),
  q: z.string().trim().max(100).optional(),
});

module.exports = { vacanteSchema, vacanteParcialSchema, estadoSchema, idParam, abiertasQuery, todasQuery };
