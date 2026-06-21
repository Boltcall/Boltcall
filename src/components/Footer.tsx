import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Facebook, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
// X (formerly Twitter) Logo Component - Custom SVG since lucide-react doesn't have X icon
const XLogo: React.FC<{ className?: string; strokeWidth?: number }> = ({ className = "w-4 h-4", strokeWidth = 2.5 }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={strokeWidth}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface FooterProps {
  theme?: 'light' | 'dark';
  showLogo?: boolean;
}

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
  labelHe?: string;
}

const Footer: React.FC<FooterProps> = ({ theme = 'light', showLogo = true }) => {
  const isDark = theme === 'dark';
  const { t, i18n } = useTranslation('marketing');
  const dir = useDirection();
  const isRtl = dir === 'rtl';
  const isHebrew = (i18n.language || 'en').split('-')[0] === 'he';

  const bgClass = isDark ? 'bg-black' : 'bg-white';
  const textClass = isDark ? 'text-white' : 'text-neutral-900';
  const mutedTextClass = isDark ? 'text-neutral-400' : 'text-neutral-500';
  const hoverTextClass = isDark ? 'hover:text-white' : 'hover:text-neutral-900';
  const borderClass = isDark ? 'border-neutral-800' : 'border-neutral-200';
  // Logo styling removed — was adding gray container

  const footerLinks: Record<string, FooterLink[]> = {
    features: [
      { label: 'AI Receptionist', labelHe: 'קבלת פנים AI', href: '/features/ai-receptionist' },
      { label: 'Instant Form Reply', labelHe: 'תגובה מיידית לטופס', href: '/features/instant-form-reply' },
      { label: 'SMS Booking Assistant', labelHe: 'עוזר קביעת פגישות ב-SMS', href: '/features/sms-booking-assistant' },
      { label: 'Automated Reminders', labelHe: 'תזכורות אוטומטיות', href: '/features/automated-reminders' },
      { label: 'AI Follow-Up System', labelHe: 'מערכת מעקב AI', href: '/features/ai-follow-up-system' },
      { label: 'Website Widget', labelHe: 'וידג׳ט לאתר', href: '/features/website-widget' },
      { label: 'Lead Reactivation', labelHe: 'החייאת לידים', href: '/features/lead-reactivation' },
      { label: 'Smart Website', labelHe: 'אתר חכם', href: '/features/smart-website' },
    ],
    freeTools: [
      { label: 'SEO Audit', labelHe: 'בדיקת SEO', href: '/seo-audit' },
      { label: 'SEO + AEO Audit', labelHe: 'בדיקת SEO + AEO', href: '/seo-aeo-audit' },
      { label: 'Business Audit', labelHe: 'בדיקת עסק', href: '/business-audit' },
      { label: 'AI Visibility Check', labelHe: 'בדיקת נראות AI', href: '/ai-visibility-check' },
      { label: 'Website Health Check', labelHe: 'בדיקת בריאות אתר', href: '/speed-test' },
      { label: 'Speed Test Offer', labelHe: 'הצעת בדיקת מהירות', href: '/speed-test/offer' },
      { label: 'AI Readiness Scorecard', labelHe: 'כרטיס מוכנות ל-AI', href: '/ai-readiness-scorecard' },
      { label: 'Lead Response Scorecard', labelHe: 'כרטיס תגובה ללידים', href: '/lead-response-scorecard' },
      { label: 'AI Revenue Audit', labelHe: 'בדיקת הכנסות מ-AI', href: '/ai-revenue-audit' },
      { label: 'AI Revenue Calculator', labelHe: 'מחשבון הכנסות מ-AI', href: '/ai-revenue-calculator' },
      { label: 'AI Receptionist ROI Calculator', labelHe: 'מחשבון ROI לקבלת פנים AI', href: '/ai-receptionist-roi' },
      { label: 'Funnel Optimizer', labelHe: 'מייעל משפך', href: '/funnel-optimizer' },
      { label: 'Conversion Rate Optimizer', labelHe: 'מייעל שיעור המרה', href: '/conversion-rate-optimizer' },
      { label: 'After-Hours Lead Rescue Setup', labelHe: 'הגדרת חילוץ לידים אחרי שעות הפעילות', href: '/after-hours-lead-rescue' },
      { label: 'Automatic Reviews Agent Setup', labelHe: 'הגדרת סוכן ביקורות אוטומטי', href: '/automatic-reviews-agent' },
      { label: 'Reminders Agent Setup', labelHe: 'הגדרת סוכן תזכורות', href: '/reminders-agent' },
    ],
    calculators: [
      { label: '5-Minute Response Playbook', labelHe: 'פלייבוק תגובה ב-5 דקות', href: '/tools/5-minute-response-playbook' },
      { label: 'Plumber Revenue Calculator', labelHe: 'מחשבון הכנסות לאינסטלטורים', href: '/tools/plumber-revenue-calculator' },
      { label: 'HVAC Overflow Calculator', labelHe: 'מחשבון עומס ל-HVAC', href: '/tools/hvac-overflow-calculator' },
      { label: 'Dentist Chair Calculator', labelHe: 'מחשבון כיסא לרופאי שיניים', href: '/tools/dentist-chair-calculator' },
      { label: 'MedSpa Rebooking Calculator', labelHe: 'מחשבון הזמנות מחדש ל-MedSpa', href: '/tools/medspa-rebooking-calculator' },
      { label: 'Real Estate Speed Scorecard', labelHe: 'כרטיס מהירות לנדל״ן', href: '/tools/real-estate-speed-scorecard' },
      { label: 'Vet Clinic Revenue Calculator', labelHe: 'מחשבון הכנסות למרפאות וטרינריות', href: '/tools/vet-clinic-revenue-calculator' },
      { label: 'Solar Profit Calculator', labelHe: 'מחשבון רווח לסולאר', href: '/tools/solar-profit-calculator' },
      { label: 'Solar Quote Generator', labelHe: 'מחולל הצעות מחיר לסולאר', href: '/tools/solar-quote-generator' },
    ],
    industries: [
      { label: 'HVAC Answering Service', labelHe: 'שירות מענה ל-HVAC', href: '/industries/hvac-answering-service' },
      { label: 'Plumbing Answering Service', labelHe: 'שירות מענה לאינסטלטורים', href: '/industries/plumbing-answering-service' },
      { label: 'Contractor Answering Service', labelHe: 'שירות מענה לקבלנים', href: '/industries/contractor-answering-service' },
      { label: 'Speed-to-Lead for Solar', labelHe: 'מהירות ללידים לסולאר', href: '/solar' },
      { label: 'Solar Speed Benchmark', labelHe: 'בנצ׳מרק מהירות לסולאר', href: '/solar-benchmark' },
      { label: 'Solar Benchmark 2026', labelHe: 'בנצ׳מרק סולאר 2026', href: '/solar-benchmark-2026' },
      { label: 'Solar Speed Playbook', labelHe: 'פלייבוק מהירות לסולאר', href: '/solar-speed-playbook' },
      { label: 'Solar Speed Score Quiz', labelHe: 'חידון ציון מהירות לסולאר', href: '/solar-speed-score' },
      { label: 'Voice Agent Setup', labelHe: 'הגדרת סוכן קולי', href: '/voice-agent-setup' },
      { label: 'Rank on Google Offer', labelHe: 'הצעת דירוג בגוגל', href: '/rank-on-google-offer' },
      { label: 'Free Website Offer', labelHe: 'הצעת אתר חינם', href: '/free-website' },
      { label: 'Giveaway', labelHe: 'הגרלה', href: '/giveaway' },
    ],
    comparisons: [
      { label: 'All Comparisons', labelHe: 'כל ההשוואות', href: '/comparisons' },
      { label: 'vs GoHighLevel', labelHe: 'מול GoHighLevel', href: '/compare/boltcall-vs-gohighlevel' },
      { label: 'vs Smith.ai', labelHe: 'מול Smith.ai', href: '/compare/boltcall-vs-smith-ai' },
      { label: 'vs BirdEye', labelHe: 'מול BirdEye', href: '/compare/boltcall-vs-birdeye' },
      { label: 'vs Podium', labelHe: 'מול Podium', href: '/compare/boltcall-vs-podium' },
      { label: 'vs GoodCall', labelHe: 'מול GoodCall', href: '/compare/boltcall-vs-goodcall' },
      { label: 'vs Callin.io', labelHe: 'מול Callin.io', href: '/compare/boltcall-vs-callin' },
      { label: 'vs Lindy', labelHe: 'מול Lindy', href: '/compare/boltcall-vs-lindy' },
      { label: 'vs Convin.ai', labelHe: 'מול Convin.ai', href: '/compare/boltcall-vs-convin' },
      { label: 'vs SoundHound AI', labelHe: 'מול SoundHound AI', href: '/compare/boltcall-vs-soundhound' },
      { label: 'Receptionist vs Boltcall', labelHe: 'מזכירה מול Boltcall', href: '/comparisons/receptionist-vs-boltcall' },
      { label: 'Answering Services vs Boltcall', labelHe: 'שירותי מענה מול Boltcall', href: '/comparisons/answering-services-vs-boltcall' },
    ],
    learn: [
      { label: 'Blog', labelHe: 'בלוג', href: '/blog' },
      { label: 'Free AI Course', labelHe: 'קורס AI חינמי', href: '/ai-course' },
      { label: 'Speed-to-Lead Guide', labelHe: 'מדריך מהירות ללידים', href: '/speed-to-lead' },
      { label: 'Speed-to-Lead Statistics', labelHe: 'סטטיסטיקות מהירות ללידים', href: '/speed-to-lead/statistics' },
      { label: 'AI Guide Level 1: Understanding AI', labelHe: 'מדריך AI רמה 1: להבין AI', href: '/ai-guide-for-businesses/level-1-understanding-ai' },
      { label: 'AI Guide Level 2: Choosing AI Tools', labelHe: 'מדריך AI רמה 2: בחירת כלי AI', href: '/ai-guide-for-businesses/level-2-choosing-ai-tools' },
      { label: 'AI Guide Level 3: Getting Started', labelHe: 'מדריך AI רמה 3: להתחיל לעבוד', href: '/ai-guide-for-businesses/level-3-getting-started' },
      { label: 'All Lead Magnets', labelHe: 'כל מגנטי הלידים', href: '/lead-magnet' },
      { label: "AI Receptionist Buyer's Guide", labelHe: 'מדריך רכישה לקבלת פנים AI', href: '/lead-magnet/ai-receptionist-buyers-guide' },
      { label: 'Claude Code Overnight Kit', labelHe: 'ערכת Claude Code ללילה', href: '/lead-magnet/claude-code-overnight-kit' },
    ],
    company: [
      { label: 'About', labelHe: 'אודות', href: '/about' },
      { label: 'Contact', labelHe: 'צור קשר', href: '/contact' },
      { label: 'Partners', labelHe: 'שותפים', href: '/partners' },
      { label: 'Help Center', labelHe: 'מרכז עזרה', href: '/help-center' },
      { label: 'Documentation', labelHe: 'תיעוד', href: 'https://boltcall.mintlify.app/', external: true },
      { label: 'Email: support@boltcall.org', labelHe: 'אימייל: support@boltcall.org', href: 'mailto:support@boltcall.org' },
      { label: 'Privacy Policy', labelHe: 'מדיניות פרטיות', href: '/privacy-policy' },
      { label: 'Terms of Service', labelHe: 'תנאי שימוש', href: '/terms-of-service' },
    ],
  };

  const localeLabel = (link: FooterLink) => (isHebrew ? link.labelHe ?? link.label : link.label);


  return (
    <>
    <footer className={`${bgClass} ${textClass} pt-12 md:pt-16`} dir={dir}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Footer Content */}
        <div className="py-12">
          {/* Row 1: Logo + primary product columns */}
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10 ${isRtl ? 'text-right' : ''}`}>
            {/* Company Info */}
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                {showLogo && (
                  <picture>
                    <source srcSet="/boltcall_full_logo.webp" type="image/webp" />
                    <img
                      src="/boltcall_full_logo.png"
                      alt="Boltcall - AI Receptionist, Follow Ups, Reminders"
                      className="h-12 mb-3"
                      width="97"
                      height="48"
                      loading="lazy"
                    />
                  </picture>
                )}
              </motion.div>
            </div>

            {/* Features Links */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.features')}</p>
                <ul className="space-y-2">
                  {footerLinks.features.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                      >
                        {localeLabel(link)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Free Tools */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.15 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.freeTools')}</p>
                <ul className="space-y-2">
                  {footerLinks.freeTools.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                      >
                        {localeLabel(link)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Calculators */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.calculators')}</p>
                <ul className="space-y-2">
                  {footerLinks.calculators.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                      >
                        {localeLabel(link)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Learn */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.learn')}</p>
                <ul className="space-y-2">
                  {footerLinks.learn.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                      >
                        {localeLabel(link)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>

          {/* Row 2: Industries, Comparisons, Company */}
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-6 ${isRtl ? 'text-right' : ''}`}>
            {/* Industries */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.industries')}</p>
                <ul className="space-y-2">
                  {footerLinks.industries.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                      >
                        {localeLabel(link)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Comparisons */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.comparisons')}</p>
                <ul className="space-y-2">
                  {footerLinks.comparisons.map((link, index) => (
                    <li key={index}>
                      <Link
                        to={link.href}
                        className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                      >
                        {localeLabel(link)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Company / Support */}
            <div className="col-span-2 md:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <p className={`text-base font-semibold mb-3 ${textClass}`}>{t('footer.sections.company')}</p>
                <ul className="space-y-2">
                  {footerLinks.company.map((link, index) => (
                    <li key={index}>
                      {(link as any).external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                        >
                          {localeLabel(link)}
                        </a>
                      ) : (
                        <Link
                          to={link.href}
                          className={`${mutedTextClass} ${hoverTextClass} transition-colors duration-200`}
                        >
                          {localeLabel(link)}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className={`border-t ${borderClass} py-6`}>
          <div className={`flex flex-col md:flex-row justify-between items-center gap-4 ${isRtl ? 'md:flex-row-reverse' : ''}`}>
            <motion.div
              className={`${mutedTextClass} text-sm`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              {t('footer.copyright')}
            </motion.div>

            <motion.div
              className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              {/* Social Media Links */}
              <a
                href="https://www.facebook.com/profile.php?id=61582307818752"
                target="_blank"
                rel="noopener noreferrer"
                className={`${mutedTextClass} ${hoverTextClass} transition-colors`}
                aria-label="Boltcall on Facebook"
              >
                <Facebook className="w-4 h-4" strokeWidth={2.5} />
              </a>
              <a
                href="https://x.com/boltcallteam"
                target="_blank"
                rel="noopener noreferrer"
                className={`${mutedTextClass} ${hoverTextClass} transition-colors`}
                aria-label="Boltcall on X"
              >
                <XLogo className="w-4 h-4" strokeWidth={2.5} />
              </a>
              <a
                href="https://www.linkedin.com/company/boltcall"
                target="_blank"
                rel="noopener noreferrer"
                className={`${mutedTextClass} ${hoverTextClass} transition-colors`}
                aria-label="Boltcall on LinkedIn"
              >
                <Linkedin className="w-4 h-4" strokeWidth={2.5} />
              </a>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
    </>
  );
};

export default Footer;
