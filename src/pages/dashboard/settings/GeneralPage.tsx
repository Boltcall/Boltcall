import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTokens } from '../../../contexts/TokenContext';
import { supabase } from '../../../lib/supabase';
import { useDashboardStore } from '../../../stores/dashboardStore';
import { PopButton } from '../../../components/ui/pop-button';
import Button from '../../../components/ui/Button';
import ModalShell from '../../../components/ui/modal-shell';
import { UnsavedChanges } from '../../../components/ui/unsaved-changes';

const GeneralPage: React.FC = () => {
  const { t } = useTranslation('settings');
  const { showToast } = useToast();
  const { user } = useAuth();
  const { claimReward } = useTokens();
  const navigate = useNavigate();
  const setBusinessName = useDashboardStore((s) => s.setBusinessName);
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    language: 'en',
    owner: '',
    website: '',
    description: '',
    industry: 'other'
  });

  const [addressInfo, setAddressInfo] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [businessProfileId, setBusinessProfileId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);

  // Fetch existing data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        // Fetch business profile
        const { data: profile } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (profile) {
          setBusinessProfileId(profile.id);
          // Seed the dashboard store so Topbar shows the name immediately
          if (profile.business_name) setBusinessName(profile.business_name);
          setBusinessInfo({
            businessName: profile.business_name || '',
            language: profile.languages?.[0] || 'en',
            owner: profile.owner_name || user.name || '',
            website: profile.website_url || '',
            description: profile.description || '',
            // main_category is the canonical (lowercase) value the wizard
            // saved, e.g. 'plumber'. Keep it raw — the <select> below renders
            // the matching {value,label} option. Falling back to 'other'
            // surfaces the situation more honestly than silently defaulting
            // to "Technology" when no match is found.
            industry: profile.main_category || 'other'
          });

          // Fetch primary location for address
          const { data: location } = await supabase
            .from('locations')
            .select('*')
            .eq('business_profile_id', profile.id)
            .eq('is_primary', true)
            .limit(1)
            .maybeSingle();

          if (location) {
            setLocationId(location.id);
            setAddressInfo({
              line1: location.address_line1 || '',
              line2: location.address_line2 || '',
              city: location.city || '',
              state: location.state || '',
              postalCode: location.postal_code || '',
              country: location.country || 'United States'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching general settings:', err);
      }
    };
    fetchData();
  }, [user?.id, user?.name]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      // Upsert business profile
      const profilePayload = {
        user_id: user.id,
        business_name: businessInfo.businessName,
        website_url: businessInfo.website,
        main_category: businessInfo.industry,
        languages: [businessInfo.language],
        // owner_name and description may not have dedicated columns yet;
        // the upsert will silently ignore unknown columns on insert, but
        // we include them so they work once the columns are added.
        owner_name: businessInfo.owner,
        description: businessInfo.description,
      };

      // Track the resolved profile ID locally so the location upsert
      // can use it immediately — React state updates are async and
      // setBusinessProfileId won't reflect in the same render cycle.
      let resolvedProfileId = businessProfileId;

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
        if (newProfile) {
          resolvedProfileId = newProfile.id;
          setBusinessProfileId(newProfile.id);
        }
      }

      // Upsert location (address) — use resolvedProfileId, not the stale state value
      if (resolvedProfileId) {
        const locationPayload = {
          address_line1: addressInfo.line1,
          address_line2: addressInfo.line2,
          city: addressInfo.city,
          state: addressInfo.state,
          postal_code: addressInfo.postalCode,
          country: addressInfo.country,
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
              business_profile_id: resolvedProfileId,
              user_id: user.id,
              name: addressInfo.line1 || businessInfo.businessName || 'Primary Location',
              is_primary: true,
              is_active: true,
            }])
            .select()
            .single();
          if (error) throw error;
          if (newLoc) setLocationId(newLoc.id);
        }
      }

      showToast({ title: 'Saved', message: 'Settings saved successfully!', variant: 'success', duration: 3000 });
      setSaveSuccess(true);
      // Update the shared store so Topbar reflects the new name immediately
      if (businessInfo.businessName) setBusinessName(businessInfo.businessName);
      setTimeout(() => { setSaveSuccess(false); setIsDirty(false); }, 2000);

      // Claim bonus token reward — run outside the main try/catch so a
      // failure here doesn't show a "Failed to save" error to the user.
      try {
        const rewardResult = await claimReward('complete_business_profile');
        if (rewardResult?.success && !rewardResult?.alreadyClaimed) {
          showToast({ title: 'Bonus Tokens!', message: '+50 tokens earned for completing your business profile', variant: 'success', duration: 4000 });
        }
      } catch (rewardErr) {
        // Non-fatal: reward claim errors should not surface as a save failure
        console.warn('Token reward claim failed (non-fatal):', rewardErr);
      }
    } catch (err) {
      console.error('Error saving general settings:', err);
      showToast({ title: 'Error', message: 'Failed to save settings. Please try again.', variant: 'error', duration: 4000 });
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBusinessInfoChange = (field: string, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleAddressChange = (field: string, value: string) => {
    setAddressInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' }
  ];

  const countries = [
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Spain',
    'Italy',
    'Netherlands',
    'Sweden',
    'Norway',
    'Denmark'
  ];

  // Keep these slugs aligned with business_profiles.main_category so saved
  // values (for example 'plumber') round-trip cleanly in settings.
  const industries: { value: string; label: string }[] = [
    { value: 'dentist', label: 'Dentist' },
    { value: 'medspa', label: 'Med Spa' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'legal', label: 'Legal' },
    { value: 'salon', label: 'Salon' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'retail', label: 'Retail' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'construction', label: 'Construction' },
    { value: 'roofing', label: 'Roofing' },
    { value: 'education', label: 'Education' },
    { value: 'technology', label: 'Technology' },
    { value: 'finance', label: 'Finance' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'manufacturing', label: 'Manufacturing' },
    { value: 'hospitality', label: 'Hospitality' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}

      {/* Business Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-lg border border-gray-200 p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('general.businessInfo')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.businessName')} *
            </label>
            <input
              type="text"
              value={businessInfo.businessName}
              onChange={(e) => handleBusinessInfoChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.owner')} *
            </label>
            <input
              type="text"
              value={businessInfo.owner}
              onChange={(e) => handleBusinessInfoChange('owner', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter owner name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.agentLanguage')} *
            </label>
            <select
              value={businessInfo.language}
              onChange={(e) => handleBusinessInfoChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.industry')}
            </label>
            <select
              value={businessInfo.industry}
              onChange={(e) => handleBusinessInfoChange('industry', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {industries.map((industry) => (
                <option key={industry.value} value={industry.value}>
                  {industry.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.website')}
            </label>
            <input
              type="url"
              value={businessInfo.website}
              onChange={(e) => handleBusinessInfoChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://your-website.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.description')}
            </label>
            <textarea
              value={businessInfo.description}
              onChange={(e) => handleBusinessInfoChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of your business"
            />
          </div>
        </div>
      </motion.div>

      {/* Business Address */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
        className="bg-white rounded-lg border border-gray-200 p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('general.address')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.addressLine1')} *
            </label>
            <input
              type="text"
              value={addressInfo.line1}
              onChange={(e) => handleAddressChange('line1', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter street address"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.addressLine2')}
            </label>
            <input
              type="text"
              value={addressInfo.line2}
              onChange={(e) => handleAddressChange('line2', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Apartment, suite, unit, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.city')} *
            </label>
            <input
              type="text"
              value={addressInfo.city}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter city"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.state')}
            </label>
            <input
              type="text"
              value={addressInfo.state}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter state or province"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.postalCode')}
            </label>
            <input
              type="text"
              value={addressInfo.postalCode}
              onChange={(e) => handleAddressChange('postalCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter postal code"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('general.country')} *
            </label>
            <select
              value={addressInfo.country}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="bg-white rounded-lg border border-red-200 p-4 md:p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">{t('general.deleteAccount')}</h2>
            <p className="text-sm text-gray-600 mt-1">{t('general.deleteAccountDesc')}</p>
          </div>
        </div>

        <div className="border-t border-red-200 pt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Delete Account</h3>
              <p className="text-sm text-gray-600">
                Permanently delete your account and all data. This action cannot be undone.
              </p>
              <p className="text-xs text-gray-400 mt-1">To delete your account, please contact <a href="mailto:support@boltcall.org" className="text-blue-600 hover:underline">support@boltcall.org</a></p>
            </div>
            <Button
              variant="outline"
              disabled
              className="border-red-200 text-red-400 cursor-not-allowed opacity-60"
              title="Contact support to delete your account"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
          <div className="border-t border-red-100" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Delete Workspace</h3>
              <p className="text-sm text-gray-600">
                Once you delete a workspace, there is no going back. Please be certain.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(true)}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Workspace
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Delete Workspace Modal */}
      <ModalShell
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText('');
        }}
        title="Delete Workspace"
        description="This action cannot be undone. This will permanently delete your workspace, all associated data, members, and settings."
        footer={
          <>
            <PopButton
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </PopButton>
            <button
              type="button"
              onClick={async () => {
                if (deleteConfirmText !== 'DELETE') {
                  showToast({
                    title: 'Invalid Confirmation',
                    message: 'Please type DELETE to confirm',
                    variant: 'error',
                    duration: 3000
                  });
                  return;
                }

                setIsDeleting(true);
                try {
                  // Get the current user
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) throw new Error('Not authenticated');

                  // Delete business profiles for this user
                  await supabase.from('business_profiles').delete().eq('user_id', user.id);
                  localStorage.removeItem('boltcall_setup_complete');

                  // Delete workspaces for this user
                  await supabase.from('workspaces').delete().eq('user_id', user.id);

                  // Delete knowledge base files from storage
                  const { data: files } = await supabase.storage.from('knowledge-base').list(user.id);
                  if (files?.length) {
                    const paths = files.map(f => `${user.id}/${f.name}`);
                    await supabase.storage.from('knowledge-base').remove(paths);
                  }

                  // Sign out the user
                  await supabase.auth.signOut();

                  showToast({
                    title: 'Workspace Deleted',
                    message: 'Your workspace has been permanently deleted',
                    variant: 'success',
                    duration: 4000
                  });
                  setShowDeleteModal(false);
                  navigate('/');
                } catch (error) {
                  showToast({
                    title: 'Deletion Failed',
                    message: 'Failed to delete workspace. Please try again.',
                    variant: 'error',
                    duration: 4000
                  });
                } finally {
                  setIsDeleting(false);
                }
              }}
              disabled={isDeleting || deleteConfirmText !== 'DELETE'}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Workspace
                </span>
              )}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type <span className="font-semibold">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="DELETE"
          />
        </div>
      </ModalShell>

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

export default GeneralPage;
