const { z } = require('zod');
const { fechaISO, hoy } = require('../practicas/validators');

const idParam = z.object({ id: z.coerce.number().int().positive() });

const incidenciaSchema = z
  .object({
    idPractica: z.coerce.number({ error: 'Indica la práctica' }).int().positive(),
    idCategoria: z.coerce.number().int().positive().optional().nullable(),
    categoriaLibre: z.string().trim().max(150).optional().nullable().transform((v) => (v ? v : null)),
    descripcion: z.string({ error: 'Describe lo que pasó' }).trim().min(10, 'Describe con más detalle (mínimo 10 caracteres)').max(3000),
    fechaHecho: fechaISO.refine((f) => f <= hoy(), 'La fecha no puede ser futura'),
  })
  .refine((d) => d.idCategoria || d.categoriaLibre, {
    message: 'Elige una categoría o escribe una',
    path: ['idCategoria'],
  });

const resolverSchema = z.object({
  resolucion: z.string({ error: 'Describe cómo se resolvió' }).trim().min(5, 'Describe cómo se resolvió').max(3000),
});

const listarQuery = z.object({
  estado: z.enum(['ABIERTA', 'RESUELTA']).optional(),
  idPractica: z.coerce.number().int().positive().optional(),
});

module.exports = { idParam, incidenciaSchema, resolverSchema, listarQuery };
