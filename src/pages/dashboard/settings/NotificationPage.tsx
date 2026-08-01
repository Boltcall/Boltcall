import React, { useState, useEffect } from 'react';
import { Bell, Mail, Phone, MessageSquare, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { PremiumToggle } from '../../../components/ui/bouncy-toggle';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { UnsavedChanges } from '../../../components/ui/unsaved-changes';

// The dispatcher (src/lib/notificationService.ts -> should_send_notification RPC)
// enforces one flag per notification TYPE and one enable per delivery CHANNEL, then
// sends only when BOTH are on. The old UI showed a per-channel × per-type matrix the
// table can't store, so it collapsed to single booleans on save and fanned back out
// to every channel on load — it never round-tripped. This page now mirrors the real
// model: global per-type toggles + per-channel enables. Every control here persists.

type NotificationType = {
  key: 'newLead' | 'appointmentBooked' | 'appointmentCancelled' | 'missedCall' | 'systemAlerts' | 'weeklyDigest';
  column: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

const notificationTypes: NotificationType[] = [
  { key: 'newLead', column: 'new_lead', title: 'New Lead', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { key: 'appointmentBooked', column: 'appointment_booked', title: 'Appointment Booked', icon: Calendar, color: 'text-blue-600 bg-blue-50' },
  { key: 'appointmentCancelled', column: 'appointment_cancelled', title: 'Appointment Cancelled', icon: Calendar, color: 'text-orange-600 bg-orange-50' },
  { key: 'missedCall', column: 'missed_calls', title: 'Missed Call', icon: Phone, color: 'text-red-600 bg-red-50' },
  { key: 'systemAlerts', column: 'system_maintenance', title: 'System Alerts', icon: AlertTriangle, color: 'text-purple-600 bg-purple-50' },
  { key: 'weeklyDigest', column: 'weekly_digest', title: 'Weekly Digest', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50' },
];

const channels = [
  { key: 'email' as const, column: 'email_notifications', name: 'Email', icon: Mail, description: 'Receive notifications via email', accentColor: 'bg-blue-100 text-blue-600' },
  { key: 'push' as const, column: 'push_notifications', name: 'Push Notifications', icon: Bell, description: 'Browser push notifications', accentColor: 'bg-green-100 text-green-600' },
  { key: 'sms' as const, column: 'sms_notifications', name: 'SMS', icon: Phone, description: 'Text message notifications', accentColor: 'bg-orange-100 text-orange-600' },
];

type Settings = {
  types: Record<NotificationType['key'], boolean>;
  channels: { email: boolean; push: boolean; sms: boolean };
  quietHours: { enabled: boolean; start: string; end: string };
  timezone: string;
};

const defaultSettings: Settings = {
  types: {
    newLead: true,
    appointmentBooked: true,
    appointmentCancelled: true,
    missedCall: true,
    systemAlerts: true,
    weeklyDigest: true,
  },
  channels: { email: true, push: true, sms: false },
  quietHours: { enabled: true, start: '22:00', end: '08:00' },
  timezone: 'America/New_York',
};

const NotificationPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data) {
          setSettings({
            types: {
              newLead: data.new_lead ?? true,
              appointmentBooked: data.appointment_booked ?? true,
              appointmentCancelled: data.appointment_cancelled ?? true,
              missedCall: data.missed_calls ?? true,
              systemAlerts: data.system_maintenance ?? true,
              weeklyDigest: data.weekly_digest ?? true,
            },
            channels: {
              email: data.email_notifications ?? true,
              push: data.push_notifications ?? true,
              sms: data.sms_notifications ?? false,
            },
            quietHours: {
              enabled: data.quiet_hours_enabled ?? true,
              start: data.quiet_hours_start || '22:00',
              end: data.quiet_hours_end || '08:00',
            },
            timezone: data.quiet_hours_timezone || 'America/New_York',
          });
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      }
    };
    fetchPrefs();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        email_notifications: settings.channels.email,
        sms_notifications: settings.channels.sms,
        push_notifications: settings.channels.push,
        in_app_notifications: true,
        new_lead: settings.types.newLead,
        appointment_booked: settings.types.appointmentBooked,
        appointment_cancelled: settings.types.appointmentCancelled,
        missed_calls: settings.types.missedCall,
        system_maintenance: settings.types.systemAlerts,
        weekly_digest: settings.types.weeklyDigest,
        quiet_hours_enabled: settings.quietHours.enabled,
        quiet_hours_start: settings.quietHours.start,
        quiet_hours_end: settings.quietHours.end,
        quiet_hours_timezone: settings.timezone,
      };
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      showToast({ title: 'Saved', message: 'Notification settings saved!', variant: 'success', duration: 3000 });
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);
    } catch (err) {
      console.error('Error saving notification settings:', err);
      showToast({ title: 'Error', message: 'Failed to save. Please try again.', variant: 'error', duration: 4000 });
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleType = (key: NotificationType['key'], value: boolean) => {
    setSettings((prev) => ({ ...prev, types: { ...prev.types, [key]: value } }));
    setIsDirty(true);
  };

  const toggleChannel = (key: 'email' | 'push' | 'sms', value: boolean) => {
    setSettings((prev) => ({ ...prev, channels: { ...prev.channels, [key]: value } }));
    setIsDirty(true);
  };

  const setQuietHours = (patch: Partial<Settings['quietHours']>) => {
    setSettings((prev) => ({ ...prev, quietHours: { ...prev.quietHours, ...patch } }));
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      {/* Notification types — one global toggle per event */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#17171b]">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Notify me about</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pick which events send a notification. Delivery is controlled by the channels below.</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-[#17171b]">
          {notificationTypes.map((type) => {
            const TypeIcon = type.icon;
            return (
              <div key={type.key} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type.color}`}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{type.title}</p>
                </div>
                <PremiumToggle checked={settings.types[type.key]} onChange={(v) => toggleType(type.key, v)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery channels — on/off enables */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#17171b]">
          <h2 className="text-sm font-semibold text-gray-900">Delivery Channels</h2>
          <p className="text-xs text-gray-500 mt-0.5">Where enabled notifications are sent</p>
        </div>
        <div className="divide-y divide-gray-100">
          {channels.map((ch) => {
            const ChIcon = ch.icon;
            return (
              <div key={ch.key} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ch.accentColor}`}>
                    <ChIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ch.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ch.description}</p>
                  </div>
                </div>
                <PremiumToggle checked={settings.channels[ch.key]} onChange={(v) => toggleChannel(ch.key, v)} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white dark:bg-[#111114] rounded-xl border border-gray-200 dark:border-[#1e1e24] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-[#17171b]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Quiet Hours</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pause notifications during specified hours</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Quiet Hours</p>
            <PremiumToggle checked={settings.quietHours.enabled} onChange={(v) => setQuietHours({ enabled: v })} />
          </div>
          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => setQuietHours({ start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => setQuietHours({ end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-[#2a2a30] dark:bg-[#17171b] dark:text-white dark:placeholder-gray-500 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <UnsavedChanges
        open={isDirty}
        isSaving={isSaving}
        success={saveSuccess}
        error={saveError}
        onReset={() => { setIsDirty(false); window.location.reload(); }}
        onSave={handleSave}
      />
    </div>
  );
};

export default NotificationPage;
