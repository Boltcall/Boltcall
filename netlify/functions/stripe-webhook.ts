import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-04-30.basil',
});

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

function getInternalSecretHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_API_SECRET || process.env.INTERNAL_WEBHOOK_SECRET || process.env.CRON_SECRET;
  return secret ? { 'x-internal-secret': secret } : {};
}

const handler: Handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return { statusCode: 400, body: 'Missing signature or webhook secret' };
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body || '', sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan || 'starter';
  const interval = session.metadata?.interval || 'monthly';

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  // Get the subscription details from Stripe
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Upsert subscription in Supabase
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      plan_level: plan,
      billing_interval: interval,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  console.log(`Subscription created for user ${userId}: ${plan} (${interval})`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const plan = subscription.metadata?.plan;
  const interval = subscription.metadata?.interval;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      plan_level: plan || undefined,
      billing_interval: interval || undefined,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Stripe API ≥ 2024-09 sometimes omits invoice.subscription_details, so fall
  // back to looking up the subscription row we keep on file, then to retrieving
  // the subscription directly from Stripe.
  let userId: string | undefined = invoice.subscription_details?.metadata?.userId;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', invoice.subscription as string)
    .single();

  if (!userId && sub?.user_id) {
    userId = sub.user_id;
  }

  if (!userId && invoice.subscription) {
    try {
      const sObj = await stripe.subscriptions.retrieve(invoice.subscription as string);
      userId = sObj.metadata?.userId;
    } catch (e) {
      console.error('Failed to retrieve subscription for invoice', invoice.id, e);
    }
  }

  if (!userId) {
    console.error('handleInvoicePaid: could not resolve userId for invoice', invoice.id);
    return;
  }

  const { error } = await supabase
    .from('invoices')
    .upsert({
      user_id: userId,
      stripe_invoice_id: invoice.id,
      subscription_id: sub?.id,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      period_start: new Date((invoice.period_start || 0) * 1000).toISOString(),
      period_end: new Date((invoice.period_end || 0) * 1000).toISOString(),
    }, {
      onConflict: 'stripe_invoice_id',
    });

  if (error) {
    console.error('Error saving invoice:', error);
  }

  // Greeninvoice: issue Israeli tax invoice (חשבונית מס) for ILS payments
  if (invoice.currency === 'ils') {
    try {
      const baseUrl = process.env.URL || 'https://boltcall.org';
      await fetch(`${baseUrl}/.netlify/functions/greeninvoice-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getInternalSecretHeaders() },
        body: JSON.stringify({
          stripeInvoiceId: invoice.id,
          userId,
          amountILS: invoice.amount_paid,
          customerEmail: invoice.customer_email,
          customerName: (invoice as any).customer_name,
        }),
      });
    } catch (e) {
      console.error('Greeninvoice issue failed (non-blocking):', e);
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Update subscription status to past_due
  if (invoice.subscription) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', invoice.subscription as string);

    if (error) {
      console.error('Error updating subscription to past_due:', error);
    }
  }
}

export { handler };
