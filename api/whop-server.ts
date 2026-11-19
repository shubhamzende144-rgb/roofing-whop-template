// SERVER-ONLY. Never import this from src/ (browser) code: it holds the secret API key.
//
// Verified against @whop/sdk 2.8.1 types and docs.whop.com (Nov 2026):
//   setupIntents.create / retrieve, invoices.create / issue / send.
// Leads use a direct REST call: POST /leads is documented in the API reference,
// but SDK 2.8.1 has no leads resource. Confirm its body fields in the API reference
// before going to production (marked VERIFY).

import { WhopClient, WhopEnvironment } from "@whop/sdk";

const isSandbox = process.env.WHOP_ENVIRONMENT === "sandbox";
const REST_BASE = isSandbox ? "https://sandbox-api.whop.com/api/v1" : "https://api.whop.com/api/v1";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

let client: WhopClient | null = null;
function whop(): WhopClient {
  client ??= new WhopClient({
    token: requireEnv("WHOP_API_KEY"),
    environment: isSandbox ? WhopEnvironment.Sandbox : WhopEnvironment.Production,
  });
  return client;
}

const accountId = () => requireEnv("WHOP_COMPANY_ID");

// ── Leads ────────────────────────────────────────────────────────────────────

export interface EstimateInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  service: string;
  message?: string;
}

/** Creates a lead on the account so quote requests land under Leads. VERIFY body fields. */
export async function createLead(input: EstimateInput): Promise<{ id: string }> {
  const res = await fetch(`${REST_BASE}/leads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireEnv("WHOP_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      company_id: accountId(),
      product_id: process.env.WHOP_LEAD_PRODUCT_ID || undefined,
      email: input.email,
      name: input.name,
      phone: input.phone,
      metadata: {
        service: input.service,
        address: input.address ?? "",
        message: input.message ?? "",
        source: "estimate_form",
      },
    }),
  });
  if (!res.ok) throw new Error(`Create lead failed: ${res.status} ${await res.text().catch(() => "")}`);
  return (await res.json()) as { id: string };
}

// ── Card on file (setup intent) ──────────────────────────────────────────────

/**
 * Turns the confirmation token from <Payments mode="setup"> into a saved payment method.
 * The buyer may still owe a 3DS step: when status is "requires_action", the browser passes
 * client_secret to payments.handleNextAction().
 */
export async function saveCardOnFile(args: { confirmationToken: string; email: string; depositPaymentId?: string }) {
  const intent = await whop().setupIntents.create({
    account_id: accountId(),
    confirmation_token: args.confirmationToken,
    email: args.email,
    metadata: { purpose: "roof_final_balance", deposit_payment_id: args.depositPaymentId ?? null },
  });
  return { setupIntentId: intent.id, status: intent.status, clientSecret: intent.client_secret };
}

// ── Final balance (invoice) ──────────────────────────────────────────────────

export type CollectionMode = "charge_card_on_file" | "email_for_payment";

/**
 * Bills the final balance once the job is done.
 *  - charge_card_on_file: the draft carries the saved payment_method_id; issuing it charges
 *    that method off-session. Fulfill from the payment.succeeded webhook, not this response.
 *  - email_for_payment: no saved method; send() emails the homeowner a Whop checkout link,
 *    where any financing options the account is approved for also appear.
 */
export async function billFinalBalance(args: {
  setupIntentId: string;
  balanceUsd: number;
  memo: string;
  mode: CollectionMode;
}) {
  const intent = await whop().setupIntents.retrieve({ id: args.setupIntentId });
  if (intent.status !== "succeeded") throw new Error(`Setup intent is ${intent.status}, not succeeded`);
  if (!intent.member_id) throw new Error("Setup intent has no member to bill");

  const draft = await whop().invoices.create({
    account_id: accountId(),
    member_id: intent.member_id,
    memo: args.memo,
    metadata: { setup_intent_id: intent.id },
    payment_method_id: args.mode === "charge_card_on_file" ? intent.payment_method_id : null,
    // Inline one-time variant priced at the balance. Needs `plan:create` on the API key.
    items: [
      {
        plan: {
          product_id: requireEnv("WHOP_FINAL_BALANCE_PRODUCT_ID"),
          plan_type: "one_time",
          initial_price: args.balanceUsd,
          currency: "usd",
        },
        quantity: 1,
      },
    ],
  });

  const invoice =
    args.mode === "charge_card_on_file"
      ? await whop().invoices.issue({ id: draft.id })
      : await whop().invoices.send({ id: draft.id });

  return { invoiceId: invoice.id, status: invoice.status, mode: args.mode };
}
