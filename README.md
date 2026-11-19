# Summit Roofing: a Whop Websites template for roofing companies

**Live:** https://summit-roofing-shubh.whop.site

A reusable website for US roofing companies, built on **Whop Websites** (TanStack Start on Cloudflare, deployed with the Whop CLI) and **Whop Payments**. It covers the high-ticket roofing flow:

**estimate request → contact on the account → inspection or deposit → card saved on file → final balance invoice**

To rebrand it for another roofer, edit `src/config/site.ts` (name, services, service area, reviews, prices) and run `setup.sh`. No component changes are needed.

## Whop features used

| Requirement | Where | Whop feature |
|---|---|---|
| Services, service area, financing, reviews, contact | `src/components/HomePage.tsx` + `src/config/site.ts` | — |
| $149 inspection, $500 deposit, $450 flat-rate repair | created by `setup.sh` | Products + variants (`whop products create`, `whop variants create`) |
| Hosted checkout with Apple Pay / Google Pay | `src/components/PlanCheckout.tsx` | `Checkout` + `CheckoutElement` + `ExpressCheckoutElement` (both render "Powered by Whop") |
| Financing (Klarna, Afterpay, Splitit…) | automatic | Shown inside Whop checkout for approved merchants. No custom card form. |
| Card on file at deposit | `src/components/CardOnFile.tsx` → `POST /api/card-setup` | `Payments mode="setup"` + `PaymentElement` + **`BrandingElement`** → `POST /setup_intents` |
| Final balance billing | `/admin` → `POST /api/final-invoice` | Invoices API: `POST /invoices`, then `/issue` (charge the saved card) or `/send` (email for manual payment) |
| "Request an Estimate" → lead | `src/components/EstimateForm.tsx` → `POST /api/leads` | `POST /members` (see note below) |
| Custom pixel events | `src/lib/whop-track.ts` | `whop.track`: `estimate_requested`, `service_viewed`, `deposit_started` |

**Note on leads:** Whop retired `POST /leads` in November 2026. It now returns `410 Gone` with the message: *"Creating leads is no longer available. To add someone who hasn't bought anything yet, call POST /api/v1/members."* The estimate form follows that guidance. Each request adds the homeowner to the business as a member with no access, and they appear under **Customers** in the dashboard. The quote details (service, phone, address, message) are written to the app logs (`whop apps logs <app_id> --query leads`).

### Pixel events

| Event | Fires when | Dedupe `event_id` |
|---|---|---|
| `service_viewed` | a service card is 50% on screen (once per service) | `service:<key>` |
| `deposit_started` | the Project Deposit tab is opened | — |
| `estimate_requested` | the estimate form succeeds | the member ID |

Page views and checkout events are tracked automatically on whop.site.

## Project layout

```
src/
  config/site.ts          ← everything client-specific lives here
  components/             ← page sections, checkout, card-on-file, admin panel
  routes/index.tsx        ← home page (client-rendered: Payment Elements need the browser)
  routes/admin.tsx        ← office tool to bill the final balance
  routes/api/*.ts         ← server routes: leads, card-setup, final-invoice
  server/whop.ts          ← Whop REST calls (server-only, reads app secrets)
  lib/whop-track.ts       ← whop.track wrapper
setup.sh                  ← one-time setup: product, prices, .env, app secrets
```

## Set up for a new client

```bash
whop apps init --app_type website --name "Client Roofing" --domain client-roofing
# copy src/ and setup.sh from this repo into the new folder, then:
bash setup.sh        # creates the product + 3 prices, writes .env, stores secrets
whop apps deploy
```

`setup.sh` asks for a business API key (Dashboard → Developer → API keys) with member, payment, setup-intent and invoice permissions. It stores the key with `whop apps secrets set`, never in a file, and prints the `/admin` password.

## How the money flow works

1. **Inspection or flat-rate repair:** a single `<Checkout plan=…>` payment.
2. **Deposit:** pay through Checkout, then save a card in `<Payments mode="setup">` with the required `BrandingElement`. The server turns the confirmation token into a setup intent (`sint_…`). 3-D Secure is finished in the browser with `whop.payments.handleNextAction`.
3. **Final balance:** the office opens `/admin`, enters the `sint_…` reference and the balance, then chooses one of two options:
   - **Charge saved card:** creates an invoice with the saved `payment_method_id` and issues it, which charges the card.
   - **Email invoice:** sends the homeowner a Whop payment link, where financing can apply.

## Security

- Card details only ever go to Whop's Payment Elements. No route accepts card data.
- The API key and admin token are app secrets, not files. `.env` holds only public IDs.
- `/api/final-invoice` requires the `X-Admin-Token` header to match `ADMIN_TOKEN`.
- If a client's site has several office users, put real auth in front of `/admin`.
- The reviews in `site.ts` are placeholders. Replace them with the client's real reviews.
