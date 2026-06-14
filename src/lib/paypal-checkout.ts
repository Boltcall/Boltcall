// PayPal Subscription checkout — frontend helper.
//
// Calls /.netlify/functions/create-paypal-subscription with the user's JWT,
// receives an approvalUrl, and redirects the browser there. PayPal handles the
// rest; on approval the user returns to ?paypal=success and the webhook
// activates the subscription in Supabase.

import { supabase } from './supabase';
import type { PlanLevel, BillingInterval } from './stripe';

interface CheckoutParams {
  plan: PlanLevel;
  interval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}

export async function redirectToPayPalCheckout({
  plan,
  interval,
  successUrl,
  cancelUrl,
}: CheckoutParams): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to start checkout');
  }

  const response = await fetch('/.netlify/functions/create-paypal-subscription', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ plan, interval, successUrl, cancelUrl }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `PayPal checkout failed (${response.status})`);
  }

  if (!data.approvalUrl) {
    throw new Error('PayPal did not return an approval URL');
  }

  window.location.href = data.approvalUrl;
}

export async function redirectToPayPalTestPayment(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to start the PayPal test payment');
  }

  const response = await fetch('/.netlify/functions/create-paypal-test-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      successUrl: `${window.location.origin}/dashboard/settings/plan-billing?paypal_test=success`,
      cancelUrl: `${window.location.origin}/dashboard/settings/plan-billing?paypal_test=cancelled`,
    }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `PayPal test payment failed (${response.status})`);
  }
  if (!data.approvalUrl) {
    throw new Error('PayPal did not return a test-payment approval URL');
  }

  window.location.href = data.approvalUrl;
}

export async function capturePayPalTestPayment(orderId: string): Promise<{
  orderId: string;
  captureId: string | null;
  amount: string;
  currency: string;
  status: string;
  paypalMode: 'live' | 'sandbox';
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to capture the PayPal test payment');
  }

  const response = await fetch('/.netlify/functions/capture-paypal-test-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `PayPal capture failed (${response.status})`);
  }
  return data;
}
