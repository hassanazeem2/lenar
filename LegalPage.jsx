// Terms, Privacy, Refunds and Contact. Plain pages on the site's shell, one shared layout.
// These are a sensible starting point written for how lenar actually works (prepaid credit,
// Stripe and WolvPay, keys from an upstream provider); have them reviewed before relying on them.
import { Link, useLocation } from 'react-router-dom'
import { Mail, Activity, BookOpen } from 'lucide-react'
import { C, cn, SHELL, STYLES, Nav, Footer } from './SimpleLanding.jsx'
import { usePageMeta } from './src/meta.js'

export const SUPPORT_EMAIL = 'support@lenar.cc'
const UPDATED = 'October 22, 2026'

const Mailto = () => <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2 hover:text-[#cd8a4c]">{SUPPORT_EMAIL}</a>

const DOCS = {
  terms: {
    title: 'Terms of Service',
    intro: 'These terms cover your use of lenar: the website, the dashboard and the API at lenar.cc/v1. By creating an account or using an API key you agree to them.',
    sections: [
      ['The service', <>lenar gives you one API key and one endpoint for many AI models made by other companies. Requests you send are passed to the model provider that runs the model, and the response is passed back to you. Which models are offered, and their prices, can change; the live list is on the <Link to="/pricing" className="underline underline-offset-2">pricing page</Link>.</>],
      ['Your account', 'You need an account to buy credit and get a key. Give a real email address and keep your password and API key private. You are responsible for everything done with your key until you roll it. If you think it leaked, roll it from the dashboard straight away.'],
      ['Credit and billing', 'lenar is prepaid. You add credit by card (through Stripe) or by crypto (through WolvPay), and each request is charged per token at the rate shown for that model at the time of the request, with cached input charged at the lower cached rate. There is no subscription. Credit has no cash value and cannot be transferred to another account.'],
      ['Acceptable use', 'Do not use lenar to break the law, to harm or harass people, to create malware or attack systems, to generate sexual content involving minors, or to break the usage policies of the provider whose model you call. Do not resell or share your key, try to get around rate limits or billing, or probe the service for weaknesses. We may suspend a key or an account that does any of this, and unused credit on an account suspended for abuse may not be refunded.'],
      ['Availability', 'We aim to keep lenar running, but models depend on outside providers and can be slow or unavailable; the status page shows their health. The service is provided "as is", without guarantees of uptime, accuracy of model output, or fitness for a particular purpose. Model output can be wrong; check it before you rely on it.'],
      ['Liability', 'To the extent the law allows, lenar is not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.'],
      ['Ending', 'You can stop using lenar at any time. We may end or suspend accounts that break these terms. Unused credit after closing an account is handled under the refund policy.'],
      ['Changes', 'We may update these terms. The date at the top shows the latest version; if a change is significant we will tell you by email or in the dashboard. Using lenar after a change means you accept it.'],
      ['Contact', <>Questions about these terms: <Mailto />.</>],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This explains what lenar collects, why, and who else handles it. We keep as little as we can.',
    sections: [
      ['What we collect', <>Your email address; a hashed password (we never see the password itself), or your Google account ID if you sign in with Google; your API key, stored encrypted so the dashboard can read your usage; your top-ups (amount, method, date and status); and daily snapshots of your total spend for the dashboard chart. Card and wallet details are entered on Stripe&rsquo;s or WolvPay&rsquo;s pages and never reach us.</>],
      ['Your prompts', 'lenar does not store the content of your requests or of the model responses. They pass through our gateway to the model provider and back. The provider that runs a model processes your request under its own terms and may keep it for a period, for example for abuse monitoring.'],
      ['How we use it', 'To run your account and key, to show your balance and usage, to take payments and add credit, to send account emails (verification, password reset, payment problems), to keep the service secure (for example rate limits on sign-in), and to meet legal obligations. We do not sell your data or use it for advertising.'],
      ['Who handles it', 'Cloudflare (hosting and our API gateway), Railway (our servers and database), Stripe (card payments), WolvPay (crypto payments), Resend (account emails), Google (only if you sign in with Google), and the AI model providers that process your requests.'],
      ['Cookies', 'lenar keeps you signed in with a token stored in your browser. We do not use advertising or tracking cookies.'],
      ['How long we keep it', 'Account data is kept while your account is open. Payment records are kept as long as tax and accounting rules require. Ask us to delete your account and we will remove the rest.'],
      ['Your rights', <>You can ask for a copy of your data, ask us to correct it, or ask us to delete your account by emailing <Mailto />. Depending on where you live you may also have the right to complain to a data protection authority.</>],
      ['Changes', 'We will update this page if what we collect or who handles it changes, and change the date at the top.'],
    ],
  },
  refunds: {
    title: 'Refund Policy',
    intro: 'lenar is prepaid, so refunds are about credit you have not used yet.',
    sections: [
      ['Unused credit', <>Within 14 days of a top-up you can ask for a refund of the part of that top-up you have not spent. Email <Mailto /> from your account&rsquo;s address with the date and amount. Card refunds go back to the original card through Stripe and usually arrive in 5 to 10 business days.</>],
      ['Used credit', 'Credit already spent on requests cannot be refunded, because it has already been paid to the model providers.'],
      ['Crypto payments', 'Crypto top-ups are refunded in a stable coin or the same coin at the dollar value of the unused credit, to an address you give us, minus network fees. We cannot reverse a payment sent to the wrong address or an underpaid invoice.'],
      ['Failed or stuck top-ups', 'If you paid and your credit shows as Processing for more than an hour, contact us and we will add it or refund it in full.'],
      ['Chargebacks', 'Please contact us before disputing a charge with your bank; we can usually sort it out faster. Accounts with a disputed payment are paused until it is resolved.'],
      ['Abuse', 'Credit on accounts suspended for breaking the terms of service may not be refunded.'],
    ],
  },
}

function Shell({ children }) {
  return (
    <div className="min-h-screen antialiased" style={{ background: C.bg, color: C.fg, fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{STYLES}</style>
      <Nav />
      <main className={cn(SHELL, 'pb-24 pt-14 sm:pt-20')}>{children}</main>
      <Footer />
    </div>
  )
}

export function LegalPage({ doc }) {
  const d = DOCS[doc]
  usePageMeta(`${d.title} · lenar`, d.intro)
  return (
    <Shell>
      <article className="mx-auto max-w-[68ch]">
        <h1 className="font-medium" style={{ fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.035em' }}>{d.title}</h1>
        <p className="mt-3 text-[15px]" style={{ color: C.dim }}>Last updated {UPDATED}</p>
        <p className="mt-8 text-[18px] leading-relaxed">{d.intro}</p>
        {d.sections.map(([h, body]) => (
          <section key={h} className="mt-10">
            <h2 className="text-[20px] font-medium" style={{ letterSpacing: '-0.01em' }}>{h}</h2>
            <p className="mt-3 text-[16px] leading-relaxed" style={{ color: 'rgba(243,239,231,0.82)' }}>{body}</p>
          </section>
        ))}
        <nav className="mt-14 flex flex-wrap gap-x-6 gap-y-2 text-[15px]" style={{ color: C.dim }}>
          {Object.entries(DOCS).filter(([k]) => k !== doc).map(([k, v]) => <Link key={k} to={`/${k}`} className="py-1 hover:text-[#cd8a4c]">{v.title}</Link>)}
          <Link to="/contact" className="py-1 hover:text-[#cd8a4c]">Contact</Link>
        </nav>
      </article>
    </Shell>
  )
}

export function ContactPage() {
  usePageMeta('Contact · lenar', 'Get help with your lenar account, API key or a payment.')
  const { search } = useLocation()
  const topic = new URLSearchParams(search).get('topic')
  const cards = [
    { icon: Mail, title: 'Email support', body: 'Account, key or payment problems. Include the email you signed up with, and for payments the date and amount.', action: <a href={`mailto:${SUPPORT_EMAIL}${topic ? `?subject=${encodeURIComponent(topic)}` : ''}`} className="text-[16px] font-medium underline underline-offset-4 hover:text-[#cd8a4c]">{SUPPORT_EMAIL}</a> },
    { icon: Activity, title: 'Is a model down?', body: 'Check live uptime and response times for every model before you write in.', action: <Link to="/status" className="text-[16px] font-medium underline underline-offset-4 hover:text-[#cd8a4c]">Status page</Link> },
    { icon: BookOpen, title: 'Setting up', body: 'Base URL, SDK examples, errors and limits are all in the docs.', action: <Link to="/docs" className="text-[16px] font-medium underline underline-offset-4 hover:text-[#cd8a4c]">Read the docs</Link> },
  ]
  return (
    <Shell>
      <h1 className="font-medium" style={{ fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.035em' }}>Contact</h1>
      <p className="mt-4 max-w-[52ch] text-[18px] leading-relaxed">We answer support email within one business day. A payment showing as Processing for over an hour gets looked at first.</p>
      <div className="mt-10 grid gap-2 md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="flex flex-col rounded-[14px] p-6" style={{ background: '#14120f' }}>
            <c.icon size={20} strokeWidth={1.75} style={{ color: '#cd8a4c' }} />
            <h2 className="mt-4 text-[20px] font-medium">{c.title}</h2>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed" style={{ color: 'rgba(243,239,231,0.75)' }}>{c.body}</p>
            <div className="mt-5">{c.action}</div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-[15px]" style={{ color: C.dim }}>
        See also the <Link to="/terms" className="underline underline-offset-2">terms</Link>, <Link to="/privacy" className="underline underline-offset-2">privacy policy</Link> and <Link to="/refunds" className="underline underline-offset-2">refund policy</Link>.
      </p>
    </Shell>
  )
}
