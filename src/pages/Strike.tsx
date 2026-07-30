import React, { useEffect, useState, useRef } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Share2, Copy, Check } from 'lucide-react';
import Header from '../components/Header';
import { PromptBox } from '../components/ui/chatgpt-prompt-input';
import { cn } from '../lib/utils';
import { HomeLightning } from '../components/HomeLightning';
import { FeedbackWidget } from '../components/ui/feedback-widget';
import FAQ from '../components/FAQ';
import Breadcrumbs from '../components/Breadcrumbs';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const Strike: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [typingProgress, setTypingProgress] = useState<Record<string, number>>({});
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<string>>(new Set());
  const [copiedMessages, setCopiedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Strike AI - Your Intelligent AI Assistant | Strike';
    updateMetaDescription('Get tailored marketing strategies, sales conversion scripts, and automated reminders with Strike AI. Powerful AI built to help local businesses close more deals and grow faster.');
  }, []);

  // Typing animation effect
  useEffect(() => {
    const typingIntervals: Record<string, NodeJS.Timeout> = {};

    messages.forEach((message) => {
      if (message.sender === 'ai' && typingProgress[message.id] !== undefined) {
        const currentProgress = typingProgress[message.id];
        const fullText = message.text;
        
        if (currentProgress < fullText.length && !typingIntervals[message.id]) {
          typingIntervals[message.id] = setInterval(() => {
            setTypingProgress((prev) => {
              const newProgress = (prev[message.id] || 0) + 1;
              if (newProgress >= fullText.length) {
                if (typingIntervals[message.id]) {
                  clearInterval(typingIntervals[message.id]);
                }
                return { ...prev, [message.id]: fullText.length };
              }
              return { ...prev, [message.id]: newProgress };
            });
          }, 5); // Adjust speed here (lower = faster)
        }
      }
    });

    const bcScript = document.createElement('script');
    bcScript.type = 'application/ld+json';
    bcScript.id = 'breadcrumb-jsonld';
    bcScript.text = JSON.stringify({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://boltcall.org"}, {"@type": "ListItem", "position": 2, "name": "Strike AI", "item": "https://boltcall.org/strike-ai"}]});
    document.head.appendChild(bcScript);

    return () => {
      document.getElementById('breadcrumb-jsonld')?.remove();
      Object.values(typingIntervals).forEach(interval => clearInterval(interval));
    };
  }, [messages, typingProgress]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const messageText = formData.get("message") as string;
    
    if (!messageText || !messageText.trim()) {
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Reset the form
    event.currentTarget.reset();
    
    // Call webhook
    try {
      const response = await fetch('https://boltcall-n8n.mangocoast-7cf06d98.eastus.azurecontainerapps.io/webhook/d8434af6-5bff-47b0-9f85-c8609caddb7c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText.trim(),
          agent: selectedAgent || null,
          timestamp: new Date().toISOString(),
        }),
      });

      const aiResponse = await response.text();
      
      if (aiResponse && aiResponse.trim()) {
        // Add AI response message
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse.trim(),
          sender: 'ai',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, aiMessage]);
        // Start typing animation
        setTypingProgress(prev => ({ ...prev, [aiMessage.id]: 0 }));
      }
    } catch (error) {
      console.error('Error calling webhook:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
      // Start typing animation for error message
      setTypingProgress(prev => ({ ...prev, [errorMessage.id]: 0 }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-black">
      {/* Lightning Background Effect */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <HomeLightning className="w-full h-full opacity-30" />
      </div>
      
      <div className="relative flex flex-col h-full" style={{ position: 'relative', zIndex: 100 }}>
        <Header />
        
        {/* Black overlay when messages exist */}
        {messages.length > 0 && (
          <div className="fixed inset-0 bg-black/80 pointer-events-none" style={{ zIndex: 5 }} />
        )}
        
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden" style={{ position: 'relative', zIndex: 100 }}>
          {/* Hero Section - Only show when no messages */}
          {messages.length === 0 && (
            <section className="pt-20 md:pt-40 pb-12 px-4 sm:px-6 lg:px-8 relative" style={{ position: 'relative', zIndex: 100 }}>
              <div className="max-w-5xl mx-auto relative">
                <Breadcrumbs />
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  className="text-center mb-8"
                >
                  {/* New Tag */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-800 border border-gray-700 rounded-full mb-6 relative"
                    style={{
                      boxShadow: '0 4px 8px rgba(37, 99, 235, 0.4)'
                    }}
                  >
                    <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">NEW AGENTS MODE</span>
                  </motion.div>
                  
                  <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-4 text-white leading-tight">
                    <span 
                      className="text-white relative inline-block"
                      style={{
                        WebkitTextStroke: '1px #000',
                        textShadow: `
                          2px 0 0 #000,
                          -2px 0 0 #000,
                          0 2px 0 #000,
                          0 -2px 0 #000,
                          1px 1px 0 #000,
                          -1px -1px 0 #000,
                          1px -1px 0 #000,
                          -1px 1px 0 #000,
                          3px 1px 0 #000,
                          -3px -1px 0 #000,
                          1px 3px 0 #000,
                          -1px -3px 0 #000,
                          -2px 2px 0 #000,
                          2px -2px 0 #000,
                          -4px 0 0 #000,
                          4px 0 0 #000,
                          0 -4px 0 #000,
                          0 4px 0 #000
                        `
                      }}
                    >
                      STRIKE AI
                    </span>
                  </h1>
                  
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-4 max-w-3xl mx-auto leading-relaxed">
                    Your intelligent AI assistant that helps you accomplish more
                  </p>
                  <p className="text-xs text-white/50 max-w-xl mx-auto">
                    Powered by advanced large language models. Learn more about{' '}
                    <a
                      href="https://en.wikipedia.org/wiki/Large_language_model"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white/80 transition-colors"
                    >
                      how AI assistants work
                    </a>{' '}
                    or explore{' '}
                    <a
                      href="https://www.g2.com/categories/ai-writing-assistant"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white/80 transition-colors"
                    >
                      top-rated AI tools on G2
                    </a>
                    .
                  </p>
                </motion.div>

                {/* Content section — crawlable, explains Strike AI capabilities */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="mt-2 mb-6 max-w-3xl mx-auto text-left"
                >
                  <h2 className="text-base sm:text-lg font-semibold text-white/80 mb-3 text-center">What can Strike AI help with?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { title: 'Marketing Strategy', desc: 'Tailored marketing plans, campaign ideas, and channel recommendations for your business type and budget.' },
                      { title: 'Sales Conversion', desc: 'Scripts, follow-up sequences, and closing tactics to turn more leads into paying customers.' },
                      { title: 'Google Rankings', desc: 'Quick SEO wins — from optimizing your Google Business Profile to targeting the right local keywords.' },
                      { title: 'Business Growth', desc: 'Referral programs, upsell offers, retention tactics, and your highest-leverage growth opportunities.' },
                    ].map((item) => (
                      <div key={item.title} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                        <div className="text-sm font-semibold text-blue-400 mb-1">{item.title}</div>
                        <p className="text-xs text-white/70 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-white/50 text-center mt-3">
                    Strike AI uses specialized agents — each trained on a specific growth area. Select an agent or ask anything to get started.{' '}
                    <a href="https://openai.com/index/introducing-gpts/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Learn about AI agents</a>.
                  </p>
                </motion.div>
              </div>
            </section>
          )}

          {/* Chat Messages Area */}
          <div 
            ref={chatContainerRef}
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 py-4 relative min-h-0 chat-scrollbar",
              messages.length > 0 ? "pt-20 md:pt-32" : ""
            )}
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              scrollBehavior: 'smooth'
            }}
            tabIndex={-1}
          >
            {/* Feedback widget – shown at the top when chat is open (i.e. after first message) */}
            {messages.length > 0 && (
              <div className="max-w-4xl mx-auto mb-6 flex justify-center">
                <FeedbackWidget
                  label="How is Strike AI doing so far?"
                  placeholder="Share what's working well or what you'd like improved..."
                  onSubmit={(_data) => {
                    // For now, just log. Can be wired to n8n / analytics later.
                    // TODO: wire to n8n / analytics
                  }}
                />
              </div>
            )}

            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className={cn(
                    "flex flex-col",
                    message.sender === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  {message.sender === 'user' ? (
                    <div className="max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 bg-gray-600 text-white rounded-br-sm">
                      <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base whitespace-pre-wrap break-words text-white max-w-[80%] sm:max-w-[70%]">
                      {typingProgress[message.id] !== undefined
                        ? message.text.slice(0, typingProgress[message.id])
                        : message.text}
                      {typingProgress[message.id] !== undefined && typingProgress[message.id] < message.text.length && (
                        <span className="animate-pulse">|</span>
                      )}
                    </p>
                  )}
                  {message.sender === 'ai' && (typingProgress[message.id] === undefined || typingProgress[message.id] >= message.text.length) && (
                    <div className="flex items-center gap-0.5 mt-2 -ml-[7px]">
                      <button
                        onClick={() => {
                          setLikedMessages(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(message.id)) {
                              newSet.delete(message.id);
                            } else {
                              newSet.add(message.id);
                              setDislikedMessages(prevDis => {
                                const newDisSet = new Set(prevDis);
                                newDisSet.delete(message.id);
                                return newDisSet;
                              });
                            }
                            return newSet;
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs",
                          likedMessages.has(message.id)
                            ? "text-blue-400 hover:text-blue-300"
                            : "text-white/60 hover:text-white/80"
                        )}
                        title="Like"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDislikedMessages(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(message.id)) {
                              newSet.delete(message.id);
                            } else {
                              newSet.add(message.id);
                              setLikedMessages(prevLike => {
                                const newLikeSet = new Set(prevLike);
                                newLikeSet.delete(message.id);
                                return newLikeSet;
                              });
                            }
                            return newSet;
                          });
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs",
                          dislikedMessages.has(message.id)
                            ? "text-red-400 hover:text-red-300"
                            : "text-white/60 hover:text-white/80"
                        )}
                        title="Dislike"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            if (navigator.share) {
                              await navigator.share({
                                title: 'Strike AI Response',
                                text: message.text,
                              });
                            } else {
                              // Fallback: copy to clipboard
                              await navigator.clipboard.writeText(message.text);
                              setCopiedMessages(prev => new Set(prev).add(message.id));
                              setTimeout(() => {
                                setCopiedMessages(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(message.id);
                                  return newSet;
                                });
                              }, 2000);
                            }
                          } catch (err) {
                            console.error('Error sharing:', err);
                          }
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs text-white/60 hover:text-white/80"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(message.text);
                            setCopiedMessages(prev => new Set(prev).add(message.id));
                            setTimeout(() => {
                              setCopiedMessages(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(message.id);
                                return newSet;
                              });
                            }, 2000);
                          } catch (err) {
                            console.error('Error copying:', err);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs",
                          copiedMessages.has(message.id)
                            ? "text-green-400 hover:text-green-300"
                            : "text-white/60 hover:text-white/80"
                        )}
                        title="Copy"
                      >
                        {copiedMessages.has(message.id) ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="flex justify-start"
                >
                  <div className="bg-[#1a1a1a] text-white border-2 border-white/30 rounded-2xl rounded-bl-sm px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Input at Bottom - Normal flow */}
          <div className="pt-4 pb-6 px-4 sm:px-6 lg:px-8 relative flex-shrink-0 -mt-[490px]" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 100 }}>
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit} className="w-full" style={{ pointerEvents: 'auto' }}>
                <PromptBox 
                  ref={textareaRef}
                  name="message"
                  onAgentChange={setSelectedAgent}
                  selectedAgentId={selectedAgent}
                />
              </form>
              
              {/* Common Questions Tags */}
              {messages.length === 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    { question: "What's the best marketing strategy for my business?", agentId: 'marketing' },
                    { question: "How can I increase my sales conversion rate?", agentId: 'sales' },
                    { question: "How can I improve my Google search rankings?", agentId: 'google-ranking' },
                    { question: "How can I accelerate my business growth?", agentId: 'growth' }
                  ].map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        if (textareaRef.current) {
                          // Set the selected agent
                          setSelectedAgent(item.agentId);
                          
                          // Use React's event system to properly update the value
                          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                            window.HTMLTextAreaElement.prototype,
                            'value'
                          )?.set;
                          if (nativeInputValueSetter) {
                            nativeInputValueSetter.call(textareaRef.current, item.question);
                          }
                          // Create a proper input event that React will recognize
                          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                          textareaRef.current.dispatchEvent(inputEvent);
                          // Focus the textarea
                          textareaRef.current.focus();
                        }
                      }}
                      className="px-3 py-1.5 text-xs rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 hover:border-blue-400 transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                    >
                      {item.question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* How Strike AI Works */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-16 bg-gray-900 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 text-center">How Strike AI Works</h2>
          <div className="space-y-5 text-white/70 text-sm leading-relaxed">
            <p>
              Strike AI is a specialized AI assistant built specifically for local businesses. Unlike general-purpose AI tools, Strike is organized around specific growth areas — marketing, sales, local SEO, and business development — so you get focused, actionable answers rather than generic responses.
            </p>
            <p>
              When you start a conversation with Strike, you can either type a free-form question or select one of the specialized agents. Each agent is pre-configured with context about that growth area: the Sales Conversion agent, for example, is primed with objection-handling frameworks, closing techniques, and lead follow-up strategies that actually work for service businesses. The Marketing Strategy agent draws on campaign structures and messaging approaches proven in local markets.
            </p>
            <p>
              Strike AI is powered by large language models that process your input and generate responses tailored to your business context. The more specific your question, the more useful the answer. Instead of asking "how do I get more customers," try "what's the best way to follow up with a lead who asked for a quote three days ago but hasn't responded?" — Strike will give you a concrete script you can use today.
            </p>
            <p>
              All conversations are private. Strike does not retain your conversation history between sessions, and no business information you share is used to train future models. Use it to draft marketing emails, build sales scripts, brainstorm Google Business Profile updates, or map out your next 90-day growth sprint.
            </p>
          </div>
        </div>
      </section>

      <FAQ />

      {/* Contact Section */}
      <section id="contact" className="px-4 sm:px-6 lg:px-8 py-16 bg-gray-950 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
            Have Questions? We're Here to Help
          </h2>
          <p className="text-white/60 mb-10 text-sm leading-relaxed">
            Whether you're exploring Strike or need help with your setup, our team responds fast.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 sm:p-10 text-left backdrop-blur-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Support Email</p>
                <a href="mailto:support@boltcall.org"
                  className="text-white font-bold text-base hover:text-blue-400 transition-colors">
                  support@boltcall.org
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">Book a Demo</p>
                <a href="https://boltcall.org/book-a-call" target="_blank" rel="noopener noreferrer"
                  className="text-white font-bold text-base hover:text-blue-400 transition-colors">
                  boltcall.org/book-a-call
                </a>
              </div>
              <div className="sm:col-span-2 border-t border-white/10 pt-6 mt-2">
                <p className="text-white/60 text-sm leading-relaxed">
                  We typically respond within <strong className="text-white">2 business hours</strong>. A real person will get back to you — no bots, no canned responses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Strike;

