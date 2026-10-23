import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Pill-style segmented switch (e.g. Retail / Wholesale). */
export function Segmented<T extends string>({ options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div className={cn('inline-flex gap-1 rounded-xl border border-line bg-surface-container p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-[42px] rounded-[10px] px-6 text-[0.93rem] font-bold text-ink-2 transition-colors',
            option.value === value && 'ring-ink/[0.04] bg-white text-primary-strong shadow-xs ring-1',
            className,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
