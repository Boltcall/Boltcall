import { createUserWorkspaceAndProfile } from '../database';
import { createAgentAndKnowledgeBase } from '../webhooks';
import { LocationService } from '../locations';
import { FUNCTIONS_BASE } from '../api';
import { supabase } from '../supabase';
import type { PendingAgentSetup } from './onboarding';

export async function provisionAgentSetup(userId: string, setup: PendingAgentSetup) {
  const { workspace, businessProfile } = await createUserWorkspaceAndProfile(userId, {
    business_name: setup.businessName,
    main_category: setup.industry,
    country: 'us',
    service_areas: [],
    opening_hours: {},
    languages: ['en'],
  });

  let locationId: string | undefined;
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
      country: 'us',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_primary: true,
      is_active: true,
    } as never);
    locationId = location.id;
    localStorage.setItem('currentLocationId', locationId);
  } catch (error) {
    console.warn('Could not create primary location:', error);
  }

  const commonAgentData = {
    businessName: setup.businessName,
    websiteUrl: '',
    mainCategory: setup.industry,
    country: 'us',
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

  const primaryResult = await createAgentAndKnowledgeBase({
    ...commonAgentData,
    agentType: 'inbound',
    agentName: `${setup.businessName} AI Receptionist`,
    voiceId: setup.voiceId,
    transferNumber: setup.transferNumber.trim(),
  }).catch((error) => {
    console.error('Agent creation failed:', error);
    return null;
  });

  createAgentAndKnowledgeBase({
    ...commonAgentData,
    agentType: 'speed_to_lead',
    agentName: `${setup.businessName} Follow-Up Agent`,
    kbFolderId: primaryResult?.kb_folder_id || undefined,
  }).catch((error) => console.error('Follow-up agent creation failed:', error));

  localStorage.setItem('boltcall_setup_complete', userId);

  supabase.auth
    .getSession()
    .then(({ data: { session } }) =>
      fetch(`${FUNCTIONS_BASE}/setup-launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          isEnabled: true,
        }),
      }),
    )
    .catch((error) => console.error('Setup launch failed:', error));

  return {
    workspace,
    businessProfile,
    locationId,
  };
}
