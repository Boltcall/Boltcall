
import { useState } from "react";
import React from "react";
import { HeroParallax } from "../components/ui/hero-parallax";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { motion } from "framer-motion";
import FreeWebsiteFeatures from "../components/FreeWebsiteFeatures";
import { BackgroundBoxesDemo } from "../components/BackgroundBoxesDemo";
import SimpleModal from "../components/ui/simple-modal";
import { GiveawayMultiStepForm } from "../components/ui/giveaway-multistep-form";

export const products = [
    {
        title: "Modern SaaS Platform",
        link: "#",
        thumbnail: "/images/hero-examples/hero-saas.png",
    },
    {
        title: "E-commerce Store",
        link: "#",
        thumbnail: "/images/hero-examples/hero-ecommerce.png",
    },
    {
        title: "Creative Portfolio",
        link: "#",
        thumbnail: "/images/hero-examples/hero-portfolio.png",
    },
    {
        title: "Corporate Solutions",
        link: "#",
        thumbnail: "/images/hero-examples/hero-corporate.png",
    },
    {
        title: "Tech Startup",
        link: "#",
        thumbnail: "/images/hero-examples/hero-tech-startup.png",
    },
    {
        title: "Fashion Brand",
        link: "#",
        thumbnail: "/images/hero-examples/hero-fashion-brand.png",
    },
    {
        title: "Design Agency",
        link: "#",
        thumbnail: "/images/hero-examples/hero-design-agency.png",
    },
    {
        title: "Consulting Firm",
        link: "#",
        thumbnail: "/images/hero-examples/hero-consulting-firm.png",
    },
    {
        title: "Analytics Dashboard",
        link: "#",
        thumbnail: "/images/hero-examples/hero-analytics-dashboard.png",
    },
    {
        title: "Lifestyle Shop",
        link: "#",
        thumbnail: "/images/hero-examples/hero-lifestyle-shop.png",
    },
    {
        title: "Digital Artist",
        link: "#",
        thumbnail: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80",
    },
    {
        title: "Enterprise Services",
        link: "#",
        thumbnail: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&q=80",
    },
    {
        title: "Cloud Infrastructure",
        link: "#",
        thumbnail: "/images/hero-examples/hero-cloud-app.png",
    },
    {
        title: "Boutique Store",
        link: "#",
        thumbnail: "/images/hero-examples/hero-boutique-store-v2.png",
    },
    {
        title: "Creative Studio",
        link: "#",
        thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    },
];

const FreeWebsitePackagePage: React.FC = () => {
    // Set page title
    React.useEffect(() => {
        document.title = "Get Your Free Website | Boltcall";
  
    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Free Website", "item": "https://boltcall.org/free-website"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state handling
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [allowNotifications, setAllowNotifications] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                allowNotifications,
                // Map the new field to whyChoose if the backend expects it, or just send it as is. 
                // Sending both to be safe and ensure data capture.
                whyChoose: formData.referralSource || formData.whyChoose,
                referralId: '0' // Default to 0 as we don't have referral logic explicitly set up here yet, or we could add it.
            };

            // Call webhook
            const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/9b2699f0-f411-4a5d-911d-5d562fd0b828', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const responseText = await response.text();
                throw new Error(`Failed to submit form: ${response.status} ${responseText}`);
            }

            setIsSubmitted(true);
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to submit form. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCtaClick = () => {
        setIsModalOpen(true);
    };

    return (
        <div className="min-h-screen w-full bg-black">
            <Header />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative w-full"
            >
                <HeroParallax products={products} onCtaClick={handleCtaClick} />
                <FreeWebsiteFeatures />
                <BackgroundBoxesDemo onCtaClick={handleCtaClick} />

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
                <Footer theme="dark" showLogo={false} />
            </motion.div>

            <SimpleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Get Your Free Website"
            >
                {isSubmitted ? (
                    <div className="text-center py-10 space-y-4">
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white">Application Received!</h3>
                        <p className="text-neutral-400">We'll review your details and get back to you shortly.</p>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="mt-6 px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200"
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <GiveawayMultiStepForm
                        formData={formData}
                        setFormData={setFormData}
                        allowNotifications={allowNotifications}
                        setAllowNotifications={setAllowNotifications}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                        isSubmitted={isSubmitted}
                    />
                )}
            </SimpleModal>
        </div>
    );
}

export default FreeWebsitePackagePage;
