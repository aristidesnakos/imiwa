import configFile from "@/config";
import { findCheckoutSession, getStripeInstance } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sendSubConfirmEmail } from "@/lib/resend";
import Stripe from "stripe";

const stripe = getStripeInstance();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const headerObj = await headers();
    const signature = headerObj.get("stripe-signature");

    let eventType;
    let event;
    // Create a service role client for operations that require elevated permissions
    const serviceClient = createServiceClient();

    // verify Stripe event is legit
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    eventType = event.type;

    try {
      switch (eventType) {
        case "checkout.session.completed": {
          const stripeObject = event.data.object as Stripe.Checkout.Session;
          console.log('[Webhook] Processing checkout.session.completed:', stripeObject.id);

          const session = await findCheckoutSession(stripeObject.id);

          if (!session) {
            console.error('[Webhook] Session not found:', stripeObject.id);
            break;
          }

          const customerId = session.customer;
          console.log('[Webhook] Customer ID:', customerId);
          
          // Safely extract price ID
          let priceId;
          if (session.line_items?.data && session.line_items.data.length > 0 && session.line_items.data[0]?.price?.id) {
            priceId = session.line_items.data[0].price.id;
          } else {
            console.error('Could not extract price ID from line items:', session.line_items);
            break;
          }
          
          const customerEmail = stripeObject.customer_details?.email;
          let profileId = stripeObject.client_reference_id;

          // If we don't have a customerId but we have an email, use the email as the identifier
          if (!customerId && customerEmail) {
            // Using email as identifier
          } else if (!priceId || !customerEmail) {
            console.error('Missing required data:', { priceId, customerEmail });
            break;
          }

          const plan = configFile.stripe.plans.find((p) => p.priceId === priceId);
          if (!plan) {
            console.error('Plan not found for price:', priceId);
            break;
          }

          // Only retrieve customer if we have a customerId
          if (customerId) {
            // Ensure customerId is a string before retrieving customer
            if (typeof customerId !== 'string') {
              console.error('Invalid customer ID type:', typeof customerId);
              break;
            }

            const customer = await stripe.customers.retrieve(customerId);
            if (customer.deleted) {
              console.error('Customer has been deleted:', customerId);
              break;
            }
          }

          // Find or create user - use service client to bypass RLS
          if (!profileId) {
            // Check if user exists by email
            const { data: existingProfile } = await serviceClient
              .from('profiles')
              .select('id, email')
              .eq('email', customerEmail)
              .single();

            if (existingProfile) {
              profileId = existingProfile.id;
            } else {
              // Instead of creating a user with admin privileges, we'll create a profile
              // and handle the user creation separately or via a sign-up flow
              const { data: newProfile, error: insertError } = await serviceClient
                .from('profiles')
                .insert({
                  email: customerEmail,
                  customer_id: customerId || customerEmail, // Use email as customer_id if no Stripe customer ID
                  price_id: priceId,
                  has_access: true, // Grant access for new profile on successful checkout
                  updated_at: new Date().toISOString()
                })
                .select('id')
                .single();

              if (insertError) {
                console.error('Error creating profile:', insertError);
                break;
              }

              profileId = newProfile?.id;

              // Send a purchase confirmation email for new profile
              try {
                // Determine plan price based on priceId
                const planPrice = priceId === 'price_1S7bXaLWOx2Oj7mbeOqcQhfZ' ? '$10/month' : '$99/year';

                const emailVariables = {
                  plan_price: planPrice,
                  company_name: configFile.appName,
                  current_year: new Date().getFullYear(),
                  email_signature: configFile.resend.fromAdmin.split('<')[0].trim(),
                  app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://llanai.com'
                };

                console.log('[Webhook] Sending confirmation email to new user:', customerEmail);

                await sendSubConfirmEmail({
                  to: customerEmail,
                  subject: `Welcome to ${configFile.appName}!`,
                  htmlTemplate: 'stripe/purchase-confirmation',
                  replyTo: configFile.resend.supportEmail,
                  emailVariables
                });

                console.log('[Webhook] Confirmation email sent successfully to new user');
              } catch (error) {
                console.error('[Webhook] Email sending failed for new user:', error, 'to:', customerEmail);
              }

              // Skip the rest of the flow since we've created the profile
              break;
            }
          }

          // Update profile with new subscription data - use service client to bypass RLS
          console.log('[Webhook] Updating profile:', {
            profileId,
            customerId: customerId || customerEmail,
            priceId,
            has_access: true
          });

          const { error: updateError } = await serviceClient
            .from('profiles')
            .update({
              customer_id: customerId || customerEmail,
              price_id: priceId,
              has_access: true, // Grant access on successful checkout
              updated_at: new Date().toISOString()
            })
            .eq('id', profileId);

          if (updateError) {
            console.error('[Webhook] Error updating profile:', updateError);
            break;
          }

          console.log('[Webhook] Successfully updated profile with has_access=true');
          
          // Log successful payment for analytics (optional)
          console.log('[Webhook] Payment completed:', {
            sessionId: stripeObject.id,
            userId: profileId,
            customerEmail,
            priceId,
            planName: plan.name
          });
          

          // Send confirmation email
          try {
            // Determine plan price based on priceId
            const planPrice = priceId === 'price_1S7bXaLWOx2Oj7mbeOqcQhfZ' ? '$10/month' : '$99/year';

            const emailVariables = {
              plan_price: planPrice,
              company_name: configFile.appName,
              current_year: new Date().getFullYear(),
              email_signature: configFile.resend.fromAdmin.split('<')[0].trim(),
              app_url: process.env.NEXT_PUBLIC_APP_URL || 'https://llanai.com'
            };

            console.log('[Webhook] Sending confirmation email to:', customerEmail);

            await sendSubConfirmEmail({
              to: customerEmail,
              subject: `Welcome to ${configFile.appName}!`,
              htmlTemplate: 'stripe/purchase-confirmation',
              replyTo: configFile.resend.supportEmail,
              emailVariables
            });

            console.log('[Webhook] Confirmation email sent successfully');
          } catch (error) {
            console.error('[Webhook] Email sending failed:', error, 'to:', customerEmail);
          }

          break;
        }

        case "checkout.session.expired": {
          // User didn't complete the transaction
          // You don't need to do anything here, by you can send an email to the user to remind him to complete the transaction, for instance
          break;
        }

        case "customer.subscription.updated": {
          // The customer might have changed the plan (higher or lower plan, cancel soon etc...)
          // You don't need to do anything here, because Stripe will let us know when the subscription is canceled for good (at the end of the billing cycle) in the "customer.subscription.deleted" event
          // You can update the user data to show a "Cancel soon" badge for instance
          break;
        }

        case "customer.subscription.paused": {
          // The customer's subscription has been paused
          // Revoke access to the product while paused
          const stripeObject = event.data.object as Stripe.Subscription;
          const customerId = stripeObject.customer;
          
          console.log('[Webhook] Processing customer.subscription.paused for customer:', customerId);
          
          // Update profile to revoke access - use service client to bypass RLS
          let { data: profileByCustomerId, error: updateError } = await serviceClient
            .from("profiles")
            .update({ 
              has_access: false,
              updated_at: new Date().toISOString()
            })
            .eq("customer_id", customerId)
            .select();

          if (!profileByCustomerId || profileByCustomerId.length === 0) {
            // If customer is a string (not an object), try to find customer to get email
            if (typeof customerId === 'string') {
              try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                  const activeCustomer = customer as Stripe.Customer;
                  if (activeCustomer.email) {
                    // Try to find profile by email - use service client to bypass RLS
                    const { data: updatedProfile, error: emailUpdateError } = await serviceClient
                      .from("profiles")
                      .update({ 
                        has_access: false,
                        updated_at: new Date().toISOString()
                      })
                      .eq("customer_id", activeCustomer.email)
                      .select();
                    
                    if (updatedProfile && updatedProfile.length > 0) {
                      console.log('[Webhook] Successfully revoked access for paused subscription (found by email):', activeCustomer.email);
                    } else if (emailUpdateError) {
                      console.error('[Webhook] Error updating profile by email:', emailUpdateError);
                    } else {
                      console.error('[Webhook] No profile found for customer email:', activeCustomer.email);
                    }
                  }
                }
              } catch (error) {
                console.error('[Webhook] Error retrieving customer for paused subscription:', error);
              }
            }
          } else {
            console.log('[Webhook] Successfully revoked access for paused subscription:', customerId);
          }
          
          break;
        }

        case "customer.subscription.resumed": {
          // The customer's subscription has been resumed after being paused
          // Restore access to the product
          const stripeObject = event.data.object as Stripe.Subscription;
          const customerId = stripeObject.customer;
          
          console.log('[Webhook] Processing customer.subscription.resumed for customer:', customerId);
          
          // Update profile to restore access - use service client to bypass RLS
          let { data: profileByCustomerId, error: updateError } = await serviceClient
            .from("profiles")
            .update({ 
              has_access: true,
              updated_at: new Date().toISOString()
            })
            .eq("customer_id", customerId)
            .select();

          if (!profileByCustomerId || profileByCustomerId.length === 0) {
            // If customer is a string (not an object), try to find customer to get email
            if (typeof customerId === 'string') {
              try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                  const activeCustomer = customer as Stripe.Customer;
                  if (activeCustomer.email) {
                    // Try to find profile by email - use service client to bypass RLS
                    const { data: updatedProfile, error: emailUpdateError } = await serviceClient
                      .from("profiles")
                      .update({ 
                        has_access: true,
                        updated_at: new Date().toISOString()
                      })
                      .eq("customer_id", activeCustomer.email)
                      .select();
                    
                    if (updatedProfile && updatedProfile.length > 0) {
                      console.log('[Webhook] Successfully restored access for resumed subscription (found by email):', activeCustomer.email);
                    } else if (emailUpdateError) {
                      console.error('[Webhook] Error updating profile by email:', emailUpdateError);
                    } else {
                      console.error('[Webhook] No profile found for customer email:', activeCustomer.email);
                    }
                  }
                }
              } catch (error) {
                console.error('[Webhook] Error retrieving customer for resumed subscription:', error);
              }
            }
          } else {
            console.log('[Webhook] Successfully restored access for resumed subscription:', customerId);
          }
          
          break;
        }

        case "customer.subscription.trial_will_end": {
          // Optional: Send reminder email that trial is ending soon
          const stripeObject = event.data.object as Stripe.Subscription;
          const customerId = stripeObject.customer;
          console.log('[Webhook] Trial ending soon for customer:', customerId);
          // TODO: Implement reminder email if desired
          break;
        }

        case "customer.subscription.deleted": {
          // The customer subscription stopped (trial ended without payment or canceled)
          // Revoke access to the product
          const stripeObject: Stripe.Subscription = event.data
            .object as Stripe.Subscription;
          const subscription = await stripe.subscriptions.retrieve(
            stripeObject.id
          );

          const customerId = subscription.customer;

          // First try to find by Stripe customer ID - use service client to bypass RLS
          let { data: profileByCustomerId } = await serviceClient
            .from("profiles")
            .update({ has_access: false })
            .eq("customer_id", customerId)
            .select();

          if (!profileByCustomerId || profileByCustomerId.length === 0) {
            // If customer is a string (not an object), try to find customer to get email
            if (typeof customerId === 'string') {
              try {
                const customer = await stripe.customers.retrieve(customerId);
                if (!customer.deleted) {
                  // Type assertion to tell TypeScript this is a Customer, not a DeletedCustomer
                  const activeCustomer = customer as Stripe.Customer;
                  if (activeCustomer.email) {
                    // Try to find profile by email - use service client to bypass RLS
                    await serviceClient
                      .from("profiles")
                      .update({ has_access: false })
                      .eq("customer_id", activeCustomer.email);
                  }
                }
              } catch (error) {
                console.error('Error retrieving customer:', error);
              }
            }
          }
          break;
        }

        case "invoice.paid": {
          // Customer just paid an invoice (for instance, a recurring payment for a subscription)
          // Grant access to the product
          const stripeObject: Stripe.Invoice = event.data
            .object as Stripe.Invoice;
          const priceId = stripeObject.lines.data[0].price.id;
          const customerId = stripeObject.customer;
          
          // Get customer email if available
          let customerEmail;
          if (typeof customerId === 'string') {
            try {
              const customer = await stripe.customers.retrieve(customerId);
              if (!customer.deleted) {
                // Type assertion to tell TypeScript this is a Customer, not a DeletedCustomer
                const activeCustomer = customer as Stripe.Customer;
                customerEmail = activeCustomer.email;
              }
            } catch (error) {
              console.error('Error retrieving customer:', error);
            }
          }

          // Find profile where customer_id equals the customerId (in table called 'profiles')
          // Use service client to bypass RLS
          let { data: profile } = await serviceClient
            .from("profiles")
            .select("*")
            .eq("customer_id", customerId)
            .single();
            
          // If no profile found by customer ID, try to find by email
          if (!profile && customerEmail) {
            const { data: profileByEmail } = await serviceClient
              .from("profiles")
              .select("*")
              .eq("customer_id", customerEmail)
              .single();
              
            if (profileByEmail) {
              profile = profileByEmail;
              // Update the profile with the actual Stripe customer ID
              await serviceClient
                .from("profiles")
                .update({ customer_id: customerId })
                .eq("customer_id", customerEmail);
            }
          }
          
          if (!profile) {
            console.error('No profile found for customer:', customerId);
            break;
          }

          // Make sure the invoice is for the same plan (priceId) the user subscribed to
          if (profile.price_id !== priceId) {
            console.error('Price ID mismatch:', profile.price_id, priceId);
            break;
          }

          // Grant the profile access to your product. It's a boolean in the database, but could be a number of credits, etc...
          // Use service client to bypass RLS
          await serviceClient
            .from("profiles")
            .update({ has_access: true })
            .eq("id", profile.id);

          break;
        }

        case "invoice.payment_failed":
          // A payment failed (for instance the customer does not have a valid payment method)
          // Revoke access to the product
          // OR wait for the customer to pay (more friendly):
          //      - Stripe will automatically email the customer (Smart Retries)
          //      - We will receive a "customer.subscription.deleted" when all retries were made and the subscription has expired

          break;

        default:
        // Unhandled event type
      }
    } catch (e) {
      console.error("Stripe webhook error: ", e);
      console.error("Error details: ", {
        message: e.message,
        stack: e.stack,
        eventType: eventType || 'unknown'
      });
      return NextResponse.json({ error: e.message }, { status: 500 });
    }

    return NextResponse.json({});
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
