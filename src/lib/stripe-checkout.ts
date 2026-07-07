/**
 * Subscription management redirect — lazily loaded only when the user opens
 * billing management. Boltcall bills via PayPal; PayPal has no embeddable
 * customer portal, so we deep-link to paypal.com.
 *
 * ponytail: file kept named stripe-checkout.ts to avoid churning import paths;
 * the Stripe checkout flow (redirectToCheckout/getStripe) was removed as dead
 * code — nothing called it and billing is PayPal-only.
 */

/**
 * Open PayPal subscription management for the current user.
 * Deep-links to the specific subscription when we know its id, else the
 * general autopay page.
 */
export async function openPayPalSubscriptionManagement() {
  const { getUserSubscription } = await import('./stripe');
  const sub = await getUserSubscription();

  if (sub?.paypal_subscription_id) {
    window.open(
      `https://www.paypal.com/myaccount/autopay/connect/${sub.paypal_subscription_id}`,
      '_blank'
    );
  } else {
    window.open('https://www.paypal.com/myaccount/autopay', '_blank');
  }
}
