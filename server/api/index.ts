/**
 * Vercel serverless entry. Vercel runs this on demand and routes every request
 * to it (see vercel.json). Exporting the Express app as the default handler lets
 * the platform invoke it directly — the Mongo connection is cached across warm
 * invocations by the module-scoped promise in mongo.ts.
 *
 * This is the "$0 hosting" path: it only runs while serving a request.
 */

import { buildApp } from '../src/app';

export default buildApp();
