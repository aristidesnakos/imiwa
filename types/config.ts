export interface ConfigProps {
  appName: string;
  appDescription: string;
  domainName: string;
  keywords: string[];
  crisp: {
    id?: string;
    onlyShowOnRoutes?: string[];
  };
  stripe: {
    plans: {
      isFeatured?: boolean;
      priceId: string;
      name: string;
      description?: string;
      price: number;
      priceAnchor?: number;
      features: {
        name: string;
      }[];
    }[];
  };
  resend: {
    fromNoReply: string;
    fromAdmin: string;
    supportEmail?: string;
    forwardRepliesTo?: string;
  };
  newsletter: {
    /** 0 = Sunday … 6 = Saturday. The day a broadcast is scheduled for. */
    sendDay: number;
    /** Days before the send that the episode must be written and imported. */
    writeLeadDays: number;
  };
  auth: {
    loginUrl: string;
    callbackUrl: string;
  };
}