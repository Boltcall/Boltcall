import { createBusinessProfile, createUserWorkspaceAndProfile, getUserWorkspaces, getUserBusinessProfiles } from '../database';
import { createAgentAndKnowledgeBase } from '../webhooks';
import { LocationService } from '../locations';
import { FUNCTIONS_BASE } from '../api';
import { supabase } from '../supabase';
import { reportHandledError } from '../errorReporting';
import type { PendingAgentSetup } from './onboarding';

// Sensible weekday hours for the after_hours pain default. Only written when
// business_profiles.opening_hours is empty — never clobbers a picked value.
// ponytail: default M-F 9-5 hours; per-day picker if support asks twice.
const DEFAULT_MF_9_5 = {
  monday:    { open: '09:00', close: '17:00', closed: false },
  tuesday:   { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday:  { open: '09:00', close: '17:00', closed: false },
  friday:    { open: '09:00', close: '17:00', closed: false },
  saturday:  { open: '09:00', close: '17:00', closed: true  },
  sunday:    { open: '09:00', close: '17:00', closed: true  },
};

const DEFAULT_MISSED_CALL_TEMPLATE =
  "Hi, sorry we missed you. Reply here and we'll get right back.";

// Writes per-pain feature defaults so the picked pain gets a real DB
// setting, not just an in-memory tag. Non-fatal: matches the existing
// pattern used for services/locations/logo elsewhere in this file.
//
// slow_followup / front_desk fall through with no writes:
// - slow_followup: speed_to_lead_enabled is already flipped true by
//   setup-launch (netlify/functions/setup-launch.ts) at the tail of this
//   provisioning flow; adding a duplicate write here would be dead code.
// - front_desk: the transferNumber is already threaded into the inbound
//   agent config a few lines below.
async function applyPainDefaults(
  userId: string,
  workspaceId: string,
  businessProfileId: string,
  painPoint: string | undefined,
): Promise<void> {
  if (!painPoint) return;
  try {
    if (painPoint === 'missed_calls') {
      const { error } = await supabase
        .from('business_features')
        .upsert(
          {
            user_id: userId,
            workspace_id: workspaceId,
            missed_call_textback_enabled: true,
            missed_call_config: { template: DEFAULT_MISSED_CALL_TEMPLATE },
          },
          { onConflict: 'user_id' },
        );
      if (error) console.warn('applyPainDefaults(missed_calls) failed:', error);
      return;
    }
    if (painPoint === 'after_hours') {
      const { data: prof } = await supabase
        .from('business_profiles')
        .select('opening_hours')
        .eq('id', businessProfileId)
        .maybeSingle();
      const current = (prof?.opening_hours ?? {}) as Record<string, unknown>;
      if (Object.keys(current).length === 0) {
        const { error } = await supabase
          .from('business_profiles')
          .update({ opening_hours: DEFAULT_MF_9_5 })
          .eq('id', businessProfileId);
        if (error) console.warn('applyPainDefaults(after_hours) failed:', error);
      }
      return;
    }
    // slow_followup, front_desk — covered elsewhere, see comment above.
  } catch (error) {
    console.warn(`applyPainDefaults(${painPoint}) threw:`, error);
  }
}

// Namespace the "current location" cache by userId so a second account in
// the same browser cannot inherit — or silently reuse — the first user's
// location id (and end up not creating its own primary location).
function locationCacheKey(userId: string) {
  return `currentLocationId:${userId}`;
}

export async function provisionAgentSetup(userId: string, setup: PendingAgentSetup) {
  const country = setup.country?.trim() || 'us';

  // Idempotency: a failed run leaves pendingAgentSetup in localStorage and the
  // documented recovery is "refresh and try again" — reuse anything already
  // created instead of provisioning duplicates (workspace, profile, agents).
  let workspace = (await getUserWorkspaces(userId))[0];
  let businessProfile = (await getUserBusinessProfiles(userId))[0];

  if (!workspace) {
    // No workspace yet — mint both workspace + profile.
    const created = await createUserWorkspaceAndProfile(userId, {
      business_name: setup.businessName,
      website_url: setup.websiteUrl.trim() || undefined,
      main_category: setup.industry,
      country,
      service_areas: [],
      opening_hours: {},
      languages: ['en'],
    });
    workspace = created.workspace;
    businessProfile = created.businessProfile;
  } else if (!businessProfile) {
    // Workspace exists (e.g. ensureWorkspaceForUser created "My Workspace"
    // on /setup entry) but no profile row yet — DON'T re-run
    // createUserWorkspaceAndProfile, which would try to mint a second
    // workspace and either duplicate or blow up on workspaces.user_id
    // uniqueness. Just attach the profile to the existing workspace.
    businessProfile = await createBusinessProfile({
      business_name: setup.businessName,
      website_url: setup.websiteUrl.trim() || undefined,
      main_category: setup.industry,
      country,
      service_areas: [],
      opening_hours: {},
      languages: ['en'],
      workspace_id: workspace.id,
      user_id: userId,
    });
  }

  // Persist the services catalog — prices power the booked-revenue
  // dashboard (bookings get valued by matching service name). Non-fatal,
  // and skipped on retry if rows already exist.
  if (setup.services?.length) {
    try {
      const { data: existingServices } = await supabase
        .from('services')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if (!existingServices?.length) {
        const { error: svcErr } = await supabase.from('services').insert(
          setup.services.map((s) => ({
            user_id: userId,
            workspace_id: workspace.id,
            name: s.name,
            price_cents: Number.isFinite(s.price) ? Math.round(s.price * 100) : null,
            duration_min: Number.isFinite(s.duration) ? s.duration : null,
          }))
        );
        if (svcErr) {
          console.warn('Could not persist services catalog:', svcErr);
          reportHandledError('provisionAgentSetup: services insert', svcErr, { userId });
        }
      }
    } catch (error) {
      console.warn('Could not persist services catalog:', error);
      reportHandledError('provisionAgentSetup: services insert', error, { userId });
    }
  }

  const { data: existingAgents } = await supabase
    .from('agents')
    .select('id, agent_type')
    .eq('user_id', userId);
  const hasAgent = (type: string) =>
    (existingAgents || []).some((a) => a.agent_type === type);

  const locationKey = locationCacheKey(userId);
  let locationId: string | undefined =
    localStorage.getItem(locationKey) || undefined;
  if (!locationId) {
    try {
      const location = await LocationService.create({
        business_profile_id: businessProfile.id,
        user_id: userId,
        name: setup.businessName,
        slug: null,
        phone: setup.transferNumber.trim() || null,
        email: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        postal_code: null,
        country,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_primary: true,
        is_active: true,
      } as never);
      locationId = location.id;
      localStorage.setItem(locationKey, locationId);
    } catch (error) {
      console.warn('Could not create primary location:', error);
      reportHandledError('provisionAgentSetup: location create', error, { userId });
    }
  }

  // Pain-specific DB defaults BEFORE agent creation so the KB/prompt is
  // built against the final feature-flag state.
  await applyPainDefaults(userId, workspace.id, businessProfile.id, setup.painPoint);

  const commonAgentData = {
    businessName: setup.businessName,
    websiteUrl: setup.websiteUrl.trim(),
    mainCategory: setup.industry,
    country,
    serviceAreas: [],
    openingHours: {},
    languages: ['en'],
    clientId: userId,
    businessProfileId: businessProfile.id,
    locationId,
    services: setup.services ?? [],
    faqs: setup.faqs ?? [],
    policies: {
      cancellation: '',
      reschedule: '',
      deposit: '',
    },
    // Pain choice reaches the prompt builder via callFlow so the agent's
    // "primary focus" line is aligned with what the user actually cares
    // about — see PAIN_FOCUS_LINES in generate-agent-prompt.ts.
    callFlow: setup.painPoint ? { painPoint: setup.painPoint } : undefined,
  };

  let primaryResult: { kb_folder_id?: string } | undefined;
  if (!hasAgent('inbound')) {
    primaryResult = await createAgentAndKnowledgeBase({
      ...commonAgentData,
      agentType: 'inbound',
      agentName: `${setup.businessName} AI Receptionist`,
      voiceId: setup.voiceId,
      transferNumber: setup.transferNumber.trim(),
    });
  }

  if (!hasAgent('speed_to_lead')) {
    await createAgentAndKnowledgeBase({
      ...commonAgentData,
      agentType: 'speed_to_lead',
      agentName: `${setup.businessName} Follow-Up Agent`,
      kbFolderId: primaryResult?.kb_folder_id || undefined,
    });
  }

  localStorage.setItem('boltcall_setup_complete', userId);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Phone number: /start's promise includes a dialable line. Non-fatal —
  // launch never blocks on it — but the failure is RETURNED so the UI can
  // show it with a retry, never silently swallowed (the V1 wizard's sin).
  const phone: { number: string | null; error: string | null } = { number: null, error: null };
  try {
    const { data: existingPhone } = await supabase
      .from('phone_numbers')
      .select('phone_number')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (existingPhone?.phone_number) {
      phone.number = existingPhone.phone_number;
    } else {
      const purchaseRes = await fetch(`${FUNCTIONS_BASE}/twilio-numbers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ action: 'purchase', country_code: country.toUpperCase() }),
      });
      const purchaseData = await purchaseRes.json().catch(() => ({}));
      if (purchaseRes.ok && purchaseData.phone_number) {
        phone.number = purchaseData.phone_number;
      } else {
        phone.error = purchaseData.detail || purchaseData.error || `Phone purchase failed (${purchaseRes.status})`;
        console.error('Phone purchase failed during /start launch:', phone.error);
      }
    }
  } catch (error) {
    phone.error = error instanceof Error ? error.message : 'Phone purchase failed';
    console.error('Phone purchase failed during /start launch:', error);
  }

  // Brand the workspace with the logo scraped during /start onboarding.
  // Non-fatal: a missing logo never blocks launch.
  if (setup.logoUrl) {
    try {
      await fetch(`${FUNCTIONS_BASE}/saas-v2-settings-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ patch: { logo_url: setup.logoUrl } }),
      });
    } catch (error) {
      console.warn('Could not save workspace logo:', error);
      reportHandledError('provisionAgentSetup: logo upload', error, { userId });
    }
  }
  const launchRes = await fetch(`${FUNCTIONS_BASE}/setup-launch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      workspaceId: workspace.id,
      isEnabled: true,
    }),
  });

  if (!launchRes.ok) {
    const details = await launchRes.text().catch(() => '');
    throw new Error(
      `Setup finalization failed (${launchRes.status}): ${
        details || 'unknown error'
      }`,
    );
  }

  return {
    workspace,
    businessProfile,
    locationId,
    phone,
  };
}
