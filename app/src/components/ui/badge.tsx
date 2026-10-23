import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.76rem] font-bold capitalize whitespace-nowrap transition-[color,box-shadow] overflow-hidden before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-[''] [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: 'border-transparent bg-surface-container text-ink-2',
        paid: 'border-primary-soft-strong bg-[#e6f5eb] text-success',
        partial: 'border-[#f4e3c0] bg-amber-soft text-amber-strong',
        online: 'border-[#dfe8ff] bg-secondary-soft text-secondary',
        wholesale: 'border-[#e8dcff] bg-tertiary-soft text-tertiary',
        void: 'border-[#f7d6d2] bg-rose-soft text-destructive',
        outline: 'border-border bg-background text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
