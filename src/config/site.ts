// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH FOR THIS TEMPLATE.
// Swap the company name, services, service area, reviews, and pricing here.
// Nothing in components/ or App.tsx should need to change for a new client.
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceKey = "repair" | "replacement" | "inspection";

export interface Service {
  key: ServiceKey;
  title: string;
  blurb: string;
  bullets: string[];
  startingAt: string;
}

export interface PlanConfig {
  /** Whop plan ID (plan_...). Read from env so each client can point at their own plans. */
  planId: string;
  /** Shown in the UI. Keep in sync with the price set on the Whop plan. */
  label: string;
  priceDisplay: string;
  amountCents: number;
  kind: "one_time" | "deposit" | "flat_rate";
  description: string;
}

export const site = {
  companyName: "Summit Roofing Co.",
  tagline: "Honest roofs, fair prices, and a crew that shows up on time.",
  phone: "(555) 014-2290",
  email: "estimates@summitroofing.example",
  licenseLine: "Licensed & insured · Lic. #RC-000000",
  /** Whop business ID that owns leads and payments. */
  whopCompanyId: import.meta.env.VITE_WHOP_COMPANY_ID ?? "biz_REPLACE_ME",
};

export const services: Service[] = [
  {
    key: "repair",
    title: "Roof Repair",
    blurb: "Leaks, storm damage, flashing, and missing shingles fixed fast.",
    bullets: ["Same-week scheduling", "Leak tracing and flashing repair", "Storm damage documentation"],
    startingAt: "From $450",
  },
  {
    key: "replacement",
    title: "Full Replacement",
    blurb: "New asphalt or metal roof systems installed by our in-house crew.",
    bullets: ["Architectural shingles and metal", "Ventilation upgrades", "Manufacturer-backed warranties"],
    startingAt: "Free written estimate",
  },
  {
    key: "inspection",
    title: "Roof Inspection",
    blurb: "A full written report with photos, so you know exactly what you're dealing with.",
    bullets: ["Drone or ladder inspection", "Photo report within 24 hours", "Credited toward your project"],
    startingAt: "$149",
  },
];

export const serviceArea = {
  headline: "Serving the greater metro area",
  intro: "We cover the following cities and surrounding counties. Not sure if you're covered? Ask us.",
  cities: ["Springfield", "Riverside", "Fairview", "Maple Grove", "Oakdale", "Lakewood"],
};

export const financing = {
  headline: "Pay over time, on approved credit",
  body: "Qualified homeowners can split larger projects into monthly payments at checkout. Options appear automatically when you're approved.",
  providers: ["Klarna", "Afterpay", "Splitit"],
  disclaimer: "Financing subject to approval by the lender. Terms vary.",
};

// PLACEHOLDER REVIEWS for the demo only. Replace with the client's real, verifiable reviews
// (e.g. copied with permission from their Google Business profile) before going live.
export const reviews = {
  averageRating: 4.9,
  count: 412,
  items: [
    { name: "Dana R.", city: "Riverside", text: "Found a leak three other companies missed. Clean crew, fair quote, great communication." },
    { name: "Marcus T.", city: "Oakdale", text: "Full replacement done in two days. They cleaned up the yard better than they found it." },
    { name: "Priya S.", city: "Fairview", text: "The inspection report had photos of everything. Made the insurance claim painless." },
  ],
};

/**
 * Plans. Inspection and deposit are one-time; flat-rate is a fixed-price service.
 * The planId comes from env (VITE_WHOP_PLAN_*) so the template can be pointed at any account.
 */
export const plans: Record<"inspection" | "deposit" | "flatRate", PlanConfig> = {
  inspection: {
    planId: import.meta.env.VITE_WHOP_PLAN_INSPECTION ?? "plan_REPLACE_ME",
    label: "Roof Inspection",
    priceDisplay: "$149",
    amountCents: 14900,
    kind: "one_time",
    description: "Full inspection with photo report. Credited toward a project within 30 days.",
  },
  deposit: {
    planId: import.meta.env.VITE_WHOP_PLAN_DEPOSIT ?? "plan_REPLACE_ME",
    label: "Project Deposit",
    priceDisplay: "$500",
    amountCents: 50000,
    kind: "deposit",
    description: "Reserves your crew date. Applied to your final invoice. Your card is saved for the balance.",
  },
  flatRate: {
    planId: import.meta.env.VITE_WHOP_PLAN_FLAT_RATE ?? "plan_REPLACE_ME",
    label: "Flat-Rate Shingle Repair",
    priceDisplay: "$450",
    amountCents: 45000,
    kind: "one_time",
    description: "Up to 3 square feet of shingle repair, materials and labor included.",
  },
};
