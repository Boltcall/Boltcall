import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { HalideLanding } from '@/components/ui/halide-landing';
import { updateMetaDescription } from '@/lib/utils';
import { Mail, Loader2, User, BookOpen, FileText, Download, Sparkles, Gift, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeadMagnetPageProps {
  heroTitle?: React.ReactNode;
  heroCopy?: string;
  ctaText?: string;
  imageSrc?: string;
  formHeading?: string;
  source?: string;
  downloadUrl?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface LeadMagnetIconData {
  id: number;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  className: string;
}

const leadMagnetIcons: LeadMagnetIconData[] = [
  { id: 1, icon: BookOpen, className: 'top-[18%] left-[6%] sm:left-[10%]' },
  { id: 2, icon: FileText, className: 'top-[26%] right-[6%] sm:right-[10%]' },
  { id: 3, icon: Gift, className: 'top-[40%] left-[4%] sm:left-[8%]' },
  { id: 4, icon: Bookmark, className: 'top-[54%] right-[8%] sm:right-[12%]' },
  { id: 5, icon: Download, className: 'top-[70%] left-[10%] sm:left-[14%]' },
  { id: 6, icon: Sparkles, className: 'top-[78%] right-[6%] sm:right-[10%]' },
];

const FloatingIconLead = ({
  mouseX,
  mouseY,
  iconData,
  index,
}: {
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
  iconData: LeadMagnetIconData;
  index: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  useEffect(() => {
    const handleMouseMove = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const distance = Math.sqrt(
          Math.pow(mouseX.current - (rect.left + rect.width / 2), 2) +
          Math.pow(mouseY.current - (rect.top + rect.height / 2), 2)
        );
        if (distance < 150) {
          const angle = Math.atan2(
            mouseY.current - (rect.top + rect.height / 2),
            mouseX.current - (rect.left + rect.width / 2)
          );
          const force = (1 - distance / 150) * 50;
          x.set(-Math.cos(angle) * force);
          y.set(-Math.sin(angle) * force);
        } else {
          x.set(0);
          y.set(0);
        }
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y, mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      key={iconData.id}
      style={{ x: springX, y: springY }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn('absolute pointer-events-none', iconData.className)}
    >
      <motion.div
        className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 p-3 rounded-2xl shadow-xl bg-white/10 backdrop-blur-md border border-white/20"
        animate={{
          y: [0, -6, 0, 6, 0],
          x: [0, 4, 0, -4, 0],
          rotate: [0, 4, 0, -4, 0],
        }}
        transition={{
          duration: 5 + Math.random() * 4,
          repeat: Infinity,
          repeatType: 'mirror',
          ease: 'easeInOut',
        }}
      >
        <iconData.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={2} />
      </motion.div>
    </motion.div>
  );
};

const LeadMagnetPage: React.FC<LeadMagnetPageProps> = ({
  heroTitle,
  heroCopy,
  ctaText,
  imageSrc,
  formHeading = 'Get the resource',
  source = 'general',
  downloadUrl,
  metaTitle = 'Lead Magnet | Boltcall',
  metaDescription = 'Get exclusive insights and resources. Sign up for our lead magnet and explore depth with Boltcall.',
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  useEffect(() => {
    document.title = metaTitle;
    updateMetaDescription(metaDescription);
  }, [metaTitle, metaDescription]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    try {
      await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, source }),
      });
    } catch (_) {
      // don't block the user if webhook fails
    }
    const params = new URLSearchParams();
    if (downloadUrl) params.set('download', downloadUrl);
    if (source !== 'general') params.set('source', source);
    const query = params.toString();
    navigate(`/lead-magnet/thank-you${query ? `?${query}` : ''}`);
  };

  const handleSectionMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] min-h-[100dvh]">
      {/* Hero: full-viewport Halide 3D parallax */}
      <section className="relative">
        <HalideLanding
          {...(heroTitle && { heroTitle })}
          {...(heroCopy && { heroCopy })}
          {...(ctaText && { ctaText })}
          {...(imageSrc && { imageSrc })}
        />
      </section>

      {/* Scroll anchor and lead capture section — mobile-optimised */}
      <section
        id="lead-form"
        className="lead-magnet-form relative z-20 min-h-screen bg-[#0a0a0a] border-t border-white/10 min-h-[100dvh] pb-8 overflow-hidden"
        onMouseMove={handleSectionMouseMove}
      >
        {/* Floating icons around the form */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {leadMagnetIcons.map((iconData, index) => (
            <FloatingIconLead
              key={iconData.id}
              mouseX={mouseX}
              mouseY={mouseY}
              iconData={iconData}
              index={index}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-12 sm:px-6 sm:pt-40 sm:pb-24 flex flex-col items-center gap-8 sm:gap-12">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center font-sans tracking-tight px-1">
            {formHeading}
          </h2>

          <form
            className="w-full flex flex-col gap-3"
            onSubmit={handleSubmit}
          >
            <div className="relative w-full">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#e0e0e0]/50 pointer-events-none" />
              <input
                type="text"
                name="name"
                placeholder="Name"
                autoComplete="name"
                className="w-full min-h-[44px] h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-none text-white placeholder:text-[#e0e0e0]/40 focus:outline-none focus:border-brand-blue transition-colors text-base"
              />
            </div>
            <div className="w-full flex flex-col gap-3 sm:flex-row sm:gap-3">
              <div className="relative flex-1 w-full min-w-0">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#e0e0e0]/50 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  inputMode="email"
                  autoComplete="email"
                  className="w-full min-h-[44px] h-12 pl-12 pr-4 bg-white/5 border border-white/10 rounded-none text-white placeholder:text-[#e0e0e0]/40 focus:outline-none focus:border-brand-blue transition-colors text-base"
                />
              </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] h-12 px-8 bg-[#e0e0e0] text-[#0a0a0a] font-bold uppercase tracking-wider hover:bg-brand-blue hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 clip-path-[polygon(0_0,100%_0,100%_70%,85%_100%,0_100%)] disabled:opacity-80 disabled:pointer-events-none disabled:translate-y-0 flex items-center justify-center gap-2 min-w-[8rem] w-full sm:w-auto touch-manipulation"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              ) : (
                'Submit'
              )}
            </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default LeadMagnetPage;
