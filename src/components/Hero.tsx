import React, { useState, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { Phone, Calendar, MessageSquare, Users, Star, Megaphone, ArrowRight, Mail, Clock, Zap, CheckCircle, Rocket, Target, TrendingUp, Headphones } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

const SMOOTH_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FADE_DURATION = 0.7;
import { TextRotate } from './ui/text-rotate';
import Floating, { FloatingElement } from './ui/parallax-floating';

const ModalVideo = React.lazy(() => import('./ModalVideo'));

const Hero: React.FC = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');
  const { t } = useTranslation('marketing');
  const dir = useDirection();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();

  const rotatingWords = t('hero.rotatingWords', { returnObjects: true }) as string[];

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = auditUrl.trim();
    if (!trimmed) return;
    navigate(`/website-audit?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <>
      <section
        id="hero"
        className="relative -mt-32 pb-32 md:pb-64 lg:-mt-40 lg:pb-96 overflow-hidden z-[1] bg-white"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)' }}
      >
        {/* Parallax floating icon boxes — kept dir="ltr" since they are purely decorative */}
        <div className="absolute inset-0 w-full h-full pointer-events-none hidden md:block" dir="ltr">
          <Floating sensitivity={-0.5} className="h-full">

            {/* Row 1 — Users (left) / Calendar (right) */}
            <FloatingElement depth={1.5} className="top-[9%] left-[14%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.55 }}
              >
                <div className="-rotate-[8deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Users className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={1.5} className="top-[9%] left-[86%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.62 }}
              >
                <div className="rotate-[8deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Calendar className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Row 2 — Clock (left) / Zap (right) */}
            <FloatingElement depth={2} className="top-[19%] left-[32%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.70 }}
              >
                <div className="-rotate-[9deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Clock className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2} className="top-[19%] left-[68%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.77 }}
              >
                <div className="rotate-[9deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Zap className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Row 3 — Phone (left) / Target (right) */}
            <FloatingElement depth={1} className="top-[23%] left-[18%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.85 }}
              >
                <div className="-rotate-[6deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Phone className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={1} className="top-[23%] left-[82%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.92 }}
              >
                <div className="rotate-[6deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Target className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Row 4 — Rocket (left) / Megaphone (right) */}
            <FloatingElement depth={2.2} className="top-[39%] left-[10%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.00 }}
              >
                <div className="-rotate-[7deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Rocket className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2.2} className="top-[39%] left-[90%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.07 }}
              >
                <div className="rotate-[7deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Megaphone className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Row 5 — MessageSquare (left) / Star (right) */}
            <FloatingElement depth={2.5} className="top-[58%] left-[20%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.15 }}
              >
                <div className="-rotate-[5deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <MessageSquare className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2.5} className="top-[58%] left-[80%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.22 }}
              >
                <div className="rotate-[5deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Star className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Row 6 — Mail (left) / CheckCircle (right) */}
            <FloatingElement depth={3} className="top-[76%] left-[10%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.30 }}
              >
                <div className="-rotate-[6deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Mail className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={3} className="top-[76%] left-[90%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.37 }}
              >
                <div className="rotate-[6deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <CheckCircle className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Row 7 — TrendingUp (left) / Headphones (right) */}
            <FloatingElement depth={2.2} className="top-[87%] left-[35%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.45 }}
              >
                <div className="-rotate-[9deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <TrendingUp className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2.2} className="top-[87%] left-[65%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.52 }}
              >
                <div className="rotate-[9deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Headphones className="w-5 h-5 md:w-7 md:h-7 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

          </Floating>
        </div>

        {/* Mobile-only floating icons — a lighter 5-icon set that stays clear of the copy */}
        <div className="absolute inset-0 w-full h-full pointer-events-none md:hidden" dir="ltr">
          <Floating sensitivity={-0.5} className="h-full">

            <FloatingElement depth={1.2} className="top-[16%] left-[5%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.55 }}
              >
                <div className="-rotate-[8deg]">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Phone className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={1.2} className="top-[15%] left-[78%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.65 }}
              >
                <div className="rotate-[8deg]">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Zap className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2} className="top-[79%] left-[6%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.75 }}
              >
                <div className="-rotate-[7deg]">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Calendar className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2.4} className="top-[87%] left-[44%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.85 }}
              >
                <div className="rotate-[6deg]">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl shadow-xl bg-white border border-gray-100">
                    <MessageSquare className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            <FloatingElement depth={2} className="top-[78%] left-[78%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.95 }}
              >
                <div className="rotate-[7deg]">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl shadow-xl bg-white border border-gray-100">
                    <Star className="w-6 h-6 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

          </Floating>
        </div>

        {/* Subtle center grid */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-60"
          style={{
            backgroundImage: `
              linear-gradient(to right, #ededed 1px, transparent 1px),
              linear-gradient(to bottom, #ededed 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 50% 50% at 50% 48%, #000 30%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 48%, #000 30%, transparent 72%)",
          }}
        />

        {/* Center content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`relative z-10 pt-32 md:pt-44 lg:pt-52 pb-12 ${isRtl ? 'text-right md:max-w-4xl md:ml-auto' : 'text-center'}`}>

            <motion.h1
              className={`hero-headline text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text-main flex flex-col leading-tight space-y-1 md:space-y-2 mb-6 ${isRtl ? 'items-end justify-end' : 'items-center justify-center'}`}
              style={{ fontFamily: "'Sora', sans-serif" }}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.10 }}
            >
              <LayoutGroup>
                <motion.span layout className={`flex items-center whitespace-pre ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="speakable-intro">{t('hero.neverMiss')}</span>
                </motion.span>
                <motion.span layout className={`flex items-center whitespace-pre ${isRtl ? 'flex-row-reverse' : ''}`}>
                  {t('hero.a') && <span>{t('hero.a')}</span>}
                  <TextRotate
                    texts={rotatingWords}
                    mainClassName="text-blue-600 py-0 pb-1 md:pb-2 rounded-xl"
                    staggerDuration={0.04}
                    staggerFrom="last"
                    rotationInterval={1750}
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                  />
                </motion.span>
              </LayoutGroup>
            </motion.h1>

            <motion.p
              className={`text-base md:text-xl text-text-muted mb-8 max-w-2xl px-2 md:px-0 leading-relaxed whitespace-pre-line ${isRtl ? 'mr-0 md:mr-auto md:ml-0' : 'mx-auto'}`}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.25 }}
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.form
              onSubmit={handleAuditSubmit}
              className={`flex items-center gap-1 max-w-xl p-1.5 rounded-full border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] mt-2 ${isRtl ? 'mx-0' : 'mx-auto'}`}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.55 }}
            >
              <input
                type="text"
                inputMode="url"
                value={auditUrl}
                onChange={(e) => setAuditUrl(e.target.value)}
                placeholder="yourwebsite.com"
                aria-label="Your website URL"
                className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-colors duration-200 whitespace-nowrap"
              >
                <span className="sm:hidden">Get Audit</span>
                <span className="hidden sm:inline">Get My Free Audit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.form>

          </div>
        </div>

        {isVideoOpen && (
          <Suspense fallback={null}>
            <ModalVideo isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
          </Suspense>
        )}
      </section>
    </>
  );
};

export default Hero;
