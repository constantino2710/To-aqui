import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Pressable, type PressableProps } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center gap-2 rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary shadow-lg shadow-primary/25 active:opacity-90',
        secondary: 'bg-secondary active:opacity-80',
        destructive: 'bg-destructive/10 active:opacity-80',
        outline: 'border border-input bg-card active:bg-muted',
        ghost: 'active:bg-muted',
      },
      size: {
        default: 'h-[52px] px-6',
        sm: 'h-10 px-4',
        lg: 'h-14 px-8',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

const buttonTextVariants = cva('text-base font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive',
      outline: 'text-foreground',
      ghost: 'text-foreground',
    },
    size: {
      default: '',
      sm: 'text-sm',
      lg: 'text-lg',
      icon: '',
    },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type ButtonProps = PressableProps & VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  ({ className, variant, size, disabled, ...props }, ref) => (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        ref={ref}
        role="button"
        disabled={disabled}
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        {...props}
      />
    </TextClassContext.Provider>
  ),
);
Button.displayName = 'Button';

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
