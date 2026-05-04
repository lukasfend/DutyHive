import type { UserConfig } from '@commitlint/types';

/**
 * DutyHive — Conventional Commits enforcement.
 *
 * Allowed types:
 *   feat     — new user-facing feature
 *   fix      — user-facing bug fix
 *   refactor — internal restructure, no behavior change
 *   perf     — performance improvement
 *   docs     — documentation only
 *   test     — tests only
 *   build    — build / dependency changes
 *   ci       — CI/CD pipeline changes
 *   chore    — anything else (tooling, scaffolding, infra)
 *   revert   — reverts a previous commit
 *   security — security fix or hardening
 *
 * Optional scope examples:
 *   web, db, auth, ui, i18n, email, jobs, pwa, audit, infra, docs, legal, marketing
 */
const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'docs',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        'security',
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
  },
};

export default config;
