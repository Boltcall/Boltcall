import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { updateMetaDescription } from '@/lib/utils';
import {
  CheckCircle2,
  ArrowRight,
  Download,
  Phone,
  MessageSquare,
  Zap,
  Star,
  Clock,
} from 'lucide-react';

const LeadMagnetThankYouPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const downloadUrl = searchParams.get('download');

  useEffect(() => {
    document.title = 'Thank You | Boltcall';
    updateMetaDescription(
      'Thanks for signing up. Check your email for your free guide from Boltcall.'
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0]">
      {/* ── HERO: Confirmation ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-12 md:pt-28 md:pb-16">
        <div className="max-w-lg mx-auto text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-brand-blue/20 flex items-center justify-center">
            <CheckCircle2
              className="w-12 h-12 text-brand-blue"
              strokeWidth={2}
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Syncopate',sans-serif] tracking-tight">
            You're in
          </h1>
          <p className="text-[#e0e0e0]/80 text-lg max-w-md">
            Check your inbox — we just sent you everything. Or grab it right
            here:
          </p>

          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-14 px-10 bg-brand-blue text-white font-bold uppercase tracking-wider text-lg hover:bg-brand-blueDark hover:-translate-y-0.5 transition-all duration-300 clip-path-[polygon(0_0,100%_0,100%_70%,85%_100%,0_100%)]"
            >
              <Download className="w-5 h-5" strokeWidth={2.5} />
              Download Now
            </a>
          )}
        </div>
      </section>

      {/* ── BRIDGE: The soft pitch ── */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto">
          {/* Transition line */}
          <div className="w-12 h-[2px] bg-brand-blue mx-auto mb-10" />

          <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 font-sans tracking-tight">
            You just automated your research.
            <br />
            <span className="text-brand-blue">
              What about your customers?
            </span>
          </h2>
          <p className="text-[#e0e0e0]/60 text-center text-sm md:text-base max-w-xl mx-auto mb-12">
            The same "AI works while you don't" idea — applied to the calls,
            chats, and leads your business gets every day.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
            <FeatureCard
              icon={Phone}
              title="AI Receptionist"
              description="Answers every call 24/7. Books appointments. Never puts a customer on hold."
            />
            <FeatureCard
              icon={Zap}
              title="Speed-to-Lead"
              description="Responds to new form submissions in under 5 seconds. Before they call your competitor."
            />
            <FeatureCard
              icon={MessageSquare}
              title="AI Chatbot"
              description="Handles website visitors while you're on a job. Answers questions, captures leads."
            />
            <FeatureCard
              icon={Star}
              title="Review Automation"
              description="Automatically asks happy customers for Google reviews after every job."
            />
          </div>

          {/* Social proof line */}
          <p className="text-center text-[#e0e0e0]/40 text-xs uppercase tracking-widest mb-8">
            Built for local businesses that can't afford to miss a single lead
          </p>

          {/* Pricing anchor */}
          <div className="bg-white/[0.03] border border-white/10 rounded-lg p-6 md:p-8 text-center mb-8">
            <p className="text-[#e0e0e0]/50 text-sm mb-1">Starting at</p>
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-4xl md:text-5xl font-bold text-white">
                $549
              </span>
              <span className="text-[#e0e0e0]/50 text-sm">/mo</span>
            </div>
            <p className="text-[#e0e0e0]/60 text-sm mb-6">
              Most businesses pick the{' '}
              <span className="text-brand-blue font-semibold">$897 Pro plan</span>.
              <br />
              One captured customer pays for a full year.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 h-12 px-8 bg-[#e0e0e0] text-[#0a0a0a] font-bold uppercase tracking-wider hover:bg-brand-blue hover:text-white hover:-translate-y-0.5 transition-all duration-300 clip-path-[polygon(0_0,100%_0,100%_70%,85%_100%,0_100%)]"
            >
              See Plans
              <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          </div>

          {/* Risk reversal */}
          <div className="flex items-start gap-3 bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-4 max-w-md mx-auto">
            <Clock
              className="w-5 h-5 text-brand-blue mt-0.5 shrink-0"
              strokeWidth={2}
            />
            <p className="text-[#e0e0e0]/70 text-sm leading-relaxed">
              <span className="text-[#e0e0e0] font-semibold">
                No contracts. Cancel anytime.
              </span>{' '}
              Set up takes 10 minutes. If you don't see results in the first
              month, we'll help you fix it — or you walk away.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER: Back link ── */}
      <section className="px-6 pb-16 flex justify-center">
        <Link
          to="/"
          className="text-[#e0e0e0]/40 text-sm hover:text-[#e0e0e0]/70 transition-colors underline underline-offset-4"
        >
          Back to boltcall.org
        </Link>
      </section>
    </div>
  );
};

/* ── Feature Card Component ── */
const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 bg-white/[0.03] border border-white/10 rounded-lg p-4 hover:border-brand-blue/30 transition-colors">
    <div className="w-9 h-9 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4.5 h-4.5 text-brand-blue" strokeWidth={2} />
    </div>
    <div>
      <h3 className="text-sm font-semibold text-[#e0e0e0] mb-1">{title}</h3>
      <p className="text-xs text-[#e0e0e0]/50 leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);

export default LeadMagnetThankYouPage;
