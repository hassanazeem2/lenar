import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setToken } from './src/lib/api.js'

// Google OAuth lands here with ?token=... after the backend signs the user in.
export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  useEffect(() => {
    const token = params.get('token')
    if (token) setToken(token)
    navigate(token ? '/dashboard' : '/signin', { replace: true })
  }, [params, navigate])
  return null
}
