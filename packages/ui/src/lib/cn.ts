/**
 * `cn` — class-name composer.
 *
 * Combines `clsx` (conditional class lists) with `tailwind-merge`
 * (deduplicates conflicting Tailwind utilities so `cn('px-2', 'px-4')`
 * yields `'px-4'`, not `'px-2 px-4'`).
 *
 * Used throughout `@dutyhive/ui` and consumer apps wherever variant-based
 * class lists are computed.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
