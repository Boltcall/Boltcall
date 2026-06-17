import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle2, MessageCircle, HelpCircle, Wand2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { authedFetch } from '../../lib/authedFetch';
import { readJsonResponse } from '../../lib/readJsonResponse';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

type AssistantResponse = {
  reply?: string;
  error?: string;
  actions?: string[];
};

const QUICK_ACTIONS: { label: string; type: 'question' | 'action' }[] = [
  { label: 'I am new to the platform, what do I do first?', type: 'question' },
  { label: 'How do I connect a phone number?', type: 'question' },
  { label: 'Create an AI Agent for me', type: 'action' },
  { label: 'Edit an AI Agent for me', type: 'action' },
];

const AiAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => sessionStorage.getItem('aiAssistantDismissed') === 'true');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const callAssistant = useCallback(async (msgList: Message[]) => {
    setIsLoading(true);
    try {
      const res = await authedFetch('/.netlify/functions/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: msgList.map(m => ({ role: m.role, content: m.content })),
          userId: user?.id,
        }),
      });

      const data = await readJsonResponse<AssistantResponse>(res);

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content:
            data?.reply ||
            data?.error ||
            'Something went wrong on our end. Please try again in a moment.',
        }]);
        return;
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data?.reply || 'Done!',
        actions: data?.actions,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection error. Please check your internet and try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const sendMessage = useCallback(async (text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    await callAssistant(newMessages);
  }, [input, isLoading, messages, callAssistant]);

  const handleQuickAction = (label: string) => {
    const userMsg: Message = { role: 'user', content: label };
    const newMessages = [userMsg];
    setMessages(newMessages);
    callAssistant(newMessages);
  };

  if (isDismissed) return null;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50 group/fab"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
            >
              <MessageCircle className="w-7 h-7 fill-white stroke-none" />
            </button>
            {/* Dismiss button — appears on hover */}
            <button
              onClick={(e) => { e.stopPropagation(); sessionStorage.setItem('aiAssistantDismissed', 'true'); setIsDismissed(true); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-600 hover:bg-gray-700 text-white rounded-full opacity-0 group-hover/fab:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
              title="Dismiss"
              aria-label="Dismiss chat assistant"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-[340px] h-[460px] flex flex-col bg-white dark:bg-[#111114] rounded-xl shadow-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1e1e24]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 fill-white stroke-none" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Bolt Assistant</h2>
                  <p className="text-[11px] text-gray-400">Ask me anything</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#1a1a1f] rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 px-4 py-3 overflow-y-auto space-y-2.5 text-sm flex flex-col">
              {/* Empty state */}
              {messages.length === 0 && (
                <div className="flex flex-col flex-1 py-2">
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-2.5">
                      <MessageCircle className="w-5 h-5 text-blue-500" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">How can I help?</h4>
                    <p className="text-[11px] text-gray-400 max-w-[240px] text-center">
                      Ask me anything or pick a quick action below.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action.label)}
                        className="flex items-center gap-3 text-left text-[12px] px-3 py-2.5 bg-gray-50 dark:bg-[#1a1a1f] hover:bg-gray-100 dark:hover:bg-[#222228] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg border border-gray-100 dark:border-[#1e1e24] transition-colors"
                      >
                        {action.type === 'question' ? (
                          <HelpCircle className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" />
                        ) : (
                          <Wand2 className="w-4 h-4 shrink-0 text-gray-400 dark:text-gray-500" />
                        )}
                        <span className="leading-tight">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'px-3 py-2 rounded-lg max-w-[80%] text-xs',
                      msg.role === 'assistant'
                        ? 'bg-gray-50 dark:bg-[#1a1a1f] text-gray-700 dark:text-gray-200 self-start'
                        : 'bg-blue-500 text-white self-end ml-auto'
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </motion.div>
                  {/* Action badges */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {msg.actions.map((action, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] rounded-full border border-green-100 dark:border-green-500/20"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          {action}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg max-w-[25%] bg-gray-50 dark:bg-[#1a1a1f] self-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500 animate-pulse"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500 animate-pulse [animation-delay:150ms]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500 animate-pulse [animation-delay:300ms]"></span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-[#1e1e24]">
              <input
                ref={inputRef}
                className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-[#1a1a1f] rounded-lg border border-gray-200 dark:border-[#1e1e24] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Ask something..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-[#1a1a1f] disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-white disabled:text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;
