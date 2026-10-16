const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });

const listarQuery = z.object({
  soloNoLeidas: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  limite: z.coerce.number().int().min(1).max(200).optional(),
});

module.exports = { idParam, listarQuery };
