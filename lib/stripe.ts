import Stripe from "stripe";

interface CreateCheckoutParams {
  priceId: string;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  couponId?: string | null;
  clientReferenceId?: string;
  user?: {
    customerId?: string;
    email?: string;
  };
}

interface CreateCustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

// Create a single Stripe instance to be reused across functions
export const getStripeInstance = (): Stripe => {
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia" as any,
    typescript: true,
  });
};

// This is used to create a Stripe Checkout for one-time payments. It's usually triggered with the <ButtonCheckout /> component. Webhooks are used to update the user's state in the database.
export const createCheckout = async ({
  user,
  mode,
  clientReferenceId,
  successUrl,
  cancelUrl,
  priceId,
  couponId,
}: CreateCheckoutParams): Promise<string> => {
  try {
    const stripe = getStripeInstance();

    console.log("[Stripe createCheckout] Input params:", {
      hasUser: !!user,
      customerId: user?.customerId,
      email: user?.email,
      mode,
      priceId
    });

    const extraParams: {
      customer?: string;
      customer_creation?: "always";
      customer_email?: string;
      invoice_creation?: { enabled: boolean };
      payment_intent_data?: { setup_future_usage: "on_session" };
      tax_id_collection?: { enabled: boolean };
    } = {};

    // Only use customerId if it exists and is not 'NULL'
    if (user?.customerId && user.customerId !== 'NULL') {
      console.log("[Stripe] Using existing customer:", user.customerId);
      extraParams.customer = user.customerId;
    } else {
      console.log("[Stripe] Creating new customer with email:", user?.email);
      // For subscriptions, Stripe automatically creates a customer
      if (mode === "payment") {
        extraParams.customer_creation = "always";
        // The option below costs 0.4% (up to $2) per invoice. Alternatively, you can use https://zenvoice.io/ to create unlimited invoices automatically.
        // extraParams.invoice_creation = { enabled: true };
        extraParams.payment_intent_data = { setup_future_usage: "on_session" };
      }
      if (user?.email) {
        extraParams.customer_email = user?.email;
      }
      extraParams.tax_id_collection = { enabled: true };
    }

    console.log("[Stripe] Final session params:", {
      mode,
      priceId,
      ...extraParams
    });

    const stripeSession = await stripe.checkout.sessions.create({
      mode,
      allow_promotion_codes: true,
      client_reference_id: clientReferenceId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts: couponId
        ? [
            {
              coupon: couponId,
            },
          ]
        : [],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...extraParams,
    });

    return stripeSession.url;
  } catch (e) {
    console.error(e);
    return null;
  }
};

// This is used to create Customer Portal sessions, so users can manage their subscriptions (payment methods, cancel, etc..)
export const createCustomerPortal = async ({
  customerId,
  returnUrl,
}: CreateCustomerPortalParams): Promise<string> => {
  try {
    const stripe = getStripeInstance();

    // If customerId looks like an email (contains @), we need to find the actual Stripe customer ID
    if (customerId.includes('@')) {
      // Search for customers by email
      const customers = await stripe.customers.list({
        email: customerId,
        limit: 1,
      });
      
      if (customers.data.length > 0) {
        // Use the first customer found with this email
        customerId = customers.data[0].id;
      } else {
        // If no customer found, create one
        const customer = await stripe.customers.create({
          email: customerId,
        });
        customerId = customer.id;
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return portalSession.url;
  } catch (e) {
    console.error('Error creating customer portal:', e);
    return null;
  }
};

// This is used to get the user checkout session and populate the data so we get the planId the user subscribed to
export const findCheckoutSession = async (sessionId: string) => {
  try {
    console.log(`Finding checkout session with ID: ${sessionId}`);
    const stripe = getStripeInstance();

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    console.log(`Session found: ${session.id}, status: ${session.status}`);
    return session;
  } catch (e) {
    console.error(`Error finding checkout session ${sessionId}:`, e);
    console.error("Error details:", {
      message: e.message,
      stack: e.stack,
      code: e.code,
      type: e.type,
      param: e.param
    });
    return null;
  }
};
