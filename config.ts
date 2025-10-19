import { ConfigProps } from "./types/config";
import { PRICING_PLANS } from "./lib/pricing/constants";

const config = {
  appName: "Your App Name",
  appDescription: "Your app description here.",
  keywords: ["nextjs", "starter", "template"],
  domainName: "yourdomain.com",
  crisp: {
    // Crisp website ID. Leave empty if not using Crisp
    id: "",
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    plans: PRICING_PLANS.map(plan => ({
      priceId: plan.priceId,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      interval: plan.interval,
      priceMonthly: 'priceMonthly' in plan ? plan.priceMonthly : undefined,
      features: plan.features.map(feature => ({ name: feature })),
      isFeatured: 'isFeatured' in plan ? plan.isFeatured : false,
      badge: 'badge' in plan ? plan.badge : undefined,
    })),
  },
  resend: {
    fromNoReply: `Support <support@yourdomain.com>`,
    fromAdmin: `Admin <admin@yourdomain.com>`,
    supportEmail: "support@yourdomain.com",
    forwardRepliesTo: "admin@yourdomain.com",
  },
  auth: {
    // REQUIRED — the path to log in users
    loginUrl: "/signin",
    // REQUIRED — the path to redirect users after successful login
    callbackUrl: "/dashboard",
  }
} as ConfigProps;

export default config;