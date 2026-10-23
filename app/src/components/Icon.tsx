import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface IconProps {
  name: IconName
  className?: string
  size?: number
}

export type IconName =
  | 'sale'
  | 'today'
  | 'customers'
  | 'products'
  | 'sales'
  | 'reports'
  | 'audit'
  | 'staff'
  | 'settings'
  | 'search'
  | 'calendar'
  | 'wifi'
  | 'wifi-off'
  | 'logout'
  | 'plus'
  | 'receipt'
  | 'wallet'
  | 'arrow-left'
  | 'check'
  | 'lock'
  | 'card'
  | 'credit'
  | 'close'

const PATHS: Record<IconName, ReactNode> = {
  sale: (
    <>
      <path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z" />
      <path d="M8.5 8V6.5a3.5 3.5 0 0 1 7 0V8" />
    </>
  ),
  today: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  customers: (
    <>
      <path d="M16.5 20v-1.7a3.8 3.8 0 0 0-3.8-3.8H6.3a3.8 3.8 0 0 0-3.8 3.8V20" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M21.5 20v-1.7a3.8 3.8 0 0 0-2.9-3.7" />
      <path d="M15.7 4.1a3.5 3.5 0 0 1 0 6.8" />
    </>
  ),
  products: (
    <>
      <path d="M20.5 8.2v7.6a1.8 1.8 0 0 1-.9 1.6l-6.5 3.5a1.8 1.8 0 0 1-1.7 0l-6.5-3.5a1.8 1.8 0 0 1-.9-1.6V8.2" />
      <path d="m3.6 7.3 7.8-4.1a1.8 1.8 0 0 1 1.7 0l7.8 4.1-8.6 4.5a1.8 1.8 0 0 1-1.7 0L3.6 7.3Z" />
      <path d="M12 11.9V20" />
    </>
  ),
  sales: (
    <>
      <path d="M5 3.5h14v17l-2.3-1.6-2.4 1.6-2.3-1.6L9.7 20l-2.4-1.6L5 20V3.5Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </>
  ),
  reports: (
    <>
      <path d="M3.5 20.5h17" />
      <path d="M6.5 20.5v-6" />
      <path d="M12 20.5V9" />
      <path d="M17.5 20.5V4.5" />
    </>
  ),
  audit: (
    <>
      <path d="M12 3.2 5 6v5.2c0 4.3 2.9 7.6 7 9.6 4.1-2 7-5.3 7-9.6V6l-7-2.8Z" />
      <path d="m9 11.8 2.2 2.2 4-4.2" />
    </>
  ),
  staff: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.8 20.2v-1.4a4.4 4.4 0 0 1 4.4-4.4h3.6a4.4 4.4 0 0 1 4.4 4.4v1.4" />
      <path d="M18.6 8.2v.01" />
      <path d="M18.6 11.4v.01" />
      <path d="M18.6 14.6v.01" />
      <path d="M21.2 9.8v4.2" />
      <path d="M16 9.8v4.2" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h9" />
      <path d="M17 6h3" />
      <path d="M4 12h3" />
      <path d="M11 12h9" />
      <path d="M4 18h9" />
      <path d="M17 18h3" />
      <circle cx="15" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="18" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3.5 10h17" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 8.8a15 15 0 0 1 19 0" />
      <path d="M5.8 12.4a10 10 0 0 1 12.4 0" />
      <path d="M9.2 16a5 5 0 0 1 5.6 0" />
      <path d="M12 19.6h.01" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="m2.5 2.5 19 19" />
      <path d="M8.6 5.6a15 15 0 0 1 12.9 3.2" />
      <path d="M5.8 12.4a10 10 0 0 1 3.2-1.9" />
      <path d="M15 11a10 10 0 0 1 3.2 1.4" />
      <path d="M9.2 16a5 5 0 0 1 5.6 0" />
      <path d="M12 19.6h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" />
      <path d="m17 8 4 4-4 4" />
      <path d="M21 12H10" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V3.5Z" />
      <path d="M9.5 8.5h5" />
      <path d="M9.5 12.5h5" />
    </>
  ),
  wallet: (
    <>
      <path d="M20.5 8.5V7A1.8 1.8 0 0 0 18.7 5.2H5.5A1.7 1.7 0 0 0 3.8 7v10a1.8 1.8 0 0 0 1.8 1.8h13.1a1.8 1.8 0 0 0 1.8-1.8v-1.5" />
      <path d="M21 9.5h-5a2.5 2.5 0 0 0 0 5h5v-5Z" />
      <path d="M16 12h.01" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  check: (
    <>
      <path d="m4.5 12.5 5 5 10-11" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <path d="M12 15v2" />
    </>
  ),
  card: (
    <>
      <rect x="2.8" y="5" width="18.4" height="14" rx="3" />
      <path d="M2.8 9.8h18.4" />
      <path d="M7 15h3" />
    </>
  ),
  credit: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3.1 1.9" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
}

export function Icon({ name, className, size }: IconProps) {
  return (
    <svg
      className={cn('icon size-5 shrink-0', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={size ? { width: size, height: size } : undefined}
    >
      {PATHS[name]}
    </svg>
  )
}
