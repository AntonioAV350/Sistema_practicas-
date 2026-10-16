const cron = require('node-cron');
const pool = require('../config/db');

// Cada 5 minutos: las aceptaciones PENDIENTE con más de 48 h pasan a EXPIRADA
// y se avisa al alumno (lo hace practicas.sp_expirar_aceptaciones).
async function expirarAceptaciones() {
  const { rows } = await pool.query('SELECT practicas.sp_expirar_aceptaciones() AS expiradas');
  if (rows[0].expiradas > 0) console.log(`[jobs] ${rows[0].expiradas} aceptación(es) expirada(s)`);
}

function iniciar() {
  cron.schedule('*/5 * * * *', () => expirarAceptaciones().catch((e) => console.error('[jobs] expiración:', e.message)), {
    timezone: 'America/Mexico_City',
  });
  // Al arrancar también, por si el servidor estuvo apagado
  expirarAceptaciones().catch((e) => console.error('[jobs] expiración:', e.message));
}

module.exports = { iniciar, expirarAceptaciones };
