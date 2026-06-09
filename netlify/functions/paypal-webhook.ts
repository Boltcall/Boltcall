import type { Handler } from '@netlify/functions';
import {
  PAYPAL_API_BASE,
  PAYPAL_WEBHOOK_ID,
  getPayPalAccessToken,
} from './_shared/paypal-client';
import { getServiceSupabase } from './_shared/token-utils';

type SupabaseAdmin = ReturnType<typeof getServiceSupabase>;

let cachedSupabase: SupabaseAdmin | null = null;

function supabaseAdmin(): SupabaseAdmin {
  if (!cachedSupabase) cachedSupabase = getServiceSupabase();
  return cachedSupabase;
}

// ── User lookup helper (auth.users) ──────────────────────────────────────────
// Used as fallback when a webhook payload lacks `custom_id` (legacy
// hosted-button payments). Subscriptions API flows attach the user UUID via
// `custom_id` in the create-subscription call so we don't need this scan.

async function findUserByEmail(email: string | undefined): Promise<{ id: string; email: string | undefined } | null> {
  if (!email) return null;
  try {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error || !data?.users) return null;
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    return match ? { id: match.id, email: match.email } : null;
  } catch (e) {
    console.error('findUserByEmail failed:', e);
    return null;
  }
}

// ── Webhook Signature Verification ───────────────────────────────────────────

async function verifyWebhookSignature(event: any): Promise<boolean> {
  if (!PAYPAL_WEBHOOK_ID) {
    console.error('PAYPAL_WEBHOOK_ID not set — rejecting PayPal webhook');
    return false;
  }

  const accessToken = await getPayPalAccessToken();

  const verifyBody = {
    auth_algo: event.headers['paypal-auth-algo'],
    cert_url: event.headers['paypal-cert-url'],
    transmission_id: event.headers['paypal-transmission-id'],
    transmission_sig: event.headers['paypal-transmission-sig'],
    transmission_time: event.headers['paypal-transmission-time'],
    webhook_id: PAYPAL_WEBHOOK_ID,
    webhook_event: JSON.parse(event.body || '{}'),
  };

  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(verifyBody),
  });

  if (!res.ok) {
    console.error('Webhook verification API error:', await res.text());
    return false;
  }

  const result = await res.json();
  return result.verification_status === 'SUCCESS';
}

// ── Event Handlers ───────────────────────────────────────────────────────────

async function handlePaymentCompleted(resource: any) {
  const payerEmail = resource.payer?.email_address;
  const payerId = resource.payer?.payer_id;
  const amount = resource.purchase_units?.[0]?.amount?.value;
  const currency = resource.purchase_units?.[0]?.amount?.currency_code;
  const orderId = resource.id;

  console.log(`Payment completed: ${orderId} — ${amount} ${currency} from ${payerEmail}`);

  // Try to find user by email — `profiles` table doesn't exist in this project;
  // canonical source is auth.users via the admin API (service role required).
  const user = await findUserByEmail(payerEmail);

  // Log the payment
  const { error } = await supabaseAdmin()
    .from('paypal_payments')
    .upsert({
      order_id: orderId,
      payer_email: payerEmail,
      payer_id: payerId,
      user_id: user?.id || null,
      amount: parseFloat(amount),
      currency: currency || 'USD',
      status: 'completed',
      raw_event: resource,
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'order_id',
    });

  if (error) {
    console.error('Error saving PayPal payment:', error);
    throw error;
  }

  // Send Telegram notification
  await sendTelegramNotification(
    `💰 PayPal Payment Received!\n\n` +
    `Amount: $${amount} ${currency}\n` +
    `From: ${payerEmail}\n` +
    `Order: ${orderId}\n` +
    `User: ${user ? 'Matched ✅' : 'No account ⚠️'}`
  );
}

async function handleSubscriptionActivated(resource: any) {
  const subscriptionId = resource.id;
  const planId = resource.plan_id;
  const customId = resource.custom_id; // user UUID we attached during create
  const payerEmail = resource.subscriber?.email_address;
  const payerId = resource.subscriber?.payer_id;
  const startTime = resource.start_time;

  console.log(`Subscription activated: ${subscriptionId} (plan: ${planId}) for ${payerEmail} custom_id=${customId || '<none>'}`);

  const { level, interval } = mapPayPalPlan(planId);

  // Resolve user_id: trust custom_id (set by create-paypal-subscription) first,
  // fall back to email lookup for legacy hosted-button payments.
  let userId: string | null = customId || null;
  let matchSource = customId ? 'custom_id' : 'none';
  if (!userId) {
    const u = await findUserByEmail(payerEmail);
    if (u) {
      userId = u.id;
      matchSource = 'email';
    }
  }

  if (userId) {
    const { error } = await supabaseAdmin()
      .from('subscriptions')
      .upsert({
        user_id: userId,
        payment_provider: 'paypal',
        paypal_subscription_id: subscriptionId,
        paypal_payer_id: payerId,
        paypal_plan_id: planId,
        plan_level: level,
        billing_interval: interval,
        status: 'active',
        current_period_start: startTime,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'paypal_subscription_id',
      });

    if (error) {
      console.error('Error upserting PayPal subscription:', error);
      throw error;
    }
  }

  await sendTelegramNotification(
    `🎉 New PayPal Subscription!\n\n` +
    `Plan: ${level} (${interval})\n` +
    `From: ${payerEmail}\n` +
    `Subscription: ${subscriptionId}\n` +
    `User match: ${matchSource}${userId ? ' ✅' : ' ⚠️ no account'}`
  );
}

async function handleSubscriptionCancelled(resource: any) {
  const subscriptionId = resource.id;

  console.log(`Subscription cancelled: ${subscriptionId}`);

  const { error } = await supabaseAdmin()
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId);

  if (error) {
    console.error('Error cancelling PayPal subscription:', error);
    throw error;
  }

  await sendTelegramNotification(
    `⚠️ PayPal Subscription Cancelled\n\nSubscription: ${subscriptionId}`
  );
}

async function handleSubscriptionSuspended(resource: any) {
  const subscriptionId = resource.id;

  const { error } = await supabaseAdmin()
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId);

  if (error) {
    console.error('Error suspending PayPal subscription:', error);
  }

  await sendTelegramNotification(
    `⚠️ PayPal Subscription Suspended (payment failed)\n\nSubscription: ${subscriptionId}`
  );
}

async function handlePaymentSaleCompleted(resource: any) {
  const amount = resource.amount?.total;
  const currency = resource.amount?.currency;
  const saleId = resource.id;
  const subscriptionId = resource.billing_agreement_id;

  console.log(`Sale completed: ${saleId} — $${amount} ${currency}`);

  // If this is a recurring payment, update the subscription period
  if (subscriptionId) {
    const { error } = await supabaseAdmin()
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('paypal_subscription_id', subscriptionId);

    if (error) {
      console.error('Error updating subscription on sale:', error);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Reverse-lookup: PayPal Plan ID → { level, interval }. Built from env vars
// at module load so a missing var doesn't crash the handler — unknown plans
// fall back to 'starter monthly' and a Telegram alert fires.
type PlanInfo = { level: 'starter' | 'pro' | 'ultimate'; interval: 'monthly' | 'yearly' };

function buildPlanReverseMap(): Record<string, PlanInfo> {
  const isSandbox = process.env.PAYPAL_MODE === 'sandbox';
  const suffix = isSandbox ? '_SANDBOX' : '';
  const tiers: PlanInfo['level'][] = ['starter', 'pro', 'ultimate'];
  const intervals: PlanInfo['interval'][] = ['monthly', 'yearly'];
  const map: Record<string, PlanInfo> = {};
  for (const level of tiers) {
    for (const interval of intervals) {
      const key = `PAYPAL_PLAN_${level.toUpperCase()}_${interval.toUpperCase()}${suffix}`;
      const id = process.env[key];
      if (id) map[id] = { level, interval };
    }
  }
  // Legacy hosted-button IDs (pre-Subscriptions API) — keep for backward compat
  // until we're confident no live customers are still on hosted buttons.
  map['6QXWAZWNEVEV2'] = { level: 'starter', interval: 'monthly' };
  map['FUL2XPWPEMFUY'] = { level: 'pro', interval: 'monthly' };
  return map;
}

const PLAN_REVERSE_MAP = buildPlanReverseMap();

function mapPayPalPlan(planId: string): PlanInfo {
  return PLAN_REVERSE_MAP[planId] || { level: 'starter', interval: 'monthly' };
}

async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('Telegram notification failed:', err);
  }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // Verify webhook signature
  const isValid = await verifyWebhookSignature(event);
  if (!isValid) {
    console.error('PayPal webhook signature verification failed');
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const body = JSON.parse(event.body || '{}');
  const eventType = body.event_type;
  const resource = body.resource;

  console.log(`PayPal webhook received: ${eventType}`);

  try {
    switch (eventType) {
      // One-time payments (hosted buttons)
      case 'CHECKOUT.ORDER.APPROVED':
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCompleted(resource);
        break;

      // Subscriptions
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
        await handleSubscriptionActivated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionCancelled(resource);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(resource);
        break;

      // Recurring payment received
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentSaleCompleted(resource);
        break;

      default:
        console.log(`Unhandled PayPal event: ${eventType}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error: any) {
    console.error('PayPal webhook handler error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };
