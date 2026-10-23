const STEPS = ['Select', 'Pay', 'Done'] as const

export type SaleStepNumber = 1 | 2 | 3

export function SaleSteps({ current }: { current: SaleStepNumber }) {
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((label, index) => {
        const n = (index + 1) as SaleStepNumber
        const done = n < current
        const active = n === current
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden className="h-px w-5 bg-border" />}
            <span
              className={
                active
                  ? 'flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[0.8rem] font-bold text-white shadow-xs'
                  : done
                    ? 'flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[0.8rem] font-bold text-primary-strong'
                    : 'flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-ink-3'
              }
              aria-current={active ? 'step' : undefined}
            >
              <span className="grid size-[18px] place-items-center rounded-full bg-white/25 text-[0.68rem] font-extrabold max-[420px]:hidden">
                {done ? '✓' : n}
              </span>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
