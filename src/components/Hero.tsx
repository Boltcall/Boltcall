import React, { useState, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { Phone, Calendar, MessageSquare, Users, Star, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

const SMOOTH_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FADE_DURATION = 0.7;
import { TextRotate } from './ui/text-rotate';
import Floating, { FloatingElement } from './ui/parallax-floating';

const ModalVideo = React.lazy(() => import('./ModalVideo'));

const Hero: React.FC = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const { t } = useTranslation('marketing');
  const dir = useDirection();
  const isRtl = dir === 'rtl';

  const rotatingWords = t('hero.rotatingWords', { returnObjects: true }) as string[];

  return (
    <>
      <section
        id="hero"
        className="relative -mt-32 pb-32 md:pb-64 lg:-mt-40 lg:pb-96 overflow-hidden z-[1] bg-white"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 92%, 0 100%)' }}
      >
        {/* Parallax floating icon boxes — kept dir="ltr" since they are purely decorative */}
        <div className="absolute inset-0 w-full h-full pointer-events-none" dir="ltr">
          <Floating sensitivity={-0.5} className="h-full">

            {/* Top-left — Phone */}
            <FloatingElement depth={0.5} className="top-[26%] left-[17%] md:top-[28%] md:left-[19%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.55 }}
              >
                <div className="-rotate-[3deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-xl bg-white border border-gray-100">
                    <Phone className="w-6 h-6 md:w-10 md:h-10 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Top-left large — Users */}
            <FloatingElement depth={1} className="top-[12%] left-[13%] md:top-[14%] md:left-[15%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.70 }}
              >
                <div className="-rotate-12 hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-xl bg-white border border-gray-100">
                    <Users className="w-6 h-6 md:w-10 md:h-10 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Bottom-left — MessageSquare */}
            <FloatingElement depth={4} className="top-[60%] left-[17%] md:top-[52%] md:left-[21%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.85 }}
              >
                <div className="-rotate-[4deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-xl bg-white border border-gray-100">
                    <MessageSquare className="w-6 h-6 md:w-10 md:h-10 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Top-right — Calendar */}
            <FloatingElement depth={2} className="top-[10%] left-[81%] md:top-[14%] md:left-[79%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.00 }}
              >
                <div className="rotate-[6deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-xl bg-white border border-gray-100">
                    <Calendar className="w-6 h-6 md:w-10 md:h-10 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Middle-right — Star */}
            <FloatingElement depth={1} className="top-[56%] left-[71%] md:top-[48%] md:left-[69%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.15 }}
              >
                <div className="rotate-[14deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-xl bg-white border border-gray-100">
                    <Star className="w-6 h-6 md:w-10 md:h-10 text-blue-600" strokeWidth={2.5} />
                  </div>
                </div>
              </motion.div>
            </FloatingElement>

            {/* Upper-right — Megaphone (ad) */}
            <FloatingElement depth={3} className="top-[36%] left-[83%] md:top-[34%] md:left-[83%]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 1.30 }}
              >
                <div className="-rotate-[5deg] hover:scale-105 transition-transform duration-200">
                  <div className="flex items-center justify-center w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl shadow-xl bg-white border border-gray-100">
                    <Megaphone className="w-6 h-6 md:w-10 md:h-10 text-blue-600" strokeWidth={2.5} />
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
              className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-text-main flex flex-col leading-tight space-y-1 md:space-y-2 mb-6 ${isRtl ? 'items-end justify-end' : 'items-center justify-center'}`}
              style={{ fontFamily: "'Sora', sans-serif" }}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.10 }}
            >
              <span className="speakable-intro">{t('hero.neverMiss')}</span>
              <LayoutGroup>
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
              className={`text-base md:text-xl text-text-muted mb-8 max-w-2xl px-2 md:px-0 leading-relaxed ${isRtl ? 'mr-0 md:mr-auto md:ml-0' : 'mx-auto'}`}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.25 }}
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              className={`flex flex-col gap-4 mb-4 ${isRtl ? 'items-stretch sm:flex-row-reverse sm:justify-end sm:items-center' : 'justify-center items-center sm:flex-row'}`}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 24 }}
              transition={{ duration: FADE_DURATION, ease: SMOOTH_EASE, delay: 0.40 }}
            >
              <Link
                to="/signup?redirect=/setup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
              >
                {t('hero.startFree')}
              </Link>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all duration-200"
              >
                {t('hero.seeHowItWorks')}
              </button>
            </motion.div>

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
