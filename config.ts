import { ConfigProps } from "./types/config";

const config = {
  appName: "MichiKanji",
  appDescription: "Learn Japanese kanji with interactive stroke order diagrams. Master JLPT N5, N4, N3, N2, and N1 kanji with animated guides.",
  keywords: ["japanese", "kanji", "stroke order", "jlpt", "learning", "dictionary"],
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
    fromNoReply: `Support <ari@llanai.com>`,
    fromAdmin: `Admin <ari@llanai.com>`,
    supportEmail: "ari@llanai.com",
    forwardRepliesTo: "ari@llanai.com",
  },
  auth: {
    // REQUIRED — the path to log in users
    loginUrl: "/signin",
    // REQUIRED — the path to redirect users after successful login
    callbackUrl: "/dashboard",
  }
} as ConfigProps;

export default config;