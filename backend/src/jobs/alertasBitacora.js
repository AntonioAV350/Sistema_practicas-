const cron = require('node-cron');
const pool = require('../config/db');

// Diario a las 20:00: 1 día sin bitácora -> recordatorio al alumno;
// 3 días -> alerta al admin académico (lo hace practicas.sp_revisar_bitacoras).
async function revisarBitacoras() {
  await pool.query('SELECT practicas.sp_revisar_bitacoras()');
  console.log('[jobs] revisión de bitácoras ejecutada');
}

function iniciar() {
  cron.schedule('0 20 * * *', () => revisarBitacoras().catch((e) => console.error('[jobs] bitácora:', e.message)), {
    timezone: 'America/Mexico_City',
  });
}

module.exports = { iniciar, revisarBitacoras };
