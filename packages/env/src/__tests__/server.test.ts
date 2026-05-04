/**
 * Env-Validation-Test.
 *
 * Das Modul parst `process.env` direkt am Module-Load-Zeit und wirft bei
 * invalid Env. Wir testen beides: gültige Env gibt validiertes Objekt
 * zurück; invalide Env crasht den Import.
 *
 * vi.resetModules() zwingt die nächste Import-Auflösung dazu, das Modul neu
 * zu laden — sonst würde der Top-Level-Zod-Parse nur einmal pro Test-Datei
 * ausgeführt.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('@dutyhive/env/server', () => {
  it('parses a valid env into a typed object', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    process.env.BETTER_AUTH_SECRET = 'a-long-enough-secret-of-at-least-32-chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
    process.env.AUDIT_HASH_SALT = 'sixteen-char-salt';

    const mod = await import('../server');
    expect(mod.env.DATABASE_URL).toBe('postgresql://user:pass@host:5432/db');
    expect(mod.env.SMTP_HOST).toBe('localhost');
    expect(mod.env.SMTP_PORT).toBe(1025);
    expect(mod.env.LOG_LEVEL).toBe('info');
  });

  it('throws when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;
    process.env.BETTER_AUTH_SECRET = 'a-long-enough-secret-of-at-least-32-chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';

    await expect(import('../server')).rejects.toThrow();
  });
});
