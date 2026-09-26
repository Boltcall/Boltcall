import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PricingSection5 from '../components/ui/pricing';

import GiveawayBar from '../components/GiveawayBar';

const FreeWebsitePricingPage: React.FC = () => {
    // Set page title
    React.useEffect(() => {
        document.title = "Pricing Packages | Boltcall";
  
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Pricing", "item": "https://boltcall.org/pricing"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

    return (
        <div className="min-h-screen w-full bg-white">
            <GiveawayBar />
            <Header />
            <div className="pt-24">
                <PricingSection5 />
            </div>
      
      {/* Free Website Package Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Free Website Package: What Is and Is Not Included</h2>
          <p className="text-gray-500 text-sm text-center mb-6">A clear breakdown of what you get with the Boltcall free website package vs. typical web design costs</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Component</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">Boltcall Free Package</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Typical Web Agency</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Custom website design', 'Included free', '$2,500 – $10,000'],
                  ['Mobile-responsive layout', 'Included', 'Included (usually)'],
                  ['SEO-optimized pages', 'Included', '$500 – $2,000 add-on'],
                  ['Contact form with lead capture', 'Included', 'Included'],
                  ['Google Business Profile setup', 'Included', '$300 – $500 add-on'],
                  ['AI phone receptionist', 'Included (Boltcall Pro plan)', 'Not offered'],
                  ['SSL certificate', 'Included', '$50 – $200/year'],
                  ['Monthly hosting', 'Included', '$20 – $100/month'],
                  ['Delivery time', '7–14 days', '4–12 weeks'],
                  ['Ongoing maintenance', 'Included', '$100 – $500/month'],
                ].map(([component, boltcall, agency]) => (
                  <tr key={component} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{component}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{boltcall}</td>
                    <td className="px-4 py-3 text-gray-600">{agency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Built for local service businesses &middot; No credit card required &middot; Cancel anytime
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
      <Footer />
        </div>
    );
};

export default FreeWebsitePricingPage;
