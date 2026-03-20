import express from 'express';
import cors from 'cors';
import config from './config.js';
import './src/jobs/scheduler.js'; // registers all cron jobs on startup

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Anti-Pollution Routes API running' });
});

app.listen(config.port, () => {
  console.log(`[server] Listening on port ${config.port}`);
});