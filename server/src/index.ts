/**
 * Local development server. In production the same app runs as a Vercel
 * serverless function (see ../api/index.ts) — no long-lived host required.
 */

import { buildApp } from './app';
import { ENV } from './env';
import { closeMongo, getDb } from './mongo';

function start() {
  const app = buildApp();
  app.listen(ENV.port, () => {
    console.log(`✦ QuestPic API listening on http://localhost:${ENV.port}`);
    console.log(`  health → http://localhost:${ENV.port}/api/health`);
  });

  // Warm the Mongo connection in the background, but DON'T crash if Atlas is
  // briefly unreachable — the server stays up and each request retries via
  // getDb(). The most common cause of a failure here is the Atlas Network Access
  // allowlist (add 0.0.0.0/0), or a rotated password not yet in server/.env.
  getDb()
    .then((db) => console.log(`  ✓ connected to MongoDB Atlas (${db.databaseName})`))
    .catch((err) =>
      console.error(
        `  ✗ MongoDB not reachable yet: ${err?.message ?? err}\n` +
          `    → Check Atlas → Network Access (allow 0.0.0.0/0) and server/.env password.`,
      ),
    );
}

start();
void closeMongo; // kept for graceful-shutdown wiring if needed later
