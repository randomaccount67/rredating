import Stripe from 'stripe';
import { db } from './db.js';
import { config } from '../config.js';
import { badRequest } from '../utils/errors.js';
import type { Profile } from '../types/index.js';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2023-10-16' });
}

export async function createCheckoutSession(profile: Profile) {
  const stripe = getStripe();
  const frontendUrl = config.frontendOrigins[0];

  // Reuse existing customer or create one
  let customerId = profile.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { profile_id: profile.id },
    });
    customerId = customer.id;
    await db.from('profiles').update({ stripe_customer_id: customerId }).eq('id', profile.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'RRedating Supporter',
          description: 'Unlock cosmetics, extended bio, priority placement, and more.',
        },
        unit_amount: 500, // $5.00
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${frontendUrl}/profile?subscribed=true`,
    cancel_url: `${frontendUrl}/profile`,
  });

  return { url: session.url };
}

export async function handleWebhook(rawBody: Buffer, signature: string) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed';
    throw badRequest(`Webhook signature error: ${msg}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      await db.from('profiles')
        .update({
          is_supporter: true,
          stripe_subscription_id: subscriptionId,
          supporter_since: new Date().toISOString(),
        })
        .eq('stripe_customer_id', customerId);
      console.log('[stripe] checkout.session.completed — supporter activated for customer', customerId);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await db.from('profiles')
        .update({ is_supporter: false, stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId);
      console.log('[stripe] customer.subscription.deleted — supporter deactivated for customer', customerId);
      break;
    }

    case 'customer.subscription.updated': {
      // Handle plan changes / reactivations
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      await db.from('profiles')
        .update({ is_supporter: isActive })
        .eq('stripe_customer_id', customerId);
      break;
    }

    default:
      // Unhandled event — not an error, Stripe sends many event types
      break;
  }

  return { received: true };
}

export async function getStatus(profile: Profile) {
  if (!profile.is_supporter || !profile.stripe_subscription_id) {
    return {
      is_supporter: false,
      supporter_since: null,
    };
  }

  try {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    return {
      is_supporter: profile.is_supporter,
      supporter_since: profile.supporter_since,
      subscription_status: sub.status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    };
  } catch {
    return {
      is_supporter: profile.is_supporter,
      supporter_since: profile.supporter_since,
    };
  }
}

export async function cancelSubscription(profile: Profile) {
  if (!profile.stripe_subscription_id) throw badRequest('No active subscription found');
  const stripe = getStripe();
  await stripe.subscriptions.cancel(profile.stripe_subscription_id);
  return { success: true };
}

export async function createPortalSession(profile: Profile) {
  if (!profile.stripe_customer_id) throw badRequest('No billing account found');
  const stripe = getStripe();
  const frontendUrl = config.frontendOrigins[0];
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${frontendUrl}/profile`,
  });
  return { url: session.url };
}
