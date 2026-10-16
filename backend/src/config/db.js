const { Pool, types } = require('pg');

// NUMERIC (horas de bitácora) y BIGINT (ids, conteos) como número en JS.
types.setTypeParser(types.builtins.NUMERIC, (v) => (v === null ? null : Number(v)));
types.setTypeParser(types.builtins.INT8, (v) => (v === null ? null : Number(v)));
// DATE como 'YYYY-MM-DD' para que no se corra de día por la zona horaria.
types.setTypeParser(types.builtins.DATE, (v) => v);

const pool = new Pool();

// Ejecuta fn(client) dentro de una transacción. Si fn lanza, se hace ROLLBACK.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = pool;
module.exports.withTransaction = withTransaction;
