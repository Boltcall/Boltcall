import { useEffect, useId, useRef, useState } from 'react';
import { animate, stagger } from 'motion/react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import './lead-response-crowd.css';

// Crowd illustrations from Open Peeps by Pablo Stanley (CC0).
const PEEPS = Array.from({ length: 20 }, (_, i) => `/lead-response-crowd/person-${i + 1}.svg`);

type Tone = 'caution' | 'route' | 'plain';
type Scenario = {
  tag: string;
  tc: Tone;
  signal: string;
  lab: string;
  line: string;
  rtag: string;
  rc: Tone;
  reply: string;
};
const SCENARIOS: Scenario[] = [
  {
    tag: 'Missed call',
    tc: 'caution',
    signal: 'Caller was in a car crash',
    lab: 'Text back',
    line: 'Sorry we missed your call. Were you injured?',
    rtag: 'Replied',
    rc: 'route',
    reply: 'I was rear-ended yesterday.',
  },
  {
    tag: 'Web form',
    tc: 'route',
    signal: 'New slip-and-fall inquiry',
    lab: 'Follow-up',
    line: 'Can we schedule a consultation?',
    rtag: 'Booked',
    rc: 'route',
    reply: 'Thursday morning works.',
  },
  {
    tag: 'New call',
    tc: 'plain',
    signal: 'Caller hurt in a truck crash',
    lab: 'AI receptionist',
    line: 'I can book you for tomorrow morning.',
    rtag: 'Booked',
    rc: 'route',
    reply: 'Tomorrow at 9 works.',
  },
];

type Person = {
  el: HTMLElement;
  pe: HTMLElement;
  hp: HTMLElement;
  img: HTMLImageElement;
  t: number;
  depth: number;
  w: number;
  h: number;
  dir: number;
  speed: number;
  x: number;
  v: number;
  state: 'walk' | 'locked' | 'read';
  reached: boolean;
  ph: number;
  f: number;
  bob: number;
  px: number;
};

type ReplyAnimation = {
  tip: HTMLElement;
  box: HTMLElement;
  p: Person | null;
  d: Scenario;
  t0: number;
  st: number;
  ly: number;
  hx: number;
  ty: number;
  width: number;
};

const BLACK_FRIDAY_END = Date.parse('2026-11-27T23:59:00-05:00');

function remainingBlackFridaySeconds() {
  return Math.max(0, Math.ceil((BLACK_FRIDAY_END - Date.now()) / 1_000));
}

function BlackFridayCountdown() {
  const [remaining, setRemaining] = useState(remainingBlackFridaySeconds);

  useEffect(() => {
    if (remainingBlackFridaySeconds() === 0) return;

    const timer = window.setInterval(() => {
      const seconds = remainingBlackFridaySeconds();
      setRemaining(seconds);
      if (seconds === 0) window.clearInterval(timer);
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  if (remaining === 0) return null;

  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor(remaining / 3_600) % 24;
  const minutes = Math.floor(remaining / 60) % 60;
  const seconds = remaining % 60;

  return (
    <span className="hero-countdown">
      <span>Black Friday ends in</span>
      <span className="countdown-value" role="timer">
        <span className="sr-only">
          {days} days, {hours} hours, {minutes} minutes, {seconds} seconds
        </span>
        <span aria-hidden="true">
          {days}d {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m{' '}
          {String(seconds).padStart(2, '0')}s
        </span>
      </span>
    </span>
  );
}

export default function LeadResponseCrowd() {
  const ref = useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [paused, setPaused] = useState(false);
  const textureId = useId();

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setReducedMotion(preference.matches);
    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => preference.removeEventListener('change', syncPreference);
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const stage = root.querySelector<HTMLElement>('.stage')!;
    const $ = (s: string) => root.querySelector(s) as HTMLElement;
    const frozen = reducedMotion;
    const A: typeof animate | null = frozen ? null : animate;
    let seed = frozen ? 11 : (Math.random() * 1e9) | 0;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

    const fx = root.querySelector('canvas')!;
    const context = fx.getContext('2d');
    if (!context) return;
    const g = context;
    const crowd = $('.crowd');
    const beacon = $('.beacon');
    let stageWidth = 0,
      stageHeight = 0,
      beaconY = 0,
      crowdTop = 0,
      crowdHeight = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      stageWidth = stage.clientWidth;
      stageHeight = stage.clientHeight;
      beaconY = beacon.offsetTop + beacon.offsetHeight / 2;
      crowdTop = crowd.offsetTop;
      crowdHeight = crowd.offsetHeight;
      fx.width = stageWidth * dpr;
      fx.height = stageHeight * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    const accentChannels = getComputedStyle(root).getPropertyValue('--ac').trim();
    const accentColor = `rgb(${accentChannels})`;
    const al = (opacity: number) => `rgba(${accentChannels},${opacity})`;

    // Farther figures stay lighter so the current lead can stand out.
    const people: Person[] = [];
    const fade = (p: Person) =>
      `blur(${Math.max(0, (74 - p.t) * 0.045).toFixed(2)}px) contrast(${(0.36 + 0.3 * p.depth).toFixed(2)}) brightness(${(1 / (0.68 + 0.15 * p.depth)).toFixed(2)})`;
    function sizePerson(p: Person) {
      p.w = (146 + (p.t - 31.8) * 2.62) * (stageWidth < 640 ? 0.72 : 1);
      p.h = p.w * 1.35;
      p.el.style.width = p.w.toFixed(1) + 'px';
      p.el.style.height = p.h.toFixed(1) + 'px';
    }
    function place(p: Person, anywhere: boolean) {
      p.t = 31 + random() * 54;
      p.depth = (p.t - 31) / 54;
      p.dir = random() < 0.5 ? 1 : -1;
      p.speed = 108 / (12 + random() * 26);
      p.x = anywhere ? -4 + random() * 108 : p.dir > 0 ? -10 : 110;
      p.v = 1;
      p.state = 'walk';
      p.reached = false;
      p.ph = random() * 6.283;
      p.f = 1.5 + p.speed * 0.22;
      p.bob = 0;
      p.px = (p.x / 100) * stageWidth;
      p.el.className = 'pw';
      p.el.style.cssText = `top:${p.t.toFixed(2)}%;z-index:${p.t | 0}`;
      sizePerson(p);
      p.img.src = PEEPS[(random() * PEEPS.length) | 0];
      p.img.style.filter = fade(p);
      p.img.style.transform = `scaleX(${p.dir})`;
    }
    for (let i = 0; i < (stageWidth < 640 ? 22 : 42); i++) {
      const el = document.createElement('div');
      el.innerHTML =
        '<div class="pe"><div class="hp"><img alt="" draggable="false" decoding="async"><i class="ok"><svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg></i></div></div>';
      crowd.appendChild(el);
      const p: Person = {
        el,
        pe: el.querySelector<HTMLElement>('.pe')!,
        hp: el.querySelector<HTMLElement>('.hp')!,
        img: el.querySelector('img')!,
        t: 0,
        depth: 0,
        w: 0,
        h: 0,
        dir: 1,
        speed: 0,
        x: 0,
        v: 0,
        state: 'walk',
        reached: false,
        ph: 0,
        f: 0,
        bob: 0,
        px: 0,
      };
      place(p, true);
      people.push(p);
    }
    const head = (p: Person) => [
      p.px,
      crowdTop + (crowdHeight * p.t) / 100 - p.h / 2 + p.h * 0.3 + p.bob,
    ];

    const conversations: ReplyAnimation[] = Array.from({ length: 3 }, () => {
      const tip = document.createElement('div');
      tip.className = 'tip';
      tip.setAttribute('aria-hidden', 'true');
      tip.innerHTML = '<div class="cen"><div class="tbox"></div></div>';
      stage.appendChild(tip);
      return {
        tip,
        box: tip.querySelector<HTMLElement>('.tbox')!,
        p: null,
        d: SCENARIOS[0],
        t0: 0,
        st: 0,
        ly: 0,
        hx: 0,
        ty: 0,
        width: 0,
      };
    });
    const btile = $('.btile'),
      cbox = $('.cbox'),
      clab = $('.cbox .lab'),
      ctxt = $('.cbox .txt');
    let comp: { d: Scenario; t0: number; n: number } | null = null;
    let disposed = false;
    const pop = (el: HTMLElement, on: boolean) => {
      if (A)
        A(
          el,
          { scale: on ? [0, 1] : [1, 0], opacity: on ? [0, 1] : [1, 0] },
          on ? { type: 'spring', stiffness: 420, damping: 22 } : { duration: 0.2 },
        );
      else {
        el.style.transform = `scale(${on ? 1 : 0})`;
        el.style.opacity = on ? '1' : '0';
      }
    };
    const setBubble = (s: ReplyAnimation, reply: boolean) => {
      const { d, box } = s;
      const tag = document.createElement('span');
      tag.className = `tg ${reply ? d.rc : d.tc}`;
      tag.textContent = reply ? d.rtag : d.tag;
      box.className = reply ? 'tbox reply' : 'tbox';
      box.replaceChildren(tag, reply ? `“${d.reply}”` : d.signal);
      s.width = box.offsetWidth;
    };
    const flip = (s: ReplyAnimation) => {
      if (!A) {
        setBubble(s, true);
        return;
      }
      A(s.box, { rotateX: [0, 90] }, { duration: 0.14, ease: 'easeIn' }).then(() => {
        if (disposed) return;
        setBubble(s, true);
        A(s.box, { rotateX: [-90, 0] }, { type: 'spring', stiffness: 480, damping: 20 });
      });
    };
    const hop = (p: Person) => {
      if (A) A(p.hp, { y: [0, -26, 0], scale: [1, 1.06, 1] }, { duration: 0.6, ease: [0.3, 0, 0.3, 1] });
    };
    const bump = (k: number) => {
      if (A) A(btile, { scale: [1, k, 1] }, { duration: 0.45, ease: [0.3, 0, 0.2, 1] });
    };
    const hit = (c: string) => {
      if (frozen) return;
      const e = $('.' + c);
      e.classList.remove('hit');
      void e.offsetWidth;
      e.classList.add('hit');
    };

    let side = 1,
      scenarioIndex = 0,
      nextAt = 0.6;
    function pick() {
      const act = conversations.flatMap((s) => (s.p ? [s.p.px] : [])),
        cx = stageWidth / 2;
      const ok = (p: Person) => {
        if (p.state !== 'walk' || p.reached || p.t < 47) return false;
        const f = p.px + ((p.dir * p.speed) / 100) * stageWidth * 2.4;
        return (
          p.px > stageWidth * 0.13 &&
          p.px < stageWidth * 0.87 &&
          f > stageWidth * 0.1 &&
          f < stageWidth * 0.9 &&
          Math.abs(p.px - cx) > Math.min(120, stageWidth * 0.17) &&
          act.every((a) => Math.abs(a - p.px) > Math.min(380, stageWidth * 0.54))
        );
      };
      let c = people.filter(ok);
      const pref = c.filter((p) => (p.px - cx) * side > 0);
      if (pref.length) c = pref;
      if (!c.length) return null;
      side = -side;
      return c[(random() * c.length) | 0];
    }
    function start(now: number) {
      const s = conversations.find((s) => !s.p);
      if (!s) {
        nextAt = now + 0.2;
        return;
      }
      const p = pick();
      if (!p) {
        nextAt = now + 0.3;
        return;
      }
      s.p = p;
      s.d = SCENARIOS[scenarioIndex++ % SCENARIOS.length];
      s.t0 = now;
      s.st = 0;
      s.ly = 0;
      nextAt = now + (stageWidth < 640 ? 6.1 : 2.4);
      p.state = 'locked';
      p.el.style.zIndex = '200';
      p.img.style.filter = 'none';
      p.img.style.transform = `scaleX(${p.dir}) scale(1.07)`;
    }
    const message = (x: number, y: number, rot: number, sc: number) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(sc, sc);
      g.globalAlpha = 1;
      g.setLineDash([]);
      g.shadowColor = al(0.55);
      g.shadowBlur = 16;
      g.fillStyle = '#fff';
      g.strokeStyle = accentColor;
      g.lineWidth = 2;
      g.lineJoin = 'round';
      g.beginPath();
      g.roundRect(-15, -10.5, 30, 21, 5);
      g.fill();
      g.shadowBlur = 0;
      g.stroke();
      g.beginPath();
      g.moveTo(-8, 10.5);
      g.lineTo(-8, 15);
      g.lineTo(-2, 10.5);
      g.stroke();
      g.fillStyle = accentColor;
      for (const dot of [-6, 0, 6]) {
        g.beginPath();
        g.arc(dot, 0, 1.35, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    };

    function drawReply(s: ReplyAnimation, p: Person, a: number, now: number, hx: number, hy: number) {
      const P0 = [stageWidth / 2, beaconY],
        P1 = [(P0[0] + hx) / 2, Math.min(beaconY, hy) - (26 + Math.abs(hx - P0[0]) * 0.07)];
      const B = (u: number) => {
        const v = 1 - u;
        return [
          v * v * P0[0] + 2 * v * u * P1[0] + u * u * hx,
          v * v * P0[1] + 2 * v * u * P1[1] + u * u * hy,
        ];
      };
      const seg = (u0: number, u1: number, n: number) => {
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const q = B(u0 + ((u1 - u0) * i) / n);
          if (i === 0) g.moveTo(q[0], q[1]);
          else g.lineTo(q[0], q[1]);
        }
        g.stroke();
      };
      g.strokeStyle = accentColor;
      g.lineCap = 'round';
      if (a < 3.75) {
        /* target ring locks onto the head */
        const R = p.w * 0.27,
          k = Math.min(1, a / 0.5),
          e = 1 - Math.pow(1 - k, 3);
        g.save();
        g.translate(hx, hy);
        g.rotate(now * 1.2);
        g.globalAlpha = 0.9 * k;
        g.lineWidth = 2;
        g.setLineDash([R * 0.5, R * 0.285]);
        g.beginPath();
        g.arc(0, 0, R * (2.2 - 1.2 * e), 0, 6.2832);
        g.stroke();
        g.restore();
      }
      if (a < 6.2) {
        /* the thread: dashed while aiming, solid while the reply comes back */
        g.save();
        g.lineWidth = 1.2;
        if (a < 3.75) {
          g.globalAlpha = 0.55;
          g.setLineDash([3, 6]);
          g.lineDashOffset = -now * 24;
          seg(0, Math.min(1, a / 0.6), 28);
        } else {
          g.globalAlpha = 0.35 * Math.min(1, (6.2 - a) / 0.4);
          seg(0, 1, 28);
        }
        g.restore();
      }
      if (a >= 2.9 && a < 3.75) {
        /* the text travels along the arc */
        const u = ease((a - 2.9) / 0.85);
        g.save();
        g.shadowColor = al(0.8);
        g.shadowBlur = 14;
        for (let i = 0; i < 14; i++) {
          const u1 = u - (0.46 * i) / 14,
            u0 = u - (0.46 * (i + 1)) / 14;
          if (u1 <= 0) break;
          const f = 1 - i / 14;
          g.globalAlpha = f * 0.22;
          g.lineWidth = 16 * f;
          seg(Math.max(0, u0), u1, 3);
          g.globalAlpha = f * 0.95;
          g.lineWidth = 6 * f + 1;
          seg(Math.max(0, u0), u1, 3);
        }
        g.restore();
        const q = B(u),
          q2 = B(Math.min(1, u + 0.02)),
          dx = q2[0] - q[0];
        message(
          q[0],
          q[1],
          Math.atan2(q2[1] - q[1], Math.abs(dx) || 1e-6) * (dx >= 0 ? 1 : -1) * 0.6,
          Math.min(1, (a - 2.9) / 0.15),
        );
      }
      if (a >= 3.75 && a < 4.4) {
        /* it lands */
        const k = (a - 3.75) / 0.65,
          e = 1 - Math.pow(1 - k, 3);
        g.save();
        g.globalAlpha = 1 - k;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(hx, hy, p.w * 0.2 + e * p.w * 0.32, 0, 6.2832);
        g.stroke();
        g.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const an = (i / 10) * 6.2832 + s.t0,
            r0 = p.w * 0.3 + e * p.w * 0.22,
            r1 = r0 + 12 * (1 - k);
          g.beginPath();
          g.moveTo(hx + Math.cos(an) * r0, hy + Math.sin(an) * r0);
          g.lineTo(hx + Math.cos(an) * r1, hy + Math.sin(an) * r1);
          g.stroke();
        }
        g.restore();
      }
      if (a >= 5.3 && a < 6) {
        /* the reply travels back to Boltcall */
        const u = 1 - ease((a - 5.3) / 0.7);
        g.save();
        for (let i = 0; i < 8; i++) {
          const u0 = u + (0.22 * i) / 8,
            u1 = u + (0.22 * (i + 1)) / 8;
          if (u0 >= 1) break;
          g.globalAlpha = (1 - i / 8) * 0.7;
          g.lineWidth = 3 * (1 - i / 10);
          seg(u0, Math.min(1, u1), 3);
        }
        const q = B(u);
        g.globalAlpha = 1;
        g.shadowColor = al(0.8);
        g.shadowBlur = 12;
        g.fillStyle = accentColor;
        g.beginPath();
        g.arc(q[0], q[1], 6, 0, 6.2832);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(q[0], q[1], 2.4, 0, 6.2832);
        g.fill();
        g.restore();
      }
    }

    let pointerX = 0,
      targetPointerX = 0;
    const onMove = (e: PointerEvent) => {
      targetPointerX = (e.clientX - root.getBoundingClientRect().left) / stageWidth - 0.5;
    };
    if (!frozen) stage.addEventListener('pointermove', onMove);
    function tick(now: number, dt: number, draw: boolean) {
      pointerX += (targetPointerX - pointerX) * Math.min(1, dt * 4);
      for (const p of people) {
        const tv = p.state === 'walk' ? 1 : p.state === 'locked' ? 0.45 : 0;
        p.v += (tv - p.v) * Math.min(1, dt * 5);
        p.x += p.dir * p.speed * p.v * dt;
        if ((p.x > 111 || p.x < -11) && p.state === 'walk') place(p, false);
        const s = Math.sin(now * Math.PI * p.f + p.ph);
        p.bob = -Math.abs(s) * (1.5 + 2.5 * p.depth) * p.v;
        p.px = (p.x / 100) * stageWidth - pointerX * p.depth * stageWidth * 0.02;
        if (draw)
          p.pe.style.transform = `translate3d(${(p.px - p.w / 2).toFixed(1)}px,${(-p.h / 2 + p.bob).toFixed(1)}px,0) rotate(${(s * 0.7 * p.v).toFixed(2)}deg)`;
      }
      if (now >= nextAt) start(now);
      if (draw) g.clearRect(0, 0, stageWidth, stageHeight);
      for (const s of conversations) {
        if (!s.p) continue;
        const a = now - s.t0,
          p = s.p,
          d = s.d;
        if (s.st < 1 && a >= 0.9) {
          s.st = 1;
          setBubble(s, false);
          pop(s.box, true);
        }
        if (s.st < 2 && a >= 1.8) {
          s.st = 2;
          comp = { d, t0: now, n: -1 };
          clab.textContent = d.lab;
          ctxt.textContent = '';
          pop(cbox, true);
        }
        if (s.st < 3 && a >= 2.9) {
          s.st = 3;
          if (comp && comp.d === d) {
            pop(cbox, false);
            comp = null;
          }
          bump(1.16);
          hit('p1');
        }
        if (s.st < 4 && a >= 3.75) {
          s.st = 4;
          p.state = 'read';
          p.reached = true;
          p.img.style.filter = `drop-shadow(0 0 14px ${al(0.6)})`;
          hop(p);
        }
        if (s.st < 5 && a >= 4.45) {
          s.st = 5;
          flip(s);
          hit('p2');
        }
        if (s.st < 6 && a >= 6) {
          s.st = 6;
          bump(1.1);
          p.el.classList.add('done');
        }
        if (s.st < 7 && a >= 6.7) {
          s.st = 7;
          pop(s.box, false);
          p.state = 'walk';
          p.el.style.zIndex = String(p.t | 0);
          p.img.style.transform = `scaleX(${p.dir})`;
          p.img.style.filter = `drop-shadow(0 0 8px ${al(0.45)})`;
        }
        if (a >= 7.1) {
          s.p = null;
          continue;
        }
        if (draw) {
          const [hx, hy] = head(p);
          s.hx = hx;
          s.ty = Math.max(44, hy - p.h * 0.21 - 14);
          let lift = 0;
          for (const o of conversations)
            if (
              o !== s &&
              o.p &&
              o.t0 < s.t0 &&
              Math.abs(o.hx - hx) < 350 &&
              Math.abs(o.ty - s.ty) < 46 &&
              s.ty > 92
            )
              lift = -46; /* two bubbles never sit on each other */
          s.ly += (lift - s.ly) * Math.min(1, dt * 8);
          const inset = s.width / 2 + 12;
          const bubbleX = Math.max(inset, Math.min(stageWidth - inset, hx));
          s.tip.style.transform = `translate(${bubbleX.toFixed(1)}px,${(s.ty + s.ly).toFixed(1)}px)`;
          drawReply(s, p, a, now, hx, hy);
        }
      }
      if (comp) {
        const L = comp.d.line,
          n = Math.ceil(Math.min(1, (now - comp.t0) / 0.8) * L.length);
        if (n !== comp.n) {
          comp.n = n;
          ctxt.textContent = L.slice(0, n);
        }
      }
    }

    let raf = 0;
    let now = 0;
    let last = performance.now();
    const loop = (ms: number) => {
      const dt = Math.min(0.1, Math.max(0, (ms - last) / 1000));
      last = ms;
      now += dt;
      tick(now, dt, true);
      raf = requestAnimationFrame(loop);
    };
    const syncPlayback = () => {
      cancelAnimationFrame(raf);
      if (frozen || root.dataset.paused === 'true' || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const playbackObserver = new MutationObserver(syncPlayback);
    const sizeObserver = new ResizeObserver(() => {
      const wasMobile = stageWidth < 640;
      size();
      if (wasMobile !== stageWidth < 640) people.forEach(sizePerson);
      conversations.forEach((s) => {
        s.width = s.box.offsetWidth;
      });
      tick(now, 0, true);
    });
    sizeObserver.observe(stage);

    if (frozen) {
      // Hold a readable example when the visitor requests reduced motion.
      for (let frame = 0; frame < 480; frame++) {
        now = frame / 60;
        tick(now, 1 / 60, false);
        if (conversations.some((s) => s.p && now - s.t0 >= 3.35)) break;
      }
      tick(now, 0, true);
    } else {
      animate(
        root.querySelectorAll('h1 .w'),
        { opacity: [0, 1], y: [24, 0] },
        { duration: 0.7, ease: [0.2, 0.7, 0.2, 1], delay: stagger(0.06) },
      );
      animate(btile, { scale: [0.8, 1] }, { type: 'spring', stiffness: 300, damping: 20 });
      playbackObserver.observe(root, { attributes: true, attributeFilter: ['data-paused'] });
      document.addEventListener('visibilitychange', syncPlayback);
      syncPlayback();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      sizeObserver.disconnect();
      playbackObserver.disconnect();
      stage.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', syncPlayback);
      root.querySelectorAll('.ph').forEach((phrase) => phrase.classList.remove('hit'));
      btile.removeAttribute('style');
      cbox.removeAttribute('style');
      conversations.forEach((s) => s.tip.remove());
      crowd.replaceChildren();
      g.clearRect(0, 0, stageWidth, stageHeight);
    };
  }, [reducedMotion]);

  return (
    <section
      className="lead-response-crowd"
      ref={ref}
      data-paused={paused}
      aria-labelledby="lead-response-title"
    >
      <div className="scene-background" aria-hidden="true">
        <i className="b1" />
        <i className="b2" />
        <i className="b3" />
        <div className="dome" />
        <svg className="grain" width="100%" height="100%">
          <filter id={textureId}>
            <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${textureId})`} />
        </svg>
      </div>
      <div className="hero-copy">
        <p className="kick">Black Friday giveaway</p>
        <h1 id="lead-response-title">
          <span className="ph p1">
            <span className="w">A</span> <span className="w">free</span>{' '}
            <span className="w">website.</span>
          </span>{' '}
          <span className="ph p2">
            <span className="w">Free</span> <span className="w">speed-to-lead</span>{' '}
            <span className="w">setup.</span>
          </span>
        </h1>
        <p className="lead">Built for personal injury law firms.</p>
        <div className="hero-offer-details">
          <div className="hero-website-count">
            <span>Free websites</span>
            <strong>5</strong>
          </div>
          <BlackFridayCountdown />
        </div>
        <div className="ctas">
          <a className="demo-button demo-button-primary" href="#black-friday-application">
            Apply for the giveaway <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="stage" aria-hidden="true">
        <div className="crowd" />
        <canvas className="fx" />
        <div className="beacon">
          <div className="btile">
            <img src="/boltcall_small_logo.webp" alt="" width="32" height="32" />
          </div>
        </div>
        <div className="compose">
          <div className="cen">
            <div className="cbox">
              <span className="lab" />
              <span className="txt" />
              <i className="caret" />
            </div>
          </div>
        </div>
      </div>
      <div className="playback">
        <span>Simulated lead activity</span>
        {!reducedMotion && (
          <button
            type="button"
            aria-label={paused ? 'Play animation' : 'Pause animation'}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
          </button>
        )}
      </div>
    </section>
  );
}
