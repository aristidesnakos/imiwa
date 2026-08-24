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
  business: {
    /** Registered legal entity. Appears in the privacy policy, ToS and footer. */
    legalName: string;
    /**
     * A valid physical postal address. CAN-SPAM (16 CFR 316.5) requires one in
     * every commercial email, so this is not decorative — it blocks the send.
     */
    postalAddress: string;
    /**
     * The published route for a GDPR/CCPA access or erasure request. A working
     * mechanism is not enough; the address has to be stated somewhere a person
     * can find it.
     */
    privacyEmail: string;
  };
  resend: {
    fromNoReply: string;
    fromAdmin: string;
    supportEmail?: string;
    forwardRepliesTo?: string;
  };
  auth: {
    loginUrl: string;
    callbackUrl: string;
  };
}