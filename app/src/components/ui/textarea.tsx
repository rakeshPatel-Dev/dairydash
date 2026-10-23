import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-[88px] w-full resize-y rounded-[11px] border border-line-strong bg-white px-3.5 py-2.5 text-[0.93rem] font-medium text-foreground shadow-[inset_0_1px_1px_rgba(18,28,21,0.02)] transition-[border-color,box-shadow] outline-none select-none',
        'placeholder:text-ink-3 hover:border-[#c2cec4]',
        'focus:border-ring focus:bg-white focus:ring-[3.5px] focus:ring-ring/15',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
