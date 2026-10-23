import { cn } from '@/lib/utils'

interface ChipFilterProps {
  label: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

/** Categories filter pill used on the POS screen. */
export function ChipFilter({ label, active, onClick, className }: ChipFilterProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[0.88rem] font-semibold shadow-xs transition-colors',
        active
          ? 'border-primary-strong bg-primary text-white hover:text-white'
          : 'border-line-strong bg-white text-ink-2 hover:border-[#b9c6bb] hover:text-foreground',
        className,
      )}
    >
      {label}
    </button>
  )
}
