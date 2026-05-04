/**
 * @dutyhive/ui — public surface.
 *
 * CSS tokens are imported separately via `@dutyhive/ui/styles/globals.css`
 * (which transitively pulls tokens.css through @import). Components are
 * tree-shakable; importing one does not pull the others.
 *
 * Design-tokens-only rule: no hex/OKLCH literals outside `styles/tokens.css`.
 * Components reference the design system via Tailwind classes that map onto
 * those tokens (`bg-brand-500`, `text-[color:var(--color-fg)]`, etc.).
 */
export { cn } from './lib/cn';

export { Button, buttonStyles, type ButtonProps } from './components/button';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/card';
export { Input, type InputProps } from './components/input';
export { Label, type LabelProps } from './components/label';
