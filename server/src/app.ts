/**
 * Builds the Express app (without listening). This single factory is reused by
 * both the local dev server (`index.ts`) and the Vercel serverless entry
 * (`../api/index.ts`), so the API behaves identically in both environments.
 */

import cors from 'cors';
import express from 'express';
import { router } from './routes';

export function buildApp() {
  const app = express();

  app.use(cors());
  // Base64 photo payloads ride inline on item docs, so allow a generous body.
  // (Mongo still caps a single document at 16MB — keep image quality modest.)
  app.use(express.json({ limit: '25mb' }));

  app.get('/', (_req, res) => {
    res.json({
      service: 'questpic-server',
      routes: ['/api/health', '/api/auth/register', '/api/auth/login', '/api/pull', '/api/push'],
    });
  });

  app.use('/api', router);
  return app;
}
