export interface PostalAddress {
  /** The street line, e.g. "10 Main Street". */
  street: string;
  /** The suite, PMB or "#" a mail receiving agency assigns, exactly as it gives it. */
  unit?: string;
  /** City or town. */
  locality: string;
  /** State or province, e.g. "MA". */
  region: string;
  postalCode: string;
  country: string;
}

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
  business: {
    /** The legal entity that operates the site and sends the newsletter. */
    legalName: string;
    /** How that entity is constituted, as a phrase: "a company registered in …". */
    registration: string;
    /**
     * Where post reaches the business. A street address — a private mailbox at
     * a commercial mail receiving agency is fine, a USPS PO Box is not.
     * `null` until one exists; `stories:create-broadcast` refuses to run
     * without it. See lib/business/postal-address.ts.
     */
    postalAddress: PostalAddress | null;
  };
  auth: {
    loginUrl: string;
    callbackUrl: string;
  };
}