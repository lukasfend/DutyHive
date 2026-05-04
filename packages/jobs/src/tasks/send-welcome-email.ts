/**
 * Welcome-email task — fires after a user verifies their email.
 *
 * Triggered by Better Auth's `emailVerification.afterVerification` hook
 * (Phase 4+) via `tasks.trigger('send-welcome-email', { userId })`. The
 * task fetches the user, renders a Welcome template, and sends through
 * `@dutyhive/email`. Failure mails to Sentry without re-trying — Better
 * Auth doesn't depend on the welcome mail succeeding, and we don't want
 * to spam the user on transient mail-provider errors.
 *
 * Foundation Phase 5: the trigger from auth is NOT yet wired (Phase 4
 * completed without the welcome mail). The task is in place so Phase 5+
 * can `tasks.trigger(...)` from anywhere with a one-line change.
 */
import { task } from '@trigger.dev/sdk';
import { prisma } from '@dutyhive/db';
import { sendMail, render } from '@dutyhive/email';
import EmailVerification from '@dutyhive/email/templates/email-verification';
import { logger } from '@dutyhive/logger';

export type SendWelcomeEmailPayload = {
  userId: string;
};

export const sendWelcomeEmail = task({
  id: 'send-welcome-email',

  run: async (payload: SendWelcomeEmailPayload) => {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      logger.warn({ userId: payload.userId }, 'jobs.welcome.user-not-found');
      return { sent: false };
    }

    // Reuse the verification template for the welcome shape — Phase 5+
    // adds a dedicated Welcome template once we have onboarding copy.
    const html = await render(EmailVerification({ name: user.name, url: 'https://dutyhive.com' }));
    const result = await sendMail({
      to: user.email,
      subject: 'Willkommen bei DutyHive',
      html,
    });

    logger.info({ userId: user.id, ok: result.ok, backend: result.backend }, 'jobs.welcome.sent');

    return { sent: result.ok };
  },
});
