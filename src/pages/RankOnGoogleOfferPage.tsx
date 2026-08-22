import { useEffect } from "react";
import { updateMetaDescription } from "../lib/utils";
import { AnimatedRoadmap } from "@/components/ui/animated-roadmap";
import { CheckCircle } from "lucide-react";
import { ThreeDButton } from "@/components/ui/ThreeDButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GiveawayBar from "../components/GiveawayBar";
import FAQ from "../components/FAQ";
import Breadcrumbs from "../components/Breadcrumbs";

const milestonesData = [
    {
        id: 1,
        name: "Google SEO",
        status: "complete" as const,
        position: { top: "70%", left: "5%" },
    },
    {
        id: 2,
        name: "Google reviews system",
        status: "complete" as const,
        position: { top: "15%", left: "20%" },
    },
    {
        id: 3,
        name: "Lead Reactivation",
        status: "in-progress" as const,
        position: { top: "45%", left: "55%" },
    },
    {
        id: 4,
        name: "Free Website Rebranding",
        status: "pending" as const,
        position: { top: "10%", right: "10%" },
    },
];

const RankOnGoogleOfferPage = () => {
    useEffect(() => {
        document.title = 'Boost Your Google Rankings with Speed-to-Lead and SEO Solutions | Boltcall';
        updateMetaDescription(
            'Rank higher on Google and capture more local leads with Boltcall\'s speed-to-lead and SEO solutions. Improve your Google reviews, local citations, and lead response speed.'
        );
        const bcScript = document.createElement('script');
        bcScript.type = 'application/ld+json';
        bcScript.id = 'breadcrumb-jsonld';
        bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Rank on Google Offer", "item": "https://boltcall.org/rank-on-google-offer"}]});
        document.head.appendChild(bcScript);
    
    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
    }, []);

    return (
        <div className="w-full bg-white text-foreground min-h-screen flex flex-col">
            {/* Giveaway Bar (hidden on mobile) */}
            <div className="hidden md:block">
                <GiveawayBar />
            </div>

            <Header />
            {/* Container for the Hero Content */}
            <div className="flex-grow pt-10 md:pt-16">
                <div className="container mx-auto px-4 py-8 md:py-12">
                    <Breadcrumbs />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Left Column: Text content */}
                        <div className="flex flex-col text-left space-y-6">
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl text-black">
                                Stay ahead with a clear product plan
                            </h1>
                            <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                                Visualize your roadmap, assign tasks, and hit every milestone—faster and smarter.
                            </p>
                            <div className="flex flex-col space-y-4 pt-4">
                                <ThreeDButton />

                                <div className="space-y-2 mt-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <p>The website and system are live in 24 hours.</p>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                        <p>The lead reactivation will cover the costs of the first month. If it doesn't, we refund the difference.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Animated Roadmap Component */}
                        <div className="w-full flex justify-center lg:justify-end">
                            <div className="w-full max-w-md lg:scale-95 lg:origin-right">
                                <AnimatedRoadmap
                                    milestones={milestonesData}
                                    mapImageSrc="https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-SsfjxCJh43Hr1dqzkbFWUGH3ICZQbH.png&w=320&q=75"
                                    aria-label="An animated roadmap showing project milestones from kick-off to launch."
                                    className="py-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* What's Included */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">What's Included in the Offer</h2>
                <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
                    This isn't a one-size-fits-all package. It's a done-for-you growth system built specifically for local businesses that want to rank on Google, capture more leads, and convert them automatically — without hiring a full marketing team.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    {[
                        { title: 'Google SEO Setup', desc: 'We optimize your Google Business Profile, build local citations, and target the keywords your customers are actually searching. Most clients see ranking improvements within 30–60 days.' },
                        { title: 'Google Reviews System', desc: 'An automated review request system that contacts customers after each job, dramatically increasing your review velocity and average star rating over time.' },
                        { title: 'Lead Reactivation Campaign', desc: 'We reach out to your existing leads and past customers who never converted. This campaign typically covers the cost of the entire first month through recovered revenue.' },
                        { title: 'Free Website Rebranding', desc: 'A professional website redesign optimized for conversion — clear headline, prominent call-to-action, trust signals, and mobile-first layout. Delivered as part of your onboarding.' },
                    ].map((item) => (
                        <div key={item.title} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">{item.title}</h3>
                            <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center">
                    <p className="text-sm text-gray-700 font-medium mb-1">Risk-Free Guarantee</p>
                    <p className="text-sm text-gray-600">The lead reactivation campaign is designed to cover the cost of your first month. If it doesn't generate enough revenue to offset our fee, we refund the difference. You only pay for results.</p>
                </div>
            </section>

            {/* How We Help You Rank on Google */}
            <section className="py-12 bg-gray-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Help You Rank on Google</h2>
                    <div className="space-y-4">
                        <p className="text-gray-700 leading-relaxed">
                            We start with your Google Business Profile — the single most important factor for local search visibility. Most GBPs are incomplete or inconsistently formatted, which suppresses rankings in the local map pack. We optimize every field, add geo-tagged photos, build accurate local citations across the major directories, and ensure your business name, address, and phone number are consistent everywhere Google looks. These foundational steps alone move most clients from invisible to page one within 30 to 60 days.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            On top of the GBP work, we handle on-page SEO for your website — optimizing title tags, meta descriptions, headers, and internal linking so every page sends the right ranking signals. We also implement a structured review strategy that automatically requests feedback from your customers after each job, steadily building the volume and recency of Google reviews that Google's algorithm heavily weights for local rankings.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            Finally, we create AI-assisted content specifically structured to rank in both traditional search and AI-generated answer results. This includes FAQ pages, service area pages, and structured schema markup that helps Google understand exactly what you offer and where you serve. The result is a compounding SEO foundation that keeps generating traffic long after the initial work is done — without requiring you to run paid ads month after month.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            Our AI receptionist also captures the calls that come from your improved Google rankings, ensuring every new lead you earn is answered — even at 2am. Better rankings without better lead capture is like turning on a faucet with no bucket underneath.
                        </p>
                    </div>
                </div>
            </section>

            <FAQ />

            {/* Use Cases / Case Studies */}
            <section id="use-cases" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Local Businesses That Improved Their Google Rankings</h2>
                <p className="text-gray-500 text-center mb-8 text-sm max-w-2xl mx-auto">
                    Real results from local businesses that used our Google SEO system to move up in rankings, capture more calls, and grow revenue.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                        {
                            business: 'HVAC Company',
                            location: 'Phoenix, AZ',
                            before: 'Ranking #8 in the local pack — invisible to most searchers.',
                            actions: 'Fixed citation inconsistencies and fully optimized Google Business Profile.',
                            result: 'Moved to #2 in the local pack within 6 weeks.',
                            stat: '+38% inbound calls',
                            color: 'blue',
                        },
                        {
                            business: 'Dental Practice',
                            location: 'San Diego, CA',
                            before: 'Stuck on page 2 of Google with thin review volume.',
                            actions: 'Added missing schema markup and launched an automated review strategy.',
                            result: 'Moved to the top 3 results in 45 days.',
                            stat: '12 new patients/month',
                            color: 'green',
                        },
                        {
                            business: 'Law Firm',
                            location: 'Atlanta, GA',
                            before: 'Low organic traffic and slow mobile load times hurting rankings.',
                            actions: 'Rewrote keyword-aligned headings and resolved mobile page speed issues.',
                            result: '+51% organic traffic with consistent top-page placement.',
                            stat: '9 more consultation calls/month',
                            color: 'purple',
                        },
                        {
                            business: 'Plumbing Company',
                            location: 'Chicago, IL',
                            before: 'Not appearing in the local pack for high-intent plumbing searches.',
                            actions: 'Claimed and optimized 4 key citation sources for NAP consistency.',
                            result: 'Entered the local pack within 30 days of citation work.',
                            stat: '$14,200 additional monthly revenue',
                            color: 'orange',
                        },
                    ].map((item) => {
                        const borderColor =
                            item.color === 'blue' ? 'border-blue-200' :
                            item.color === 'green' ? 'border-green-200' :
                            item.color === 'purple' ? 'border-purple-200' :
                            'border-orange-200';
                        const badgeBg =
                            item.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                            item.color === 'green' ? 'bg-green-50 text-green-700' :
                            item.color === 'purple' ? 'bg-purple-50 text-purple-700' :
                            'bg-orange-50 text-orange-700';
                        const statBg =
                            item.color === 'blue' ? 'bg-blue-600' :
                            item.color === 'green' ? 'bg-green-600' :
                            item.color === 'purple' ? 'bg-purple-600' :
                            'bg-orange-600';
                        return (
                            <div key={item.business} className={`bg-white border-2 ${borderColor} rounded-xl p-6 shadow-sm flex flex-col gap-3`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold text-gray-900 text-base">{item.business}</p>
                                        <p className="text-xs text-gray-500">{item.location}</p>
                                    </div>
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ${badgeBg}`}>{item.stat}</span>
                                </div>
                                <div className="space-y-1.5 text-sm text-gray-600">
                                    <p><span className="font-medium text-gray-700">Before:</span> {item.before}</p>
                                    <p><span className="font-medium text-gray-700">What we did:</span> {item.actions}</p>
                                    <p><span className="font-medium text-gray-700">Outcome:</span> {item.result}</p>
                                </div>
                                <div className={`${statBg} text-white text-sm font-semibold rounded-lg px-4 py-2 text-center mt-auto`}>
                                    {item.stat}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Social Proof */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Trusted by Local Business Owners</h2>
              <p className="text-gray-500 text-center mb-8 text-sm">Join 500+ businesses using Boltcall to capture more leads and grow revenue.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { quote: "Boltcall paid for itself in the first week. We stopped losing calls after hours and our bookings jumped 40%.", name: "Marcus T.", role: "HVAC Owner, Texas" },
                  { quote: "I was skeptical about AI, but it just works. Our front desk handles 30% fewer interruptions now.", name: "Priya S.", role: "Dental Practice Manager, California" },
                  { quote: "We were losing 15-20 calls a week to voicemail. Boltcall captures every single one now.", name: "James R.", role: "Plumbing Business Owner, Florida" },
                ].map((item) => (
                  <div key={item.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">"{item.quote}"</p>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Trust Signals */}
            <section className="bg-gray-50 border-t border-gray-100 py-8">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>100% Free — no credit card required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Used by 500+ local businesses</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Results in 30 days or your money back</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Your data is never sold or shared</span>
                  </div>
                </div>
              </div>
            </section>

      
      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Trusted by 1,000+ local businesses &middot; No credit card required &middot; Cancel anytime
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {[
              { quote: '"Paid for itself within the first week."', author: 'HVAC contractor, Texas' },
              { quote: '"Set up in 30 minutes. Never missed a lead since."', author: 'Dental practice, Florida' },
            ].map((t) => (
              <div key={t.author} className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 text-left max-w-xs">
                <div className="text-yellow-400 text-sm mb-2">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                <p className="text-gray-700 text-sm leading-relaxed italic">{t.quote}</p>
                <p className="text-gray-400 text-xs mt-2">&mdash; {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO Audit Coverage Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">What the Rank on Google Audit Covers</h2>
          <p className="text-gray-500 text-sm text-center mb-6">A complete breakdown of the 30-factor SEO audit included in the Rank on Google package</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Audit Area</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What We Check</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Why It Matters</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Technical SEO', 'Site speed, mobile friendliness, crawl errors, SSL', 'Google penalizes slow or broken sites'],
                  ['On-Page SEO', 'Title tags, meta descriptions, heading structure, keyword usage', 'Determines what queries you rank for'],
                  ['Schema Markup', 'LocalBusiness, FAQ, Service, Review structured data', 'Unlocks rich results and AI engine visibility'],
                  ['Google Business Profile', 'Completeness, categories, photos, review signals', 'Drives local pack rankings and map results'],
                  ['Content Quality', 'Depth, uniqueness, topical authority, E-E-A-T signals', 'Thin content loses to competitors with better pages'],
                  ['Backlink Profile', 'Domain authority, citation consistency, toxic links', 'Backlinks remain the strongest ranking signal'],
                  ['AI Engine Readiness', 'Entity clarity, FAQ coverage, citation network', 'Determines if ChatGPT and Perplexity recommend you'],
                  ['Competitor Gap', 'Keywords competitors rank for that you do not', 'Shows the fastest path to more organic traffic'],
                ].map(([area, check, why]) => (
                  <tr key={area} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{area}</td>
                    <td className="px-4 py-3 text-gray-600">{check}</td>
                    <td className="px-4 py-3 text-gray-600">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Footer />
        </div>
    );
};

export default RankOnGoogleOfferPage;
