import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Moon, Sun, Smartphone, Monitor, Check, Clock, Calendar, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../../../components/ui/Button';
import LanguageSwitcher from '../../../components/dashboard/LanguageSwitcher';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { UnsavedChanges } from '../../../components/ui/unsaved-changes';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const ACCENT_COLORS = [
  { hex: '#3B82F6', label: 'Blue (default)' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#14B8A6', label: 'Teal' },
  { hex: '#F97316', label: 'Orange' },
];

function applyAccentColor(hex: string | null) {
  if (hex) {
    document.documentElement.style.setProperty('--accent', hex);
  } else {
    document.documentElement.style.removeProperty('--accent');
  }
}

const defaultPreferences = {
  theme: 'light',
  language: 'en',
  // Default to the visitor's actual zone instead of assuming US Eastern.
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  accentColor: null as string | null,
};

const PreferencesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['settings', 'common']);
  const { user } = useAuth();
  const { showToast } = useToast();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect when app gets installed
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        showToast({ title: 'Installed', message: 'Boltcall has been installed on your device!', variant: 'success', duration: 3000 });
      }
      setDeferredPrompt(null);
    } finally {
      setIsInstalling(false);
    }
  };

  // Sync language preference from i18n on mount
  useEffect(() => {
    const lang = (i18n.language || 'en').split('-')[0];
    setPreferences(prev => ({ ...prev, language: lang }));
  }, [i18n.language]);

  // Fetch existing preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('id, user_preferences')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (profile) {
          setBusinessProfileId(profile.id);
          if (profile.user_preferences) {
            const prefs = profile.user_preferences;
            setPreferences(prev => ({
              ...prev,
              ...prefs,
            }));
            // Apply saved theme on load
            if (prefs.theme === 'dark') {
              document.documentElement.classList.add('dark');
              localStorage.setItem('darkMode', 'true');
            } else if (prefs.theme === 'light') {
              document.documentElement.classList.remove('dark');
              localStorage.setItem('darkMode', 'false');
            }
            // Apply saved accent color on load
            if (prefs.accentColor) applyAccentColor(prefs.accentColor);
          }
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
      }
    };
    fetchPreferences();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      if (businessProfileId) {
        const { error } = await supabase
          .from('business_profiles')
          .update({ user_preferences: preferences })
          .eq('id', businessProfileId);
        if (error) throw error;
      } else {
        const { data: newProfile, error } = await supabase
          .from('business_profiles')
          .insert([{ user_id: user.id, business_name: 'My Business', user_preferences: preferences }])
          .select()
          .single();
        if (error) throw error;
        if (newProfile) setBusinessProfileId(newProfile.id);
      }
      // Apply theme immediately
      if (preferences.theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else if (preferences.theme === 'light') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      } else {
        // Auto: follow system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
        localStorage.setItem('darkMode', String(prefersDark));
      }

      // Apply accent color immediately on save
      applyAccentColor(preferences.accentColor ?? null);

      showToast({ title: t('common:save'), message: t('settings:prefsSavedSuccess'), variant: 'success', duration: 3000 });
      setSaveMessage(t('settings:prefsSavedSuccess'));
      setTimeout(() => setSaveMessage(''), 3000);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving preferences:', err);
      showToast({ title: t('common:error'), message: t('settings:prefsSaveError'), variant: 'error', duration: 4000 });
      setSaveError(true);
      setTimeout(() => setSaveError(false), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  // Full IANA zone list from the platform, not a hand-picked 13. Label is the
  // zone name with underscores spaced out. ?? guard covers the rare browser
  // without supportedValuesOf (falls back to the current zone only).
  const timezones = (Intl.supportedValuesOf?.('timeZone') ?? [Intl.DateTimeFormat().resolvedOptions().timeZone])
    .map((z) => ({ value: z, label: z.replace(/_/g, ' ') }));

  const selectClass = "w-full h-11 px-4 pr-10 bg-white dark:bg-[#161619] border border-gray-200 dark:border-[#2a2a30] rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer outline-none";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Preferences</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Customize your workspace appearance and regional settings.</p>
      </div>

      {/* Save success message */}
      <AnimatePresence>
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl"
          >
            <div className="flex items-center justify-center w-5 h-5 bg-emerald-500 rounded-full">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{saveMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appearance */}
      <div className="bg-white dark:bg-[#111114] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2a2a30] p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('settings:preferences.appearance')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-5">Choose how Boltcall looks on your device.</p>

        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('settings:preferences.theme')}</label>
        <div className="relative flex bg-gray-100 dark:bg-[#1a1a1f] rounded-xl p-1">
          {[
            { value: 'light', label: t('settings:preferences.themeLight'), icon: Sun },
            { value: 'dark', label: t('settings:preferences.themeDark'), icon: Moon },
            { value: 'auto', label: t('settings:preferences.themeAuto'), icon: Monitor },
          ].map((theme) => {
            const Icon = theme.icon;
            const isSelected = preferences.theme === theme.value;
            return (
              <button
                key={theme.value}
                onClick={() => { setPreferences(prev => ({ ...prev, theme: theme.value })); setIsDirty(true); }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors z-10 ${
                  isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="theme-selector"
                    className="absolute inset-0 bg-blue-600 rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {theme.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Accent Color */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-[#2a2a30]">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accent Color</label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Applied to primary buttons and interactive elements across the dashboard.</p>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_COLORS.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                title={label}
                onClick={() => { setPreferences(prev => ({ ...prev, accentColor: preferences.accentColor === hex ? null : hex })); setIsDirty(true); }}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 ${
                  preferences.accentColor === hex ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                }`}
                style={{ backgroundColor: hex }}
              >
                {preferences.accentColor === hex && (
                  <Check className="w-4 h-4 text-white mx-auto" />
                )}
              </button>
            ))}
            {preferences.accentColor && (
              <button
                type="button"
                onClick={() => { setPreferences(prev => ({ ...prev, accentColor: null })); setIsDirty(true); }}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-white dark:bg-[#111114] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2a2a30] p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('settings:preferences.languageRegion')}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 mb-5">Set your language, timezone, and formatting preferences.</p>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              {t('settings:preferences.language')}
            </label>
            <LanguageSwitcher variant="select" />
          </div>

          {/* Timezone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              {t('settings:preferences.timezone')}
            </label>
            <div className="relative">
              <select
                value={preferences.timezone}
                onChange={(e) => { setPreferences(prev => ({ ...prev, timezone: e.target.value })); setIsDirty(true); }}
                className={selectClass}
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Date Format */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {t('settings:preferences.dateFormat')}
            </label>
            <div className="relative">
              <select
                value={preferences.dateFormat}
                onChange={(e) => { setPreferences(prev => ({ ...prev, dateFormat: e.target.value })); setIsDirty(true); }}
                className={selectClass}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Time Format */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {t('settings:preferences.timeFormat')}
            </label>
            <div className="relative">
              <select
                value={preferences.timeFormat}
                onChange={(e) => { setPreferences(prev => ({ ...prev, timeFormat: e.target.value })); setIsDirty(true); }}
                className={selectClass}
              >
                <option value="12h">{t('settings:preferences.timeFormat12')}</option>
                <option value="24h">{t('settings:preferences.timeFormat24')}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop App */}
      <div className="bg-white dark:bg-[#111114] rounded-2xl shadow-sm border border-gray-200 dark:border-[#2a2a30] p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Desktop App</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Install Boltcall as a native-like app on your device.</p>

        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#161619] border border-gray-200 dark:border-[#2a2a30] rounded-xl">
          <div className="flex items-center gap-4">
            <img src="/boltcall_icon.png" alt="Boltcall" className="w-12 h-12 rounded-xl" width={48} height={48} loading="lazy" decoding="async" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Install Boltcall</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isInstalled
                  ? 'Boltcall is installed on your device.'
                  : isIOS
                    ? 'Tap the share button in Safari, then "Add to Home Screen".'
                    : 'Install Boltcall as a desktop app for quick access.'}
              </p>
            </div>
          </div>

          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-lg">
              <Check className="w-4 h-4" />
              Installed
            </span>
          ) : !isIOS && deferredPrompt ? (
            <Button
              variant="primary"
              onClick={handleInstallApp}
              disabled={isInstalling}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
          ) : !isIOS ? (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Not available in this browser
            </span>
          ) : null}
        </div>
      </div>

      <UnsavedChanges
        // Close the moment changes are no longer pending. On success isDirty
        // clears and the bar dismisses (toast confirms the save) instead of
        // lingering; on error isDirty stays true so the bar keeps offering Save.
        open={isDirty || isSaving}
        isSaving={isSaving}
        success={saveSuccess}
        error={saveError}
        onSave={handleSave}
        onReset={() => setIsDirty(false)}
      />
    </div>
  );
};

export default PreferencesPage;
