import React, { useEffect } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, Phone, MessageSquare, Headphones, Users, CheckCircle, Zap, Settings, Globe } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import ReadingProgress from '../components/ReadingProgress';
import Breadcrumbs from '../components/Breadcrumbs';
import TableOfContents from '../components/TableOfContents';
import { useTableOfContents } from '../hooks/useTableOfContents';

const BlogProfessionalTelephoneEtiquette: React.FC = () => {
  const headings = useTableOfContents();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Professional Telephone Etiquette Tips & Best Practices';
    updateMetaDescription('Professional telephone etiquette tips. Learn best practices for phone communication and customer service. Improve now.');
    
    // Add Article schema markup
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Tips for Professional Telephone Etiquette",
      "description": "Tips for professional telephone etiquette. Learn best practices for phone communication and customer service.",
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
      "datePublished": "2025-02-10",
      "dateModified": "2026-04-09",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://boltcall.org/blog/tips-for-professional-telephone-etiquette"
      },
      "image": {
        "@type": "ImageObject",
        "url": "https://boltcall.org/og-image.png",
        "width": 1200,
        "height": 630
      }
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://boltcall.org/blog" },
        { "@type": "ListItem", "position": 3, "name": "Professional Telephone Etiquette Tips", "item": "https://boltcall.org/blog/tips-for-professional-telephone-etiquette" }
      ]
    };

    const existingScript = document.getElementById('article-schema');
    if (existingScript) existingScript.remove();
    const existingBreadcrumb = document.getElementById('breadcrumb-schema');
    if (existingBreadcrumb) existingBreadcrumb.remove();

    const script = document.createElement('script');
    script.id = 'article-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(articleSchema);
    document.head.appendChild(script);

    const breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-schema';
    breadcrumbScript.type = 'application/ld+json';
    breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(breadcrumbScript);

    const personScript = document.createElement('script');
    personScript.type = 'application/ld+json';
    personScript.id = 'person-schema';
    personScript.text = JSON.stringify({"@context":"https://schema.org","@type":"Person","name":"Boltcall Team","url":"https://boltcall.org/about","worksFor":{"@type":"Organization","name":"Boltcall","url":"https://boltcall.org"}});
    document.head.appendChild(personScript);

    return () => {
      document.getElementById('person-schema')?.remove();
      const scriptToRemove = document.getElementById('article-schema');
      if (scriptToRemove) scriptToRemove.remove();
      const breadcrumbToRemove = document.getElementById('breadcrumb-schema');
      if (breadcrumbToRemove) breadcrumbToRemove.remove();
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
              { label: 'Professional Telephone Etiquette', href: '/blog/professional-telephone-etiquette' }
            ]} />
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight text-left">
              Tips for <span className="text-blue-600">Professional Telephone Etiquette</span>
            </h1>
            
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>February 10, 2025</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>8 min read</span>
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
            Answering a phone call may seem like a simple task, but in a professional setting, it's an art form that requires 
            finesse and attention to detail. Whether you're a receptionist, a manager, or an employee, how you answer the 
            phone can impact the perception of your business.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mt-4">
            In this guide, we'll explore the essentials of answering calls professionally, ensuring you leave a positive 
            impression every time you pick up the receiver.
          </p>
        </motion.div>

        {/* Section 1: Answering the Phone Promptly */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >

          {/* Table of Contents */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-12">
            <h2 className="text-base font-bold text-gray-900 mb-4">In This Article</h2>
            <ol className="space-y-2 list-decimal list-inside">
                  <li key="answering-the-phone-promptly"><a href="#answering-the-phone-promptly" className="text-blue-600 hover:underline text-sm">Answering the Phone Promptly</a></li>
                  <li key="greeting-the-caller"><a href="#greeting-the-caller" className="text-blue-600 hover:underline text-sm">Greeting the Caller</a></li>
                  <li key="handling-calls-professionally"><a href="#handling-calls-professionally" className="text-blue-600 hover:underline text-sm">Handling Calls Professionally</a></li>
                  <li key="navigating-challenging-situations"><a href="#navigating-challenging-situations" className="text-blue-600 hover:underline text-sm">Navigating Challenging Situations</a></li>
                  <li key="special-considerations-for-receptionists"><a href="#special-considerations-for-receptionists" className="text-blue-600 hover:underline text-sm">Special Considerations for Receptionists</a></li>
                  <li key="best-practices-for-cell-phone-etiquette"><a href="#best-practices-for-cell-phone-etiquette" className="text-blue-600 hover:underline text-sm">Best Practices for Cell Phone Etiquette</a></li>
                  <li key="conclusion-mastering-professional-phone"><a href="#conclusion-mastering-professional-phone" className="text-blue-600 hover:underline text-sm">Conclusion: Mastering Professional Phone Etiquette</a></li>
            </ol>
          </div>

          <h2 id="answering-the-phone-promptly" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Answering the Phone Promptly
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              One of the first steps in professional phone etiquette is to answer the phone promptly. Ideally, you should aim 
              to answer within three rings. This shows the caller that their time is valued and sets a positive tone for the 
              conversation.
            </p>
          </div>
        </motion.section>

        {/* Section 2: Greeting the Caller */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-16"
        >
          <h2 id="greeting-the-caller" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Greeting the Caller
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              When answering the phone, your greeting is crucial. A professional greeting should be polite and informative. 
              It generally includes the company name, your name, and a polite inquiry about how you can assist the caller. 
              For example, "Good morning, Company Name, this is Your Name. How may I assist you today?"
            </p>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl my-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Using a Friendly Tone
              </h3>
              <p className="text-gray-700">
                Your tone of voice is as important as the words you use. A friendly and enthusiastic tone can make the caller 
                feel welcomed and appreciated. Remember to smile while speaking, as this can naturally make your voice sound 
                more inviting.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 3: Handling Calls Professionally */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 id="handling-calls-professionally" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Handling Calls Professionally
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white border-l-4 border-blue-600 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-blue-600" />
                Listening Actively
              </h3>
              <p className="text-gray-700">
                Active listening is essential when taking calls. This involves paying full attention to the caller, understanding 
                their needs, and responding appropriately. Avoid interrupting the caller, and take notes if necessary to ensure 
                you capture all relevant information.
              </p>
            </div>
            
            <div className="bg-white border-l-4 border-green-600 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Clarifying and Confirming Details
              </h3>
              <p className="text-gray-700">
                Miscommunication can lead to misunderstandings, so it's crucial to clarify and confirm details during the call. 
                If you're unsure about something the caller said, politely ask for clarification. Repeat key points back to the 
                caller to ensure you have understood correctly.
              </p>
            </div>
            
            <div className="bg-white border-l-4 border-purple-600 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Managing Hold Time
              </h3>
              <p className="text-gray-700">
                If you need to place a caller on hold, always ask for their permission first. For example, "May I place you on 
                hold for a moment while I retrieve your information?" Keep hold times brief, and periodically check in with the 
                caller to reassure them that you're still working on their request.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 4: Navigating Challenging Situations */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 id="navigating-challenging-situations" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Navigating Challenging Situations
          </h2>
          
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="w-6 h-6 text-red-600" />
                Handling Difficult Callers
              </h3>
              <p className="text-gray-700">
                Dealing with difficult callers is an inevitable part of professional phone etiquette. Stay calm and composed, 
                listen to their concerns, and empathize with their situation. If necessary, escalate the call to a supervisor 
                or manager who can provide further assistance.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="w-6 h-6 text-blue-600" />
                Managing Multiple Calls
              </h3>
              <p className="text-gray-700">
                If you're responsible for handling multiple calls, prioritize them based on urgency and importance. Politely 
                inform callers if you need to switch lines, and ensure that no caller feels neglected or ignored.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                Ending the Call Gracefully
              </h3>
              <p className="text-gray-700">
                Concluding a call professionally is just as important as starting it. Thank the caller for reaching out, 
                summarize any action points, and confirm any follow-up steps. For example, "Thank you for calling Company Name. 
                We'll get back to you by date/time to follow up on your request. Have a great day!"
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 5: Special Considerations for Receptionists */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <h2 id="special-considerations-for-receptionists" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Special Considerations for Receptionists
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Routing Calls Efficiently
              </h3>
              <p className="text-gray-700">
                Receptionists often need to route calls to the appropriate department or individual. Familiarize yourself with 
                the company's structure and know who to direct specific inquiries to. Inform the caller when you're transferring 
                their call and to whom they're being transferred.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-green-600" />
                Managing Receptionist Duties
              </h3>
              <p className="text-gray-700">
                In addition to answering calls, receptionists may have other duties, such as greeting visitors and handling mail. 
                Balancing these responsibilities requires organization and multitasking skills. Ensure that you're not overwhelmed 
                and that each task receives the attention it deserves.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6 text-purple-600" />
                Staying Updated with Company Information
              </h3>
              <p className="text-gray-700">
                As a receptionist, you are the first point of contact for many callers. Stay informed about company updates, 
                new products, and services so you can provide accurate information and assistance.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 6: Best Practices for Cell Phone Etiquette */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-16"
        >
          <h2 id="best-practices-for-cell-phone-etiquette" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Best Practices for Cell Phone Etiquette
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white border-l-4 border-blue-600 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                Personal vs. Professional Calls
              </h3>
              <p className="text-gray-700">
                When using a cell phone for business, it's important to distinguish between personal and professional calls. 
                Use a separate ringtone for business calls to ensure you answer them with the appropriate level of professionalism.
              </p>
            </div>
            
            <div className="bg-white border-l-4 border-green-600 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-600" />
                Maintaining Professionalism on the Go
              </h3>
              <p className="text-gray-700">
                If you're answering calls while on the go, be mindful of your surroundings. Find a quiet place to take the call, 
                and ensure there's no background noise that could disrupt the conversation.
              </p>
            </div>
            
            <div className="bg-white border-l-4 border-purple-600 p-6 rounded-r-lg shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Using Voicemail Effectively
              </h3>
              <p className="text-gray-700">
                If you're unable to answer a call, ensure your voicemail is set up professionally. Record a clear and concise 
                message that includes your name, the company's name, and an invitation for the caller to leave a message.
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 7: Conclusion with Boltcall */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-16"
        >
          <h2 id="conclusion-mastering-professional-phone" className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 flex items-start gap-3">
            <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
            Conclusion: Mastering Professional Phone Etiquette
          </h2>
          
          <div className="space-y-6 text-gray-700 leading-relaxed">
            <p>
              Answering the phone professionally is a skill that can significantly enhance the image of your business. By following 
              these tips, you'll ensure that every call you take is handled with the professionalism and care it deserves. Whether 
              you're taking calls at a reception desk or on your cell phone, the right etiquette can make a lasting impression on 
              your callers.
            </p>
            
            <p>
              Incorporate these strategies into your daily routine, and watch as your ability to manage calls improves, along with 
              the satisfaction of your callers. Good phone etiquette is more than just a formality; it's a powerful tool for building 
              relationships and ensuring effective communication.
            </p>
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-2xl my-8">
              <h3 className="text-2xl font-bold mb-4 flex items-start gap-3">
                <Zap className="w-6 h-6" />
                How Boltcall Ensures Consistent Professional Phone Etiquette
              </h3>
              <p className="text-lg leading-relaxed text-blue-50 mb-4">
                While mastering professional telephone etiquette is essential for human receptionists, Boltcall's AI receptionist 
                takes consistency and professionalism to the next level. Our AI is trained on best practices and professional phone 
                etiquette, ensuring every call is handled with the same level of care and professionalism—24/7, without variation.
              </p>
              <p className="text-lg leading-relaxed text-blue-50 mb-4">
                <strong>Always Answers Promptly:</strong> Boltcall's AI receptionist answers every call instantly, never missing the 
                three-ring standard. This ensures that every caller feels valued and receives immediate attention, regardless of the 
                time of day or call volume.
              </p>
              <p className="text-lg leading-relaxed text-blue-50 mb-4">
                <strong>Consistent Professional Greetings:</strong> Every call begins with a warm, professional greeting that includes 
                your company name and a friendly inquiry about how to assist. The AI maintains a friendly, enthusiastic tone on every 
                call, ensuring a positive first impression.
              </p>
              <p className="text-lg leading-relaxed text-blue-50 mb-4">
                <strong>Active Listening and Accurate Responses:</strong> Boltcall's AI receptionist actively listens to every caller, 
                understands their needs, and responds appropriately. It never interrupts, takes detailed notes, and confirms all important 
                details to prevent miscommunication.
              </p>
              <p className="text-lg leading-relaxed text-blue-50 mb-4">
                <strong>Handles Challenging Situations with Grace:</strong> The AI is trained to stay calm and composed when dealing with 
                difficult callers, showing empathy and understanding. It can escalate calls when necessary while maintaining professionalism 
                throughout the interaction.
              </p>
              <p className="text-lg leading-relaxed text-blue-50 mb-4">
                <strong>Efficient Call Routing:</strong> Boltcall's AI receptionist is familiar with your company structure and can 
                efficiently route calls to the appropriate department or individual, always informing callers when transfers occur.
              </p>
              <p className="text-lg leading-relaxed text-blue-50">
                For businesses looking to ensure consistent, professional phone etiquette on every call, Boltcall offers an AI-powered 
                solution that never gets tired, never has a bad day, and always maintains the highest standards of professionalism. 
                Experience how Boltcall can transform your phone communication and ensure every caller receives the professional treatment 
                they deserve.
              </p>
              <Link
                to="/features/ai-receptionist"
                className="mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium bg-white text-blue-600 hover:bg-blue-50 transition-colors h-11 px-6 shadow-lg"
              >
                Learn More About Boltcall AI Receptionist
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Editor's Note */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <p className="text-sm font-semibold text-blue-800 mb-1">Editor's Note — April 2026</p>
            <p className="text-sm text-blue-700">As AI voice assistants take over routine call handling in 2026, professional telephone etiquette has become more critical than ever for the human interactions that remain — clients now expect the calls that do reach a person to be exceptional. New research shows that tone of voice and response speed account for over 65% of caller satisfaction scores, underscoring why training staff on etiquette best practices directly impacts retention. AI tools that coach and score live calls in real time are now helping businesses rapidly elevate their phone communication standards.</p>
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
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

      {/* Telephone Etiquette Comparison Table */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Professional Telephone Etiquette: Do's and Don'ts</h2>
          <p className="text-gray-500 text-sm text-center mb-6">The practices that build caller trust vs. the habits that lose customers</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-semibold text-gray-700 border-b border-gray-200">Situation</th>
                  <th className="px-4 py-3 font-semibold text-red-600 border-b border-gray-200">Unprofessional (Loses Trust)</th>
                  <th className="px-4 py-3 font-semibold text-green-700 border-b border-gray-200">Professional (Builds Trust)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Answering the call', 'Ringing 6+ times, then voicemail', 'Answered within 3 rings with business name'],
                  ['Placing on hold', '"Hold on" — then silence for 3+ minutes', '"May I place you on a brief hold? It will be under 2 minutes"'],
                  ['Taking a message', 'Loose note, never followed up', 'Read back message, confirm callback time, follow through'],
                  ['Transferring a call', 'Blind transfer with no context', 'Warm transfer with caller name and reason stated'],
                  ['Handling a complaint', 'Defensive or dismissive tone', 'Acknowledgement, ownership, resolution timeline'],
                  ['Ending the call', 'Hanging up abruptly', '"Is there anything else I can help you with?" + clear close'],
                  ['After-hours calls', 'Voicemail with no callback ETA', 'AI answers, books appointment, sends confirmation'],
                ].map(([situation, bad, good]) => (
                  <tr key={situation} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{situation}</td>
                    <td className="px-4 py-3 text-red-600 text-xs">{bad}</td>
                    <td className="px-4 py-3 text-green-700 text-xs">{good}</td>
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

export default BlogProfessionalTelephoneEtiquette;

