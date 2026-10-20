import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { C, STYLES, Wordmark } from './SimpleLanding.jsx'
import { api } from './src/lib/api.js'

// Lands here from the "verify your email" link. Signing in doesn't require this —
// it just marks the account verified for anything that checks it later.
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [state, setState] = useState('checking') // checking | ok | error

  useEffect(() => {
    const token = params.get('token')
    if (!token) return setState('error')
    api('/auth/verify', { token }).then(() => setState('ok')).catch(() => setState('error'))
  }, [params])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: C.bg, color: C.fg }}>
      <style>{STYLES}</style>
      <Link to="/" className="mb-10"><Wordmark /></Link>
      <h1 className="text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>
        {state === 'checking' ? 'Verifying…' : state === 'ok' ? 'Email verified' : 'Link expired'}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed" style={{ color: C.dim }}>
        {state === 'error' ? 'That verification link is invalid or has expired.' : 'You can close this tab and head back to your dashboard.'}
      </p>
      <Link to="/dashboard" className="mt-8 text-sm hover:text-white" style={{ color: C.dim }}>Go to dashboard →</Link>
    </div>
  )
}
