import { cn } from '@/lib/utils'

const MARK_PATHS = [
  'M7.61103 42.9326H116.702C131.927 42.9326 168.348 52.2076 181.819 95.8317C188.485 117.417 186.216 165.29 129.387 182.464L157.295 134.931C163.496 120.109 170.318 87.3985 141.227 75.132L50.4128 217.73C73.355 231.274 134.645 248.115 190.276 200.097C201.488 190.419 223.984 163.963 229.177 141.831C231.524 131.823 235.176 106.829 226.64 80.4986C218.866 56.521 186.966 0 108.246 0H32.1355L7.61103 42.9326Z',
  'M125.159 66.6988L33.8268 210.11C23.6788 203.195 2.70614 186.757 0 176.33L55.8142 88.69C64.8347 75.2264 91.3323 51.9791 125.159 66.6988Z',
] as const

/**
 * The Dairydash logo mark — the same paths as /favicon.svg, inlined so it can
 * sit on any surface. `gradient` is the solid brand tile (favicon-style); `glass`
 * floats on the dark-green hero panels with the same translucent styling as
 * neighbouring elements.
 */
export function BrandMark({ variant = 'gradient', className }: { variant?: 'gradient' | 'glass'; className?: string }) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden',
        variant === 'gradient'
          ? 'rounded-[14px] bg-gradient-to-br from-[#128044] to-[#07552a] shadow-[0_8px_20px_rgba(7,85,42,0.28),inset_0_1px_0_rgba(255,255,255,0.24)]'
          : 'rounded-[14px] border border-white/22 bg-white/13 text-white',
        className,
      )}
    >
      <svg viewBox="0 0 232 232" className="size-[74%]" aria-hidden="true">
        {MARK_PATHS.map((d) => (
          <path key={d} d={d} fill={variant === 'gradient' ? '#FFFCFC' : 'currentColor'} />
        ))}
      </svg>
    </span>
  )
}
