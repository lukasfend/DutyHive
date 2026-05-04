# Color Tokens

> Phase 1 placeholder. Replaced when final brand identity lands.

## Provisional palette

CSS variables defined in `apps/web/app/globals.css` (and later moved to `packages/ui/src/styles/tokens.css`):

| Token               | Light value           | Notes               |
| ------------------- | --------------------- | ------------------- |
| `--color-brand-50`  | `oklch(0.98 0.02 80)` | placeholder accent  |
| `--color-brand-100` | `oklch(0.95 0.04 80)` |                     |
| `--color-brand-500` | `oklch(0.65 0.15 80)` | primary placeholder |
| `--color-brand-700` | `oklch(0.45 0.13 80)` |                     |
| `--color-brand-900` | `oklch(0.25 0.10 80)` |                     |

Discipline: no hardcoded hex / oklch outside `tokens.css`. PR review enforces this.

## Dark mode (Phase 3)

`[data-theme="dark"]` block in `tokens.css` overrides bg/fg/surface tokens. Brand hues stay; only surface and content tokens flip.

## Accessibility

Foundation aims for WCAG 2.1 AA on all production-rendered text/control combinations. Tooling: `@axe-core/playwright` checks pages in Phase 5 e2e suite.
