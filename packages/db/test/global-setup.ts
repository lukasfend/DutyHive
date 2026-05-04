/**
 * Global setup for @dutyhive/db integration tests.
 *
 *   1. (Re)create the `dutyhive_test` database from the dutyhive superuser.
 *      Wiping and recreating costs a fraction of a second on local Postgres
 *      and gives every test run a clean slate.
 *   2. Apply all Prisma migrations against the fresh database via
 *      `prisma migrate deploy`. We use the same migrations the dev DB runs,
 *      so RLS policies and grants exactly match production semantics.
 *
 * The `dutyhive_app` and `dutyhive_migrate` roles already exist (created by
 * infra/docker/postgres/init/02-roles.sql when the dev container booted).
 * No need to recreate them — they are server-level objects.
 */
import { execSync } from 'node:child_process';
import { Client } from 'pg';

const SUPERUSER_URL = 'postgresql://dutyhive:devpassword@localhost:5432/postgres';
const TEST_DB_NAME = 'dutyhive_test';

async function dropAndCreateTestDb(): Promise<void> {
  const client = new Client({ connectionString: SUPERUSER_URL });
  await client.connect();
  try {
    // Terminate any lingering connections so DROP DATABASE doesn't block.
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [TEST_DB_NAME],
    );
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    await client.query(`CREATE DATABASE ${TEST_DB_NAME} OWNER dutyhive_migrate`);
    // Connection-level CONNECT grant for the app role.
    await client.query(`GRANT CONNECT ON DATABASE ${TEST_DB_NAME} TO dutyhive_app`);
  } finally {
    await client.end();
  }

  // Schema-level USAGE/CREATE for both roles inside the new DB.
  const dbClient = new Client({
    connectionString: `postgresql://dutyhive:devpassword@localhost:5432/${TEST_DB_NAME}`,
  });
  await dbClient.connect();
  try {
    await dbClient.query(`GRANT USAGE ON SCHEMA public TO dutyhive_app, dutyhive_migrate`);
    await dbClient.query(`GRANT CREATE ON SCHEMA public TO dutyhive_migrate`);
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
         GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dutyhive_app`,
    );
    await dbClient.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
         GRANT USAGE, SELECT ON SEQUENCES TO dutyhive_app`,
    );
  } finally {
    await dbClient.end();
  }
}

function applyMigrations(): void {
  // `migrate deploy` is the production-style apply; no shadow DB needed.
  execSync('pnpm --filter @dutyhive/db exec prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://dutyhive_app:dev_app_password@localhost:5432/${TEST_DB_NAME}?schema=public`,
      MIGRATE_DATABASE_URL: `postgresql://dutyhive_migrate:dev_migrate_password@localhost:5432/${TEST_DB_NAME}?schema=public`,
    },
  });
}

export async function setup(): Promise<void> {
  await dropAndCreateTestDb();
  applyMigrations();
}

export async function teardown(): Promise<void> {
  // Nothing to clean up — dropAndCreateTestDb() takes care of state on the
  // next run. Keeping the test DB around between runs lets the developer
  // psql into it for post-mortem debugging.
}
