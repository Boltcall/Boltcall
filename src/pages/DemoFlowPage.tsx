import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MessageSquare, Megaphone, Globe, Calendar, Bell, PhoneForwarded, Bot, ArrowRightLeft } from 'lucide-react';
import { updateMetaDescription } from '../lib/utils';
import { createServiceSchema } from '../lib/schema';
import { useSchemaInjector } from '../hooks/useSchemaInjector';

/* ─── SVG defs shared by both layouts ──────────────────────────────────── */
const SvgDefs: React.FC = () => (
  <defs>
    <linearGradient id="blueGlowH" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
      <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
    </linearGradient>
    <linearGradient id="blueGlowV" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
      <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
    </linearGradient>
    <filter id="dotGlow">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

/* ─── animated glow line ───────────────────────────────────────────────── */
const GlowLine: React.FC<{ id: string; path: string; delay?: number; gradient?: string }> = ({
  id,
  path,
  delay = 0,
  gradient = 'url(#blueGlowH)',
}) => (
  <g>
    <path d={path} stroke="#1e3a5f" strokeWidth="2" fill="none" opacity="0.25" />
    <path
      d={path}
      stroke={gradient}
      strokeWidth="3"
      fill="none"
      strokeDasharray="16 184"
      strokeLinecap="round"
      style={{ animation: 'flowDash 3s linear infinite', animationDelay: `${delay}s` }}
    />
    <path id={id} d={path} fill="none" stroke="none" />
    <circle r="5" fill="#93c5fd" filter="url(#dotGlow)">
      <animateMotion dur="3s" repeatCount="indefinite" begin={`${delay}s`}>
        <mpath xlinkHref={`#${id}`} />
      </animateMotion>
    </circle>
  </g>
);

/* ─── source / output card ─────────────────────────────────────────────── */
const NodeCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub?: string;
  delay?: number;
  compact?: boolean;
}> = ({ icon, label, sub, delay = 0, compact }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`flex flex-col items-center gap-1.5 rounded-2xl border border-blue-500/20 bg-[#0a1628]/80 backdrop-blur-sm shadow-[0_0_24px_rgba(59,130,246,0.12)] hover:shadow-[0_0_32px_rgba(59,130,246,0.25)] transition-shadow duration-300 ${
      compact ? 'px-4 py-3 w-28' : 'px-6 py-5 w-36'
    }`}
  >
    <div className={`rounded-xl bg-blue-500/10 text-blue-400 ${compact ? 'p-2' : 'p-3'}`}>{icon}</div>
    <span className={`font-semibold text-white tracking-wide ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>
    {sub && <span className="text-[11px] text-blue-300/60 text-center leading-tight">{sub}</span>}
  </motion.div>
);

/* ─── central AI node ──────────────────────────────────────────────────── */
const CenterNode: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <motion.div
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.6, delay: 0.3, type: 'spring' }}
    className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-600/20 to-blue-900/30 backdrop-blur-md shadow-[0_0_60px_rgba(59,130,246,0.25)] ${
      compact ? 'px-6 py-5' : 'px-10 py-8'
    }`}
  >
    <div className="absolute inset-0 rounded-3xl border-2 border-blue-400/20 animate-ping-slow" />
    <div className={`rounded-2xl bg-blue-500/20 mb-2 ${compact ? 'p-3' : 'p-4'}`}>
      <Bot size={compact ? 30 : 40} className="text-blue-400" />
    </div>
    <span className={`font-bold text-white tracking-wide ${compact ? 'text-base' : 'text-lg'}`}>Boltcall</span>
    <span className="text-xs text-blue-300/70 font-medium">AI Agent</span>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
/*  HORIZONTAL LAYOUT — sources left → center → outputs right            */
/* ═══════════════════════════════════════════════════════════════════════ */
const HorizontalDiagram: React.FC<{ sources: Source[]; outputs: Source[] }> = ({ sources, outputs }) => (
  <div className="relative mx-auto max-w-6xl px-4 pb-16">
    <div className="relative" style={{ height: 520 }}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1100 520"
        preserveAspectRatio="xMidYMid meet"
      >
        <SvgDefs />
        {/* Source → Center (each source gets its own line) */}
        <GlowLine id="hs0" path="M 140 55  C 320 55,  400 260, 490 260"  delay={0} />
        <GlowLine id="hs1" path="M 140 155 C 320 155, 400 260, 490 260"  delay={0.4} />
        <GlowLine id="hs2" path="M 140 260 C 310 260, 400 260, 490 260"  delay={0.8} />
        <GlowLine id="hs3" path="M 140 365 C 320 365, 400 260, 490 260"  delay={1.2} />
        <GlowLine id="hs4" path="M 140 465 C 320 465, 400 260, 490 260"  delay={1.6} />
        {/* Center → Output */}
        <GlowLine id="ho0" path="M 610 260 C 720 260, 780 120, 960 120"  delay={0.2} />
        <GlowLine id="ho1" path="M 610 260 C 720 260, 780 260, 960 260"  delay={0.7} />
        <GlowLine id="ho2" path="M 610 260 C 720 260, 780 400, 960 400"  delay={1.1} />
      </svg>

      {/* Source cards — left */}
      <div className="absolute left-0 top-0 flex flex-col items-center" style={{ width: 160 }}>
        {sources.map((s, i) => (
          <div key={s.label} style={{ marginTop: i === 0 ? 10 : 6 }}>
            <NodeCard icon={s.icon} label={s.label} sub={s.sub} delay={0.1 * i} />
          </div>
        ))}
      </div>

      {/* Center node */}
      <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <CenterNode />
      </div>

      {/* Output cards — right */}
      <div className="absolute right-0 flex flex-col items-center gap-6" style={{ width: 160, top: 56 }}>
        {outputs.map((o, i) => (
          <NodeCard key={o.label} icon={o.icon} label={o.label} sub={o.sub} delay={0.2 + 0.1 * i} />
        ))}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */
/*  VERTICAL LAYOUT — sources top → center → outputs bottom              */
/* ═══════════════════════════════════════════════════════════════════════ */
const VerticalDiagram: React.FC<{ sources: Source[]; outputs: Source[] }> = ({ sources, outputs }) => (
  <div className="relative mx-auto max-w-4xl px-4 pb-16">
    <div className="relative" style={{ height: 700 }}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 800 700"
        preserveAspectRatio="xMidYMid meet"
      >
        <SvgDefs />
        {/* Source → Center (5 sources spread across top, all converge to center) */}
        <GlowLine id="vs0" path="M 90  95  C 90  200, 400 240, 400 300"  delay={0}   gradient="url(#blueGlowV)" />
        <GlowLine id="vs1" path="M 235 95  C 235 200, 400 240, 400 300"  delay={0.35} gradient="url(#blueGlowV)" />
        <GlowLine id="vs2" path="M 400 95  C 400 180, 400 240, 400 300"  delay={0.7}  gradient="url(#blueGlowV)" />
        <GlowLine id="vs3" path="M 565 95  C 565 200, 400 240, 400 300"  delay={1.05} gradient="url(#blueGlowV)" />
        <GlowLine id="vs4" path="M 710 95  C 710 200, 400 240, 400 300"  delay={1.4}  gradient="url(#blueGlowV)" />
        {/* Center → Output (3 outputs spread across bottom) */}
        <GlowLine id="vo0" path="M 400 410 C 400 470, 175 500, 175 600" delay={0.2}  gradient="url(#blueGlowV)" />
        <GlowLine id="vo1" path="M 400 410 C 400 480, 400 520, 400 600" delay={0.6}  gradient="url(#blueGlowV)" />
        <GlowLine id="vo2" path="M 400 410 C 400 470, 625 500, 625 600" delay={1.0}  gradient="url(#blueGlowV)" />
      </svg>

      {/* Source cards — top row */}
      <div className="absolute top-0 left-0 right-0 flex justify-center gap-4">
        {sources.map((s, i) => (
          <NodeCard key={s.label} icon={s.icon} label={s.label} sub={s.sub} delay={0.08 * i} compact />
        ))}
      </div>

      {/* Center node */}
      <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
        <CenterNode />
      </div>

      {/* Output cards — bottom row */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-8">
        {outputs.map((o, i) => (
          <NodeCard key={o.label} icon={o.icon} label={o.label} sub={o.sub} delay={0.15 + 0.08 * i} />
        ))}
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════ */

type Source = { icon: React.ReactNode; label: string; sub: string };

const DemoFlowPage: React.FC = () => {
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');

  useSchemaInjector([
    createServiceSchema({
      name: 'How Boltcall Works | Demo',
      description:
        'Boltcall speed-to-lead answering + booking service for local operators. Every inbound lead answered instantly and booked automatically.',
      url: '/demo',
    }),
  ]);

  useEffect(() => {
    document.title = 'How Boltcall Works | Demo';
    updateMetaDescription('See how Boltcall AI connects every channel to smart business actions.');
  }, []);

  const sources: Source[] = [
    { icon: <Phone size={22} />, label: 'Phone', sub: 'Incoming calls' },
    { icon: <Mail size={22} />, label: 'Email', sub: 'Form submissions' },
    { icon: <MessageSquare size={22} />, label: 'SMS', sub: 'Text messages' },
    { icon: <Megaphone size={22} />, label: 'Ads', sub: 'Lead ads' },
    { icon: <Globe size={22} />, label: 'Website', sub: 'Chat widget' },
  ];

  const outputs: Source[] = [
    { icon: <Calendar size={22} />, label: 'Calendar', sub: 'Book appointments' },
    { icon: <Bell size={22} />, label: 'Notifications', sub: 'Alert the owner' },
    { icon: <PhoneForwarded size={22} />, label: 'Phone', sub: 'Transfer to human' },
  ];

  return (
    <div className="min-h-screen bg-[#060d1b] text-white overflow-hidden relative">
      {/* subtle radial background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(59,130,246,0.08),transparent)]" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="relative z-10 pt-16 pb-6 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent"
        >
          How Boltcall Works
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-blue-200/60 max-w-xl mx-auto text-base md:text-lg"
        >
          Every channel flows into one AI agent — and the right action happens automatically.
        </motion.p>

        {/* Layout toggle */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setLayout(layout === 'horizontal' ? 'vertical' : 'horizontal')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-medium hover:bg-blue-500/20 transition-colors duration-200"
          >
            <ArrowRightLeft size={16} />
            Switch to {layout === 'horizontal' ? 'Vertical' : 'Horizontal'}
          </button>
        </div>
      </header>

      {/* ── Diagram ────────────────────────────────────────────────────────── */}
      <div className="relative z-10" key={layout}>
        {layout === 'horizontal' ? (
          <HorizontalDiagram sources={sources} outputs={outputs} />
        ) : (
          <VerticalDiagram sources={sources} outputs={outputs} />
        )}
      </div>

      {/* ── Keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes flowDash {
          0%   { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0;   }
        }
        @keyframes ping-slow {
          0%   { opacity: 0.6; transform: scale(1);   }
          70%  { opacity: 0;   transform: scale(1.15); }
          100% { opacity: 0;   transform: scale(1.15); }
        }
        .animate-ping-slow {
          animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default DemoFlowPage;
