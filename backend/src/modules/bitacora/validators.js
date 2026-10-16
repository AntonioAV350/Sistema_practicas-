const { z } = require('zod');
const { fechaISO, hoy } = require('../practicas/validators');

const idParam = z.object({ id: z.coerce.number().int().positive() });

const registroSchema = z.object({
  fecha: fechaISO.refine((f) => f <= hoy(), 'No puedes registrar días futuros'),
  horas: z.coerce
    .number({ error: 'Indica las horas trabajadas' })
    .positive('Las horas deben ser mayores a 0')
    .max(24, 'Máximo 24 horas')
    .refine((h) => Number.isInteger(h * 4), 'Usa intervalos de 15 minutos (0.25 h)'),
  descripcion: z.string({ error: 'Describe lo que hiciste' }).trim().min(10, 'Describe con más detalle (mínimo 10 caracteres)').max(3000),
  idTarea: z.coerce.number().int().positive().optional().nullable(),
});

module.exports = { idParam, registroSchema };
