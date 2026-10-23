/** Centered loading state with a spinner ring (replaces the old .page-loading). */
export function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-[0.95rem] font-semibold text-ink-3">
      <span className="mb-4 size-[30px] animate-spin rounded-full border-4 border-surface-highest border-t-ring" />
      {label}
    </div>
  )
}
