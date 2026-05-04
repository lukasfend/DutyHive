# Naming Conventions

## Brand-name discipline

The platform name **"DutyHive"** appears in **only two places** in the codebase:

1. `packages/config/src/brand.ts` — the `brand.name` constant
2. `packages/i18n/src/messages/<locale>/*.json` — translatable strings that interpolate `{brand.name}`

If you find "DutyHive" hardcoded anywhere else (component text, page titles, email templates), move it to one of the above. Tests / CI lint check enforces this in Phase 5.

**Why:** the working name is provisional. Centralizing it keeps a future rebrand to a single-file PR.

## Repository / package names

- Repo: `dutyhive` (chosen by the principal in Q&A)
- npm packages: `@dutyhive/*` (chosen explicitly)
- DB schema names: generic (`public`)
- DB role names: `dutyhive_app`, `dutyhive_migrate`

A rebrand requires renaming the repo and a search-replace on `@dutyhive/*` imports. This trade-off was accepted vs. fully generic naming.

## Code identifiers

- TypeScript: `camelCase` for variables, `PascalCase` for types/classes/components
- React components: `PascalCase`, file `PascalCase.tsx`
- Hooks: `useXxx`
- Utility files: `kebab-case.ts`
- Constants: `UPPER_SNAKE_CASE` only for true compile-time constants (e.g., `MAX_LOGIN_ATTEMPTS`); export const objects use camelCase

## i18n keys

Dot-namespaced by route group:

```
marketing.hero.title
marketing.hero.subtitle
account.login.emailLabel
common.errors.unknown
```

Never inline German strings in components — always go through `useTranslations()` / `getTranslations()`.

## Audit-log action names

`<domain>.<resource>.<verb>`, lowercase, dot-separated:

```
auth.login
auth.logout
org.member.invited
org.member.role_changed
legal.consent.given
```

## Database conventions

- Prisma model: `PascalCase` singular (`User`, `Organization`, `AuditEntry`)
- DB table: same as model (Prisma default)
- Columns: `camelCase` Prisma fields → `snake_case` actual DB columns via `@map`
- Indexes: explicit `@@index([col1, col2(sort: Desc)])` for query-driven indexes
- Foreign keys named `<related>Id`
