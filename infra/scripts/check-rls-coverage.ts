/**
 * CI-Gate: every tenant-scoped table must have at least one RLS policy.
 *
 * The script connects to the dev DB via MIGRATE_DATABASE_URL (it needs
 * BYPASSRLS to read pg_policies and information_schema reliably) and
 * verifies coverage against an explicit allowlist:
 *
 *   TENANT_SCOPED_TABLES — must have an RLS policy referencing
 *                          `organizationId` (or be a Better Auth table that
 *                          is intentionally exempt, listed in
 *                          BETTER_AUTH_EXEMPT).
 *
 *   USER_SCOPED_TABLES   — must have an RLS policy referencing `userId`.
 *
 *   PUBLIC_TABLES        — explicitly no RLS expected.
 *
 * Why an explicit allowlist over auto-detection? A typed allowlist forces
 * a developer to file a quality-document review when adding a tenant
 * model (R-0002 mitigation). Auto-detection would silently approve any
 * new column named `organizationId` without a policy review.
 *
 * Run:  pnpm check:rls
 * CI exit code: 0 = pass, 1 = missing coverage.
 */
import { Client } from 'pg';

const TENANT_SCOPED_TABLES: readonly string[] = ['audit_entry'];

const USER_SCOPED_TABLES: readonly string[] = ['legal_consent'];

const PUBLIC_TABLES: readonly string[] = ['email_subscriber'];

// Better Auth's own tables. RLS deferred — Better Auth's organization plugin
// enforces tenant access via its permission system (see
// docs/architecture/rls-strategy.md, "Phase 2 RLS scope").
const BETTER_AUTH_EXEMPT: readonly string[] = [
  'user',
  'session',
  'account',
  'verification',
  'twoFactor',
  'organization',
  'member',
  'invitation',
];

const PRISMA_INTERNAL: readonly string[] = ['_prisma_migrations'];

const url = process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('❌ MIGRATE_DATABASE_URL (or DATABASE_URL) must be set.');
  process.exit(2);
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: url });
  await client.connect();
  const issues: string[] = [];

  try {
    const allTablesRes = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const allTables = allTablesRes.rows.map((r) => r.table_name);

    const policiesRes = await client.query<{
      tablename: string;
      polqual: string | null;
      polwithcheck: string | null;
    }>(
      `SELECT c.relname AS tablename,
              pg_get_expr(p.polqual, p.polrelid) AS polqual,
              pg_get_expr(p.polwithcheck, p.polrelid) AS polwithcheck
       FROM pg_policy p
       JOIN pg_class c ON c.oid = p.polrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'`,
    );
    const policiesByTable = new Map<string, { qual: string | null; check: string | null }[]>();
    for (const row of policiesRes.rows) {
      const list = policiesByTable.get(row.tablename) ?? [];
      list.push({ qual: row.polqual, check: row.polwithcheck });
      policiesByTable.set(row.tablename, list);
    }

    // 1. Every TENANT_SCOPED_TABLES entry must have a policy mentioning
    //    current_organization_id.
    for (const t of TENANT_SCOPED_TABLES) {
      if (!allTables.includes(t)) {
        issues.push(`Tenant-scoped table "${t}" listed in coverage allowlist but missing from DB.`);
        continue;
      }
      const policies = policiesByTable.get(t);
      if (!policies || policies.length === 0) {
        issues.push(`Tenant-scoped table "${t}" has no RLS policies.`);
        continue;
      }
      const hasOrgPolicy = policies.some(
        (p) =>
          (p.qual?.includes('current_organization_id') ?? false) ||
          (p.check?.includes('current_organization_id') ?? false),
      );
      if (!hasOrgPolicy) {
        issues.push(
          `Tenant-scoped table "${t}" has policies but none reference current_organization_id.`,
        );
      }
    }

    // 2. Every USER_SCOPED_TABLES entry must have a policy mentioning
    //    current_user_id.
    for (const t of USER_SCOPED_TABLES) {
      if (!allTables.includes(t)) {
        issues.push(`User-scoped table "${t}" listed in coverage allowlist but missing from DB.`);
        continue;
      }
      const policies = policiesByTable.get(t);
      if (!policies || policies.length === 0) {
        issues.push(`User-scoped table "${t}" has no RLS policies.`);
        continue;
      }
      const hasUserPolicy = policies.some(
        (p) =>
          (p.qual?.includes('current_user_id') ?? false) ||
          (p.check?.includes('current_user_id') ?? false),
      );
      if (!hasUserPolicy) {
        issues.push(`User-scoped table "${t}" has policies but none reference current_user_id.`);
      }
    }

    // 3. Surface any unclassified table — the allowlists must be exhaustive.
    const known = new Set<string>([
      ...TENANT_SCOPED_TABLES,
      ...USER_SCOPED_TABLES,
      ...PUBLIC_TABLES,
      ...BETTER_AUTH_EXEMPT,
      ...PRISMA_INTERNAL,
    ]);
    for (const t of allTables) {
      if (!known.has(t)) {
        issues.push(
          `Unclassified table "${t}" — add it to TENANT_SCOPED_TABLES, USER_SCOPED_TABLES, PUBLIC_TABLES, or BETTER_AUTH_EXEMPT in infra/scripts/check-rls-coverage.ts.`,
        );
      }
    }
  } finally {
    await client.end();
  }

  if (issues.length > 0) {
    console.error('❌ RLS coverage check failed:');
    for (const i of issues) console.error('  -', i);
    process.exit(1);
  }
  console.log('✅ RLS coverage check passed: every tenant/user-scoped table has the right policy.');
}

main().catch((err) => {
  console.error('❌ RLS coverage check threw:', err);
  process.exit(2);
});
