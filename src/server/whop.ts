// SERVER-ONLY. Imported only from src/routes/api/* handlers, never from components.
// Plain REST calls to the Whop API (current API, Nov 2026). No SDK, so it runs on
// Cloudflare Workers without Node-specific dependencies.
//
// Secrets come from `whop apps secrets set` (hosted) or are injected by `whop apps dev`.
// They are read from process.env, which Workers populate when nodejs_compat is on.

const API = "https://api.whop.com/api/v1";

function env(name: string): string | undefined {
  const v = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
  return v && v.trim() ? v.trim() : undefined;
}

function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing secret ${name}. Set it with: whop apps secrets set --secret ${name}=...`);
  return v;
}

/** A business API key with lead, member, payment and invoice permissions. */
const apiKey = () => env("ROOFING_API_KEY") ?? requireEnv("WHOP_API_KEY");
const accountId = () => env("ROOFING_COMPANY_ID") ?? requireEnv("WHOP_COMPANY_ID");

export class WhopApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    public body: string,
  ) {
    super(`Whop ${path} failed (${status}): ${body.slice(0, 500)}`);
  }
}

async function whop<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new WhopApiError(res.status, `${method} ${path}`, text);
  return (text ? JSON.parse(text) : {}) as T;
}

const idOf = (v: unknown): string | undefined =>
  typeof v === "string" ? v : v && typeof v === "object" && "id" in v ? String((v as { id: unknown }).id) : undefined;

// ── Leads ────────────────────────────────────────────────────────────────────

export interface EstimateInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  service: string;
  message?: string;
  referrer?: string;
}

/**
 * Estimate form → lead on the account.
 * Whop retired POST /leads (410 Gone, Nov 2026). Its replacement, per the API's own error message,
 * is POST /members: the person is added to the business as a member with no access, which is how
 * Whop now represents someone who hasn't bought yet. They appear under Customers in the dashboard.
 */
export async function createLead(input: EstimateInput) {
  const member = await whop<{ id: string }>("POST", "/members", {
    account_id: accountId(),
    email: input.email,
    name: input.name,
  });
  console.log(
    `[leads] estimate request: member=${member.id} service=${input.service}` +
      (input.phone ? ` phone=${input.phone}` : "") +
      (input.address ? ` address=${JSON.stringify(input.address)}` : "") +
      (input.message ? ` message=${JSON.stringify(input.message.slice(0, 300))}` : ""),
  );
  return { leadId: member.id, memberId: member.id };
}

// ── Card on file ─────────────────────────────────────────────────────────────

interface SetupIntent {
  id: string;
  status: string;
  client_secret?: string | null;
  member_id?: string | null;
  member?: { id: string } | null;
  payment_method_id?: string | null;
  payment_method?: { id: string } | null;
}

/** Saves the card collected by <Payments mode="setup"> without charging it. */
export async function saveCardOnFile(args: { confirmationToken: string; email: string; returnUrl?: string; depositPaymentId?: string }) {
  const intent = await whop<SetupIntent>("POST", "/setup_intents", {
    account_id: accountId(),
    confirmation_token: args.confirmationToken,
    email: args.email,
    currency: "usd",
    return_url: args.returnUrl,
    metadata: { purpose: "roof_final_balance", deposit_payment_id: args.depositPaymentId ?? "" },
  });
  return { setupIntentId: intent.id, status: intent.status, clientSecret: intent.client_secret ?? null };
}

// ── Final balance invoice ────────────────────────────────────────────────────

export type CollectionMode = "charge_card_on_file" | "email_for_payment";

/**
 * Bills the remaining balance once the job is done.
 *  - charge_card_on_file: draft carries the saved payment method; /issue charges it right away.
 *  - email_for_payment:   no saved method; /send emails the homeowner a Whop payment link.
 */
export async function billFinalBalance(args: { setupIntentId: string; balanceUsd: number; memo: string; mode: CollectionMode }) {
  const intent = await whop<SetupIntent>("GET", `/setup_intents/${encodeURIComponent(args.setupIntentId)}`);
  const memberId = intent.member_id ?? idOf(intent.member);
  const paymentMethodId = intent.payment_method_id ?? idOf(intent.payment_method);
  if (!memberId) throw new Error(`Setup intent ${intent.id} has no member yet (status: ${intent.status}).`);
  if (args.mode === "charge_card_on_file" && !paymentMethodId) {
    throw new Error(`Setup intent ${intent.id} has no saved card (status: ${intent.status}).`);
  }

  const draft = await whop<{ id: string; status: string }>("POST", "/invoices", {
    account_id: accountId(),
    member_id: memberId,
    memo: args.memo,
    metadata: { setup_intent_id: intent.id },
    payment_method_id: args.mode === "charge_card_on_file" ? paymentMethodId : undefined,
    items: [
      {
        quantity: 1,
        variant: {
          product_id: env("ROOFING_PRODUCT_ID"),
          title: "Final balance",
          billing_type: "one_time",
          currency: "usd",
          initial_price: args.balanceUsd,
        },
      },
    ],
  });

  const invoice = await whop<{ id: string; status: string }>(
    "POST",
    `/invoices/${draft.id}/${args.mode === "charge_card_on_file" ? "issue" : "send"}`,
    {},
  );
  return { invoiceId: invoice.id ?? draft.id, status: invoice.status ?? draft.status, mode: args.mode };
}
