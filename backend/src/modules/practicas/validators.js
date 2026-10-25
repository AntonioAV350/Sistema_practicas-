const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (AAAA-MM-DD)');
const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

const tareaSchema = z.object({
  titulo: z.string({ error: 'El título es obligatorio' }).trim().min(3, 'El título es muy corto').max(200),
  descripcion: z.string().trim().max(3000).optional().nullable().transform((v) => (v ? v : null)),
  fechaLimite: fechaISO.refine((f) => f >= hoy(), 'La fecha límite no puede ser anterior a hoy'),
});

const revisionTareaSchema = z.object({
  decision: z.enum(['COMPLETAR', 'DEVOLVER'], { error: 'Indica si apruebas o devuelves la tarea' }),
  comentario: z.string().trim().max(1000).optional().nullable(),
});

const cierreSchema = z.object({
  decision: z.enum(['CERRAR', 'REABRIR'], { error: 'Indica si cierras o reabres la práctica' }),
  observaciones: z.string().trim().max(2000).optional().nullable().transform((v) => (v ? v : null)),
});

const listarQuery = z.object({
  estado: z.enum(['ACTIVA', 'EN_REVISION_CIERRE', 'CERRADA', 'BAJA']).optional(),
  q: z.string().trim().max(100).optional(),
  sinBitacora: z.coerce.number().int().min(1).max(60).optional(),
});

const ofertadorQuery = z.object({
  estado: z.enum(['ACTIVA', 'EN_REVISION_CIERRE', 'CERRADA', 'BAJA']).optional(),
});

module.exports = { idParam, tareaSchema, revisionTareaSchema, cierreSchema, listarQuery, ofertadorQuery, fechaISO, hoy };
