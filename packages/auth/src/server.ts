/**
 * @dutyhive/auth — Better Auth server configuration.
 *
 * Single source of truth for authentication. Mounted in the Next.js app at
 * `apps/web/app/api/auth/[...all]/route.ts`. Exports the `auth` instance for
 * the Next.js route handler and for `withAuthContext()` (./with-tenant.ts).
 *
 * Cross-subdomain cookies. The `domain` attribute is set to `.${ROOT_DOMAIN}`
 * so a session minted on `app.dutyhive.com` is also valid on
 * `planner.dutyhive.com`, `business.dutyhive.com`, etc. Cookies set with a
 * leading-dot domain are valid for the host AND its subdomains. In dev
 * (`lvh.me`), the same trick gives us cross-sub for `app.lvh.me`,
 * `planner.lvh.me`, etc.
 *
 * Email verification is required (R-0001 mitigation). Magic link is enabled
 * as a passwordless alternative; 2FA is plugin-enabled but the enrolment UI
 * is deferred (out-of-scope for Foundation).
 *
 * Mail backend (Phase 2). All transactional mail goes through SMTP. In dev
 * SMTP_HOST/SMTP_PORT point at mailpit; in production they will be unused
 * once @dutyhive/email (Phase 4) takes over and routes through Resend.
 */
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins/organization';
import { magicLink } from 'better-auth/plugins/magic-link';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { createTransport } from 'nodemailer';
import { prisma } from '@dutyhive/db';
import { auditLog } from '@dutyhive/audit';
import { env } from '@dutyhive/env/server';
import { clientEnv } from '@dutyhive/env/client';

const ROOT_DOMAIN_HOST = clientEnv.NEXT_PUBLIC_ROOT_DOMAIN;
const ROOT_DOMAIN = ROOT_DOMAIN_HOST.split(':')[0]!;

const mailer = createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

async function sendMail(to: string, subject: string, html: string) {
  await mailer.sendMail({
    from: env.RESEND_FROM,
    to,
    subject,
    html,
  });
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail(
        user.email,
        'DutyHive — bestätige deine Email-Adresse',
        `<p>Hallo ${user.name},</p>
         <p>Bestätige deine Email-Adresse, um dein DutyHive-Konto zu aktivieren:</p>
         <p><a href="${url}">${url}</a></p>
         <p>Wenn du dich nicht registriert hast, kannst du diese Mail ignorieren.</p>`,
      );
    },
  },

  session: {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
    updateAge: 7 * 24 * 60 * 60, // refresh after 7 days of activity
  },

  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: `.${ROOT_DOMAIN}`,
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // No org context yet — this is a brand-new user; the row lands with
          // organizationId=NULL, which the RLS policy permits via WITH CHECK.
          await auditLog({
            action: 'auth.signup',
            actorUserId: user.id,
            organizationId: null,
            payload: { email: user.email },
          });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          await auditLog({
            action: 'auth.login',
            actorUserId: session.userId,
            organizationId:
              typeof session.activeOrganizationId === 'string'
                ? session.activeOrganizationId
                : null,
            request: {
              ip: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
            },
          });
        },
      },
    },
  },

  plugins: [
    organization({
      // Foundation: stick with the plugin's default owner/admin/member roles.
      // A custom ability matrix lands when product features arrive (Phase 5+).
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendMail(
          email,
          'DutyHive — Magic-Link Login',
          `<p>Klick zum Anmelden:</p>
           <p><a href="${url}">${url}</a></p>
           <p>Der Link gilt 5 Minuten und kann nur einmal genutzt werden.</p>`,
        );
      },
    }),
    twoFactor({}),
  ],
});

export type Auth = typeof auth;
