import express from 'express';
import cors from 'cors';
import config from './config.js';
import './src/jobs/scheduler.js'; // registers all cron jobs on startup
import { connectRedis } from './src/db/redis.js';

const app = express();

app.use(cors());
app.use(express.json());

import { router as scoreRoutes } from './src/routes/score.js';

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Anti-Pollution Routes API running' });
});

app.use('/api', scoreRoutes);

app.listen(config.port, async () => {
  await connectRedis();
  console.log(`[server] Listening on port ${config.port}`);
});