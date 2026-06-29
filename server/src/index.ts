/**
 * Local development server. In production the same app runs as a Vercel
 * serverless function (see ../api/index.ts) — no long-lived host required.
 */

import { buildApp } from './app';
import { ENV } from './env';
import { closeMongo, getDb } from './mongo';

async function start() {
  // Connect eagerly so a bad URI fails on boot, not on the first request.
  await getDb();
  const app = buildApp();
  app.listen(ENV.port, () => {
    console.log(`✦ QuestPic API listening on http://localhost:${ENV.port}`);
    console.log(`  health → http://localhost:${ENV.port}/api/health`);
  });
}

start().catch(async (err) => {
  console.error('Failed to start QuestPic server:', err);
  await closeMongo();
  process.exit(1);
});
