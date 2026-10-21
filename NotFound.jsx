import { C, STYLES, Nav, PrimaryButton } from './SimpleLanding.jsx'

export default function NotFound() {
  return (
    <div className="min-h-screen antialiased" style={{ background: C.bg, color: C.fg, fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{STYLES}</style>
      <Nav />
      <main className="ssy-rise flex flex-col items-center px-6 py-40 text-center">
        <p className="font-mono text-sm" style={{ color: C.faint }}>404</p>
        <h1 className="mt-3 text-3xl font-medium" style={{ letterSpacing: '-0.03em' }}>This page doesn't exist</h1>
        <p className="mt-3 text-sm" style={{ color: C.dim }}>The link may be old, or the address has a typo.</p>
        <PrimaryButton to="/" className="mt-8">Back home</PrimaryButton>
      </main>
    </div>
  )
}
