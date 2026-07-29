import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageSkeleton } from '../../components/ui/loading-skeleton';
import {
  Code,
  MessageCircle,
  Palette,
  Type,
  AlertCircle,
  Globe,
} from 'lucide-react';
import ServiceEmptyState from '../../components/dashboard/ServiceEmptyState';

import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CopyButton } from '../../components/ui/copy-button';
import { UnsavedChanges } from '../../components/ui/unsaved-changes';

const WebsiteBubblePage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [chatEnabled, setChatEnabled] = useState<boolean | null>(null);
  // Data from Supabase
  const [embedToken, setEmbedToken] = useState<string | null>(null);

  // Chatbot config
  const [chatColor, setChatColor] = useState('#3B82F6');
  const [chatPosition, setChatPosition] = useState<string>('bottom-right');
  const [chatGreeting, setChatGreeting] = useState('Hi! How can I help you today?');
  const [retellAgentId, setRetellAgentId] = useState('');

  // Load data from Supabase
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('business_features')
          .select(
            'embed_token, chatbot_enabled, speed_to_lead_enabled, reputation_manager_enabled, chatbot_config'
          )
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          // If no row exists yet, the FeatureHub would have created it — show a helpful message
          if (fetchError.code === 'PGRST116') {
            setError('No workspace found. Visit the Feature Hub first to initialize your account.');
          } else {
            console.error('Failed to load embed config:', fetchError);
            setError('Failed to load settings. Please try again.');
          }
          setLoading(false);
          return;
        }

        if (data) {
          setChatEnabled(!!data.chatbot_enabled);
          setEmbedToken(data.embed_token || null);

          if (data.chatbot_config) {
            const cfg = data.chatbot_config as Record<string, any>;
            if (cfg.color) setChatColor(cfg.color);
            if (cfg.position) setChatPosition(cfg.position);
            if (cfg.greeting) setChatGreeting(cfg.greeting);
            if (cfg.retell_agent_id) setRetellAgentId(cfg.retell_agent_id);
          }
        }
      } catch (err) {
        console.error('WebsiteBubble load error:', err);
        setError('Failed to load settings.');
      }
      setLoading(false);
    })();
  }, [user]);

  // Save chatbot config to Supabase
  const handleSaveChatbotConfig = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);

    const config = {
      color: chatColor,
      position: chatPosition,
      greeting: chatGreeting,
      retell_agent_id: retellAgentId,
    };

    try {
      const { error: updateError } = await supabase
        .from('business_features')
        .update({
          chatbot_config: config,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to save chatbot config:', updateError);
        setError('Failed to save settings. Please try again.');
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);
    } catch (err) {
      console.error('Chatbot config save error:', err);
      setError('Something went wrong. Please try again.');
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
      setSaving(false);
    }
  };

  const embedCode = embedToken
    ? `<script src="https://boltcall.org/embed.js" data-token="${embedToken}"></script>`
    : '';

  if (loading) {
    return <PageSkeleton />;
  }

  if (chatEnabled === false) {
    return (
      <ServiceEmptyState
        icon={<MessageCircle className="w-7 h-7 text-purple-600" />}
        iconBg="bg-purple-50"
        title="Website Chat Widget not set up"
        description="Embed an AI chat bubble on your website to capture and qualify visitors 24/7 — no code required."
        setupLabel="Enable Chat Widget"
        setupTo="/dashboard/integrations"
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Embed Script Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Code className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Embed Script</h2>
            <p className="text-sm text-gray-600">
              Add this single script to your website to enable all features below
            </p>
          </div>
        </div>

        {embedToken ? (
          <div className="space-y-4">
            {/* Token display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Embed Token
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-800 select-all">
                  {embedToken}
                </code>
              </div>
            </div>

            {/* Embed code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Installation Code
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Paste this before the closing &lt;/body&gt; tag on every page of your website.
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{embedCode}</code>
                </pre>
                <CopyButton
                  textToCopy={embedCode}
                  className="absolute top-2 right-2"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How it works</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Paste the script on your website</li>
                <li>Toggle the features you want below</li>
                <li>Configure each feature from its settings page</li>
                <li>The script automatically loads only what you have enabled</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No embed token found</p>
            <p className="text-sm text-gray-500 mt-1">
              Visit the Feature Hub to initialize your workspace and generate an embed token.
            </p>
          </div>
        )}
      </motion.div>


      {/* Chatbot Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Chatbot Configuration</h2>
            <p className="text-sm text-gray-600">
              Customize how the chat bubble looks and behaves on your website
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Retell Agent ID */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retell Chat Agent ID
            </label>
            <p className="text-xs text-gray-500 mb-2">
              The agent ID from your Retell dashboard for the chat widget
            </p>
            <input
              type="text"
              value={retellAgentId}
              onChange={(e) => { setRetellAgentId(e.target.value); setIsDirty(true); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              placeholder="agent_xxxxxxxxxxxx"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Palette className="w-4 h-4 inline mr-1" />
              Widget Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={chatColor}
                onChange={(e) => { setChatColor(e.target.value); setIsDirty(true); }}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={chatColor}
                onChange={(e) => { setChatColor(e.target.value); setIsDirty(true); }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="w-4 h-4 inline mr-1" />
              Widget Position
            </label>
            <select
              value={chatPosition}
              onChange={(e) => { setChatPosition(e.target.value); setIsDirty(true); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>

          {/* Greeting */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Type className="w-4 h-4 inline mr-1" />
              Greeting Message
            </label>
            <input
              type="text"
              value={chatGreeting}
              onChange={(e) => { setChatGreeting(e.target.value); setIsDirty(true); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              placeholder="Hi! How can I help you today?"
            />
          </div>
        </div>

      </motion.div>

      <UnsavedChanges
        open={isDirty}
        isSaving={saving}
        success={saveSuccess}
        error={saveError}
        onReset={() => { setIsDirty(false); window.location.reload(); }}
        onSave={handleSaveChatbotConfig}
      />
    </div>
  );
};

export default WebsiteBubblePage;
