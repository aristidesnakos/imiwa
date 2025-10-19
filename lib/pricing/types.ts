export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyProductId: string;
  annualProductId: string;
  features: string[];
  isFeatured?: boolean;
  badge?: string;
}

export interface PricingState {
  isAnnual: boolean;
  isFreeTrial: boolean;
}