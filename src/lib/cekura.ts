// Cekura phone verification client — proxied through Netlify function

import { FUNCTIONS_BASE } from './api';
import { authedFetch } from './authedFetch';

export interface VerificationResult {
  success: boolean;
  verification_id?: string;
  status?: string;
  channel?: string;
}

export interface VerificationCheckResult {
  success: boolean;
  verified: boolean;
  status?: string;
}

export interface PhoneValidationResult {
  success: boolean;
  valid: boolean;
  phone_type?: 'mobile' | 'landline' | 'voip';
  carrier?: string;
  country_code?: string;
  national_format?: string;
}

export interface CallerIdResult {
  success: boolean;
  caller_name?: string;
  caller_type?: string;
  phone_type?: string;
  carrier?: string;
}

async function cekuraFetch(body: Record<string, any>) {
  const response = await authedFetch(`${FUNCTIONS_BASE}/cekura-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.details || err.error || `Cekura error: ${response.status}`);
  }

  return response.json();
}

/**
 * Start phone verification — sends OTP via SMS or call
 */
export async function startVerification(
  phoneNumber: string,
  channel: 'sms' | 'call' = 'sms'
): Promise<VerificationResult> {
  return cekuraFetch({
    action: 'start_verification',
    phone_number: phoneNumber,
    channel,
  });
}

/**
 * Check verification code entered by user
 */
export async function checkVerification(
  phoneNumber: string,
  code: string,
  verificationId?: string
): Promise<VerificationCheckResult> {
  return cekuraFetch({
    action: 'check_verification',
    phone_number: phoneNumber,
    code,
    ...(verificationId && { verification_id: verificationId }),
  });
}

/**
 * Validate a phone number (check if real, get carrier info)
 */
export async function validatePhoneNumber(
  phoneNumber: string
): Promise<PhoneValidationResult> {
  return cekuraFetch({
    action: 'validate',
    phone_number: phoneNumber,
  });
}

/**
 * Get caller identity (CNAM lookup)
 */
export async function getCallerId(
  phoneNumber: string
): Promise<CallerIdResult> {
  return cekuraFetch({
    action: 'caller_id',
    phone_number: phoneNumber,
  });
}
