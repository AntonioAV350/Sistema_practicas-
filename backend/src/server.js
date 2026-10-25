require('dotenv').config({ quiet: true });

const app = require('./app');
const jobs = require('./jobs');

const PORT = process.env.PORT || 3000;

// En Express 5 este callback también se llama si el puerto no se pudo abrir
app.listen(PORT, (err) => {
  if (err) {
    console.error(
      err.code === 'EADDRINUSE'
        ? `El puerto ${PORT} ya está en uso (¿hay otro backend corriendo?). Ciérralo o cambia PORT en backend/.env`
        : `No se pudo iniciar el servidor: ${err.message}`,
    );
    process.exit(1);
  }
  console.log(`Server running on port ${PORT}`);
  if (process.env.JOBS_DISABLED !== 'true') jobs.iniciar();
});
