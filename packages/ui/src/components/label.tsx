/**
 * Label — form-field label primitive.
 *
 * Native <label> with consistent typography. Pairs with <Input> via the
 * shared `htmlFor` / `id` contract — this component does not provide a
 * Radix-style automatic association.
 */
import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...rest }, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className,
    )}
    {...rest}
  />
));

Label.displayName = 'Label';
