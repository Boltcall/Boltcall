// Twilio SMS & Phone Numbers client — proxied through Netlify functions

import { FUNCTIONS_BASE } from './api';
import { authedFetch } from './authedFetch';

// === SMS ===

export interface SendSmsResult {
  success: boolean;
  message_sid?: string;
  status?: string;
  to?: string;
  from?: string;
}

export interface BulkSmsResult {
  success: boolean;
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    message_sid?: string;
    error?: string;
  }>;
}

export interface SmsMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  status: string;
  direction: string;
  date_sent: string;
}

/**
 * Send a single SMS
 */
export async function sendSms(to: string, message: string, from?: string): Promise<SendSmsResult> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', to, message, from }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `SMS failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSms(
  messages: Array<{ to: string; message: string }>,
  from?: string
): Promise<BulkSmsResult> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send_bulk', messages, from }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Bulk SMS failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get SMS message history
 */
export async function getSmsHistory(params?: {
  to?: string;
  from?: string;
  date_sent?: string;
  limit?: number;
}): Promise<{ messages: SmsMessage[]; total: number }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'list', ...params }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `List SMS failed: ${response.status}`);
  }

  return response.json();
}

// === SMS AI Responder ===

export interface SmsAiResponse {
  success: boolean;
  draftStatus?: string;
  reply?: string;
  qualification?: {
    intent: string;
    score: number;
    reason: string;
    suggested_action: string;
    booking_intent?: boolean;
    suggested_slot?: string;
    service_requested?: string;
  };
  booking?: {
    wants_to_book: boolean;
    suggested_slot: string | null;
    service_requested: string | null;
  } | null;
  messageId?: string;
  threadId?: string;
  message?: string;
  skipped?: boolean;
  status?: string;
}

/**
 * Generate an AI response for an inbound SMS message
 */
export async function generateSmsAiReply(
  messageId: string,
  userId: string,
  action: 'generate' | 'regenerate' = 'generate'
): Promise<SmsAiResponse> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/sms-ai-responder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, userId, action }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `AI responder failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Approve an AI-generated SMS draft and send it
 */
export async function approveSmsAiDraft(messageId: string, userId: string): Promise<{ success: boolean; sid?: string }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/sms-ai-responder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, userId, action: 'approve' }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Approve failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Reject an AI-generated SMS draft
 */
export async function rejectSmsAiDraft(messageId: string, userId: string): Promise<{ success: boolean }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/sms-ai-responder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, userId, action: 'reject' }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Reject failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Enroll a contact in a follow-up SMS sequence
 */
export async function enrollInSequence(params: {
  sequenceId: string;
  contactPhone: string;
  contactName?: string;
  contactEmail?: string;
  userId: string;
  leadId?: string;
}): Promise<{ success: boolean; enrollmentId?: string; nextStepAt?: string }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/sms-sequence-processor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'enroll', ...params }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Enroll failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Manually trigger sequence processing
 */
export async function processSequences(): Promise<{ processed: number; failed: number }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/sms-sequence-processor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'process' }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `Process failed: ${response.status}`);
  }

  return response.json();
}

// === Phone Numbers ===

export interface OwnedPhoneNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
  status: string;
  voice_url?: string;
  sms_url?: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
  date_created: string;
}

export interface AvailablePhoneNumber {
  phone_number: string;
  friendly_name: string;
  region: string;
  locality: string;
  rate_center: string;
  capabilities: {
    voice: boolean;
    SMS: boolean;
    MMS: boolean;
  };
  monthly_cost: string;
}

/**
 * List owned phone numbers
 */
export async function listPhoneNumbers(): Promise<OwnedPhoneNumber[]> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers`);
  if (!response.ok) {
    throw new Error(`Failed to list numbers: ${response.status}`);
  }
  return response.json();
}

/**
 * Search available phone numbers to purchase
 */
export async function searchAvailableNumbers(params?: {
  country?: string;
  type?: 'Local' | 'TollFree' | 'Mobile';
  area_code?: string;
  contains?: string;
}): Promise<AvailablePhoneNumber[]> {
  const searchParams = new URLSearchParams({ action: 'available' });
  if (params?.country) searchParams.set('country', params.country);
  if (params?.type) searchParams.set('type', params.type);
  if (params?.area_code) searchParams.set('area_code', params.area_code);
  if (params?.contains) searchParams.set('contains', params.contains);

  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to search numbers: ${response.status}`);
  }
  return response.json();
}

/**
 * Purchase a phone number
 */
export async function purchasePhoneNumber(
  phoneNumber: string,
  options?: { voice_url?: string; sms_url?: string; friendly_name?: string }
): Promise<{ success: boolean; sid: string; phone_number: string; friendly_name: string }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'purchase',
      phone_number: phoneNumber,
      ...options,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Purchase failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Configure an existing phone number (update voice/SMS URLs)
 */
export async function configurePhoneNumber(
  sid: string,
  config: { voice_url?: string; sms_url?: string; friendly_name?: string }
): Promise<{ success: boolean; phone_number: string }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'configure', sid, ...config }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Configure failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Release (delete) a phone number
 */
export async function releasePhoneNumber(sid: string): Promise<{ success: boolean }> {
  const response = await authedFetch(`${FUNCTIONS_BASE}/twilio-numbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'release', sid }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Release failed: ${response.status}`);
  }

  return response.json();
}
