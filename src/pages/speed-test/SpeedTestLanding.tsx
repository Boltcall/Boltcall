import React, { useState } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import GiveawayBar from '../../components/GiveawayBar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Button from '../../components/ui/Button';
import { useSpeedTestStore } from '../../stores/speedTestStore';
import { runSpeedTest } from '../../lib/speedTest';

const SpeedTestLanding: React.FC = () => {
  const navigate = useNavigate();
  const { setUrl, setResults, setWebhookResults } = useSpeedTestStore();
  const [websiteUrl, setWebsiteUrl] = useState('');

  React.useEffect(() => {
    document.title = 'Free Website Speed & Health Check — See Your Score in Seconds | Boltcall';
    updateMetaDescription('Enter your URL for a free website health check. Instantly analyze your page load speed, Core Web Vitals, mobile performance score, and get specific fixes to rank higher and reduce bounce rate.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Speed Test", "item": "https://boltcall.org/speed-test"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('Testing your website speed...');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) return;

    // Add https:// if not present
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    setIsLoading(true);
    setProgress(0);
    setProgressMessage('Running website health check...');
    setUrl(url);

    try {
      // Call webhook first
      setProgress(5);
      setProgressMessage('Running health check...');
      const webhookResponse = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/fade2648-d939-4d3b-93aa-726ced02c1a3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      let webhookData = null;
      if (webhookResponse.ok) {
        webhookData = await webhookResponse.json();
        setWebhookResults(webhookData);
      }

      // Run speed test with progress callback
      const results = await runSpeedTest(url, (progressValue, message) => {
        setProgress(progressValue);
        setProgressMessage(message);
      });
      setResults(results);
      // Small delay to show 100% before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/speed-test/report');
    } catch (error) {
      console.error('Speed test error:', error);
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to run health check. Please try again.';
      alert(errorMessage);
    } finally {
      // Always reset loading state, even if navigation fails
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative min-h-screen bg-white">
      <GiveawayBar />
      <div className="relative z-10 pt-32">
        <Header />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Website Health Check
            </h1>
            
            <p className="text-xl text-gray-600 mb-12">
              Get instant insights into your website's performance and health
            </p>


            {/* What This Test Measures */}
            <section className="max-w-3xl mx-auto text-left mt-4 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">What Does This Health Check Measure?</h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Your website's speed and performance directly affect how many visitors turn into customers. 
                Google uses Core Web Vitals — including Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), 
                and First Input Delay (FID) — as ranking signals. A slow site not only frustrates visitors; it actively 
                suppresses your search rankings.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This free tool analyzes your page load speed, mobile performance score, render-blocking resources, 
                image optimization, and other technical factors that affect both user experience and SEO. Enter your 
                URL to get a real-time score with specific, actionable recommendations you can implement today to 
                rank higher and reduce bounce rate.
              </p>
            </section>

          </motion.div>

          <div className="text-center">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="Enter your website URL (e.g., example.com)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="px-8 py-3 text-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    'Run Health Check'
                  )}
                </Button>
              </div>
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-3 mt-4"
                >
                  <div className="flex items-center gap-2 text-blue-600">
                    <span className="text-sm font-medium">{progressMessage}</span>
                  </div>
                  <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{progress}%</span>
                </motion.div>
              )}
            </form>
          </div>
        </main>

      {/* Trust + Social Proof */}
      <section className="py-10 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-gray-500 mb-5">
            Trusted by 1,000+ local businesses &middot; Free forever &middot; No signup required
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {[
              { quote: '"Found 3 issues I had no idea about. Fixed them and rankings improved."', author: 'Plumber, Ohio' },
              { quote: '"Fast, accurate, and free. Runs in seconds."', author: 'HVAC contractor, Georgia' },
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
    </div>
  );
};

export default SpeedTestLanding;

