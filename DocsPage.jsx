import { useEffect, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './src/ui.jsx'
import { API_BASE } from './src/lib/api.js'
import { Link } from 'react-router-dom'
import { AlertTriangle, Info } from 'lucide-react'
import { C, cn, SHELL, STYLES, Nav, Footer, CopyLine } from './SimpleLanding.jsx'
import { FAMILIES, MODEL_COUNT } from './models.js'

const BASE = API_BASE

/* ---------- building blocks ---------- */

function Code({ title, children }) {
  return (
    <div className="my-5 overflow-hidden rounded-xl border" style={{ borderColor: C.line2, background: 'rgba(0,0,0,0.35)' }}>
      <div className="flex items-center border-b px-4 py-2 text-xs" style={{ borderColor: C.line, color: C.faint }}>
        <span className="font-mono">{title}</span>
        <CopyLine text={children} />
      </div>
      <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-relaxed" style={{ color: 'rgba(244,245,246,0.85)' }}>
        <code>{children}</code>
      </pre>
    </div>
  )
}

function CodeTabs({ items }) {
  return (
    <Tabs defaultValue={items[0][0]} className="my-5">
      <TabsList>
        {items.map(([label]) => <TabsTrigger key={label} value={label}>{label}</TabsTrigger>)}
      </TabsList>
      {items.map(([label, code]) => (
        <TabsContent key={label} value={label} className="-mt-2">
          <Code title={label}>{code}</Code>
        </TabsContent>
      ))}
    </Tabs>
  )
}

function Endpoint({ method, path }) {
  return (
    <div className="my-5 flex items-center gap-3 rounded-xl border px-4 py-3 font-mono text-sm" style={{ borderColor: C.line2, background: 'rgba(0,0,0,0.35)' }}>
      <span className={cn('badge badge-sm font-semibold', method === 'GET' ? 'badge-info badge-soft' : 'badge-success badge-soft')}>{method}</span>
      <span className="truncate" style={{ color: 'rgba(244,245,246,0.85)' }}>{path}</span>
      <CopyLine text={path} />
    </div>
  )
}

function Callout({ warn, children }) {
  const Icon = warn ? AlertTriangle : Info
  const color = warn ? '#fbbf24' : C.accent
  return (
    <div className="my-5 flex gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: `${color}33`, background: `${color}0d`, color: 'rgba(244,245,246,0.8)' }}>
      <Icon size={16} className="mt-0.5 shrink-0" style={{ color }} />
      <div>{children}</div>
    </div>
  )
}

const P = ({ children }) => <p className="my-4 text-[15px] leading-7" style={{ color: 'rgba(244,245,246,0.68)' }}>{children}</p>
const K = ({ children }) => <code className="rounded px-1.5 py-0.5 font-mono text-[13px]" style={{ background: 'rgba(244,245,246,0.07)', color: C.fg }}>{children}</code>
const H3 = ({ children }) => <h3 className="mt-8 mb-2 text-base font-medium" style={{ color: C.fg }}>{children}</h3>

function Table({ head, rows }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border" style={{ borderColor: C.line2 }}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr style={{ background: 'rgba(244,245,246,0.03)' }}>
            {head.map((h, i) => <th key={i} className="px-4 py-2.5 text-xs font-medium uppercase tracking-wider" style={{ color: C.faint, fontSize: 10 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t" style={{ borderColor: C.line }}>
              {r.map((c, j) => <td key={j} className="px-4 py-2.5 align-top" style={{ color: j === 0 ? C.fg : 'rgba(244,245,246,0.62)' }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- content ---------- */

const SECTIONS = [
  {
    group: 'Getting started',
    items: [
      {
        id: 'introduction',
        title: 'Introduction',
        body: () => (
          <>
            <P>
              lenar is one API for {MODEL_COUNT} models from GPT, Claude, Gemini, DeepSeek, GLM, Grok and Kimi. You get one key,
              one base URL and one bill. Requests use the OpenAI format, so the SDK you already use keeps working.
            </P>
            <Table
              head={['', '']}
              rows={[
                ['Base URL', <K key="b">{BASE}</K>],
                ['Auth', <span key="a">Bearer token: <K>sk-lenar-…</K></span>],
                ['Format', 'OpenAI Chat Completions (plus an Anthropic-compatible messages endpoint)'],
                ['Billing', 'Prepaid credits, charged per token at the rates on the pricing page'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'quickstart',
        title: 'Quickstart',
        body: () => (
          <>
            <P>1. <Link to="/signup" className="underline underline-offset-2">Create an account</Link> and top up credits from the dashboard, by card or crypto. Your key is created after your first top-up.</P>
            <P>2. Reveal your key and copy it. We only show the full key once.</P>
            <Callout warn>Keep your key on the server. Never put it in front-end code, a mobile app, or a public repo.</Callout>
            <P>3. Point your SDK at lenar and send your first request:</P>
            <CodeTabs
              items={[
                ['Python', `from openai import OpenAI

client = OpenAI(
    base_url="${BASE}",
    api_key="sk-lenar-...",
)

res = client.chat.completions.create(
    model="claude-sonnet-5-5",
    messages=[{"role": "user", "content": "Say hello in five words."}],
)
print(res.choices[0].message.content)`],
                ['Node.js', `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${BASE}",
  apiKey: process.env.LENAR_API_KEY,
});

const res = await client.chat.completions.create({
  model: "gpt-6-sol",
  messages: [{ role: "user", content: "Say hello in five words." }],
});
console.log(res.choices[0].message.content);`],
                ['cURL', `curl ${BASE}/chat/completions \\
  -H "Authorization: Bearer $LENAR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gemini-4-argon",
    "messages": [{"role": "user", "content": "Say hello in five words."}]
  }'`],
              ]}
            />
          </>
        ),
      },
      {
        id: 'authentication',
        title: 'Authentication',
        body: () => (
          <>
            <P>Send your key in the <K>Authorization</K> header on every request.</P>
            <Code title="header">{'Authorization: Bearer sk-lenar-...'}</Code>
            <P>
              The Anthropic SDK sends <K>x-api-key</K> instead, and we accept that too. If a key is missing or wrong you get a <K>401</K>.
              If your balance runs out, requests are rejected until you add credit. Top up from the <Link to="/dashboard" className="underline underline-offset-2">dashboard</Link> and the key works again within seconds.
            </P>
          </>
        ),
      },
    ],
  },
  {
    group: 'API reference',
    items: [
      {
        id: 'chat-completions',
        title: 'Chat completions',
        body: () => (
          <>
            <Endpoint method="POST" path={`${BASE}/chat/completions`} />
            <Table
              head={['Field', 'Type', 'Notes']}
              rows={[
                ['model', 'string', 'Required. Any id from the Models section.'],
                ['messages', 'array', 'Required. Objects with role (system, user, assistant, tool) and content.'],
                ['max_tokens', 'integer', 'Upper limit on output tokens.'],
                ['temperature', 'number', '0 to 2. The default depends on the model.'],
                ['stream', 'boolean', 'Sends server-sent events. See Streaming.'],
                ['tools', 'array', 'Function definitions in OpenAI format, for models that support tools.'],
              ]}
            />
            <H3>Response</H3>
            <Code title="200 OK">{`{
  "id": "chatcmpl-9f2c…",
  "object": "chat.completion",
  "model": "claude-sonnet-5-5",
  "choices": [{
    "index": 0,
    "message": { "role": "assistant", "content": "Hello there, nice to meet!" },
    "finish_reason": "stop"
  }],
  "usage": { "prompt_tokens": 14, "completion_tokens": 7, "total_tokens": 21 }
}`}</Code>
            <P>Use <K>usage</K> to see exactly what each call cost. Cache reads and writes are billed at their own rates.</P>
          </>
        ),
      },
      {
        id: 'anthropic-messages',
        title: 'Anthropic messages',
        body: () => (
          <>
            <P>If your code already uses the Anthropic SDK, set its base URL to lenar. Claude models work through it unchanged.</P>
            <Code title="TypeScript">{`import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ baseURL: "${BASE}", apiKey: process.env.LENAR_API_KEY });

const msg = await client.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Summarise this in one line: …" }],
});`}</Code>
          </>
        ),
      },
      {
        id: 'streaming',
        title: 'Streaming',
        body: () => (
          <>
            <P>Set <K>stream: true</K> to get tokens as they're generated. Each event is a <K>chat.completion.chunk</K>, and the stream ends with <K>data: [DONE]</K>.</P>
            <Code title="Python">{`stream = client.chat.completions.create(
    model="gpt-6-sol",
    messages=[{"role": "user", "content": "Write a haiku about latency."}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)`}</Code>
          </>
        ),
      },
      {
        id: 'models',
        title: 'Models',
        body: () => (
          <>
            <P>Use these ids in the <K>model</K> field. You can also get the live list from the API:</P>
            <Endpoint method="GET" path={`${BASE}/models`} />
            {FAMILIES.filter((f) => f.models.length).map((f) => (
              <div key={f.id}>
                <H3>{f.label}</H3>
                <Table
                  head={['Model id', 'Standard $/M tokens', 'Cached input $/M']}
                  rows={f.models.map((m) => [
                    <K key="k">{m.id}</K>,
                    `$${m.price}`,
                    `$${m.cacheRead}`,
                  ])}
                />
              </div>
            ))}
            <P>See <Link to="/pricing" className="underline underline-offset-2">pricing</Link> for live rates and what each top-up buys, and <Link to="/status" className="underline underline-offset-2">status</Link> for live latency.</P>
          </>
        ),
      },
      {
        id: 'errors',
        title: 'Errors',
        body: () => (
          <>
            <P>Errors use the OpenAI shape: <K>{'{ "error": { "type", "message" } }'}</K>.</P>
            <Table
              head={['Status', 'Meaning', 'What to do']}
              rows={[
                ['400', 'Invalid request', 'Check the request body and the model id.'],
                ['401', 'Bad or missing key', 'Check the Authorization header.'],
                ['402', 'Out of credit', 'Top up from the dashboard.'],
                ['404', 'Unknown model', 'Get the list from GET /models.'],
                ['429', 'Rate limited', 'Back off and retry. Watch the Retry-After header.'],
                ['5xx', 'Upstream problem', 'Retry with backoff. We fail over automatically where we can.'],
              ]}
            />
          </>
        ),
      },
      {
        id: 'limits-billing',
        title: 'Limits & billing',
        body: () => (
          <>
            <P>
              Credits are prepaid in USD. Each request is charged for its input, output and cache tokens at that model's rate, and
              the cost comes off your balance. When the balance reaches zero, requests are rejected until you top up. You can check your balance and usage any time from the API (see below) or the dashboard.
            </P>
            <P>Rate limits apply per key. If you need higher limits for production traffic, contact us.</P>
          </>
        ),
      },
    ],
  },
  {
    group: 'Account',
    items: [
      {
        id: 'balance-usage',
        title: 'Balance & usage',
        body: () => (
          <>
            <P>These calls are free and work even when your balance is empty. Use the same key.</P>
            <Endpoint method="GET" path={`${BASE}/balance`} />
            <Endpoint method="GET" path={`${BASE}/usage`} />
            <P>
              <K>/usage</K> returns <K>windows["1h"]</K>, <K>windows["24h"]</K> and <K>windows["7d"]</K>, each with{' '}
              <K>total_tokens</K>, <K>cached_tokens</K>, <K>cost_usd</K> and <K>cache_savings_usd</K>.
            </P>
            <Code title="cURL">{`curl ${BASE}/usage \\
  -H "Authorization: Bearer $LENAR_API_KEY"`}</Code>
            <Endpoint method="GET" path={`${BASE}/status`} />
            <P>Live health for every model: <K>status</K> (<K>up</K>, <K>degraded</K>, <K>down</K>), <K>availability_pct</K> and <K>avg_latency_s</K>. The same data powers the <Link to="/status" className="underline underline-offset-2">status page</Link>.</P>
          </>
        ),
      },
    ],
  },
  {
    group: 'More',
    items: [
      {
        id: 'changelog',
        title: 'Changelog',
        body: () => (
          <Table
            head={['Date', 'Change']}
            rows={[
              ['Oct 20, 2026', 'Added Claude Opus 5.5, Sonnet 5.5 and Haiku 5.5. Refreshed the model catalog from the latest status probes.'],
              ['Oct 2026', 'Prepaid credits and the self-serve dashboard are live.'],
            ]}
          />
        ),
      },
    ],
  },
]

const ALL = SECTIONS.flatMap((s) => s.items)

/* ---------- page ---------- */

export default function DocsPage() {
  const [active, setActive] = useState(() => {
    const id = location.hash.slice(1)
    return ALL.some((x) => x.id === id) ? id : ALL[0].id
  })

  // Highlight the section in view.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-20% 0px -70% 0px' },
    )
    ALL.forEach(({ id }) => { const el = document.getElementById(id); if (el) io.observe(el) })
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView()
    return () => io.disconnect()
  }, [])

  return (
    <div className="min-h-screen antialiased" style={{ background: C.bg, color: C.fg, fontFamily: "'Instrument Sans', ui-sans-serif, system-ui, sans-serif" }}>
      <style>{STYLES}</style>
      <Nav />
      <div className={cn(SHELL, 'flex gap-12 py-12')}>
        <aside className="sticky top-24 hidden h-[calc(100vh-8rem)] w-52 shrink-0 overflow-y-auto md:block">
          {SECTIONS.map((s) => (
            <div key={s.group} className="mb-7">
              <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: C.faint, fontSize: 10 }}>{s.group}</p>
              {s.items.map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  className="relative block rounded-md py-1.5 pl-3 text-sm transition-colors hover:text-white"
                  style={{ color: active === it.id ? C.fg : C.dim }}
                >
                  <span
                    className="absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 transition-opacity"
                    style={{ background: C.fg, opacity: active === it.id ? 1 : 0 }}
                  />
                  {it.title}
                </a>
              ))}
            </div>
          ))}
        </aside>

        <main className="min-w-0 max-w-3xl flex-1">
          <div className="ssy-rise">
            <p className="text-xs uppercase tracking-widest" style={{ color: C.faint }}>Documentation</p>
            <h1 className="mt-2 font-medium" style={{ fontSize: 'clamp(32px, 5vw, 44px)', letterSpacing: '-0.03em' }}>Build with lenar</h1>
          </div>
          {SECTIONS.map((s) => s.items.map((it) => (
            <section key={it.id} id={it.id} className="scroll-mt-24 border-b py-10" style={{ borderColor: C.line }}>
              <h2 className="text-2xl font-medium" style={{ letterSpacing: '-0.02em' }}>
                <a href={`#${it.id}`} className="hover:opacity-80">{it.title}</a>
              </h2>
              <it.body />
            </section>
          )))}
        </main>
      </div>
      <Footer />
    </div>
  )
}
