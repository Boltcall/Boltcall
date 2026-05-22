import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import { Zap, Clock, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

const DoesResponseTimeAffectGettingJob: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Does Response Time Affect Getting the Job? | Boltcall';
    updateMetaDescription(
      'Yes — response time is the #1 factor in winning local service jobs. Learn how Boltcall helps businesses respond instantly and book more leads automatically.'
    );

    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: 'Does Response Time Affect Whether You Get the Job?',
      description:
        'Response time is the single biggest factor in whether a local service business wins or loses a job. MIT Sloan research shows contacting a lead within 1 minute yields 391% higher conversion. Learn how to fix slow response with AI speed-to-lead automation.',
      author: { '@type': 'Organization', name: 'Boltcall', url: 'https://boltcall.org' },
      publisher: {
        '@type': 'Organization',
        name: 'Boltcall',
        logo: { '@type': 'ImageObject', url: 'https://boltcall.org/boltcall-logo.png' },
      },
      datePublished: '2026-05-01',
      dateModified: '2026-05-22',
      image: { '@type': 'ImageObject', url: 'https://boltcall.org/og-image.jpg' },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': 'https://boltcall.org/blog/does-response-time-affect-getting-job',
      },
    };
    const articleScript = document.createElement('script');
    articleScript.type = 'application/ld+json';
    articleScript.id = 'article-schema-response-time';
    articleScript.text = JSON.stringify(articleSchema);
    document.head.appendChild(articleScript);

    const orgSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Boltcall',
      url: 'https://boltcall.org',
      logo: 'https://boltcall.org/boltcall-logo.png',
      sameAs: ['https://boltcall.org'],
    };
    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.id = 'org-schema-response-time';
    orgScript.text = JSON.stringify(orgSchema);
    document.head.appendChild(orgScript);

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://boltcall.org' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://boltcall.org/blog' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Does Response Time Affect Getting the Job?',
          item: 'https://boltcall.org/blog/does-response-time-affect-getting-job',
        },
      ],
    };
    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.id = 'breadcrumb-schema-response-time';
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does response time really affect whether I get the job?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — dramatically. Research from MIT Sloan found that contacting a lead within 1 minute makes you 391% more likely to convert compared to waiting just 5 minutes. Local service customers call multiple businesses simultaneously and give the job to whoever responds first. Speed is the primary competitive advantage in local service markets.',
          },
        },
        {
          '@type': 'Question',
          name: 'How fast should a local business respond to a new lead?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Under 1 minute is the gold standard. Conversion rates drop significantly after 5 minutes, fall 80% by 10 minutes, and become 10x lower after 30 minutes. The industry average response time is 47 hours — which means any business that responds within minutes holds a massive competitive advantage over the typical competitor.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens if I call a lead back after 30 minutes?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'By 30 minutes, the job is almost certainly already booked with a competitor. The customer has mentally moved on, and calling back rarely converts. After 10 minutes you are already 10x less likely to even reach the person. A 30-minute callback is functionally useless for emergency or high-intent service requests.',
          },
        },
        {
          '@type': 'Question',
          name: 'How can a local business respond faster without hiring more staff?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI speed-to-lead platforms like Boltcall automate instant response around the clock. When a lead calls or submits a form, the AI responds in seconds, qualifies the lead, and books the appointment — with no human involvement required. This eliminates the need for after-hours staff while ensuring every lead is captured.',
          },
        },
      ],
    };
    const faqScript = document.createElement('script');
    faqScript.type = 'application/ld+json';
    faqScript.id = 'faq-schema-response-time';
    faqScript.text = JSON.stringify(faqSchema);
    document.head.appendChild(faqScript);

    return () => {
      document.getElementById('article-schema-response-time')?.remove();
      document.getElementById('org-schema-response-time')?.remove();
      document.getElementById('breadcrumb-schema-response-time')?.remove();
      document.getElementById('faq-schema-response-time')?.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-orange-50 via-white to-yellow-50/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Speed-to-Lead Research
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Does Response Time Affect Whether You Get the Job?
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-4">
            Yes — and the data is startling. The first business to respond almost always wins the booking. Everything else — your price, your reviews, your years of experience — comes second.
          </p>
          <p className="text-gray-500 text-sm">
            Updated May 2026 &bull; 9 min read
          </p>
        </div>
      </section>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* AEO Answer Box */}
        <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-2xl p-6">
          <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide mb-2">Direct Answer</p>
          <p className="text-gray-800 leading-relaxed text-base">
            Yes — response time is the single biggest factor in whether a local service business wins or loses a job. Research from MIT Sloan found that contacting a lead within 1 minute makes you 391% more likely to convert. After 10 minutes, you are 10x less likely to even reach the person.
          </p>
        </div>

        {/* Section 1: Response Time Window */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <TrendingDown className="w-7 h-7 text-orange-600 shrink-0" />
            The Response Time Window That Costs Local Businesses the Most
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            When a homeowner needs a plumber, an HVAC tech, or a dental appointment, they are not doing careful comparison shopping. They are in a state of need — an emergency repair, a broken appliance, a scheduling urgency — and they want the problem solved fast. They pull up Google, call three or four businesses, and give their job to whoever picks up or responds first.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            Industry data shows a consistent and steep degradation in conversion as response time increases. This is not a gradual decline — it falls off a cliff within the first 10 minutes.
          </p>

          <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Response Time</th>
                  <th className="px-4 py-3 font-semibold text-orange-700 border-b border-gray-200 bg-orange-50">Conversion Impact</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">What Typically Happens</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Under 1 minute', '391% higher conversion', 'Lead\'s buying intent is fully active — books immediately'],
                  ['1 to 5 minutes', 'Significant drop', 'Customer has already started calling the next number'],
                  ['5 to 10 minutes', '80% lower conversion', 'Most customers have already reached someone else'],
                  ['10 to 30 minutes', '10x less likely to connect', 'Lead has mentally moved on to a booked competitor'],
                  ['30+ minutes or hours', 'Near zero conversion', 'Job is booked, work has started, opportunity is gone'],
                ].map(([time, impact, outcome]) => (
                  <tr key={time} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{time}</td>
                    <td className="px-4 py-3 text-orange-700 bg-orange-50/30 font-semibold">{impact}</td>
                    <td className="px-4 py-3 text-gray-600">{outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-gray-700 leading-relaxed mb-6">
            The industry average response time for local service businesses in the US is <strong>47 hours</strong>. Nearly two full days. For a customer who needed someone immediately, a 47-hour callback is not a follow-up — it is an apology letter to a customer who has already moved on.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { stat: '391%', label: 'higher conversion when you respond within 1 minute (MIT Sloan)' },
              { stat: '47 hrs', label: 'average response time for local service businesses in the US' },
              { stat: '10x', label: 'less likely to reach a lead after 10 minutes have passed' },
            ].map((item) => (
              <div key={item.label} className="bg-orange-50 rounded-xl p-5 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">{item.stat}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Why the First Response Wins */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Zap className="w-7 h-7 text-yellow-500 shrink-0" />
            Why the First Response Always Wins
          </h2>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">How fast do I need to respond to a new lead?</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Under one minute is the gold standard. MIT Sloan's research across thousands of inbound leads found that the first minute is a category of its own — leads contacted within 60 seconds convert at nearly four times the rate of those contacted five minutes later. This is not a marginal improvement; it is a fundamentally different outcome.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            The reason is buying intent. When someone searches for "emergency plumber near me" and calls your number, their intent to book is at its absolute peak in that exact moment. They have not yet called a second business. They have not yet scrolled through more Google results. They have not yet calmed down from the stress of the problem and decided to wait until tomorrow. You have a one-minute window where converting them is almost guaranteed — if you answer.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            Every minute that passes after that, their options multiply and their urgency fades. By 5 minutes, 75% of local service customers have reached another business or left a voicemail somewhere else. By 10 minutes, the conversion opportunity is effectively closed.
          </p>

          <blockquote className="border-l-4 border-orange-500 pl-6 my-6 bg-orange-50 rounded-r-xl py-4 pr-4">
            <p className="text-lg text-gray-700 italic leading-relaxed">"If you call a lead within five minutes vs thirty minutes, you are 100 times more likely to reach them. The difference between responding now and responding later is not incremental — it is categorical."</p>
            <footer className="mt-3 text-sm font-semibold text-gray-600">— James Oldroyd, MIT Sloan School of Management, Lead Response Management Study</footer>
          </blockquote>

          <p className="text-gray-700 leading-relaxed">
            The math compounds quickly across a month of leads. If your business receives 40 inbound inquiries per month and you only respond to half of them within 5 minutes, you are handing 20 jobs directly to competitors — not because they are better, cheaper, or more reviewed, but simply because they picked up first.
          </p>
        </section>

        {/* Section 3: Missing Calls */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-red-500 shrink-0" />
            What Happens When You Miss a Call
          </h2>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">What is the response time for most local businesses?</h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Most local service businesses respond in hours, not minutes — and many do not respond at all. Studies across the plumbing, HVAC, roofing, landscaping, and home services industries consistently show that fewer than 30% of inbound leads receive a response within the first hour. The average, as noted above, is 47 hours.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            This creates an enormous competitive opening for any business willing to close it. In a market where the average competitor takes two days to respond, a business that responds in 60 seconds wins by default — regardless of pricing, branding, or service quality. Speed becomes the differentiator before the customer ever evaluates anything else.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            The most damaging aspect of missed calls is that they are invisible. Unlike a bad review or a customer complaint, a missed call leaves no trace. Your team does not know an emergency plumbing call came in at 7:42 PM on Friday. Your CRM does not log it. Your owner does not see it in the weekly numbers. But the customer is fully aware — and they booked a competitor who answered immediately.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { stat: '80%', label: 'lower conversion rate at the 5–10 minute mark vs. 1-minute response' },
              { stat: '75%', label: 'of local service customers who do not leave a voicemail when no one answers' },
            ].map((item) => (
              <div key={item.label} className="bg-red-50 rounded-xl p-5 text-center border border-red-100">
                <div className="text-3xl font-bold text-red-600 mb-1">{item.stat}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>

          <p className="text-gray-700 leading-relaxed mt-6">
            In high-repeat industries — dentistry, HVAC maintenance contracts, home cleaning — every missed call is potentially thousands of dollars in lifetime customer value walking out the door permanently. A plumber who misses one emergency call does not just lose that job; they lose every referral that customer would have made over the next decade.
          </p>

          <p className="text-gray-700 leading-relaxed mt-4">
            For more on the compounding cost of missed calls, read our guide on{' '}
            <a href="/blog/speed-to-lead-local-business" className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
              speed-to-lead for local businesses
            </a>{' '}
            and our breakdown of{' '}
            <a href="/blog/ai-phone-answering-plumbers" className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
              what happens when plumbers miss calls
            </a>.
          </p>
        </section>

        {/* Section 4: How to Fix It */}
        <section>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <CheckCircle className="w-7 h-7 text-green-600 shrink-0" />
            How to Fix Slow Response Without Hiring More Staff
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Historically, the only way to guarantee fast response was to have a human available around the clock. That meant hiring after-hours staff, paying a live answering service $500–$1,500 per month, or personally managing calls 24/7 — options that are expensive, unsustainable, and still prone to delays when call volume spikes.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            AI-powered speed-to-lead platforms now automate the entire first response. When a lead comes in — through a call, a contact form, a Google Business Profile message, or a web chat — the system responds in seconds, not hours. It qualifies the lead, answers common questions, and books the appointment directly into your calendar with no human involvement required.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            Boltcall is built specifically for this use case. Every inbound lead for a local service business gets a personalized response in under 60 seconds, 24 hours a day, 7 days a week — including nights, weekends, and holidays when most competitors go dark. The AI handles the first conversation, captures the customer's information, and confirms the booking before a competitor even sees the missed call notification.
          </p>
          <p className="text-gray-700 leading-relaxed mb-6">
            The{' '}
            <a href="/features/ai-receptionist" className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
              Boltcall AI receptionist
            </a>{' '}
            learns your service area, your pricing structure, your availability, and your business voice. It handles the full intake conversation — collecting the job details, confirming the appointment slot, and sending a confirmation text — so your team only gets involved when the job is already booked and ready to be dispatched.
          </p>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">What instant response automation handles:</h3>
            <ul className="space-y-3">
              {[
                'Answers every inbound call in under 2 seconds — no hold, no voicemail',
                'Responds to web forms and texts immediately, even at 2 AM',
                'Qualifies the lead and collects job details before booking',
                'Books appointments directly to your calendar in real time',
                'Sends instant confirmation texts so customers know they are booked',
                'Follows up with unbooked leads automatically — no manual chase',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-gray-700 leading-relaxed mt-6">
            For service businesses that compete on local search, speed-to-lead is not a nice-to-have feature. It is the primary conversion driver. Every other improvement — better reviews, a redesigned website, more ad spend — sits downstream of the fundamental question: did you respond before your competitor did?
          </p>

          <p className="text-gray-700 leading-relaxed mt-4">
            See how Boltcall compares to traditional hiring on our{' '}
            <a href="/pricing" className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
              pricing page
            </a>{' '}
            — or{' '}
            <a href="/signup" className="text-orange-600 hover:text-orange-700 underline underline-offset-2">
              start free today
            </a>{' '}
            and see your first automated response go out within minutes of setup.
          </p>
        </section>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Stop losing jobs to faster competitors</h2>
          <p className="text-orange-100 mb-6 max-w-lg mx-auto">
            Boltcall responds to every lead in under 60 seconds — 24/7, automatically. The first business to respond wins. Make that business yours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-colors"
            >
              <Zap className="w-5 h-5" />
              Try Boltcall free
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white/10 transition-colors"
            >
              <Clock className="w-5 h-5" />
              See pricing
            </a>
          </div>
        </div>

      </article>

      {/* FAQ Section */}
      <section className="py-12 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'Does response time really affect whether I get the job?',
                a: 'Yes — dramatically. Research from MIT Sloan found that contacting a lead within 1 minute makes you 391% more likely to convert compared to waiting just 5 minutes. Local service customers call multiple businesses simultaneously and give the job to whoever responds first. Speed is the primary competitive advantage in local service markets.',
              },
              {
                q: 'How fast should a local business respond to a new lead?',
                a: 'Under 1 minute is the gold standard. Conversion rates drop significantly after 5 minutes, fall 80% by 10 minutes, and become 10x lower after 30 minutes. The industry average response time is 47 hours — which means any business that responds within minutes holds a massive competitive advantage over the typical competitor.',
              },
              {
                q: 'What happens if I call a lead back after 30 minutes?',
                a: 'By 30 minutes, the job is almost certainly already booked with a competitor. The customer has mentally moved on, and calling back rarely converts. After 10 minutes you are already 10x less likely to even reach the person. A 30-minute callback is functionally useless for emergency or high-intent service requests.',
              },
              {
                q: 'How can a local business respond faster without hiring more staff?',
                a: 'AI speed-to-lead platforms like Boltcall automate instant response around the clock. When a lead calls or submits a form, the AI responds in seconds, qualifies the lead, and books the appointment — with no human involvement required. This eliminates the need for after-hours staff while ensuring every lead is captured.',
              },
            ].map((item) => (
              <div key={item.q} className="border border-gray-200 rounded-xl overflow-hidden">
                <h3 className="font-semibold text-gray-900 px-6 py-4 bg-gray-50 border-b border-gray-200">{item.q}</h3>
                <p className="text-gray-700 px-6 py-4 leading-relaxed">{item.a}</p>
              </div>
            ))}
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
              { quote: '"We used to miss calls every single night. Boltcall changed that immediately."', author: 'Plumbing company, Arizona' },
              { quote: '"Set it up in an afternoon. Booked 3 new jobs the first week during hours we were closed."', author: 'HVAC contractor, Georgia' },
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

      {/* Related Articles */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Related Reading</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Speed-to-Lead for Local Businesses: Complete Guide',
                href: '/blog/speed-to-lead-local-business',
                desc: 'How to build a lead response system that converts more inquiries into booked jobs.',
              },
              {
                title: 'AI Phone Answering for Plumbers',
                href: '/blog/ai-phone-answering-plumbers',
                desc: 'Why plumbing businesses miss 40%+ of their calls — and how AI stops it.',
              },
              {
                title: 'AI Receptionist Features',
                href: '/features/ai-receptionist',
                desc: 'See exactly how Boltcall\'s AI receptionist handles inbound calls and books jobs.',
              },
              {
                title: 'Start for Free',
                href: '/signup',
                desc: 'Set up your Boltcall account in minutes and capture your first automated lead today.',
              },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block bg-gray-50 rounded-xl p-5 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-colors group"
              >
                <div className="font-semibold text-gray-900 group-hover:text-orange-700 mb-1 transition-colors">
                  {link.title}
                </div>
                <div className="text-sm text-gray-500">{link.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DoesResponseTimeAffectGettingJob;
