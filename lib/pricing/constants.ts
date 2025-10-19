export const PRODUCT_IDS = {
  amateur: "amateur", // Monthly plan
  writer: "writer",   // Annual plan
} as const;

export const STRIPE_PRICE_IDS = {
  amateur: "price_1S7bXaLWOx2Oj7mbeOqcQhfZ", // Monthly: $10/month
  writer: "price_1S7bYfLWOx2Oj7mblVox9Xwz",   // Annual: $99/year
} as const;

export const CHECKOUT_LINKS = {
  amateur: "https://checkout.llanai.com/b/7sY14odu41XG6rW61b0co03", // With 3-day trial
  amateur_direct: "https://checkout.llanai.com/b/bJe28s2PqgSAg2wexH0co06", // No trial - for expired trial users
  writer: "https://checkout.llanai.com/b/7sY14odu41XG6rW61b0co03", // Writer plan (no trial)
} as const;

export const PRICING_PLANS = [
  {
    id: "amateur",
    name: "The Amateur",
    description: "Pay monthly, cancel anytime",
    price: 10,
    displayPrice: "$10",
    interval: "/month",
    productId: PRODUCT_IDS.amateur,
    priceId: STRIPE_PRICE_IDS.amateur,
    checkoutLink: CHECKOUT_LINKS.amateur,
    checkoutLinkDirect: CHECKOUT_LINKS.amateur_direct, // For post-trial upgrades
    features: [
      "3-day free trial",
      "Unlimited journal entries",
      "Customized writing tips",
      "100 monthly credits for AI-powered writing feedback",
      "Cancel anytime",
    ],
  },
  {
    id: "writer",
    name: "The Writer",
    description: "Best value for committed learners",
    price: 99,
    displayPrice: "$99",
    interval: "/year",
    productId: PRODUCT_IDS.writer,
    priceId: STRIPE_PRICE_IDS.writer,
    checkoutLink: CHECKOUT_LINKS.writer,
    features: [
      "Everything in Amateur",
      "Save $21 per year (17% off)",
      "Early access to new features",
      "Priority support",
    ],
    isFeatured: true,
    badge: "Save $21",
  },
] as const;

export const calculateMonthlyPrice = (annualPrice: number) => {
  return Math.round((annualPrice / 12) * 100) / 100;
};

export const calculateSavings = (monthlyPrice: number, annualPrice: number) => {
  const monthlyCost = monthlyPrice * 12;
  return Math.round(((monthlyCost - annualPrice) / monthlyCost) * 100);
};