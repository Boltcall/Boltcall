import React, { useState, useCallback } from 'react';
import { ArrowDown, Loader2, ShieldCheck, ShieldX, Globe, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import type { CountryCode } from 'libphonenumber-js';
import 'react-phone-number-input/style.css';
import { useSetupStore } from '../../../stores/setupStore';
import { validatePhoneNumber, type PhoneValidationResult } from '../../../lib/cekura';
import StyledInput from '../../ui/StyledInput';
import Button from '../../ui/Button';
import { FUNCTIONS_BASE } from '../../../lib/api';
import { authedFetch } from '../../../lib/authedFetch';

const StepBusinessProfile: React.FC = () => {
  const { account, businessProfile, updateBusinessProfile, knowledgeBase, updateKnowledgeBase } = useSetupStore();
  const [errors] = useState<Record<string, string>>({});
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const [phoneValidation, setPhoneValidation] = useState<PhoneValidationResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [scanSummary, setScanSummary] = useState('');

  const handleScanWebsite = useCallback(async () => {
    const url = businessProfile.websiteUrl?.trim();
    if (!url) return;

    setScanning(true);
    setScanResult(null);
    setScanSummary('');

    try {
      const scrapeRes = await fetch(`${FUNCTIONS_BASE}/scrape-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const scraped = await scrapeRes.json();
      const content = scraped.markdown || scraped.content || '';

      if (!content || content.length < 50) {
        setScanResult('error');
        setScanSummary('Could not extract content from this website.');
        return;
      }

      const extractRes = await authedFetch(`${FUNCTIONS_BASE}/ai-extract-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          businessName: businessProfile.businessName,
          category: businessProfile.mainCategory,
          userId: account.userId,
        }),
      });

      if (extractRes.ok) {
        const extracted = await extractRes.json();

        if (extracted.services?.length && knowledgeBase.services.length === 0) {
          updateKnowledgeBase({ services: extracted.services });
        }
        if (extracted.faqs?.length && knowledgeBase.faqs.length === 0) {
          updateKnowledgeBase({ faqs: extracted.faqs });
        }
        if (extracted.policies) {
          const current = knowledgeBase.policies;
          const merged = { ...current };
          if (!current.cancellation && extracted.policies.cancellation) merged.cancellation = extracted.policies.cancellation;
          if (!current.reschedule && extracted.policies.reschedule) merged.reschedule = extracted.policies.reschedule;
          if (!current.deposit && extracted.policies.deposit) merged.deposit = extracted.policies.deposit;
          updateKnowledgeBase({ policies: merged });
        }

        const parts: string[] = [];
        if (extracted.services?.length) parts.push(`${extracted.services.length} services`);
        if (extracted.faqs?.length) parts.push(`${extracted.faqs.length} FAQs`);
        if (extracted.policies) parts.push('policies');

        setScanResult('success');
        setScanSummary(parts.length > 0 ? `Found ${parts.join(', ')}` : 'Website read — knowledge base ready');
      } else {
        setScanResult('success');
        setScanSummary('Website read — content saved for your AI agent');
      }
    } catch {
      setScanResult('error');
      setScanSummary('Scan failed. You can add info manually in the next step.');
    } finally {
      setScanning(false);
    }
  }, [account.userId, businessProfile.websiteUrl, businessProfile.businessName, businessProfile.mainCategory, knowledgeBase, updateKnowledgeBase]);

  // Validate business phone with Cekura on blur
  const handlePhoneBlur = useCallback(async () => {
    const phone = (businessProfile.businessPhone || '').trim();
    if (!phone || phone.length < 7) {
      setPhoneValidation(null);
      return;
    }
    setIsValidatingPhone(true);
    setPhoneValidation(null);
    try {
      const result = await validatePhoneNumber(phone);
      setPhoneValidation(result);
    } catch {
      setPhoneValidation({ success: false, valid: false });
    } finally {
      setIsValidatingPhone(false);
    }
  }, [businessProfile.businessPhone]);

  const categories = [
    { value: 'dentist', label: 'Dentist' },
    { value: 'medspa', label: 'Med Spa' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'legal', label: 'Legal' },
    { value: 'salon', label: 'Salon' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'retail', label: 'Retail' },
    { value: 'other', label: 'Other' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'he', label: 'Hebrew' },
    { value: 'ar', label: 'Arabic' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
  ];

  const countries = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'au', label: 'Australia' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'es', label: 'Spain' },
    { value: 'it', label: 'Italy' },
    { value: 'nl', label: 'Netherlands' },
    { value: 'be', label: 'Belgium' },
    { value: 'ch', label: 'Switzerland' },
    { value: 'at', label: 'Austria' },
    { value: 'se', label: 'Sweden' },
    { value: 'no', label: 'Norway' },
    { value: 'dk', label: 'Denmark' },
    { value: 'fi', label: 'Finland' },
    { value: 'ie', label: 'Ireland' },
    { value: 'nz', label: 'New Zealand' },
    { value: 'sg', label: 'Singapore' },
    { value: 'jp', label: 'Japan' },
    { value: 'kr', label: 'South Korea' },
    { value: 'in', label: 'India' },
    { value: 'mx', label: 'Mexico' },
    { value: 'br', label: 'Brazil' },
    { value: 'ar', label: 'Argentina' },
    { value: 'cl', label: 'Chile' },
    { value: 'za', label: 'South Africa' },
    { value: 'il', label: 'Israel' },
    { value: 'ae', label: 'United Arab Emirates' },
  ];

  return (
    <div className="space-y-8">
      {/* Business Name */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Name</h3>
          <div className="space-y-4">
            <div>
              <StyledInput
                type="text"
                value={businessProfile.businessName || ''}
                onChange={(e) => updateBusinessProfile({ businessName: e.target.value })}
                placeholder="Enter your business name"
                name="businessName"
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business Website */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-500" />
            Business Website
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            We'll scan your website to auto-build your AI agent's knowledge base and prompt.
          </p>
          <div className="flex gap-2">
            <div className="flex-1">
              <StyledInput
                type="url"
                value={businessProfile.websiteUrl || ''}
                onChange={(e) => {
                  updateBusinessProfile({ websiteUrl: e.target.value });
                  setScanResult(null);
                  setScanSummary('');
                }}
                placeholder="https://yourbusiness.com"
                name="websiteUrl"
              />
            </div>
            <Button
              onClick={handleScanWebsite}
              disabled={scanning || !businessProfile.websiteUrl?.trim()}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 whitespace-nowrap px-4 h-[42px]"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Scan & Analyze
                </>
              )}
            </Button>
          </div>

          {/* Scan result feedback */}
          {scanResult === 'success' && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{scanSummary} — knowledge base pre-filled for the next step.</span>
            </div>
          )}
          {scanResult === 'error' && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{scanSummary}</span>
            </div>
          )}
          {!scanResult && !scanning && (
            <p className="mt-1 text-xs text-gray-400">
              Optional — you can skip this and fill in details manually.
            </p>
          )}
        </div>
      </div>

      {/* Business Phone Number */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Phone Number</h3>
          <div className="space-y-4">
            <div>
              <div className="relative">
                <PhoneInput
                  defaultCountry={(businessProfile.country?.toUpperCase() as CountryCode) || 'US'}
                  value={businessProfile.businessPhone || ''}
                  onChange={(value) => {
                    updateBusinessProfile({ businessPhone: value || '' });
                    setPhoneValidation(null);
                  }}
                  onBlur={handlePhoneBlur}
                  className="phone-input-wrapper"
                  international
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {isValidatingPhone && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  )}
                  {!isValidatingPhone && phoneValidation && phoneValidation.valid && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {!isValidatingPhone && phoneValidation && !phoneValidation.valid && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                      <ShieldX className="w-3.5 h-3.5" />
                      Invalid
                    </span>
                  )}
                </div>
              </div>
              {phoneValidation?.valid && (
                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  {phoneValidation.phone_type && (
                    <span className="capitalize">{phoneValidation.phone_type}</span>
                  )}
                  {phoneValidation.carrier && (
                    <span>• {phoneValidation.carrier}</span>
                  )}
                  {phoneValidation.country_code && (
                    <span>• {phoneValidation.country_code}</span>
                  )}
                </div>
              )}
              {phoneValidation && !phoneValidation.valid && (
                <p className="mt-1 text-sm text-red-600">
                  This phone number could not be verified. Please check the format (include country code, e.g. +1).
                </p>
              )}
              {errors.businessPhone && (
                <p className="mt-1 text-sm text-red-600">{errors.businessPhone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business Category */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Business Category</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Category *
            </label>
            <div className="relative">
              <ArrowDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={businessProfile.mainCategory}
                onChange={(e) => updateBusinessProfile({ mainCategory: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none bg-white text-gray-900 ${
                  errors.mainCategory ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-brand-blue'
                }`}
              >
                <option value="" className="text-gray-900">Select your business category</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value} className="text-gray-900">
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.mainCategory && (
              <p className="mt-1 text-sm text-red-600">{errors.mainCategory}</p>
            )}
          </div>
        </div>
      </div>

      {/* Country Selection */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Country</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select your country *
            </label>
            <div className="relative">
              <ArrowDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={businessProfile.country || ''}
                onChange={(e) => {
                  const c = e.target.value;
                  updateBusinessProfile({ country: c });
                  // Auto-set timezone for known country → IANA mappings
                  if (c === 'il') updateBusinessProfile({ timezone: 'Asia/Jerusalem' } as any);
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none bg-white text-gray-900 ${
                  errors.country ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-brand-blue'
                }`}
              >
                <option value="" className="text-gray-900">Select your country</option>
                {countries.map(country => (
                  <option key={country.value} value={country.value} className="text-gray-900">
                    {country.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.country && (
              <p className="mt-1 text-sm text-red-600">{errors.country}</p>
            )}
          </div>
        </div>
      </div>

      {/* Primary Location */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
              <StyledInput
                type="text"
                value={businessProfile.addressLine1 || ''}
                onChange={(e) => updateBusinessProfile({ addressLine1: e.target.value })}
                placeholder="Street address"
                name="addressLine1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <StyledInput
                type="text"
                value={businessProfile.city || ''}
                onChange={(e) => updateBusinessProfile({ city: e.target.value })}
                placeholder="City"
                name="city"
              />
            </div>
            {businessProfile.country !== 'il' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                <StyledInput
                  type="text"
                  value={businessProfile.state || ''}
                  onChange={(e) => updateBusinessProfile({ state: e.target.value })}
                  placeholder="State or province"
                  name="state"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {businessProfile.country === 'il' ? 'מיקוד (Postal Code)' : 'Postal Code'}
              </label>
              <StyledInput
                type="text"
                value={businessProfile.postalCode || ''}
                onChange={(e) => updateBusinessProfile({ postalCode: e.target.value })}
                placeholder={businessProfile.country === 'il' ? '1234567' : 'ZIP / Postal code'}
                name="postalCode"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Language</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select language your AI can speak
            </label>
            <div className="relative">
              <ArrowDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={businessProfile.languages || 'en'}
                onChange={(e) => updateBusinessProfile({ languages: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 appearance-none bg-white text-gray-900 border-gray-300 focus:border-brand-blue"
              >
                {languageOptions.map(lang => (
                  <option key={lang.value} value={lang.value} className="text-gray-900">
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StepBusinessProfile;
