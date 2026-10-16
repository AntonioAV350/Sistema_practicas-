const { z } = require('zod');

const opcional = (max) =>
  z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));

const miPerfilSchema = z.object({
  telefono: opcional(20),
  puesto: opcional(100),
});

module.exports = { miPerfilSchema };
