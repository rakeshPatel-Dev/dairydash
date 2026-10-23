import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  className?: string
  children: ReactNode
}

/** Form field wrapper: label + control (+ optional hint under the control). */
export function Field({ label, hint, required, className, children }: FieldProps) {
  return (
    <label className={cn('mb-4 block', className)}>
      <Label className="mb-[7px]">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>
      {children}
      {hint && <span className="mt-1.5 block text-[0.78rem] text-ink-3">{hint}</span>}
    </label>
  )
}
