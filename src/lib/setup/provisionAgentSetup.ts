import { createUserWorkspaceAndProfile, getUserWorkspaces, getUserBusinessProfiles } from '../database';
import { createAgentAndKnowledgeBase } from '../webhooks';
import { LocationService } from '../locations';
import { FUNCTIONS_BASE } from '../api';
import { supabase } from '../supabase';
import type { PendingAgentSetup } from './onboarding';

export async function provisionAgentSetup(userId: string, setup: PendingAgentSetup) {
  const country = setup.country?.trim() || 'us';

  // Idempotency: a failed run leaves pendingAgentSetup in localStorage and the
  // documented recovery is "refresh and try again" — reuse anything already
  // created instead of provisioning duplicates (workspace, profile, agents).
  let workspace = (await getUserWorkspaces(userId))[0];
  let businessProfile = (await getUserBusinessProfiles(userId))[0];

  if (!workspace || !businessProfile) {
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
  }

  const { data: existingAgents } = await supabase
    .from('agents')
    .select('id, agent_type')
    .eq('user_id', userId);
  const hasAgent = (type: string) =>
    (existingAgents || []).some((a) => a.agent_type === type);

  let locationId: string | undefined =
    localStorage.getItem('currentLocationId') || undefined;
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
      localStorage.setItem('currentLocationId', locationId);
    } catch (error) {
      console.warn('Could not create primary location:', error);
    }
  }

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
    services: [],
    faqs: [],
    policies: {
      cancellation: '',
      reschedule: '',
      deposit: '',
    },
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
  };
}
