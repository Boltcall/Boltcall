"use client"
import * as React from "react"
import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from "framer-motion"
import { Check, Home, Inbox, Moon, Settings, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export type Mode = "light" | "dark"
export type Density = "compact" | "cozy" | "roomy"
export interface Appearance { accent: string; density: Density; radius: number; previewMode: Mode }
export interface Accent { id: string; label: string; color: string }
export interface AppearanceLabProps {
  accents?: Accent[]
  value?: Appearance; defaultValue?: Appearance; onChange?: (a: Appearance) => void
  /** Force the theme of the panel itself. Without it the panel follows prefers-color-scheme and shows its own toggle. */
  theme?: "light" | "dark"
  title?: string; className?: string
}
const ACCENTS: Accent[] = [
  { id: "ember", label: "Ember", color: "#e8590c" }, { id: "iris", label: "Iris", color: "#5f3dc4" }, { id: "rose", label: "Rose", color: "#d6336c" },
  { id: "sky", label: "Sky", color: "#1c7ed6" }, { id: "gold", label: "Gold", color: "#e0a100" }, { id: "ink", label: "Ink", color: "#343a40" },
]
const PAD: Record<Density, number> = { compact: 6, cozy: 12, roomy: 18 }
const spring = { type: "spring" as const, stiffness: 480, damping: 34 }

function useScheme(forced?: "light" | "dark") {
  const [s, set] = React.useState<"light" | "dark">(forced ?? "light")
  React.useEffect(() => {
    if (forced) { set(forced); return }
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const f = () => set(mq.matches ? "dark" : "light"); f()
    mq.addEventListener("change", f); return () => mq.removeEventListener("change", f)
  }, [forced])
  return [s, () => set((x) => (x === "dark" ? "light" : "dark"))] as const
}
function ThemeToggle({ scheme, onToggle }: { scheme: string; onToggle: () => void }) {
  const reduce = useReducedMotion()
  const dark = scheme === "dark"
  return (
    <button type="button" role="switch" aria-checked={dark} aria-label="Dark theme" onClick={onToggle}
      className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={scheme} initial={reduce ? false : { rotate: -80, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={reduce ? undefined : { rotate: 80, opacity: 0, scale: 0.6 }} transition={{ duration: reduce ? 0 : 0.2 }}>
          {dark ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

/** Rotary knob: drag around the dial (or use arrow keys) to set the corner radius from 0 to 28 px. */
function Dial({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  const ref = React.useRef<SVGSVGElement>(null)
  const MAX = 28, A0 = -135, A1 = 135
  const angle = A0 + (value / MAX) * (A1 - A0)
  const move = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    let a = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI + 90
    if (a > 180) a -= 360
    a = Math.max(A0, Math.min(A1, a)); onChange(Math.round(((a - A0) / (A1 - A0)) * MAX))
  }
  const pt = (deg: number, r: number) => [50 + r * Math.sin((deg * Math.PI) / 180), 50 - r * Math.cos((deg * Math.PI) / 180)]
  const arc = (d1: number, d2: number) => { const [x1, y1] = pt(d1, 40), [x2, y2] = pt(d2, 40); return `M${x1} ${y1} A40 40 0 ${d2 - d1 > 180 ? 1 : 0} 1 ${x2} ${y2}` }
  const [kx, ky] = pt(angle, 40)
  return (
    <div className="flex items-center gap-4">
      <svg ref={ref} viewBox="0 0 100 100" className="size-24 shrink-0 cursor-grab touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing" role="slider" tabIndex={0}
        aria-label="Corner radius" aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={value} aria-valuetext={`${value} pixels`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e) }} onPointerMove={(e) => e.buttons && move(e)}
        onKeyDown={(e) => {
          const delta = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0
          if (delta || e.key === "Home" || e.key === "End") {
            e.preventDefault()
            onChange(e.key === "Home" ? 0 : e.key === "End" ? MAX : Math.max(0, Math.min(MAX, value + delta)))
          }
        }}>
        <path d={arc(A0, A1)} fill="none" stroke="hsl(var(--border))" strokeWidth="7" strokeLinecap="round" />
        {value > 0 && <path d={arc(A0, angle)} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" />}
        <rect x="30" y="30" width="40" height="40" rx={Math.max(0, value * 0.7)} fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1.5" opacity="0.9" />
        <circle cx={kx} cy={ky} r="7.5" fill="hsl(var(--card))" stroke={accent} strokeWidth="3" />
      </svg>
      <div><div className="text-2xl font-semibold tabular-nums">{value}<span className="text-sm text-muted-foreground"> px</span></div><div className="text-xs text-muted-foreground">Drag the knob</div></div>
    </div>
  )
}

const MAILS = [["Emma Wilson", "Appointment booked"], ["James Miller", "Follow-up scheduled"], ["Sofia Patel", "New enquiry"]]

function Preview({ a, color }: { a: Appearance; color: string }) {
  const reduce = useReducedMotion()
  const dark = a.previewMode === "dark"
  const p = PAD[a.density], r = a.radius
  const c = dark ? { bg: "#12141c", card: "#1b1f2b", fg: "#f2f3f8", mu: "#9aa1b5", bd: "#2b3142" } : { bg: "#f2f3f7", card: "#ffffff", fg: "#161a26", mu: "#5d6478", bd: "#dfe2ea" }
  const txt = isLight(color) ? "#111" : "#fff"
  return (
    <motion.div layout={!reduce} aria-hidden className="relative min-w-0 overflow-hidden border" style={{ background: c.bg, color: c.fg, borderColor: c.bd, borderRadius: r + 6 }}>
      <div className="flex">
        <div className="flex flex-col items-center gap-2 border-r p-2" style={{ borderColor: c.bd, background: c.card, transition: "background .45s" }}>
          {[Home, Inbox, Settings].map((I, i) => <motion.span layout key={i} className="grid size-8 place-items-center" style={{ borderRadius: r * 0.6, background: i === 1 ? color : "transparent", color: i === 1 ? txt : c.mu, transition: "background .45s" }}><I className="size-4" /></motion.span>)}
        </div>
        <div className="flex-1" style={{ padding: p + 4 }}>
          <motion.div layout={!reduce} className="mb-2 text-sm font-semibold">Your leads</motion.div>
          <div className="flex flex-col" style={{ gap: p / 2 + 2 }}>
            {MAILS.map(([n, s], i) => (
              <motion.div layout key={n} className="flex items-center gap-2 border" style={{ padding: p, borderRadius: r, background: c.card, borderColor: i === 0 ? color : c.bd, transition: "background .45s, border-color .45s" }}>
                <span className="grid size-6 shrink-0 place-items-center text-[10px] font-bold" style={{ background: color, color: txt, borderRadius: Math.min(r, 12), transition: "background .45s" }}>{n[0]}</span>
                <div className="min-w-0 leading-tight"><div className="truncate text-xs font-medium">{n}</div><div className="truncate text-[11px]" style={{ color: c.mu }}>{s}</div></div>
              </motion.div>
            ))}
          </div>
          <motion.div layout={!reduce} className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold" style={{ background: color, color: txt, borderRadius: r }}><Check className="size-3" />View lead</motion.div>
        </div>
      </div>
    </motion.div>
  )
}
function isLight(hex: string) { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 165 }

export function AppearanceLab({ accents = ACCENTS, value, defaultValue, onChange, theme, title = "Appearance", className }: AppearanceLabProps) {
  const groupId = React.useId()
  const reduce = useReducedMotion()
  const [scheme, toggle] = useScheme(theme)
  const [inner, setInner] = React.useState<Appearance>(defaultValue ?? { accent: "ember", density: "cozy", radius: 12, previewMode: "light" })
  const a = value ?? inner
  const [bloom, setBloom] = React.useState<{ id: number; x: number; y: number; color: string } | null>(null)
  const prev = React.useRef<HTMLDivElement>(null)
  const set = (patch: Partial<Appearance>) => { const n = { ...a, ...patch }; if (!value) setInner(n); onChange?.(n) }
  const color = accents.find((x) => x.id === a.accent)?.color ?? accents[0]?.color ?? ACCENTS[0].color
  const pickAccent = (x: Accent, e: React.MouseEvent) => {
    const r = prev.current?.getBoundingClientRect(), s = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (r && !reduce) setBloom({ id: Date.now(), x: s.left + s.width / 2 - r.left, y: s.top + s.height / 2 - r.top, color: x.color })
    set({ accent: x.id })
  }
  const label = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
  const radioKey = (e: React.KeyboardEvent) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(e.key)) return
    e.preventDefault()
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 :
      (index + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length
    buttons[next]?.focus()
    buttons[next]?.click()
  }
  return (
    <MotionConfig reducedMotion="user"><LayoutGroup id={groupId}>
    <section data-theme="st-appearance-lab" className={cn(scheme === "dark" && "dark", "isolate grid min-h-[100dvh] w-full min-w-0 place-items-center bg-background p-6 text-foreground motion-safe:transition-colors motion-safe:duration-200", className)}>
      <div className="w-full max-w-[720px] min-w-0">
        <header className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{!theme && <ThemeToggle scheme={scheme} onToggle={toggle} />}</header>
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
          <div className="flex flex-col gap-5">
            <div role="radiogroup" aria-label="Theme" onKeyDown={radioKey}><span className={label}>Theme</span>
              <div className="relative grid grid-cols-2 rounded-xl bg-muted p-1">
                {(["light", "dark"] as Mode[]).map((m) => (
                  <button type="button" key={m} role="radio" tabIndex={a.previewMode === m ? 0 : -1} aria-checked={a.previewMode === m} onClick={() => set({ previewMode: m })} className="relative z-10 flex min-h-11 items-center justify-center gap-1.5 rounded-lg text-sm font-medium capitalize outline-none focus-visible:outline-2 focus-visible:outline-ring">
                    {a.previewMode === m && <motion.span layoutId="al-mode" transition={spring} className="absolute inset-0 -z-10 rounded-lg bg-card shadow" />}
                    {m === "light" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}{m}
                  </button>))}
              </div>
            </div>
            <div role="radiogroup" aria-label="Accent color" onKeyDown={radioKey}><span className={label}>Accent</span>
              <div className="flex flex-wrap gap-1">
                {accents.map((x) => (
                  <button type="button" key={x.id} role="radio" tabIndex={a.accent === x.id ? 0 : -1} aria-checked={a.accent === x.id} aria-label={x.label} onClick={(e) => pickAccent(x, e)}
                    className="relative grid size-11 place-items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-ring">
                    {a.accent === x.id && <motion.span layoutId="al-ring" transition={spring} className="absolute inset-0.5 rounded-full border-2" style={{ borderColor: x.color }} />}
                    <motion.span whileHover={reduce ? undefined : { scale: 1.12 }} whileTap={reduce ? undefined : { scale: 0.88 }} className="size-6 rounded-full" style={{ background: x.color }} />
                  </button>))}
              </div>
            </div>
            <div role="radiogroup" aria-label="Density" onKeyDown={radioKey}><span className={label}>Density</span>
              <div className="relative grid grid-cols-3 rounded-xl bg-muted p-1">
                {(["compact", "cozy", "roomy"] as Density[]).map((d) => (
                  <button type="button" key={d} role="radio" tabIndex={a.density === d ? 0 : -1} aria-checked={a.density === d} onClick={() => set({ density: d })} className="relative z-10 min-h-11 rounded-lg text-sm font-medium capitalize outline-none focus-visible:outline-2 focus-visible:outline-ring">
                    {a.density === d && <motion.span layoutId="al-den" transition={spring} className="absolute inset-0 -z-10 rounded-lg bg-card shadow" />}{d}
                  </button>))}
              </div>
            </div>
            <div><span className={label}>Corner radius</span><Dial value={a.radius} onChange={(v) => set({ radius: v })} accent={color} /></div>
          </div>
          <div className="flex flex-col gap-3">
            <span className={label}>Live preview</span>
            <div ref={prev} className="relative overflow-hidden" style={{ borderRadius: a.radius + 6 }}><Preview a={a} color={color} />
              <AnimatePresence>{bloom && (
                <motion.span key={bloom.id} aria-hidden className="pointer-events-none absolute size-8 rounded-full" style={{ left: bloom.x - 16, top: bloom.y - 16, background: bloom.color, mixBlendMode: "soft-light" }}
                  initial={{ scale: 0, opacity: 0.8 }} animate={{ scale: 30, opacity: 0 }} transition={{ duration: 0.9, ease: "easeOut" }} onAnimationComplete={() => setBloom(null)} />)}</AnimatePresence>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Preview your colors, spacing, and corners before saving.</p>
          </div>
        </div>
      </div>
    </section>
    </LayoutGroup></MotionConfig>
  )
}

export default AppearanceLab
