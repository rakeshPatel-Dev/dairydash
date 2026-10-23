import type { ReactNode } from 'react'

/** Centered empty state for lists/tables. */
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-16 text-center text-ink-3">
      <span className="mb-2 block text-[1.2rem] font-extrabold tracking-[-0.02em] text-foreground">{title}</span>
      {children && <p className="mx-auto max-w-[46ch] text-[0.92rem] leading-[1.6]">{children}</p>}
    </div>
  )
}
