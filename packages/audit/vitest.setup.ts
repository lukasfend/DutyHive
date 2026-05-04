/**
 * Test setup — populate the env vars that @dutyhive/env asserts at module load.
 * These must be set BEFORE any import that pulls in @dutyhive/env/server.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??=
  'postgresql://dutyhive_app:dev_app_password@localhost:5432/dutyhive_test?schema=public';
process.env.MIGRATE_DATABASE_URL ??=
  'postgresql://dutyhive_migrate:dev_migrate_password@localhost:5432/dutyhive_test?schema=public';
process.env.BETTER_AUTH_SECRET ??= 'test-secret-must-be-at-least-thirty-two-characters';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.AUDIT_HASH_SALT ??= 'test-fixed-salt-for-deterministic-hashing';
