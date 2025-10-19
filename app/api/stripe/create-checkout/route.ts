import { createCheckout } from "@/lib/stripe";
import { createServerComponentClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// This function is used to create a Stripe Checkout Session (one-time payment or subscription)
// It's called by the <ButtonCheckout /> component
// Users must be authenticated. It will prefill the Checkout data with their email and/or credit card (if any)
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.priceId) {
    return NextResponse.json(
      { error: "Price ID is required" },
      { status: 400 }
    );
  } else if (!body.successUrl || !body.cancelUrl) {
    return NextResponse.json(
      { error: "Success and cancel URLs are required" },
      { status: 400 }
    );
  } else if (!body.mode) {
    return NextResponse.json(
      {
        error:
          "Mode is required (either 'payment' for one-time payments or 'subscription' for recurring subscription)",
      },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerComponentClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log("[Checkout] User:", user?.id, user?.email);

    const { priceId, mode, successUrl, cancelUrl } = body;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    console.log("[Checkout] Profile data:", {
      email: data?.email,
      customer_id: data?.customer_id,
      has_existing_customer: !!data?.customer_id
    });

    // Only pass customerId if it exists and is not 'NULL' string
    const checkoutParams: any = {
      priceId,
      mode,
      successUrl,
      cancelUrl,
      // If user is logged in, it will pass the user ID to the Stripe Session so it can be retrieved in the webhook later
      clientReferenceId: user?.id,
      user: {
        email: data?.email || user?.email,
      },
      // If you send coupons from the frontend, you can pass it here
      // couponId: body.couponId,
    };

    // Only add customerId if it exists and is not 'NULL'
    if (data?.customer_id && data.customer_id !== 'NULL') {
      checkoutParams.user.customerId = data.customer_id;
    }

    console.log("[Checkout] Creating session with params:", checkoutParams);

    const stripeSessionURL = await createCheckout(checkoutParams);

    return NextResponse.json({ url: stripeSessionURL });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
