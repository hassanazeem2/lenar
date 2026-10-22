import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, MailCheck } from 'lucide-react'
import { C, cn, STYLES, Wordmark, AsciiRidge } from './SimpleLanding.jsx'
import { auth, configured, useSession } from './src/lib/api.js'
import { Tabs, TabsList, TabsTrigger } from './src/ui.jsx'

const AUTH_STYLES = `
@keyframes au-shake { 10%,90% { transform: translateX(-1px) } 20%,80% { transform: translateX(3px) } 30%,50%,70% { transform: translateX(-6px) } 40%,60% { transform: translateX(6px) } }
@keyframes au-orb { 0%,100% { transform: translate(0,0) scale(1) } 33% { transform: translate(40px,-30px) scale(1.1) } 66% { transform: translate(-30px,20px) scale(0.95) } }
@keyframes au-blink { 50% { opacity: 0 } }
@keyframes au-spin-border { to { --au-angle: 360deg } }
@property --au-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false }
.au-shake { animation: au-shake 500ms cubic-bezier(.36,.07,.19,.97) both }
.au-orb { animation: au-orb 18s ease-in-out infinite }
.au-caret { animation: au-blink 1s step-end infinite }
.au-ring { background: conic-gradient(from var(--au-angle), transparent 0deg, rgba(244,245,246,0.35) 60deg, transparent 120deg); animation: au-spin-border 6s linear infinite }
.au-input:focus + label, .au-input:not(:placeholder-shown) + label { transform: translateY(-9px) scale(0.78); color: rgba(244,245,246,0.5) }
@media (prefers-reduced-motion: reduce) { .au-shake, .au-orb, .au-caret, .au-ring { animation: none } }
`

/* ---------- left: animated showcase ---------- */

const SCRIPTS = [
  { model: 'claude-opus-5-5', prompt: 'Refactor this function to be pure.', reply: 'Done. Moved the side effects out and returned a new object.', ms: '4.9s' },
  { model: 'gpt-6-sol', prompt: 'Summarise the incident in one line.', reply: 'A cache miss storm overloaded the DB. Fixed with request coalescing.', ms: '2.0s' },
  { model: 'gemini-4-argon', prompt: 'Translate to French: ship it.', reply: 'Livrez-le.', ms: '1.7s' },
  { model: 'deepseek-v4-pro-0813', prompt: 'Write a regex for semver.', reply: '^\\d+\\.\\d+\\.\\d+(-[\\w.]+)?$', ms: '5.2s' },
]

function useTyped(text, speed, start) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    if (!start) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(text.length)
    const t = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(t), v) : v + 1)), speed)
    return () => clearInterval(t)
  }, [text, speed, start])
  return [text.slice(0, n), n >= text.length]
}

function Terminal() {
  const [i, setI] = useState(0)
  const s = SCRIPTS[i]
  const [prompt, promptDone] = useTyped(s.prompt, 38, true)
  const [reply, replyDone] = useTyped(s.reply, 18, promptDone)

  useEffect(() => {
    if (!replyDone) return
    const t = setTimeout(() => setI((v) => (v + 1) % SCRIPTS.length), 2200)
    return () => clearTimeout(t)
  }, [replyDone])

  return (
    <div className="relative rounded-2xl p-px">
      <div className="au-ring absolute inset-0 rounded-2xl" />
      <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: C.line, background: 'rgba(10,11,12,0.92)' }}>
        <div className="flex items-center gap-1.5 border-b px-4 py-3" style={{ borderColor: C.line }}>
          {[0, 1, 2].map((k) => <span key={k} className="h-2.5 w-2.5 rounded-full" style={{ background: 'rgba(244,245,246,0.12)' }} />)}
          <span className="ml-3 font-mono text-xs" style={{ color: C.faint }}>POST /v1/chat/completions</span>
        </div>
        <div className="space-y-3 px-5 py-5 font-mono text-[13px] leading-relaxed">
          <div key={s.model} className="ssy-fade flex items-center gap-2">
            <span style={{ color: C.faint }}>model</span>
            <span className="rounded px-1.5 py-0.5" style={{ background: 'rgba(205,138,76,0.12)', color: C.accent }}>{s.model}</span>
          </div>
          <div>
            <span style={{ color: C.faint }}>user › </span>
            <span style={{ color: C.fg }}>{prompt}</span>
            {!promptDone ? <span className="au-caret">▍</span> : null}
          </div>
          <div className="min-h-[44px]">
            {promptDone ? (
              <>
                <span style={{ color: C.up }}>assistant › </span>
                <span style={{ color: 'rgba(244,245,246,0.75)' }}>{reply}</span>
                {!replyDone ? <span className="au-caret">▍</span> : null}
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: C.line, color: C.faint }}>
            <span className="transition-opacity" style={{ opacity: replyDone ? 1 : 0 }}>200 OK · {s.ms}</span>
            <span className="flex gap-1">
              {SCRIPTS.map((_, k) => (
                <span key={k} className="h-1 rounded-full transition-all duration-500" style={{ width: k === i ? 16 : 6, background: k === i ? C.fg : 'rgba(244,245,246,0.15)' }} />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Showcase() {
  return (
    <div className="relative hidden overflow-hidden border-r lg:flex lg:flex-col" style={{ borderColor: C.line }}>
      <div className="au-orb pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(205,138,76,0.18), transparent 65%)' }} />
      <div className="au-orb pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.1), transparent 65%)', animationDelay: '-9s' }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0"><AsciiRidge height={340} opacity={0.35} /></div>

      <div className="relative z-10 p-10"><Link to="/"><Wordmark /></Link></div>
      <div className="relative z-10 flex flex-1 flex-col justify-center px-10 pb-24 xl:px-16">
        <h2 className="ssy-rise max-w-md font-medium leading-tight" style={{ fontSize: 'clamp(28px, 3vw, 40px)', letterSpacing: '-0.03em' }}>
          One key. <span style={{ color: 'rgba(244,245,246,0.35)' }}>Every model.</span>
        </h2>
        <p className="ssy-rise mt-4 max-w-sm text-sm leading-relaxed" style={{ color: C.dim, animationDelay: '120ms' }}>
          GPT, Claude, Gemini, DeepSeek and more behind one endpoint, with per-token billing and nothing to migrate.
        </p>
        <div className="ssy-rise mt-10 max-w-lg" style={{ animationDelay: '240ms' }}><Terminal /></div>
      </div>
    </div>
  )
}

/* ---------- right: form ---------- */

function Field({ id, label, type = 'text', value, onChange, error, autoComplete, trailing }) {
  return (
    <div>
      <div className="group relative">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder=" "
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="au-input peer w-full rounded-xl border px-4 pb-2 pt-5 text-sm outline-none transition-all duration-200 focus:border-white/30 focus:shadow-[0_0_0_4px_rgba(244,245,246,0.05)]"
          style={{ borderColor: error ? C.down : C.line2, background: 'rgba(244,245,246,0.03)', color: C.fg, paddingRight: trailing ? 44 : undefined }}
        />
        <label htmlFor={id} className="pointer-events-none absolute left-4 top-3.5 origin-left text-sm transition-all duration-200" style={{ color: C.faint }}>
          {label}
        </label>
        {trailing ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div> : null}
      </div>
      <div className="grid transition-all duration-300" style={{ gridTemplateRows: error ? '1fr' : '0fr' }}>
        <p className="overflow-hidden" style={{ fontSize: 12.5, color: C.down }}><span className="block pt-1.5">{error}</span></p>
      </div>
    </div>
  )
}

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const STRENGTH = [['Too short', C.down], ['Weak', C.down], ['Okay', '#fbbf24'], ['Good', C.up], ['Strong', C.up]]

function Strength({ pw }) {
  const s = pw.length < 8 ? 0 : strength(pw)
  const [label, color] = STRENGTH[s]
  return (
    <div className="grid transition-all duration-300" style={{ gridTemplateRows: pw ? '1fr' : '0fr' }}>
      <div className="overflow-hidden">
        <div className="flex items-center gap-3 pt-1">
          <div className="flex flex-1 gap-1">
            {[1, 2, 3, 4].map((k) => (
              <span key={k} className="h-1 flex-1 rounded-full transition-colors duration-300" style={{ background: k <= s ? color : 'rgba(244,245,246,0.08)' }} />
            ))}
          </div>
          <span className="w-16 text-right text-xs" style={{ color }}>{label}</span>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

function ModeToggle({ isSignup }) {
  const navigate = useNavigate()
  return (
    <Tabs value={isSignup ? 'signup' : 'signin'} onValueChange={(v) => navigate(`/${v}`, { replace: true })}>
      <TabsList className="!grid w-full grid-cols-2">
        <TabsTrigger value="signin" className="w-full py-2 text-sm">Sign in</TabsTrigger>
        <TabsTrigger value="signup" className="w-full py-2 text-sm">Create account</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export default function AuthScreen({ mode = 'signup' }) {
  const isSignup = mode === 'signup'
  const navigate = useNavigate()
  const [view, setView] = useState('form') // form | reset | sent
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(0)
  const [sentMsg, setSentMsg] = useState('')

  // Reset state when switching between sign in and sign up.
  useEffect(() => { setErrors({}); setConfirm(''); setView('form') }, [mode])

  // The backend sends failed Google sign-ins back here with ?error=google_failed.
  const [params] = useSearchParams()
  useEffect(() => {
    if (params.get('error') === 'google_failed') setErrors({ form: 'Google sign-in failed. Try again, or use email and password.' })
  }, [params])

  // Already signed in? Go straight to the dashboard.
  const session = useSession()
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  const fail = (next) => { setErrors(next); setShake((k) => k + 1) }
  const clear = (k) => setErrors((e) => ({ ...e, [k]: undefined, form: undefined }))

  const validate = () => {
    const next = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email'
    if (view === 'form') {
      if (!password) next.password = 'Password is required'
      else if (isSignup && password.length < 8) next.password = 'Use at least 8 characters'
      if (isSignup && password !== confirm) next.confirm = 'Passwords do not match'
    }
    if (Object.keys(next).length) { fail(next); return false }
    return true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (loading || !validate()) return
    if (!configured) return fail({ form: 'Sign-in isn\'t connected yet. Add your API URL to .env (see SETUP.md).' })
    setLoading(true)
    try {
      if (view === 'reset') {
        await auth.forgotPassword(email).catch((e) => { throw e })
        setSentMsg(`If ${email} has an account, we sent a reset link.`)
        return setView('sent')
      }
      if (isSignup) await auth.signUp(email, password)
      else await auth.signIn(email, password)
      navigate('/dashboard')
    } catch (e) {
      fail({ form: e.message })
    } finally {
      setLoading(false)
    }
  }

  const google = () => {
    if (!configured) return fail({ form: 'Sign-in isn\'t connected yet. Add your API URL to .env (see SETUP.md).' })
    auth.signInWithGoogle()
  }

  const heading = view === 'reset' ? 'Reset your password' : isSignup ? 'Create your account' : 'Welcome back'
  const sub = view === 'reset'
    ? "Enter your email and we'll send you a reset link."
    : isSignup ? 'Get an API key and start calling any model in minutes.' : 'Sign in to manage your keys and credits.'

  return (
    <div className="grid min-h-screen antialiased lg:grid-cols-[1.1fr_1fr]" style={{ background: C.bg, color: C.fg, fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{STYLES + AUTH_STYLES}</style>
      <Showcase />

      <div className="relative flex flex-col items-center justify-center px-6 py-14">
        <div className="pointer-events-none absolute inset-x-0 top-0 lg:hidden"><AsciiRidge flip height={360} opacity={0.12} /></div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-10 flex justify-center lg:hidden"><Link to="/"><Wordmark height={15} /></Link></div>

          {view === 'sent' ? (
            <div className="ssy-rise text-center">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border" style={{ borderColor: C.line2, background: 'rgba(74,222,128,0.08)' }}>
                <MailCheck size={24} style={{ color: C.up }} />
              </div>
              <h1 className="text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>Check your inbox</h1>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: C.dim }}>{sentMsg}</p>
              <button type="button" onClick={() => setView('form')} className="mt-8 inline-flex items-center gap-1.5 text-sm hover:text-white" style={{ color: C.dim }}>
                <ArrowLeft size={14} /> Back
              </button>
            </div>
          ) : (
            // Keyed on view only, so switching sign in / sign up keeps the toggle mounted and its indicator slides.
            <div key={view} className="ssy-rise">
              {view === 'form' ? <ModeToggle isSignup={isSignup} /> : (
                <button type="button" onClick={() => setView('form')} className="inline-flex items-center gap-1.5 text-sm hover:text-white" style={{ color: C.dim }}>
                  <ArrowLeft size={14} /> Back to sign in
                </button>
              )}

              <div key={mode} className="ssy-fade">
                <h1 className="mt-8 text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>{heading}</h1>
                <p className="mt-2 text-sm" style={{ color: C.dim }}>{sub}</p>
              </div>

              <form key={shake} className={cn('mt-8 space-y-3', shake && 'au-shake')} onSubmit={onSubmit} noValidate>
                <Field id="email" label="Email" type="email" autoComplete="email" value={email}
                  onChange={(v) => { setEmail(v); clear('email') }} error={errors.email} />

                {view === 'form' ? (
                  <>
                    <Field
                      id="password" label="Password" type={showPw ? 'text' : 'password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      value={password} onChange={(v) => { setPassword(v); clear('password') }} error={errors.password}
                      trailing={(
                        <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}
                          className="rounded-lg p-2 transition-colors hover:bg-white/5 hover:text-white" style={{ color: C.faint }}>
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}
                    />
                    {isSignup ? (
                      <>
                        <Strength pw={password} />
                        <Field id="confirm" label="Confirm password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                          value={confirm} onChange={(v) => { setConfirm(v); clear('confirm') }} error={errors.confirm} />
                      </>
                    ) : (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => { setView('reset'); setErrors({}) }} className="-my-2 py-2 text-[13px] transition-colors hover:text-white" style={{ color: C.dim }}>
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </>
                ) : null}

                {errors.form ? (
                  <div role="alert" className="alert alert-error alert-soft ssy-fade py-2.5 text-sm"><span>{errors.form}</span></div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-sm font-medium transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-70"
                  style={{ background: C.fg, color: C.bg }}
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {loading ? <span className="loading loading-spinner loading-sm" /> : null}
                  {view === 'reset' ? 'Send reset link' : isSignup ? 'Create account' : 'Sign in'}
                  {!loading ? <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /> : null}
                </button>

                {view === 'form' ? (
                  <>
                    <div className="flex items-center gap-3 py-2">
                      <span className="h-px flex-1" style={{ background: C.line2 }} />
                      <span className="text-xs" style={{ color: C.faint }}>or</span>
                      <span className="h-px flex-1" style={{ background: C.line2 }} />
                    </div>
                    <button
                      type="button"
                      onClick={google}
                      className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border px-5 py-3 text-sm font-medium transition-all hover:bg-white/[0.04] active:scale-[0.98]"
                      style={{ borderColor: C.line2, color: C.fg }}
                    >
                      <GoogleIcon /> Continue with Google
                    </button>
                  </>
                ) : null}

                {isSignup && view === 'form' ? (
                  <p className="pt-2 text-center text-xs leading-relaxed" style={{ color: C.faint }}>
                    By creating an account you agree to our Terms and Privacy Policy.
                  </p>
                ) : null}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
