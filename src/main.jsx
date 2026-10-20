import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import './index.css'
import SimpleLanding from '../SimpleLanding.jsx'
import PricingPage from '../PricingPage.jsx'
import AuthScreen from '../AuthScreen.jsx'
import Dashboard from '../Dashboard.jsx'
import DocsPage from '../DocsPage.jsx'
import StatusPage from '../StatusPage.jsx'
import ResetPassword from '../ResetPassword.jsx'
import NotFound from '../NotFound.jsx'

// Sign in and sign up share one key so the toggle between them slides instead of re-entering the page.
const pageKey = (path) => {
  if (path === '/signin' || path === '/signup') return 'auth'
  // The dashboard animates its own sub-pages.
  if (path.startsWith('/dashboard')) return 'dashboard'
  return path
}

function scrollToHash(hash, behavior) {
  const el = hash && document.getElementById(decodeURIComponent(hash.slice(1)))
  if (el) el.scrollIntoView({ behavior })
  return Boolean(el)
}

function AnimatedRoutes() {
  const location = useLocation()

  // Same page, new hash (e.g. "Models" while already on the landing page): glide to the section.
  useEffect(() => {
    scrollToHash(location.hash, 'smooth')
  }, [location.hash])

  return (
    <AnimatePresence
      mode="wait"
      initial={false}
      // Once the old page has faded out, start the new one at the top (or at its #section).
      onExitComplete={() => { if (!scrollToHash(location.hash, 'instant')) window.scrollTo(0, 0) }}
    >
      <motion.div
        key={pageKey(location.pathname)}
        initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
        exit={{ opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
      >
        <Routes location={location}>
          <Route path="/" element={<SimpleLanding />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/signup" element={<AuthScreen mode="signup" />} />
          <Route path="/signin" element={<AuthScreen mode="signin" />} />
          <Route path="/dashboard/*" element={<Dashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/status" element={<StatusPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* Honors the visitor's "reduce motion" setting for every Motion animation. */}
      <MotionConfig reducedMotion="user">
        <AnimatedRoutes />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
