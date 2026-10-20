import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { C, STYLES, Wordmark, AsciiRidge } from './SimpleLanding.jsx'
import { supabase, configured } from './src/lib/supabase.js'

// Landing page for the "reset password" email. Supabase signs the user in with a recovery
// session from the link; here they choose a new password.
export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY' || s) setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return setError('Use at least 8 characters')
    setBusy(true); setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) return setError(err.message)
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 antialiased" style={{ background: C.bg, color: C.fg, fontFamily: "'Sora', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{STYLES}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0"><AsciiRidge flip height={380} opacity={0.14} /></div>
      <div className="ssy-rise relative w-full max-w-sm">
        <div className="mb-10 flex justify-center"><Link to="/"><Wordmark height={15} /></Link></div>
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: C.line2 }}>
          <KeyRound size={20} style={{ color: C.dim }} />
        </div>
        <h1 className="text-center text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>Choose a new password</h1>
        {!ready ? (
          <p className="mt-4 text-center text-sm leading-relaxed" style={{ color: C.dim }}>
            Open this page from the link in your reset email. If the link expired,{' '}
            <Link to="/signin" className="underline underline-offset-2">request a new one</Link>.
          </p>
        ) : (
          <form className="mt-8 space-y-3" onSubmit={submit} noValidate>
            <label className="input w-full rounded-xl border-white/15 bg-white/[0.03]">
              <input type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null) }} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="text-white/40 hover:text-white">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </label>
            {error ? <div role="alert" className="alert alert-error alert-soft py-2.5 text-sm"><span>{error}</span></div> : null}
            <button type="submit" disabled={busy} className="btn btn-primary w-full rounded-xl">
              {busy ? <span className="loading loading-spinner loading-sm" /> : null} Save password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
