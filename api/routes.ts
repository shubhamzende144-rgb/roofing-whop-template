// Framework-agnostic handlers: Fetch API Request -> Response.
// No handler ever receives card data. Payment details go only to Whop's Payment Elements.

import { createLead, saveCardOnFile, billFinalBalance, type CollectionMode } from "./whop-server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const str = (v: unknown, max = 2000): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

const isEmail = (s: string | undefined): s is string => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** POST /api/leads: the "Request an Estimate" form. */
export async function postLead(req: Request): Promise<Response> {
  const b = await readBody(req);
  if (!b) return json({ error: "Invalid request" }, 400);
  const name = str(b.name, 120);
  const email = str(b.email, 200);
  const service = str(b.service, 50);
  if (!name || name.length < 2) return json({ error: "Please enter your name." }, 422);
  if (!isEmail(email)) return json({ error: "Please enter a valid email." }, 422);
  if (!service) return json({ error: "Please choose a service." }, 422);
  try {
    const lead = await createLead({
      name,
      email,
      service,
      phone: str(b.phone, 40),
      address: str(b.address, 300),
      message: str(b.message),
    });
    return json({ leadId: lead.id }, 201);
  } catch (err) {
    console.error("[leads]", err);
    return json({ error: "We couldn't submit your request. Please call us instead." }, 502);
  }
}

/** POST /api/card-setup: saves the card collected at deposit checkout via a setup intent. */
export async function postCardSetup(req: Request): Promise<Response> {
  const b = await readBody(req);
  const confirmationToken = str(b?.confirmationToken, 500);
  const email = str(b?.email, 200);
  if (!confirmationToken) return json({ error: "Missing confirmation token" }, 422);
  if (!isEmail(email)) return json({ error: "A valid email is required" }, 422);
  try {
    return json(await saveCardOnFile({ confirmationToken, email, depositPaymentId: str(b?.depositPaymentId, 100) }), 201);
  } catch (err) {
    console.error("[card-setup]", err);
    return json({ error: "We couldn't save your card. Please try again." }, 502);
  }
}

/**
 * POST /api/final-invoice: office-only. Bills the remaining balance.
 * Requires the X-Admin-Token header to match ADMIN_TOKEN. Anyone who can call this can bill
 * a saved card, so keep ADMIN_TOKEN long and secret, or replace this check with real auth.
 */
export async function postFinalInvoice(req: Request): Promise<Response> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 16 || req.headers.get("x-admin-token") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }
  const b = await readBody(req);
  const setupIntentId = str(b?.setupIntentId, 100);
  const balanceUsd = typeof b?.balanceUsd === "number" ? Math.round(b.balanceUsd * 100) / 100 : NaN;
  const mode = b?.mode as CollectionMode;
  if (!setupIntentId) return json({ error: "setupIntentId is required" }, 422);
  if (!Number.isFinite(balanceUsd) || balanceUsd <= 0) return json({ error: "balanceUsd must be positive" }, 422);
  if (mode !== "charge_card_on_file" && mode !== "email_for_payment") return json({ error: "Invalid mode" }, 422);
  try {
    const result = await billFinalBalance({
      setupIntentId,
      balanceUsd,
      mode,
      memo: str(b?.memo, 500) ?? "Final balance for your roofing project. Your deposit has been applied.",
    });
    return json(result, 201);
  } catch (err) {
    console.error("[final-invoice]", err);
    return json({ error: err instanceof Error ? err.message : "Could not create the invoice" }, 502);
  }
}

/** Route table, shared by the dev server and the production adapter. */
export const routes: Record<string, (req: Request) => Promise<Response>> = {
  "POST /api/leads": postLead,
  "POST /api/card-setup": postCardSetup,
  "POST /api/final-invoice": postFinalInvoice,
};
