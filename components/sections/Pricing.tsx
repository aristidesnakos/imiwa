"use client";

import { PRICING_PLANS } from "@/lib/pricing/constants";
import { PricingCard } from "@/components/pricing/PricingCard";
import { useState } from "react";
import { useUser } from "@/context/user";

const Pricing = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { profile } = useUser();

  // Check if user had a trial but no longer has access (trial expired)
  const customerId = profile?.customer_id;
  const hasAccess = profile?.has_access;
  const isExpiredTrial = !hasAccess && customerId && customerId !== 'NULL' && !customerId.includes('@');

  const handleCheckout = async (plan: typeof PRICING_PLANS[number]) => {
    setIsLoading(plan.id);
    // Use direct checkout link for expired trial users on amateur plan
    const checkoutUrl = isExpiredTrial && plan.id === 'amateur' && 'checkoutLinkDirect' in plan
      ? (plan as any).checkoutLinkDirect
      : plan.checkoutLink;
    window.location.href = checkoutUrl;
  };

  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-lg text-muted-foreground mb-8">
              {isExpiredTrial
                ? "Your trial has ended. Choose a plan to continue learning!"
                : "Start your language learning journey with our simple pricing"}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PRICING_PLANS.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                displayPrice={plan.displayPrice}
                interval={plan.interval}
                isLoading={isLoading === plan.id}
                onCheckout={() => handleCheckout(plan)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;