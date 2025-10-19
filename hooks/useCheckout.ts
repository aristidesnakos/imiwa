import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface CheckoutOptions {
  priceId: string;
  mode?: "payment" | "subscription";
  successUrl?: string;
  cancelUrl?: string;
}

export const useCheckout = () => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const startCheckout = async (options: CheckoutOptions & { planId?: string }) => {
    const {
      priceId,
      mode = "subscription",
      successUrl = `${window.location.origin}/settings?success=true`,
      cancelUrl = `${window.location.origin}/settings?canceled=true`,
      planId
    } = options;

    try {
      if (planId) {
        setIsLoading(planId);
      }

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to sign in if not authenticated
        router.push("/signin");
        return;
      }

      // Create checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          mode,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsLoading(null);
    }
  };

  return {
    startCheckout,
    isLoading,
  };
};