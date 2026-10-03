const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function main() {
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  const client = new Client(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {});
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        nombre      TEXT PRIMARY KEY,
        checksum    TEXT        NOT NULL,
        aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const { rows } = await client.query('SELECT nombre, checksum FROM public.schema_migrations');
    const aplicadas = new Map(rows.map((r) => [r.nombre, r.checksum]));
    let nuevas = 0;
    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      if (aplicadas.has(file)) {
        if (aplicadas.get(file) !== checksum) {
          throw new Error(`La migración ${file} ya estaba aplicada pero su contenido cambió. Crea una nueva.`);
        }
        console.log(`  = ${file} (ya aplicada)`);
        continue;
      }
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO public.schema_migrations (nombre, checksum) VALUES ($1, $2)', [file, checksum]);
        await client.query('COMMIT');
        console.log(`  + ${file}`);
        nuevas++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Falló ${file}: ${err.message}`);
      }
    }
    console.log(nuevas === 0 ? 'Base de datos al día.' : `Listo: ${nuevas} migración(es) aplicada(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});