/**
 * Cleanup task — deletes Better Auth session rows past their expiresAt.
 *
 * Runs as a daily cron at 04:00 UTC (off-peak in Europe/Vienna). Better
 * Auth tolerates expired rows gracefully (they're rejected on read), but
 * leaving them piles up forever — this task keeps the table small and the
 * indexes hot.
 *
 * The task uses the migrate role indirectly via Prisma's connection pool —
 * sessions are not RLS-scoped (see ADR-0004 Phase-2-RLS-scope), so a plain
 * `deleteMany` works. We don't open a `withAuthContext` because there is
 * no user context for cron.
 */
import { schedules } from '@trigger.dev/sdk';
import { prisma } from '@dutyhive/db';
import { logger } from '@dutyhive/logger';
import { auditLog } from '@dutyhive/audit';

export const cleanupStaleSessions = schedules.task({
  id: 'cleanup-stale-sessions',
  // 04:00 UTC every day — off-peak for Europe/Vienna users.
  cron: '0 4 * * *',

  run: async () => {
    const cutoff = new Date();
    const result = await prisma.session.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });

    logger.info(
      { deleted: result.count, cutoff: cutoff.toISOString() },
      'jobs.cleanup-stale-sessions.done',
    );

    await auditLog({
      action: 'jobs.session.cleanup',
      payload: { deleted: result.count, cutoff: cutoff.toISOString() },
    });

    return { deletedCount: result.count };
  },
});
