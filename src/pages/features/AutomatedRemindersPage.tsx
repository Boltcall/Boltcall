import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Bell, Calendar, TrendingDown, CheckCircle, ArrowRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { createFAQSchema, injectSchemas } from '../../lib/schema';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';

const AutomatedRemindersPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Automated Appointment Reminders System | Boltcall';
    updateMetaDescription('Automated appointment reminders reduce no-shows. Send SMS and email reminders automatically before appointments. Start now.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "Automated Reminders", "item": "https://boltcall.org/features/automated-reminders"}]});
    document.head.appendChild(bcScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "Person", "name": "Boltcall Team", "url": "https://boltcall.org/about", "worksFor": {"@type": "Organization", "name": "Boltcall", "url": "https://boltcall.org"}});
    document.head.appendChild(personScript);
    return () => { document.getElementById('breadcrumb-jsonld')?.remove(); };
  }, []);

  useEffect(() => {
    return injectSchemas([
      createFAQSchema([
        { question: 'Can I customize reminder messages?', answer: 'Yes. You can customize message templates, tone, content, and timing. You can create different messages for different appointment types, services, or customer segments. The system allows full customization while maintaining professional standards.' },
        { question: 'What if a customer doesn\'t want reminders?', answer: 'Customers can opt out of reminders at any time. The system respects preferences and won\'t send reminders to customers who have opted out. You can also configure opt-out options in your reminder settings.' },
        { question: 'How do customers reschedule via reminders?', answer: 'Reminder messages include links or instructions for rescheduling. Customers can click a link to see available times and select a new appointment, or they can reply to the text/email with their preferred new time. The AI handles the rescheduling automatically.' },
        { question: 'Can reminders include special instructions?', answer: 'Absolutely. Reminders can include preparation instructions, what to bring, directions, parking information, or any other relevant details. You can customize these instructions per appointment type or service.' },
      ]),
    ]);
  }, []);
  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs />
          <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
              <Bell className="w-4 h-4" />
              <span className="font-semibold">Automated Reminders</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Eliminate <span className="text-blue-600">No-Shows</span> with Automated Reminders
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Send personalized reminders automatically to reduce no-shows, improve customer satisfaction, 
              and protect your revenue.
            </p>
          </motion.div>
          </div>
        </div>
      </section>

      {/* What It Is Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>What are Automated Reminders?</span>
            </h2>
            <p className="text-lg text-gray-600 mb-4 leading-relaxed">
              Automated Reminders automatically send personalized messages to customers before their appointments, 
              reducing no-shows and ensuring better schedule utilization. You can customize when reminders are sent 
              (24 hours before, 2 hours before, etc.) and personalize the message with customer and appointment details.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Reminders are sent via SMS, email, or both, and can include appointment details, location information, 
              preparation instructions, and easy rescheduling options.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Why It's Important Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Why Automated Reminders are Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      The Cost of No-Shows
                    </h3>
                    <p className="text-gray-600">
                      The average no-show rate is <strong>20-30%</strong> for most businesses. For a business with 
                      100 appointments per month at $150 per appointment, that's $3,000-$4,500 in lost revenue monthly— 
                      $36,000-$54,000 annually. Automated reminders can reduce no-shows by up to 70%.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Better Schedule Management
                    </h3>
                    <p className="text-gray-600">
                      When customers cancel or reschedule in advance (thanks to reminders), you have time to fill 
                      those slots. This maximizes your schedule utilization and revenue potential.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Customer Satisfaction
                    </h3>
                    <p className="text-gray-600">
                      Customers appreciate reminders. They show professionalism and care, and help customers 
                      prepare for appointments. <strong>85% of customers prefer businesses that send reminders</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Helps Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How Automated Reminders Help Your Business</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Reduce No-Shows
                  </h3>
                </div>
                <p className="text-gray-600">
                  Cut no-show rates by up to 70% with timely, personalized reminders. 
                  Protect your revenue and maximize schedule utilization.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Save Time
                  </h3>
                </div>
                <p className="text-gray-600">
                  Automate reminder sending completely. No more manual calls or emails— 
                  set it once and let the system handle everything.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Easy Rescheduling
                  </h3>
                </div>
                <p className="text-gray-600">
                  Include rescheduling links in reminders. Customers can change appointments 
                  with a single click, reducing last-minute cancellations.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Professional Image
                  </h3>
                </div>
                <p className="text-gray-600">
                  Show customers you're organized and care about their time. 
                  Professional reminders build trust and improve customer relationships.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-4">
                Start Reducing No-Shows Today
              </h3>
              <p className="text-blue-100 mb-6">
                Protect your revenue and improve customer satisfaction with automated reminders.
              </p>
              <Link to="/setup">
                <Button
                  variant="primary"
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>How Automated Reminders Work</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Appointment Scheduling
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When an appointment is scheduled (through any channel—phone, website, SMS, or in-person), 
                  the automated reminder system is immediately activated. The system captures all relevant 
                  details: customer name, appointment date and time, service type, location, and any special 
                  instructions. This information is stored and used to create personalized reminder messages.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system integrates seamlessly with your existing scheduling system, whether it's a 
                  calendar app, booking software, or custom solution. There's no need to manually enter 
                  appointment information—the reminders are set up automatically for every appointment.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Reminder Timing Configuration
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  You configure when reminders are sent based on your business needs. Common configurations 
                  include reminders 48 hours before, 24 hours before, and 2 hours before the appointment. 
                  You can customize these timings for different appointment types or services. For example, 
                  medical procedures might need earlier reminders with preparation instructions, while 
                  simple consultations might only need a 24-hour reminder.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system is intelligent about timing—it won't send reminders in the middle of the night 
                  or at inappropriate times. Reminders are sent during reasonable hours based on the 
                  customer's time zone, ensuring they're seen and acted upon.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Personalized Message Delivery
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Reminders are sent via SMS, email, or both, depending on customer preferences and your 
                  configuration. Each message is personalized with the customer's name, appointment details, 
                  location, and any relevant instructions. The tone is friendly and professional, creating 
                  a positive experience that reinforces your brand.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Messages can include links to confirm, reschedule, or cancel the appointment, making it 
                  easy for customers to manage their appointments without calling. This convenience reduces 
                  friction and encourages customers to take action if they need to make changes.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: Response Handling
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  When customers respond to reminders (confirming, rescheduling, or cancelling), the system 
                  handles these responses automatically. Confirmations are logged, rescheduling requests are 
                  processed with calendar availability checks, and cancellations free up the time slot. 
                  You're notified of any changes, but the system handles the administrative work.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  If a customer needs to reschedule, the AI can suggest alternative times based on your 
                  availability, making it easy to find a new appointment time that works for both parties. 
                  This proactive approach helps fill cancelled slots and maintains customer relationships 
                  even when they need to change plans.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Real-World Impact</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Healthcare Practice</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A medical practice with 500 appointments per month had a 25% no-show rate, costing 
                  $18,750 monthly in lost revenue. After implementing automated reminders with 24-hour 
                  and 2-hour notifications, no-shows dropped to 8%. This saved $12,750 monthly ($153,000 
                  annually) and improved patient satisfaction significantly.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The reminders also included preparation instructions (like fasting requirements or 
                  bringing insurance cards), which reduced confusion and improved appointment quality. 
                  Patients appreciated the proactive communication, and the practice saw improved patient 
                  retention and referrals.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Service Business</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A home services company reduced no-shows from 30% to 10% with automated reminders. 
                  The reminders included service details, what to expect, and preparation requirements. 
                  This not only reduced no-shows but also improved customer satisfaction because customers 
                  were better prepared for their appointments.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The company also used the reminder system to send follow-up messages after service, 
                  asking for feedback and offering additional services. This created additional revenue 
                  opportunities and improved customer relationships beyond just reducing no-shows.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Calculate Your Savings</span>
            </h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-100">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Let's calculate the impact for a typical business. If you have 200 appointments per month 
                at $150 per appointment, and your no-show rate is 20% (40 no-shows), you're losing $6,000 
                monthly ($72,000 annually) in revenue.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                Automated reminders typically reduce no-shows by 50-70%. If reminders reduce your no-show 
                rate to 10% (20 no-shows), you save 20 appointments per month. That's $3,000 monthly 
                ($36,000 annually) in recovered revenue. Additionally, you save time on manual reminder 
                calls and reduce staff workload.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                The cost of automated reminders is minimal compared to the revenue protection and time 
                savings. For most businesses, the system pays for itself many times over in the first 
                month of use.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Frequently Asked Questions</span>
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I customize reminder messages?</h3>
                <p className="text-gray-600">
                  Yes. You can customize message templates, tone, content, and timing. You can create 
                  different messages for different appointment types, services, or customer segments. 
                  The system allows full customization while maintaining professional standards.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What if a customer doesn't want reminders?</h3>
                <p className="text-gray-600">
                  Customers can opt out of reminders at any time. The system respects preferences and 
                  won't send reminders to customers who have opted out. You can also configure opt-out 
                  options in your reminder settings.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How do customers reschedule via reminders?</h3>
                <p className="text-gray-600">
                  Reminder messages include links or instructions for rescheduling. Customers can click 
                  a link to see available times and select a new appointment, or they can reply to the 
                  text/email with their preferred new time. The AI handles the rescheduling automatically.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can reminders include special instructions?</h3>
                <p className="text-gray-600">
                  Absolutely. Reminders can include preparation instructions, what to bring, directions, 
                  parking information, or any other relevant details. You can customize these instructions 
                  per appointment type or service.
                </p>
              </div>
            </div>
          </motion.div>
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


      {/* Why Boltcall */}
      <section className="py-14 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8 text-center">Why Businesses Choose Boltcall</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { title: 'Setup in 30 minutes', desc: 'No developers, no tech team. Answer 5 questions about your business and your AI receptionist is live — configured to your services, hours, and voice.' },
              { title: 'Flat monthly pricing', desc: 'Unlike per-call services that penalize you for growth, Boltcall charges a flat monthly fee. Handle 500 calls or 5,000 — your cost stays predictable.' },
              { title: 'Trained on your business', desc: 'Not a generic bot. Boltcall learns your specific services, pricing, FAQs, and booking rules — so every interaction sounds like your best team member.' },
              { title: 'ROI from day one', desc: 'One recovered call per month covers the entire subscription cost. Most customers see 5–10x ROI within the first 30 days from calls they would have otherwise missed.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-white">
                <h3 className="font-bold text-gray-900 mb-2">✓ {item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Automated Reminders: Impact on No-Show Rates</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How automated appointment reminders reduce cancellations across industries</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">With Automated Reminders</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Without Reminders</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Dental no-show rate', '8–12%', '20–25%'],
                  ['HVAC no-show rate', '8–12%', '18–22%'],
                  ['Law firm no-show rate', '10–14%', '20–28%'],
                  ['Med spa no-show rate', '8–12%', '18–25%'],
                  ['Monthly revenue saved (avg business)', '$1,500 – $8,000', '$0'],
                  ['Staff time on manual reminders/day', '0 min (automated)', '45–90 min'],
                ].map((row) => (
                  <tr key={row[0]} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{row[0]}</td>
                    <td className="px-4 py-3 text-indigo-700 font-medium bg-indigo-50/30">{row[1]}</td>
                    <td className="px-4 py-3 text-gray-600">{row[2]}</td>
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

export default AutomatedRemindersPage;

