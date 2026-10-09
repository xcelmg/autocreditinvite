export const site = {
  name: "My Auto Credit",
  short: "My Auto Credit",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://autocreditinvite.com",
  tagline: "Your auto credit application, already started.",
  description:
    "Enter the Invitation Code from your mailer, confirm it's you and finish a short credit application with the participating dealership in a few minutes. A specialist texts you with next steps.",
  /** Where privacy and terms requests go. Set NEXT_PUBLIC_SUPPORT_EMAIL to override. */
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@updash.com",
};

/** Brand colours for the places CSS variables can't reach (favicon, apple icon, OG image). */
export const BRAND = {
  ink: "#16181d",
  blue: "#1d5ad6",
  blueDeep: "#163f9c",
  red: "#d60000",
  canvas: "#f5f7fa",
  paper: "#ffffff",
};
