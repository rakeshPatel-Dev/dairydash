import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useOnlineStatus } from '../lib/useOnlineStatus'
import { BrandMark } from './BrandMark'
import { Icon, type IconName } from './Icon'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: IconName
}

const SECTION_TITLES: Record<string, string> = {
  '/today': 'Overview',
  '/sale': 'Point of sale',
  '/customers': 'Customers & credit',
  '/sales': 'Sales history',
  '/products': 'Product catalog',
  '/reports': 'Reports',
  '/audit': 'Audit log',
  '/staff': 'Staff & permissions',
  '/settings': 'Settings',
}

function initials(name: string | undefined): string {
  if (!name) return 'G'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function sectionTitle(pathname: string): string {
  if (pathname.startsWith('/customers/')) return 'Customer ledger'
  if (pathname === '/sale' || pathname.startsWith('/sale/')) return 'Point of sale'
  return SECTION_TITLES[pathname] ?? 'Dairydash'
}

const NAV_LINK =
  'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.94rem] font-semibold tracking-[-0.005em] whitespace-nowrap text-ink-2 transition-colors hover:bg-surface-container hover:text-foreground [&_svg]:text-ink-3'
const NAV_LINK_ACTIVE =
  'bg-primary-soft text-primary-strong font-bold shadow-[inset_0_0_0_1px_#d9eddf] [&_svg]:text-primary before:absolute before:-left-1.5 before:top-2.5 before:bottom-2.5 before:w-0.75 before:rounded-[3px] before:bg-primary before:content-[""] max-md:before:hidden'

function NavLinks({ items }: { items: NavItem[] }) {
  return items.map((item) => (
    <NavLink key={item.to} to={item.to} className={({ isActive }) => cn(NAV_LINK, isActive && NAV_LINK_ACTIVE)}>
      <Icon name={item.icon} className="size-5 max-md:size-[17px]" />
      {item.label}
    </NavLink>
  ))
}

function NavLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pt-4 pb-2 text-[0.66rem] font-bold tracking-[0.15em] text-ink-3 uppercase max-md:hidden">
      {children}
    </div>
  )
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isOwner = profile?.role === 'owner'
  const online = useOnlineStatus()

  const counterNav: NavItem[] = [
    { to: '/sale', label: 'New sale', icon: 'sale' },
    { to: '/today', label: 'Today', icon: 'today' },
  ]

  const ledgerNav: NavItem[] = [
    { to: '/customers', label: 'Customers', icon: 'customers' },
    { to: '/sales', label: isOwner ? 'Sales history' : 'My sales', icon: 'sales' },
  ]

  const ownerNav: NavItem[] = [
    { to: '/products', label: 'Products', icon: 'products' },
    { to: '/reports', label: 'Reports', icon: 'reports' },
    { to: '/audit', label: 'Audit log', icon: 'audit' },
    { to: '/staff', label: 'Staff', icon: 'staff' },
    { to: '/settings', label: 'Settings', icon: 'settings' },
  ]

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kathmandu',
  })

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1100px_440px_at_84%_-10%,rgba(201,240,214,0.42),transparent_62%),var(--color-surface)]">
      {/* ── Sidebar (desktop) / compact nav bar (mobile) ── */}
      <aside
        className={cn(
          'z-40 flex flex-col gap-5 bg-white/88 backdrop-blur-lg',
          // mobile: horizontal sticky bar
          'max-md:sticky max-md:inset-x-0 max-md:top-0 max-md:h-auto max-md:flex-row max-md:items-center max-md:gap-3 max-md:border-b max-md:border-line max-md:px-4 max-md:py-2.5',
          // desktop: fixed sidebar
          'min-md:fixed min-md:inset-y-0 min-md:left-0 min-md:w-[clamp(238px,16.5vw,288px)] min-md:overflow-y-auto min-md:border-r min-md:border-line min-md:p-[26px_16px_20px]',
        )}
      >
        <div className="flex items-center gap-3 px-1.5">
          <BrandMark className="size-[46px] max-md:size-9 max-md:rounded-[11px]" />
          <div className="max-sm:hidden">
            <strong className="block text-[1.08rem] leading-[1.2] font-extrabold tracking-[-0.025em]">Dairydash</strong>
            <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-ink-3 uppercase max-md:hidden">
              Dairy Cooperative
            </span>
          </div>
        </div>

        <span className="mx-1 hidden items-center gap-2 self-start rounded-full border border-[#d5ebdd] bg-primary-soft px-3.5 py-1.5 text-[0.75rem] font-bold text-primary-strong md:inline-flex">
          <span
            className={cn(
              'size-2 rounded-full',
              online
                ? 'bg-[#16a34a] shadow-[0_0_0_3px_rgba(22,163,74,0.16)]'
                : 'bg-destructive shadow-[0_0_0_3px_rgba(180,35,24,0.14)]',
            )}
          />
          {online ? 'Counter live · Rautahat' : 'Offline — sales paused'}
        </span>

        <nav className="flex flex-row gap-0.5 max-md:[scrollbar-width:none] max-md:overflow-x-auto min-md:flex-1 min-md:flex-col max-md:[&::-webkit-scrollbar]:hidden">
          <NavLabel>Counter</NavLabel>
          <NavLinks items={counterNav} />
          <NavLabel>Ledger</NavLabel>
          <NavLinks items={ledgerNav} />
          {isOwner && (
            <>
              <NavLabel>Management</NavLabel>
              <NavLinks items={ownerNav} />
            </>
          )}
        </nav>

        <div
          className={cn(
            'flex border-t border-line pt-4 max-md:border-0 max-md:pt-0',
            'max-md:flex-row max-md:items-center',
            'min-md:flex-col min-md:gap-2.5',
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5 px-1 max-md:hidden">
            <span className="grid size-10 shrink-0 place-items-center rounded-[13px] border border-line bg-surface-high text-[0.86rem] font-extrabold text-primary-strong">
              {initials(profile?.full_name)}
            </span>
            <div className="min-w-0">
              <span className="block overflow-hidden text-[0.88rem] font-bold text-ellipsis whitespace-nowrap">
                {profile?.full_name}
              </span>
              <small className="block text-[0.76rem] text-ink-3 capitalize">{profile?.role} · Signed in</small>
            </div>
          </div>
          <button
            className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] px-3.5 text-[0.84rem] font-bold text-ink-2 transition-colors hover:bg-surface-container hover:text-foreground max-md:shrink-0"
            onClick={handleSignOut}
          >
            <Icon name="logout" className="size-4" />
            <span className="max-md:hidden">Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Topbar (desktop) ── */}
      <header className="fixed top-0 right-0 left-[clamp(238px,16.5vw,288px)] z-35 hidden h-[76px] items-center gap-5 border-b border-line bg-surface/80 px-[clamp(20px,2.6vw,46px)] backdrop-blur-xl backdrop-saturate-140 md:flex">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[0.7rem] font-bold tracking-[0.12em] whitespace-nowrap text-ink-3 uppercase">
            Dairydash
          </span>
          <span className="text-line-strong">/</span>
          <span className="overflow-hidden text-[0.95rem] font-bold text-ellipsis whitespace-nowrap">
            {sectionTitle(location.pathname)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex h-[38px] items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[0.83rem] font-semibold text-ink-2 shadow-xs [&_svg]:size-[17px] [&_svg]:text-ink-3">
            <Icon name="calendar" />
            {today}
          </span>
          <span
            className={cn(
              'inline-flex h-[38px] items-center gap-2 rounded-full border bg-white px-3.5 text-[0.83rem] font-semibold shadow-xs [&_svg]:size-[17px]',
              online
                ? 'border-[#d5ebdd] bg-primary-soft text-primary-strong [&_svg]:text-primary'
                : 'border-[#f6d3cf] bg-rose-soft text-destructive',
            )}
          >
            <Icon name={online ? 'wifi' : 'wifi-off'} />
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      <main className="ml-[clamp(238px,16.5vw,288px)] px-[clamp(20px,2.6vw,46px)] pt-[106px] pb-21 max-md:ml-0 max-md:px-4 max-md:pt-[22px] max-md:pb-16 max-sm:px-3.5">
        {!online && (
          <div
            role="alert"
            className="mb-5 rounded-[13px] border border-l-4 border-[#f6d3cf] border-l-destructive bg-rose-soft px-4.5 py-3.5 text-[0.94rem] leading-[1.5] font-semibold text-destructive"
          >
            No internet connection. Sales cannot be saved — nothing is queued. Do not take payment until the connection
            returns.
          </div>
        )}
        <div className="animate-page-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
