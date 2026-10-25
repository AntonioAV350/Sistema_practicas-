// Las columnas vienen en snake_case de Postgres; la API responde en camelCase.
const aCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function camel(valor) {
  if (Array.isArray(valor)) return valor.map(camel);
  if (valor && typeof valor === 'object' && !(valor instanceof Date) && !Buffer.isBuffer(valor)) {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [aCamel(k), camel(v)]));
  }
  return valor;
}

module.exports = { camel };
