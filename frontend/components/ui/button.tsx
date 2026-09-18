import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-mono text-xs font-bold uppercase tracking-[0.08em] outline-none transition-[transform,box-shadow,color,border-color,background-color] duration-150 ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-signal text-background shadow-[4px_4px_0_var(--foreground)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_var(--foreground)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_var(--foreground)]',
        destructive: 'bg-destructive text-background hover:opacity-90',
        outline: 'border border-line text-foreground hover:border-signal hover:text-signal',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:text-foreground',
        link: 'text-signal underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 has-[>svg]:px-4',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-12 px-6 has-[>svg]:px-5',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
