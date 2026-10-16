import { ETIQUETA_ESTADO, ETIQUETA_ROL } from 'shared/constants';

const ZONA = 'America/Mexico_City';

// Las columnas DATE llegan como 'YYYY-MM-DD': se muestran sin moverlas de día
export function fecha(valor) {
  if (!valor) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return new Date(valor).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: ZONA,
  });
}

export function fechaHora(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: ZONA,
  });
}

export function hoyISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
}

// "3 h 20 min" o "expirada"
export function tiempoRestante(hasta) {
  const ms = new Date(hasta) - Date.now();
  if (ms <= 0) return 'expirada';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export const estado = (clave) => ETIQUETA_ESTADO[clave] ?? clave;
export const rol = (clave) => ETIQUETA_ROL[clave] ?? clave;

export function nombreCompleto(p) {
  if (!p) return '';
  return [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ');
}
