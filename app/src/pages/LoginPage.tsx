import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { BrandMark } from '../components/BrandMark'
import { Icon } from '../components/Icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/Notice'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate('/today', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-white md:grid-cols-[1fr_clamp(420px,36vw,560px)]">
      {/* ── brand panel (desktop) ── */}
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
            Every litre, every rupee, accounted for.
          </h1>
          <p className="mt-4 max-w-[40ch] text-[1rem] leading-[1.7] text-[#e2f4e8]/80">
            Sales, collections and customer credit for the Dairydash counter — recorded once and traceable everywhere.
          </p>
        </div>

        <p className="relative z-1 flex items-center gap-2.5 text-[0.72rem] font-bold tracking-[0.13em] text-[#e2f4e8]/62 uppercase before:h-px before:w-6 before:bg-[#e2f4e8]/40 before:content-['']">
          Ghardailo Dugdh Dairy Cooperative · Paroha Mun, Rautahat
        </p>
      </div>

      {/* ── sign-in panel ── */}
      <div className="grid place-items-center bg-[radial-gradient(680px_340px_at_100%_0%,rgba(231,245,236,0.75),transparent_60%),#ffffff] px-5 py-7 md:px-[clamp(32px,4vw,56px)]">
        <div className="w-full max-w-[384px]">
          <span className="mb-2.5 inline-flex items-center gap-2 text-[0.72rem] font-extrabold tracking-[0.15em] text-primary uppercase before:block before:h-[2.5px] before:w-4 before:rounded-[3px] before:bg-current before:opacity-55">
            Staff access
          </span>
          <h2 className="text-[1.7rem] font-extrabold tracking-[-0.035em]">Sign in to the counter</h2>
          <p className="mt-1.5 mb-6 text-[0.9rem] leading-[1.55] text-ink-3">
            Use the account the owner created for you.
          </p>

          <form onSubmit={handleSubmit}>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="mb-4">
              <Label className="mb-[7px]" htmlFor="login-email">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                className="h-[50px]"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <Label className="mb-[7px]" htmlFor="login-password">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                className="h-[50px]"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button block type="submit" className="mt-2 h-[50px]" disabled={busy}>
              <Icon name="lock" />
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
