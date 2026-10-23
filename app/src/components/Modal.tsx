import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Icon } from './Icon'

interface ModalProps {
  title?: string
  subtitle?: string
  wide?: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ title, subtitle, wide, onClose, children, footer }: ModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="modal-backdrop fixed inset-0 z-60 grid animate-fade-in place-items-center bg-[rgba(11,24,15,0.44)] p-6 backdrop-blur-[5px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className={cn(
          'modal max-h-[92vh] w-[600px] max-w-full animate-modal-rise overflow-y-auto rounded-[26px] border border-white/60 bg-white p-7 shadow-lg',
          wide && 'w-[860px] max-sm:p-5',
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || subtitle) && (
          <div className="no-print mb-5 flex items-start justify-between gap-4">
            <div>
              {title && <h2 className="text-[1.3rem] font-bold tracking-[-0.025em]">{title}</h2>}
              {subtitle && <p className="mt-1 text-[0.85rem] leading-[1.55] text-ink-3">{subtitle}</p>}
            </div>
            <button
              className="no-print grid size-9 cursor-pointer place-items-center rounded-[10px] border border-line bg-surface-low text-[0.9rem] text-ink-3 hover:bg-surface-container hover:text-foreground"
              onClick={onClose}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        {children}
        {footer && <div className="no-print mt-[18px]">{footer}</div>}
      </div>
    </div>
  )
}
