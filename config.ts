import { ConfigProps } from "./types/config";

const config = {
  appName: "Your App Name",
  appDescription: "Your app description here.",
  keywords: ["nextjs", "starter", "template"],
  domainName: "www.michikanji.com",
  crisp: {
    // Crisp website ID. Leave empty if not using Crisp
    id: "",
    onlyShowOnRoutes: ["/"],
  },
  stripe: {
    plans: [],
  },
  resend: {
    fromNoReply: `Support <support@michikanji.com>`,
    fromAdmin: `Admin <admin@michikanji.com>`,
    supportEmail: "support@michikanji.com",
    forwardRepliesTo: "admin@michikanji.com",
  },
  auth: {
    // REQUIRED — the path to log in users
    loginUrl: "/signin",
    // REQUIRED — the path to redirect users after successful login
    callbackUrl: "/dashboard",
  }
} as ConfigProps;

export default config;