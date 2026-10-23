import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StatTone = 'neutral' | 'cash' | 'online' | 'credit' | 'outstanding'

const TONE_CARD: Record<StatTone, string> = {
  neutral: 'border-line bg-[linear-gradient(165deg,#f4f8f5,#ffffff_58%)]',
  cash: 'border-[#d5ecdc] bg-[linear-gradient(165deg,#e7f5ec,#fdfffd_62%)]',
  online: 'border-[#dbe5fc] bg-[linear-gradient(165deg,#ebf1fe,#fdfeff_62%)]',
  credit: 'border-[#f3e4c4] bg-[linear-gradient(165deg,#fdf4e2,#fffefb_62%)]',
  outstanding: 'border-[#e4d8fb] bg-[linear-gradient(165deg,#f1ebfd,#fefcff_62%)]',
}

const TONE_ICON: Record<StatTone, string> = {
  neutral: 'text-primary',
  cash: 'text-primary',
  online: 'text-secondary',
  credit: 'text-amber',
  outstanding: 'text-tertiary',
}

const TONE_CHIP: Record<StatTone, string> = {
  neutral: 'border-line text-ink-2',
  cash: 'border-[#cfe9d8] text-primary-strong',
  online: 'border-[#d3e0fb] text-secondary',
  credit: 'border-[#eedcb8] text-amber-strong',
  outstanding: 'border-[#ded2fb] text-tertiary',
}

interface StatCardProps {
  tone?: StatTone
  label: string
  value: ReactNode
  icon?: ReactNode
  /** bottom-left context line */
  note?: ReactNode
  /** bottom-right pill (counts, deltas, status) */
  chip?: ReactNode
  className?: string
}

/** KPI card — tinted panel with label, big value and a context footer. */
export function StatCard({ tone = 'neutral', label, value, icon, note, chip, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-[172px] flex-col overflow-hidden rounded-[20px] border p-[18px_22px] shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md max-sm:min-h-0 max-sm:p-4',
        'before:absolute before:-top-[52px] before:-right-10 before:z-0 before:size-[150px] before:rounded-full before:bg-white/40 before:content-[""]',
        TONE_CARD[tone],
        className,
      )}
    >
      <div className="relative z-1 flex items-start justify-between gap-3">
        <span className="pt-1 text-[0.72rem] font-extrabold tracking-[0.11em] text-ink-2 uppercase">{label}</span>
        {icon && (
          <span
            className={cn(
              'grid size-[46px] shrink-0 place-items-center rounded-[14px] border border-white/90 bg-white/78 shadow-xs',
              TONE_ICON[tone],
              '[&_*]:size-[22px]',
              'max-sm:size-10 max-sm:rounded-xl [&_*]:max-sm:size-[19px]',
            )}
          >
            {icon}
          </span>
        )}
      </div>

      <strong className="relative z-1 mt-3 block text-[clamp(1.7rem,1.4rem+0.8vw,2.1rem)] leading-[1.05] font-extrabold tracking-[-0.035em] tabular-nums max-sm:mt-2">
        {value}
      </strong>

      {(note || chip) && (
        <div className="border-ink/[0.07] relative z-1 mt-auto flex flex-wrap items-center justify-between gap-2.5 border-t pt-3 max-sm:pt-2">
          {note && <span className="text-[0.8rem] leading-[1.35] font-medium text-ink-2">{note}</span>}
          {chip && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border bg-white/85 px-2.5 py-1 text-[0.73rem] font-bold shadow-xs',
                TONE_CHIP[tone],
              )}
            >
              {chip}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
