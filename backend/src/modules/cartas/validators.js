const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });

const revisionSchema = z.object({
  decision: z.enum(['APROBADA', 'RECHAZADA'], { error: 'Indica si apruebas o rechazas la carta' }),
  comentarios: z.string().trim().max(2000).optional().nullable().transform((v) => (v ? v : null)),
});

const listarQuery = z.object({
  estado: z.enum(['GENERADA', 'ESCANEO_SUBIDO', 'APROBADA', 'RECHAZADA']).optional(),
  q: z.string().trim().max(100).optional(),
});

module.exports = { idParam, revisionSchema, listarQuery };
