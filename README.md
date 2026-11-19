# Roofing Website Template on Whop

A reusable website for US roofing companies, built on Whop Websites and Whop Payments. It covers the full high-ticket flow:

**estimate request → lead → inspection or deposit → card saved on file → final balance invoice**

To rebrand it for a new client, edit `src/config/site.ts` and `.env`. No component changes are needed.

## Features

| Requirement | Where | Whop feature |
|---|---|---|
| Services, service area, financing, reviews, contact sections | `src/App.tsx` + `src/config/site.ts` | — |
| $149 inspection, $450 flat-rate repair, $500 deposit | `src/config/site.ts` (`plans`) + `VITE_WHOP_PLAN_*` | Plans |
| Hosted checkout with Apple Pay / Google Pay | `src/components/PlanCheckout.tsx` | `Checkout` + `CheckoutElement` + `ExpressCheckoutElement` |
| Card on file at deposit checkout | `src/components/CardOnFile.tsx` → `POST /api/card-setup` | `Payments mode="setup"` + `PaymentElement` + **`BrandingElement`** → `setupIntents.create` |
| Final balance billing | `/admin` → `POST /api/final-invoice` | Invoices API: `invoices.create` then `issue` (auto-charge the saved card) or `send` (email for manual payment) |
| Request an Estimate form → lead | `src/components/EstimateForm.tsx` → `POST /api/leads` | Leads API (`POST /leads`) |
| Custom pixel events | `src/lib/whop-track.ts` | `whop.track`: `estimate_requested`, `service_viewed`, `deposit_started` |
| Financing (Klarna, Afterpay, Splitit…) | automatic | Shown inside Whop checkout for approved merchants. There's no custom card form. |

### How the money flow works

1. **Inspection or flat-rate repair:** a single `<Checkout plan=…>` payment.
2. **Deposit (two steps):** the homeowner pays $500 through Checkout, then saves a card in a `<Payments mode="setup">` form. The server turns the confirmation token into a setup intent (`sint_…`). If 3-D Secure is needed, the browser finishes it with `whop.payments.handleNextAction`.
3. **Final balance:** when the job is done, the office opens `/admin`, enters the `sint_…` reference and the balance, and chooses one of two options:
   - **Charge saved card:** creates a draft invoice with the saved `payment_method_id`, then issues it, which charges the card off-session.
   - **Email invoice:** creates the invoice with no saved method and sends it. The homeowner pays on Whop checkout, where financing can apply.

   Fulfill from the `payment.succeeded` webhook, not from the API response or the browser.

### Pixel events

| Event | Fires when | Dedupe `event_id` |
|---|---|---|
| `service_viewed` | a service card is 50% on screen (once per service) | `service:<key>` |
| `deposit_started` | the Project Deposit tab is opened | — |
| `estimate_requested` | the lead is created successfully | the lead ID |

Page views and checkout events are tracked automatically on Whop-hosted domains. To verify, go to Dashboard → Websites / Pixel. Events show up about a minute after they fire.

## Setup

```bash
cp .env.example .env     # fill in IDs and keys (see comments in the file)
npm install
npm run dev              # site + /api routes on http://localhost:5173
```

In the Whop dashboard (use the **sandbox** dashboard for testing), create:

- A product, plus three one-time plans priced at $149, $450, and $500. Put their `plan_` IDs in `VITE_WHOP_PLAN_*`.
- A product for final-balance invoices. Put its ID in `WHOP_FINAL_BALANCE_PRODUCT_ID`.
- An API key with lead create, `payment:charge`, `invoice:create`, and `plan:create`. Set it as `WHOP_API_KEY`, which is server-only.
- A long random `ADMIN_TOKEN`.

Keep prices in `site.ts` in sync with the plans. The UI only displays them. The charge comes from the plan.

## Deploying

The Whop CLI scaffolds and deploys websites:

```bash
curl -fsSL https://whop.com/install.sh | sh
whop                                   # sign in, pick the business
whop apps init --app_type website --name "Summit Roofing" --domain summit-roofing
# copy src/, api/, index.html, and the deps from package.json into the scaffold
# add the whop() plugin from @whop/cli/vite to vite.config.ts (the scaffold does this)
whop apps dev                          # injects WHOP_APP_ID + a short-lived WHOP_API_KEY
whop apps deploy
```

The CLI scaffold is a TanStack project. Mount the handlers in `api/routes.ts` (`routes` table: `POST /api/leads`, `/api/card-setup`, `/api/final-invoice`) as its server routes. They're plain `Request → Response` functions, so this is a thin adapter. `vite.config.ts` contains the equivalent adapter for local dev. Set the remaining secrets (`WHOP_COMPANY_ID`, `WHOP_FINAL_BALANCE_PRODUCT_ID`, `ADMIN_TOKEN`) as app secrets.

**Domain:** the current quickstart describes sites going live at `<name>.whop.site` or a custom domain. Use whichever domain the CLI assigns.

**Apple Pay / Google Pay:** wallet buttons render only on a domain with Apple Pay enabled. whop.com is pre-approved. For any other domain, register it with the Domains API (`paymentMethodDomains` in the SDK).

**Sandbox:** set `WHOP_ENVIRONMENT=sandbox` and `VITE_WHOP_ENVIRONMENT=sandbox`. The docs say sandbox Elements are not yet generally available, and the CLI acts on production. If sandbox isn't enabled on your account, run test checkouts against production test plans.

## Verification status

Checked against `@whop/elements-react` 1.10.0, `@whop/elements` 1.10.0, `@whop/sdk` 2.8.1, and docs.whop.com (Nov 2026):

- ✅ `npm run typecheck` and `npm run build` pass. Every Elements component, prop, and SDK call used here type-checks against the published packages.
- ✅ API routes return correct responses for bad input (422), missing admin token (401), and unknown routes (404). No server code or secret names appear in the browser bundle.
- ✅ Renders at 1366px and 390px with no horizontal overflow. If the Whop SDK fails to load, the site stays up and checkout shows a call-us fallback with a retry.
- ⚠️ **Leads:** `POST /leads` is in the API reference, but SDK 2.8.1 has no leads resource, so it's a direct REST call. Confirm the body fields (`company_id`, `email`, `name`, `phone`, `metadata`) against the API reference on first live test.
- ⚠️ **Not yet run against live Whop:** no real checkout, setup intent, lead, or invoice has been created, because this needs a Whop account and API key.

## Before pitching to a real client

- Replace the placeholder reviews in `site.ts` with the client's real reviews.
- Replace the license line, phone number, cities, and prices.
- Put real auth in front of `/admin` and `/api/final-invoice` if more than one person in the office will use it.
