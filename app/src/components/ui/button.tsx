import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2.5 rounded-[12px] font-bold tracking-[-0.005em] whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 has-[>svg]:shrink-0 [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-[#075c2c] bg-gradient-to-b from-[#0d7a3b] to-[#08632f] text-white shadow-xs hover:from-[#0b8843] hover:to-[#0a6b33]',
        outline:
          'border border-line-strong bg-white text-foreground shadow-xs hover:bg-surface-low hover:border-[#b9c6bb]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-ink-2 hover:bg-surface-container hover:text-foreground',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-[46px] px-[19px] text-[0.93rem]',
        sm: 'h-[38px] rounded-[10px] px-3.5 text-[0.84rem] [&_svg]:size-4',
        lg: 'h-[54px] rounded-[13px] px-7 text-base',
        icon: 'size-[46px]',
        'icon-sm': 'size-[38px] rounded-[10px]',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      block: false,
    },
  },
)

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, block, className }))} {...props} />
}

export { Button, buttonVariants }
