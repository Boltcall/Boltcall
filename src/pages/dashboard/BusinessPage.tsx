import React, { useState, useEffect } from 'react';
import { Building2, Globe, Clock, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { UnsavedChanges } from '../../components/ui/unsaved-changes';
import { useErrorHandler } from '../../hooks/useErrorHandler';

const BusinessPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const handleError = useErrorHandler();

  const [formData, setFormData] = useState({
    businessName: '',
    website: '',
    phone: '',
    email: '',
    openTime: '09:00',
    closeTime: '17:00',
    description: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Fetch existing business data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (profile) {
          setBusinessProfileId(profile.id);

          // Extract opening hours if available
          let openTime = '09:00';
          let closeTime = '17:00';
          if (profile.opening_hours) {
            // opening_hours is Record<string, { open, close, closed }>
            // Take the first non-closed day's hours
            const days = Object.values(profile.opening_hours) as Array<{ open: string; close: string; closed: boolean }>;
            const activeDay = days.find(d => !d.closed);
            if (activeDay) {
              openTime = activeDay.open || '09:00';
              closeTime = activeDay.close || '17:00';
            }
          }

          setFormData(prev => ({
            ...prev,
            businessName: profile.business_name || '',
            website: profile.website_url || '',
            description: profile.description || '',
            openTime,
            closeTime,
          }));

          // Fetch primary location for phone/email
          const { data: location } = await supabase
            .from('locations')
            .select('*')
            .eq('business_profile_id', profile.id)
            .eq('is_primary', true)
            .limit(1)
            .maybeSingle();

          if (location) {
            setLocationId(location.id);
            setFormData(prev => ({
              ...prev,
              phone: location.phone || '',
              email: location.email || '',
            }));
          }
        }
      } catch (err) {
        handleError('business: fetch profile', err, {
          message: 'Could not load your business profile. Please refresh and try again.',
          metadata: { userId: user.id },
        });
      }
    };
    fetchData();
  }, [user?.id, handleError]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSaving(true);
    try {
      // Build opening_hours object from open/close times (apply to all weekdays)
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const weekend = ['saturday', 'sunday'];
      const openingHours: Record<string, { open: string; close: string; closed: boolean }> = {};
      weekdays.forEach(day => {
        openingHours[day] = { open: formData.openTime, close: formData.closeTime, closed: false };
      });
      weekend.forEach(day => {
        openingHours[day] = { open: formData.openTime, close: formData.closeTime, closed: true };
      });

      const profilePayload = {
        user_id: user.id,
        business_name: formData.businessName,
        website_url: formData.website,
        description: formData.description,
        opening_hours: openingHours,
      };

      if (businessProfileId) {
        const { error } = await supabase
          .from('business_profiles')
          .update(profilePayload)
          .eq('id', businessProfileId);
        if (error) throw error;
      } else {
        const { data: newProfile, error } = await supabase
          .from('business_profiles')
          .insert([profilePayload])
          .select()
          .single();
        if (error) throw error;
        if (newProfile) setBusinessProfileId(newProfile.id);
      }

      // Update location for phone/email
      if (businessProfileId) {
        const locationPayload = {
          phone: formData.phone || null,
          email: formData.email || null,
        };

        if (locationId) {
          const { error } = await supabase
            .from('locations')
            .update(locationPayload)
            .eq('id', locationId);
          if (error) throw error;
        } else {
          const { data: newLoc, error } = await supabase
            .from('locations')
            .insert([{
              ...locationPayload,
              business_profile_id: businessProfileId,
              user_id: user.id,
              name: formData.businessName || 'Primary Location',
              is_primary: true,
              is_active: true,
            }])
            .select()
            .single();
          if (error) throw error;
          if (newLoc) setLocationId(newLoc.id);
        }
      }

      showToast({ title: 'Saved', message: 'Business details saved successfully!', variant: 'success', duration: 3000 });
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);
    } catch (err) {
      console.error('Error saving business details:', err);
      showToast({ title: 'Error', message: 'Failed to save business details. Please try again.', variant: 'error', duration: 4000 });
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFromBar = () => {
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">Business Details</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">Manage your business information and settings</p>
      </div>

      {/* Business Information Form */}
      <div className="bg-white dark:bg-[#111114] rounded-2xl border border-zinc-200 dark:border-[#1e1e24] shadow-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Business Information</h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Business Name */}
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Business Name
            </label>
            <input
              type="text"
              id="businessName"
              value={formData.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out"
            />
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Website
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <input
                type="url"
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              </div>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out"
              />
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Business Hours
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="openTime" className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Opening Time</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="time"
                    id="openTime"
                    value={formData.openTime}
                    onChange={(e) => handleChange('openTime', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="closeTime" className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">Closing Time</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  </div>
                  <input
                    type="time"
                    id="closeTime"
                    value={formData.closeTime}
                    onChange={(e) => handleChange('closeTime', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Business Description
            </label>
            <textarea
              id="description"
              rows={4}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-[#1e1e24] rounded-lg bg-white dark:bg-[#0e0e11] text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 ease-out resize-none"
            />
          </div>

        </form>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111114] rounded-2xl border border-zinc-200 dark:border-[#1e1e24] shadow-sm p-6 hover:shadow-md transition-shadow duration-200 ease-out">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">1</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Active Location</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111114] rounded-2xl border border-zinc-200 dark:border-[#1e1e24] shadow-sm p-6 hover:shadow-md transition-shadow duration-200 ease-out">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-950/30 rounded-lg">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">3</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Phone Numbers</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111114] rounded-2xl border border-zinc-200 dark:border-[#1e1e24] shadow-sm p-6 hover:shadow-md transition-shadow duration-200 ease-out">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">8h</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">Daily Hours</div>
            </div>
          </div>
        </div>
      </div>

      <UnsavedChanges
        open={isDirty}
        isSaving={isSaving}
        success={saveSuccess}
        error={saveError}
        onReset={() => { setIsDirty(false); window.location.reload(); }}
        onSave={handleSaveFromBar}
      />
    </div>
  );
};

export default BusinessPage;
