import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeadProps {
  eyebrow: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

/** Standard page header: eyebrow + title + description on the left, actions on the right. */
export function PageHead({ eyebrow, title, description, actions, className }: PageHeadProps) {
  return (
    <div
      className={cn('mb-6 flex flex-wrap items-end justify-between gap-6 max-md:items-start max-md:gap-4', className)}
    >
      <div className="min-w-0">
        <span className="mb-2.5 inline-flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.15em] text-primary uppercase before:block before:h-[2.5px] before:w-4 before:rounded-[3px] before:bg-current before:opacity-55">
          {eyebrow}
        </span>
        <h1 className="text-4xl leading-[1.08] font-extrabold tracking-[-0.03em] max-sm:text-[1.65rem]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-[76ch] text-[0.98rem] leading-[1.55] text-ink-2 max-sm:text-[0.92rem]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}
