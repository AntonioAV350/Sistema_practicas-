const expiracion = require('./expiracionAceptaciones');
const bitacora = require('./alertasBitacora');

function iniciar() {
  expiracion.iniciar();
  bitacora.iniciar();
  console.log('[jobs] programados: expiración de aceptaciones (5 min) y alertas de bitácora (20:00)');
}

module.exports = { iniciar };
