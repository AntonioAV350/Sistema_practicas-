require('dotenv').config({ quiet: true });

const app = require('./app');
const jobs = require('./jobs');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.JOBS_DISABLED !== 'true') jobs.iniciar();
});
