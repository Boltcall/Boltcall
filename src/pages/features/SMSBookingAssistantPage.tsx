import React, { useEffect } from 'react';
import { updateMetaDescription } from '../../lib/utils';
import { motion } from 'framer-motion';
import { MessageSquare, Users, Phone, Calendar, CheckCircle } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import GiveawayBar from '../../components/GiveawayBar';
import Breadcrumbs from '../../components/Breadcrumbs';
import { createFAQSchema, injectSchemas } from '../../lib/schema';
import { Link } from 'react-router-dom';

const SMSBookingAssistantPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'SMS Booking Assistant for Appointments | Boltcall';
    updateMetaDescription('SMS booking assistant handles appointment scheduling via text. Customers book appointments by texting your business. Try free.');

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Features", "item": "https://boltcall.org/features"}, {"@type": "ListItem", "position": 3, "name": "SMS Booking Assistant", "item": "https://boltcall.org/features/sms-booking-assistant"}]});
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
        { question: 'Do customers need to download an app?', answer: 'No. SMS booking works with any phone that can send text messages. Customers simply text your business number—no apps, accounts, or downloads required. This makes it accessible to everyone, regardless of their technical comfort level.' },
        { question: 'What if a customer wants to speak to someone?', answer: 'The AI can transfer customers to a phone call or schedule a callback if they prefer to speak with a human. The system is flexible and can adapt to customer preferences, ensuring everyone gets the service they want.' },
        { question: 'Can it handle complex scheduling rules?', answer: 'Yes. The system can handle buffer times between appointments, different appointment durations, multiple service providers, recurring appointments, and more. You can configure complex scheduling rules to match your business needs.' },
        { question: 'How does it prevent double-booking?', answer: 'The system checks your calendar in real-time before confirming any appointment. It respects existing appointments, blocked time, and business hours, ensuring every booking is valid and conflict-free. If a time slot becomes unavailable between when it\'s offered and when it\'s confirmed, the system will notify the customer and suggest alternatives.' },
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
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold">SMS Booking Assistant</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Book Appointments via <span className="text-blue-600">SMS</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Let customers book, reschedule, and manage appointments through simple text messages. 
              Your SMS Booking Assistant handles everything automatically.
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
              <span>What is SMS Booking Assistant?</span>
            </h2>
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p className="text-lg">
                SMS Booking Assistant enables your customers to book, reschedule, and manage appointments 
                entirely through text messages. No phone calls, no website visits, no apps—just simple, 
                convenient SMS conversations that work on any phone, regardless of the device or carrier.
              </p>
              <p className="text-lg">
                Your AI assistant handles availability checks, confirms appointments, sends reminders, 
                and manages cancellations—all through natural text conversations that feel like texting a friend. 
                The system understands natural language, so customers can express their preferences in their own words, 
                and the AI will interpret and respond appropriately.
              </p>
              <p className="text-lg">
                The booking process is seamless and intuitive. Customers simply text your business number, 
                and the AI guides them through the booking process step by step. It can check your calendar 
                availability in real-time, suggest optimal appointment times, handle rescheduling requests, 
                and even manage cancellations—all automatically.
              </p>
              <p className="text-lg">
                This SMS-based approach eliminates the friction of traditional booking methods. Customers 
                don't need to download apps, navigate websites, or wait on hold. They can book appointments 
                from anywhere, at any time, using the communication method they're most comfortable with.
              </p>
            </div>
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
              <span>Why SMS Booking is Critical</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  SMS is Preferred
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  <strong>98% of text messages are opened</strong>, compared to just 20% of emails. 
                  Customers prefer SMS for quick, convenient communication. By offering SMS booking, 
                  you're meeting customers where they already are.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  SMS has become the preferred communication channel for many customers because it's immediate, 
                  personal, and doesn't require internet connectivity. Unlike emails that can get lost in spam 
                  folders or apps that require downloads, SMS works on every phone and gets immediate attention. 
                  This high engagement rate means your booking messages are more likely to be seen and acted upon.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Reduce No-Shows
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  SMS reminders have a <strong>45% higher response rate</strong> than phone calls or emails. 
                  Automated SMS reminders significantly reduce no-shows, protecting your revenue and 
                  ensuring better schedule utilization.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  No-shows cost businesses thousands of dollars annually in lost revenue and wasted time. 
                  SMS reminders sent 24 hours and 2 hours before appointments dramatically reduce no-show rates 
                  by keeping appointments top-of-mind for customers. The convenience of SMS also makes it easy 
                  for customers to confirm, reschedule, or cancel if needed, reducing last-minute cancellations.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Save Time
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Eliminate back-and-forth phone calls and emails. Customers can book in seconds via text, 
                  and you save hours of administrative work. <strong>Automate 80% of your booking process</strong> 
                  with SMS Booking Assistant.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Traditional booking methods require multiple touchpoints: phone calls, emails, calendar checks, 
                  and confirmations. Each interaction takes time and creates opportunities for errors or miscommunication. 
                  SMS booking streamlines this entire process into a single, automated conversation that handles 
                  everything from initial inquiry to final confirmation, freeing up your staff to focus on delivering 
                  excellent service rather than managing schedules.
                </p>
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
              <span>How SMS Booking Helps Your Business</span>
            </h2>
            
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  24/7 Booking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Customers can book appointments anytime, even when your business is closed. 
                  No more missed opportunities due to limited hours. This 24/7 availability means 
                  you capture bookings from customers who research and make decisions outside of 
                  traditional business hours.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Many customers prefer to book appointments during evenings, weekends, or other times 
                  when they're not at work. By offering SMS booking that works around the clock, you 
                  never miss an opportunity to capture a booking, regardless of when the customer decides 
                  to reach out.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Instant Confirmations
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Send immediate booking confirmations via SMS. Customers get instant peace of mind, 
                  and you reduce confusion and cancellations. The confirmation includes all relevant 
                  details: date, time, location, and any special instructions.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Instant confirmations are crucial for customer satisfaction. When customers book an 
                  appointment, they want immediate reassurance that their booking was successful. SMS 
                  confirmations provide this reassurance instantly, reducing anxiety and preventing 
                  customers from double-booking or making alternative arrangements.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Automated Reminders
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Reduce no-shows with automated SMS reminders sent before appointments. 
                  Customers can confirm, reschedule, or cancel with a simple text reply. This 
                  two-way communication makes it easy for customers to manage their appointments 
                  without having to call or email.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Automated reminders serve multiple purposes: they keep appointments top-of-mind, 
                  allow customers to easily reschedule if needed, and provide an opportunity to 
                  confirm attendance. The ability to reschedule via text reduces last-minute cancellations 
                  and helps you fill cancelled slots more quickly.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Calendar Sync
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  All bookings automatically sync with your calendar system. No double-booking, 
                  no manual entry, no scheduling conflicts. The system checks your calendar in 
                  real-time before confirming any appointment, ensuring you never overbook.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  Calendar integration eliminates the most common scheduling errors: double-booking, 
                  booking during unavailable times, and forgetting to block out personal time. The 
                  system respects your existing calendar entries, blocked time, and business hours, 
                  ensuring every booking is valid and conflict-free.
                </p>
              </div>
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
              <span>How SMS Booking Works</span>
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 1: Customer Initiates Booking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  A customer sends a text message to your business number requesting an appointment. 
                  They can use natural language like "I need an appointment next week" or "Can I book 
                  for Tuesday afternoon?" The AI understands the intent and responds immediately, 
                  starting the booking conversation.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system works with any phone number—you can use your existing business number or 
                  get a dedicated SMS number. Customers don't need to download apps, create accounts, 
                  or navigate websites. They simply text from their phone, using the communication 
                  method they're most comfortable with.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 2: Availability Check
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The AI checks your calendar in real-time to find available time slots that match 
                  the customer's preferences. It considers your business hours, existing appointments, 
                  blocked time, and any scheduling rules you've set (like buffer times between appointments). 
                  The system presents available options in a conversational, easy-to-understand format.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  If the customer's preferred time isn't available, the AI suggests alternative times 
                  that work for both parties. It can offer multiple options, explain why certain times 
                  aren't available, and help find the best alternative. This flexibility ensures customers 
                  can find a time that works for them, increasing booking completion rates.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 3: Appointment Confirmation
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Once the customer selects a time, the AI confirms the appointment details, including 
                  date, time, location, and any special instructions. The confirmation message is clear 
                  and comprehensive, ensuring the customer has all the information they need. The 
                  appointment is immediately added to your calendar, and you receive a notification.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The confirmation can include additional helpful information like directions to your 
                  location, what to bring, preparation requirements, or cancellation policies. This 
                  upfront information reduces confusion and helps ensure customers are prepared for 
                  their appointment, improving the overall experience.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 4: Automated Reminders
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  The system automatically sends reminder messages before the appointment—typically 
                  24 hours and 2 hours before. These reminders include appointment details and easy 
                  options to confirm, reschedule, or cancel. This reduces no-shows and gives you 
                  advance notice if someone needs to reschedule.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  If a customer needs to reschedule, they can simply reply to the reminder text with 
                  their new preferred time. The AI handles the rescheduling automatically, finding 
                  alternative times and updating the calendar. This convenience encourages customers to 
                  reschedule rather than simply not showing up, protecting your schedule and revenue.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Step 5: Ongoing Management
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Customers can manage their appointments anytime via text. They can reschedule, cancel, 
                  or ask questions about their upcoming appointment. The AI handles all these interactions 
                  automatically, freeing you from administrative tasks while providing customers with 
                  convenient self-service options.
                </p>
                <p className="text-gray-600 leading-relaxed mt-3">
                  The system maintains a complete history of all text conversations and appointment 
                  changes, providing you with a clear record of customer interactions. This information 
                  can be valuable for understanding customer preferences, identifying patterns, and 
                  improving your service offerings.
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
              <span>Real-World Use Cases</span>
            </h2>
            
            <div className="space-y-8">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Medical Practice</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A medical practice implemented SMS booking to reduce phone call volume and improve 
                  patient convenience. Patients can now text to book appointments, receive reminders, 
                  and reschedule if needed—all without calling the office. This reduced phone call volume 
                  by 60%, allowing staff to focus on in-person patient care.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The practice saw a 30% reduction in no-shows thanks to automated reminders and easy 
                  rescheduling options. Patients appreciate the convenience of texting, especially for 
                  routine appointments. The system can also handle appointment types, insurance 
                  verification questions, and preparation instructions, making the entire process smoother.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Beauty Salon</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A beauty salon uses SMS booking to manage appointments for multiple stylists. Customers 
                  can text to book with their preferred stylist, see available times, and manage their 
                  appointments. The system handles different service types (haircuts, color, treatments) 
                  and appointment durations automatically.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The salon increased bookings by 40% because customers could book anytime, even when the 
                  salon was closed. The automated reminders reduced no-shows by 50%, and the easy 
                  rescheduling feature helped fill cancelled appointments quickly. Staff spend less time 
                  on the phone and more time with clients.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Fitness Studio</h3>
                <p className="text-gray-600 leading-relaxed mb-3">
                  A fitness studio uses SMS booking for class reservations. Members can text to book 
                  classes, see availability, and get on waitlists if classes are full. The system sends 
                  reminders before classes and can handle cancellations, helping manage class capacity 
                  effectively.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  The studio reduced no-shows by 45% and improved class utilization. Members appreciate 
                  the convenience of booking via text, especially when they're on the go. The system can 
                  also send motivational messages, class updates, and special offers, enhancing member 
                  engagement beyond just booking.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Deep Dive Section */}
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
              <span>Additional Benefits</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reduced Phone Call Volume</h3>
                <p className="text-gray-600 text-sm">
                  SMS booking reduces phone calls by 60-80%, freeing staff to focus on in-person 
                  customer service and other important tasks. This improves productivity and reduces 
                  staffing needs.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Better Customer Experience</h3>
                <p className="text-gray-600 text-sm">
                  Customers can book appointments on their terms, without waiting on hold or being 
                  limited to business hours. This convenience improves satisfaction and loyalty.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Increased Booking Rates</h3>
                <p className="text-gray-600 text-sm">
                  24/7 availability means you capture bookings from customers who research and decide 
                  outside business hours, increasing overall booking volume by 30-50%.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Data Collection</h3>
                <p className="text-gray-600 text-sm">
                  Every text interaction provides valuable data about customer preferences, booking 
                  patterns, and peak times, helping you optimize your schedule and services.
                </p>
              </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Do customers need to download an app?</h3>
                <p className="text-gray-600">
                  No. SMS booking works with any phone that can send text messages. Customers simply 
                  text your business number—no apps, accounts, or downloads required. This makes it 
                  accessible to everyone, regardless of their technical comfort level.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What if a customer wants to speak to someone?</h3>
                <p className="text-gray-600">
                  The AI can transfer customers to a phone call or schedule a callback if they prefer 
                  to speak with a human. The system is flexible and can adapt to customer preferences, 
                  ensuring everyone gets the service they want.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can it handle complex scheduling rules?</h3>
                <p className="text-gray-600">
                  Yes. The system can handle buffer times between appointments, different appointment 
                  durations, multiple service providers, recurring appointments, and more. You can 
                  configure complex scheduling rules to match your business needs.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How does it prevent double-booking?</h3>
                <p className="text-gray-600">
                  The system checks your calendar in real-time before confirming any appointment. It 
                  respects existing appointments, blocked time, and business hours, ensuring every 
                  booking is valid and conflict-free. If a time slot becomes unavailable between 
                  when it's offered and when it's confirmed, the system will notify the customer 
                  and suggest alternatives.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="my-16 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
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
            <p className="text-base text-gray-600 mt-2 whitespace-pre-line">Launch an AI agent in 5 minutes at no cost. Connect it to all your business channels.</p>
            <Link
              to="/setup"
              className="inline-block mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start the free setup
            </Link>
          </div>
        </div>
      </motion.div>

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
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">SMS Booking Assistant vs. Phone-Only Booking</h2>
          <p className="text-gray-500 text-sm text-center mb-6">How adding SMS booking changes appointment volume and customer experience</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Metric</th>
                  <th className="px-4 py-3 font-semibold text-indigo-700 border-b border-gray-200 bg-indigo-50">SMS + AI Booking</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Phone-Only Booking</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Booking channels available', 'Phone + SMS + web', 'Phone only'],
                  ['After-hours booking', 'Yes — SMS active 24/7', 'No — voicemail only'],
                  ['Avg. time to book appointment', 'Under 2 minutes via text', '5–10 min phone call'],
                  ['Booking conversion rate', '45–60%', '25–35%'],
                  ['Customer preference (under 45)', '72% prefer texting', '28% prefer calling'],
                  ['Monthly cost', 'Included in plan', 'Additional staff time'],
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

export default SMSBookingAssistantPage;

