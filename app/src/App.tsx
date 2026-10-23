import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { AppShell } from './components/AppShell'
import { BrandMark } from './components/BrandMark'
import { Button } from '@/components/ui/button'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { CustomersPage } from './pages/CustomersPage'
import { LoginPage } from './pages/LoginPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SalesHistoryPage } from './pages/SalesHistoryPage'
import { SettingsPage } from './pages/SettingsPage'
import { StaffPage } from './pages/StaffPage'
import { TodayPage } from './pages/TodayPage'
import { AuditPage } from './pages/AuditPage'
import { SaleFlowLayout } from './pages/sale/SaleFlowLayout'
import { SelectStep } from './components/sale/SelectStep'
import { PayStep } from './components/sale/PayStep'
import { CompleteStep } from './components/sale/CompleteStep'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="/sale" element={<SaleFlowLayout />}>
            <Route index element={<SelectStep />} />
            <Route path="pay" element={<PayStep />} />
            <Route path="complete" element={<CompleteStep />} />
            <Route path="checkout" element={<Navigate to="/sale/pay" replace />} />
          </Route>
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/sales" element={<SalesHistoryPage />} />
          <Route
            path="/products"
            element={
              <OwnerOnly>
                <ProductsPage />
              </OwnerOnly>
            }
          />
          <Route
            path="/reports"
            element={
              <OwnerOnly>
                <ReportsPage />
              </OwnerOnly>
            }
          />
          <Route
            path="/staff"
            element={
              <OwnerOnly>
                <StaffPage />
              </OwnerOnly>
            }
          />
          <Route
            path="/audit"
            element={
              <OwnerOnly>
                <AuditPage />
              </OwnerOnly>
            }
          />
          <Route
            path="/settings"
            element={
              <OwnerOnly>
                <SettingsPage />
              </OwnerOnly>
            }
          />
          <Route path="*" element={<Navigate to="/today" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}

function RequireAuth() {
  const { session, profile, loading, profileMissing, profileError } = useAuth()

  if (loading)
    return (
      <div className="grid place-items-center px-6 py-25 text-[0.95rem] font-semibold text-ink-3 before:mx-auto before:mb-4 before:block before:size-[30px] before:animate-spin before:rounded-full before:border-4 before:border-surface-highest before:border-t-ring before:content-['']">
        Checking your session…
      </div>
    )
  if (!session) return <Navigate to="/login" replace />
  if (profileError) return <NoProfile error={profileError} />
  if (profileMissing) return <NoProfile />
  if (!profile)
    return (
      <div className="grid place-items-center px-6 py-25 text-[0.95rem] font-semibold text-ink-3 before:mx-auto before:mb-4 before:block before:size-[30px] before:animate-spin before:rounded-full before:border-4 before:border-surface-highest before:border-t-ring before:content-['']">
        Loading your account…
      </div>
    )
  if (!profile.active) return <NoProfile inactive />

  return <Outlet />
}

function NoProfile({ inactive, error }: { inactive?: boolean; error?: string }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="grid min-h-screen grid-cols-[1fr] bg-white md:grid-cols-[1fr_clamp(420px,36vw,560px)]">
      <div className="relative hidden flex-col items-start justify-between gap-11 overflow-hidden bg-gradient-to-br from-[#0c3d23] from-0% via-[#07552a] via-48% to-[#063a20] to-100% p-[clamp(32px,4vw,64px)] text-[#eaf6ee] md:flex">
        <div className="pointer-events-none absolute -inset-[20%] bg-[radial-gradient(560px_400px_at_78%_12%,rgba(127,252,151,0.24),transparent_68%),radial-gradient(680px_460px_at_8%_88%,rgba(49,107,243,0.18),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [mask-image:radial-gradient(80%_70%_at_50%_40%,#000_30%,transparent_100%)] bg-[size:56px_56px]" />
        <div className="relative z-1 flex items-center gap-3">
          <BrandMark variant="glass" className="size-[46px]" />
          <div>
            <strong className="block text-[1.08rem] leading-[1.2] font-extrabold tracking-[-0.025em] text-white">
              Dairydash
            </strong>
            <span className="text-[0.7rem] font-semibold tracking-[0.14em] text-[#e2f4e8]/66 uppercase">
              Dairy Cooperative
            </span>
          </div>
        </div>
        <div className="relative z-1">
          <h1 className="max-w-[16ch] text-[clamp(2.3rem,1.6rem+2.4vw,3.3rem)] leading-[1.08] font-extrabold tracking-[-0.035em] text-white">
            Account not linked to a staff profile.
          </h1>
        </div>
        <div className="relative z-1 flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.13em] text-[#e2f4e8]/62 uppercase before:h-px before:w-6 before:bg-[#e2f4e8]/40 before:content-['']">
          Ghardailo Dugdh Dairy Cooperative · Paroha Mun, Rautahat
        </div>
      </div>
      <div className="grid place-items-center bg-[radial-gradient(680px_340px_at_100%_0%,rgba(231,245,236,0.75),transparent_60%),#ffffff] p-[clamp(32px,4vw,56px)] max-md:px-5 max-md:py-7.5">
        <div className="w-full max-w-[384px]">
          <h2 className="text-[1.7rem] font-extrabold tracking-[-0.035em]">
            {error ? 'Could not load your account' : inactive ? 'Account deactivated' : 'Almost there'}
          </h2>
          <p className="mt-2 mb-[18px] text-[0.9rem] text-ink-3">
            {error
              ? error
              : inactive
                ? 'Your staff account has been deactivated. Contact the owner.'
                : 'This login exists but has no staff profile yet. Ask the owner to add you, then sign in again.'}
          </p>
          <Button
            block
            className="mt-2 h-[50px]"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  if (profile?.role !== 'owner') return <Navigate to="/today" replace />
  return <>{children}</>
}
