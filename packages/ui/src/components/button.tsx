/**
 * Button — primary CTA primitive.
 *
 * Variants ensure a small, opinionated set of looks instead of letting every
 * call site hand-roll Tailwind classes. New variants land here, not at call
 * sites, so a brand refresh re-styles every button at once.
 */
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
        secondary:
          'bg-[color:var(--color-card)] text-[color:var(--color-fg)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-border)]',
        ghost: 'hover:bg-[color:var(--color-border)] text-[color:var(--color-fg)]',
        link: 'underline-offset-4 hover:underline text-brand-600',
        danger: 'bg-[color:var(--color-danger)] text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonStyles({ variant, size }), className)}
      {...rest}
    />
  ),
);

Button.displayName = 'Button';

export { buttonStyles };
