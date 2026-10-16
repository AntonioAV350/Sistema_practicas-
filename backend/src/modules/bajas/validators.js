const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const texto = (msg) => z.string().trim().max(3000).optional().nullable().transform((v) => (v ? v : null));

const solicitudSchema = z.object({
  idPractica: z.coerce.number({ error: 'Indica la práctica' }).int().positive(),
  idIncidencia: z.coerce.number().int().positive().optional().nullable(),
  motivo: z.string({ error: 'Explica el motivo' }).trim().min(10, 'Explica el motivo (mínimo 10 caracteres)').max(3000),
});

const atenderSchema = z
  .object({
    decision: z.enum(['RESUELTA_SIN_BAJA', 'ESCALADA'], { error: 'Indica si se resolvió o se escala' }),
    nota: texto(),
  })
  .refine((d) => d.nota, { message: 'Escribe una nota de lo que se habló con el alumno', path: ['nota'] });

const decidirSchema = z.object({
  decision: z.enum(['APROBADA', 'RECHAZADA'], { error: 'Indica si apruebas o rechazas la baja' }),
  comentario: texto(),
});

const listarQuery = z.object({
  estado: z.enum(['EN_REVISION_ACADEMICA', 'RESUELTA_SIN_BAJA', 'ESCALADA', 'APROBADA', 'RECHAZADA']).optional(),
  idPractica: z.coerce.number().int().positive().optional(),
});

module.exports = { idParam, solicitudSchema, atenderSchema, decidirSchema, listarQuery };
