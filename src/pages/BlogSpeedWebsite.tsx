import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Users, Phone } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';
import Breadcrumbs from '../components/Breadcrumbs';

const BlogSpeedWebsite: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Why Website Speed Is Everything for Business | Boltcall';
    updateMetaDescription('Why website speed is everything for business success. Learn how fast sites improve conversions and boost customer satisfaction.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Why Website Speed Is Everything",
      "description": "Why website speed is everything for business success. Learn how fast sites improve conversions and customer satisfaction.",
      "author": {
        "@type": "Organization",
        "name": "Boltcall"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Boltcall",
        "logo": {
          "@type": "ImageObject",
          "url": "https://boltcall.org/boltcall_full_logo.png"
        }
      },
      "datePublished": "2025-01-25",
      "dateModified": "2026-04-09",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/why-website-speed-is-everything"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.jpg"
      }
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog"}, {"@type": "ListItem", "position": 3, "name": "Why Website Speed Matters", "item": "https://boltcall.org/blog/why-website-speed-is-everything"}]});
    document.head.appendChild(bcScript);
    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      <ReadingProgress />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl px-4 sm:px-6 lg:px-8" style={{ marginLeft: 0 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left mb-4"
          >
            <Breadcrumbs items={[
              { label: 'Home', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'Why Website Speed Is Everything', href: '/blog/website-speed' }
            ]} />
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight text-left">
              Why <span className="text-blue-600">Website Speed</span> Is Everything
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>January 25, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>7 min read</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="flex gap-8">
          <article className="flex-1 max-w-4xl">
        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="prose prose-lg max-w-none mb-12"
        >
          <p className="text-xl text-gray-700 leading-relaxed font-medium">
            Your website loads in 3 seconds. Your competitor's loads in 1 second. 
            Guess who gets the customer? Speed isn't just nice to have—it's the difference 
            between winning and losing in today's digital world.
          </p>
        </motion.div>

        {/* Table of Contents */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
          <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
          <ol className="space-y-2 list-decimal list-inside">
                  <li key="the-3-second-rule-when-speed-becomes-cri"><a href="#the-3-second-rule-when-speed-becomes-cri" className="text-blue-600 hover:underline text-sm">The 3-Second Rule: When Speed Becomes Critical</a></li>
                  <li key="why-speed-matters-more-than-ever"><a href="#why-speed-matters-more-than-ever" className="text-blue-600 hover:underline text-sm">Why Speed Matters More Than Ever</a></li>
                  <li key="the-real-cost-of-a-slow-website"><a href="#the-real-cost-of-a-slow-website" className="text-blue-600 hover:underline text-sm">The Real Cost of a Slow Website</a></li>
                  <li key="what-makes-a-website-slow"><a href="#what-makes-a-website-slow" className="text-blue-600 hover:underline text-sm">What Makes a Website Slow?</a></li>
                  <li key="how-to-make-your-website-fast"><a href="#how-to-make-your-website-fast" className="text-blue-600 hover:underline text-sm">How to Make Your Website Fast</a></li>
                  <li key="the-bottom-line"><a href="#the-bottom-line" className="text-blue-600 hover:underline text-sm">The Bottom Line</a></li>
          </ol>
        </div>

        {/* Section 1 */}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <h2 id="the-3-second-rule-when-speed-becomes-cri" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            The 3-Second Rule: When Speed Becomes Critical
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Google research shows that 53% of mobile users abandon sites that take longer 
              than 3 seconds to load. But here's what's even more telling: for every second 
              your site takes to load, your conversion rate drops by 7%.
            </p>
            
            <div className="my-8">
              <p className="text-gray-800 font-medium mb-3">
                The Speed Impact:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">1 second:</span>
                  <span>Optimal loading time, maximum conversions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">2 seconds:</span>
                  <span>7% drop in conversion rate</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">3 seconds:</span>
                  <span>14% drop in conversion rate, 53% of users leave</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2 font-bold">5+ seconds:</span>
                  <span>35% drop in conversion rate, most users abandon</span>
                </li>
              </ul>
            </div>
            
            <p>
              Think about it: if your site takes 5 seconds to load and your competitor's
              takes 1 second, they're converting at 28% higher rates. That's not a small
              difference—that's the difference between a thriving business and one that's
              struggling.
            </p>

          </div>
        </motion.section>

        {/* Section 2 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 id="why-speed-matters-more-than-ever" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Why Speed Matters More Than Ever
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              We live in an instant world. Amazon delivers in hours. Netflix streams instantly. 
              Google answers in milliseconds. Your customers expect the same speed from your 
              website. Anything slower feels broken.
            </p>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. First Impressions Are Everything</h3>
            <p>
              Your website is often the first interaction a customer has with your business. 
              If it's slow, they assume you're slow. If it's fast, they assume you're efficient, 
              modern, and professional. Speed is a reflection of your entire business.
            </p>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Mobile Users Won't Wait</h3>
            <p>
              More than 60% of web traffic is mobile. Mobile users are often on slower connections, 
              in a hurry, or multitasking. They have zero patience for slow sites. If your site 
              doesn't load instantly on mobile, you're losing customers before they even see 
              what you offer.
            </p>
            
            <h3 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Google Ranks Speed</h3>
            <p>
              Google uses page speed as a ranking factor. Slow sites rank lower. Lower rankings 
              mean less traffic. Less traffic means fewer customers. It's that simple. Speed 
              isn't just about user experience—it's about visibility.
            </p>
          </div>
        </motion.section>

        {/* Section 3 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 id="the-real-cost-of-a-slow-website" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            The Real Cost of a Slow Website
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Let's put this in real numbers. If you're getting 1,000 visitors per month and 
              your site takes 5 seconds to load instead of 1 second, you're losing money.
            </p>
            
            <p>
              <strong>Slow Site (5 seconds):</strong> With a 35% drop in conversion rate, you're 
              losing 35% of your potential customers. If you normally convert at 3%, you're now 
              converting at 1.95%. That's 19-20 customers instead of 30. At $500 per customer, 
              that's $5,000 in lost monthly revenue.
            </p>
            
            <p>
              <strong>Fast Site (1 second):</strong> You maintain your full conversion rate. 
              You get all 30 customers. That's $15,000 in monthly revenue.
            </p>
            
            <p>
              The difference? $10,000 per month. Over a year, that's $120,000 in lost revenue— 
              just from having a slow website.
            </p>
          </div>
        </motion.section>

        {/* Section 4 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 id="what-makes-a-website-slow" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            What Makes a Website Slow?
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Understanding what slows down your site is the first step to fixing it. Here are 
              the most common culprits:
            </p>
            
            <p>
              <strong>Large Images:</strong> Unoptimized images are the number one cause of slow 
              loading times. A single high-resolution photo can be 5MB or more. That's enough to 
              slow down your entire site.
            </p>
            
            <p>
              <strong>Too Many Plugins:</strong> Every plugin adds code. More code means more 
              to download and process. Too many plugins can turn a fast site into a slow one.
            </p>
            
            <p>
              <strong>Unoptimized Code:</strong> Bloated CSS, JavaScript, and HTML all add up. 
              Clean, optimized code loads faster.
            </p>
            
            <p>
              <strong>Poor Hosting:</strong> Cheap hosting often means slow servers. Your site 
              can only be as fast as the server it's running on.
            </p>
            
            <p>
              <strong>No Caching:</strong> Caching stores parts of your site so they don't need 
              to be rebuilt every time. Without it, every page load is slower than it needs to be.
            </p>
          </div>
        </motion.section>

        {/* Section 5 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <h2 id="how-to-make-your-website-fast" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            How to Make Your Website Fast
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              The good news? Making your site fast isn't complicated. Here's what you need to do:
            </p>
            
            <p>
              <strong>Optimize Images:</strong> Compress images before uploading. Use modern formats 
              like WebP. Resize images to the exact size you need, not larger.
            </p>
            
            <p>
              <strong>Minimize Plugins:</strong> Remove plugins you don't use. Choose lightweight 
              alternatives when possible. Every plugin should earn its place.
            </p>
            
            <p>
              <strong>Use a CDN:</strong> Content Delivery Networks serve your site from servers 
              closer to your visitors. This reduces loading time, especially for international 
              visitors.
            </p>
            
            <p>
              <strong>Enable Caching:</strong> Set up caching so your site doesn't rebuild every 
              page on every visit. This can cut loading times in half.
            </p>
            
            <p>
              <strong>Choose Fast Hosting:</strong> Invest in quality hosting. Fast servers mean 
              fast sites. It's worth the extra cost.
            </p>
            
            <p>
              <strong>Optimize Code:</strong> Minify CSS and JavaScript. Remove unused code.
              Keep your codebase clean and efficient.
            </p>

          </div>
        </motion.section>

        {/* Section 6 */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-16"
        >
          <h2 id="the-bottom-line" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            The Bottom Line
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Website speed isn't optional anymore. It's not a nice-to-have feature. It's a 
              requirement. Slow sites lose customers. Fast sites win them.
            </p>
            
            <p>
              Every second counts. Every millisecond matters. In a world where customers have 
              infinite options, speed is often the deciding factor. Make sure your site is fast, 
              or watch your competitors take your customers.
            </p>
            
            <div className="bg-gray-900 text-white p-8 rounded-2xl my-8">
              <h3 className="text-2xl font-bold mb-4">Don't Guess—Test</h3>
              <p className="text-lg leading-relaxed text-gray-200">
                You can't improve what you don't measure. Test your website speed to see where 
                you stand and what needs to be fixed. Knowledge is the first step to improvement.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Editor's Note */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <p className="text-sm font-semibold text-blue-800 mb-1">Editor's Note — April 2026</p>
            <p className="text-sm text-blue-700">Google's 2026 ranking algorithm updates have further tightened Core Web Vitals thresholds — sites now need an LCP under 2.0 seconds (down from 2.5s) to achieve "Good" status and avoid ranking penalties. AI-powered performance optimization tools have emerged that automatically compress images, defer non-critical JavaScript, and pre-fetch pages based on visitor behavior patterns — significantly lowering the technical barrier for small businesses to achieve fast load times. Speed is now also a conversion signal in AI-driven ad platforms: slower landing pages receive reduced ad delivery even when bids are competitive.</p>
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="my-16"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 w-full max-w-[800px] group hover:bg-gray-50 transition duration-500 hover:duration-200">
              <div className="flex justify-center isolate">
                <div className="bg-white size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-gray-200 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Phone className="w-6 h-6 text-blue-500" />
                </div>
                <div className="bg-white size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-gray-200 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <h2 className="text-gray-900 font-medium mt-4 text-4xl">Fast. Simple. Scalable.</h2>
              <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Get your helper ready in 5 minutes. It is free. Connect it to your phone, website, and messages.</p>
          <Link
                to="/setup"
                className="mt-4 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:text-gray-900 h-10 px-4 py-2 shadow-sm active:shadow-none"
          >
                Start the free setup
          </Link>
            </div>
          </div>
        </motion.div>
          </article>
          
          {/* Table of Contents */}
          <TableOfContents headings={headings} />
        </div>
      </div>

      {/* Website Speed Impact Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Website Load Time vs. Business Impact: The Data</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How every second of load time affects conversion rate, bounce rate, and revenue</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Load Time</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Bounce Rate</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Conversion Rate Change</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Google Core Web Vitals</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Under 1 second', '7%', 'Baseline (highest)', 'Pass — strong signal'],
                  ['1–2 seconds', '11%', '-4.42% per second', 'Pass — good'],
                  ['2–3 seconds', '22%', '-8.11% cumulative', 'Needs improvement'],
                  ['3–5 seconds', '38%', '-22% vs 1-second', 'Fail — ranking risk'],
                  ['5–10 seconds', '58%', '-35% vs 1-second', 'Fail — penalized'],
                  ['Over 10 seconds', '123%', '-75% vs 1-second', 'Fail — severe penalty'],
                ].map(([time, bounce, conversion, vitals]) => (
                  <tr key={time} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{time}</td>
                    <td className="px-4 py-3 text-red-600">{bounce}</td>
                    <td className="px-4 py-3 text-gray-600">{conversion}</td>
                    <td className="px-4 py-3 text-gray-600">{vitals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">Source: Google/Deloitte research and Portent load time study across e-commerce and service sites.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BlogSpeedWebsite;

