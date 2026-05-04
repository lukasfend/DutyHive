/**
 * RLS-Integration-Test: cross-Org-Isolation und WITH-CHECK-Reject.
 *
 * Setup-Phase nutzt die `dutyhive_migrate`-Rolle (BYPASSRLS=true), um zwei
 * Orgs + zwei Audit-Entries anzulegen. Test-Body verbindet sich als
 * `dutyhive_app` und prüft:
 *
 *   1. Mit `set_config('app.current_organization_id', 'A', true)` sieht der
 *      App-Role nur Org-A's Audit-Entries — Org B ist unsichtbar.
 *   2. Ein Cross-Tenant-Insert (`organizationId = B` während Context = A)
 *      schlägt mit einer WITH-CHECK-Violation fehl.
 *   3. Der App-Role hat KEIN UPDATE/DELETE-Privileg auf audit_entry —
 *      Versuch wirft Permission-Denied (R-0004).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

const APP_URL = process.env.DATABASE_URL!;
const MIGRATE_URL = process.env.MIGRATE_DATABASE_URL!;

const migrate = new PrismaClient({ datasources: { db: { url: MIGRATE_URL } } });
const app = new PrismaClient({ datasources: { db: { url: APP_URL } } });

const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';
const USER_ALICE = '00000000-0000-0000-0000-0000000000a1';

beforeAll(async () => {
  // Migrate role inserts a seed user, two orgs, and one audit entry per org.
  await migrate.user.create({
    data: {
      id: USER_ALICE,
      name: 'Alice',
      email: 'alice@example.com',
      emailVerified: true,
    },
  });
  await migrate.organization.createMany({
    data: [
      { id: ORG_A, name: 'Org A', slug: 'org-a', createdAt: new Date() },
      { id: ORG_B, name: 'Org B', slug: 'org-b', createdAt: new Date() },
    ],
  });
});

beforeEach(async () => {
  // Reset audit entries between tests so each test starts from a known state.
  await migrate.$executeRaw`TRUNCATE TABLE audit_entry`;
  await migrate.auditEntry.createMany({
    data: [
      { action: 'test.org-a-event', organizationId: ORG_A },
      { action: 'test.org-b-event', organizationId: ORG_B },
    ],
  });
});

afterAll(async () => {
  await app.$disconnect();
  await migrate.$disconnect();
});

describe('RLS — audit_entry tenant isolation', () => {
  it('app role with set_config(org=A) sees only Org A entries', async () => {
    const rows = await app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ORG_A}, true)`;
      return tx.auditEntry.findMany();
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.organizationId).toBe(ORG_A);
    expect(rows[0]?.action).toBe('test.org-a-event');
  });

  it('app role without auth context sees zero entries', async () => {
    // Outside any transaction, current_setting() returns empty string, which
    // does not match any organization id — RLS returns zero rows.
    const rows = await app.auditEntry.findMany();
    expect(rows).toHaveLength(0);
  });

  it('app role cannot insert an audit row for a different org (WITH CHECK)', async () => {
    await expect(
      app.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_user_id', '', true)`;
        await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ORG_A}, true)`;
        await tx.auditEntry.create({
          data: { action: 'test.spoof', organizationId: ORG_B },
        });
      }),
    ).rejects.toThrow(/row.level security|policy/i);
  });

  it('app role can insert an audit row for the current org', async () => {
    await app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', '', true)`;
      await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${ORG_A}, true)`;
      const row = await tx.auditEntry.create({
        data: { action: 'test.legitimate', organizationId: ORG_A },
      });
      expect(row.id).toBeDefined();
    });
  });

  it('app role can insert a global (org=null) audit row when actor matches', async () => {
    // Real-world callsite: Better Auth's `user.create.after` hook logs an
    // `auth.signup` audit row with `organizationId = null` and the just-
    // -created user's id as `actorUserId`. The SELECT policy's actor-self
    // branch lets the RETURNING clause read the row back.
    await app.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${USER_ALICE}, true)`;
      await tx.$executeRaw`SELECT set_config('app.current_organization_id', '', true)`;
      const row = await tx.auditEntry.create({
        data: { action: 'auth.signup', organizationId: null, actorUserId: USER_ALICE },
      });
      expect(row.id).toBeDefined();
      expect(row.organizationId).toBeNull();
      expect(row.actorUserId).toBe(USER_ALICE);
    });
  });

  it('app role cannot UPDATE an audit row (R-0004)', async () => {
    await expect(
      app.$executeRaw`UPDATE audit_entry SET action = 'tampered' WHERE id IS NOT NULL`,
    ).rejects.toThrow(/permission denied/i);
  });

  it('app role cannot DELETE an audit row (R-0004)', async () => {
    await expect(app.$executeRaw`DELETE FROM audit_entry`).rejects.toThrow(/permission denied/i);
  });
});
