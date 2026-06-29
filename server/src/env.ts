import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const ENV = {
  uri: required('MONGODB_URI'),
  dbName: process.env.MONGODB_DB ?? 'questpic',
  port: Number(process.env.PORT ?? 4000),
  /** Empty string disables the soft auth gate (dev convenience). */
  apiKey: process.env.API_KEY ?? '',
};
