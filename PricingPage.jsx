import { useState } from 'react'
import { C, STYLES, Nav, Footer } from './SimpleLanding.jsx'
import { BOARD_STYLES, ModelBoard, TopUps } from './LandingBoard.jsx'
import { useLiveModels } from './models.js'

// Pricing is the landing page's live board on its own, every model shown, plus the top-up tiles.
export default function PricingPage() {
  const { models, live, checkedAt } = useLiveModels()
  const [selected, setSelected] = useState('claude-opus-5-5')
  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: C.bg, color: C.fg, fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{STYLES}</style>
      <style>{BOARD_STYLES}</style>
      <Nav wide />
      <main className="pb-10">
        <ModelBoard
          models={models}
          live={live}
          checkedAt={checkedAt}
          selected={selected}
          setSelected={setSelected}
          title="Pricing, per million tokens."
          limit={models.length}
          headingAs="h1"
        />
        <TopUps models={models} selected={selected} setSelected={setSelected} />
      </main>
      <Footer />
    </div>
  )
}
