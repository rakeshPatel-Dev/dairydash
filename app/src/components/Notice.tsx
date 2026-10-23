import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type NoticeTone = 'error' | 'warning' | 'success'

const TONES: Record<NoticeTone, string> = {
  error: 'border-[#f7d6d2] bg-rose-soft text-destructive',
  warning: 'border-[#f2e2c2] bg-amber-soft text-amber-strong',
  success: 'border-primary-soft-strong bg-[#e8f6ed] text-success',
}

/** Inline status box shown above forms/tables. */
export function Notice({
  tone = 'error',
  children,
  className,
}: {
  tone?: NoticeTone
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'mb-3 rounded-[11px] border px-3.5 py-3 text-[0.88rem] leading-[1.5] font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </div>
  )
}
