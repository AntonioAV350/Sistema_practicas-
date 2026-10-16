// Mensaje legible a partir de un error de axios
export function mensajeError(e, porDefecto = 'Ocurrió un error, intenta de nuevo.') {
  if (!e?.response) return 'No se pudo conectar con el servidor.';
  return e.response.data?.message || porDefecto;
}
