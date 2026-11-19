// Request → Response handlers mounted by src/routes/api/*.ts.
// None of them ever receive card data: payment details go only to Whop's Payment Elements.

import { createLead, saveCardOnFile, billFinalBalance, WhopApiError, type CollectionMode } from "./whop";

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

function logError(scope: string, err: unknown) {
  // Visible with: whop apps logs <app_id> --level error
  console.error(`[${scope}]`, err instanceof WhopApiError ? `${err.path} ${err.status} ${err.body}` : err);
}

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
    const result = await createLead({
      name,
      email,
      service,
      phone: str(b.phone, 40),
      address: str(b.address, 300),
      message: str(b.message),
      referrer: req.headers.get("referer") ?? undefined,
    });
    return json(result, 201);
  } catch (err) {
    logError("leads", err);
    return json({ error: "We couldn't submit your request. Please call us instead." }, 502);
  }
}

export async function postCardSetup(req: Request): Promise<Response> {
  const b = await readBody(req);
  const confirmationToken = str(b?.confirmationToken, 2000);
  const email = str(b?.email, 200);
  if (!confirmationToken) return json({ error: "Missing confirmation token" }, 422);
  if (!isEmail(email)) return json({ error: "A valid email is required" }, 422);
  try {
    const origin = new URL(req.url).origin;
    return json(
      await saveCardOnFile({
        confirmationToken,
        email,
        returnUrl: origin.startsWith("https://") ? `${origin}/#book` : undefined,
        depositPaymentId: str(b?.depositPaymentId, 100),
      }),
      201,
    );
  } catch (err) {
    logError("card-setup", err);
    return json({ error: "We couldn't save your card. Please try again." }, 502);
  }
}

/** Office-only. Requires X-Admin-Token to match the ADMIN_TOKEN secret. */
export async function postFinalInvoice(req: Request): Promise<Response> {
  const expected = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ADMIN_TOKEN;
  if (!expected || expected.length < 12 || req.headers.get("x-admin-token") !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }
  const b = await readBody(req);
  const setupIntentId = str(b?.setupIntentId, 100);
  const balanceUsd = typeof b?.balanceUsd === "number" ? Math.round(b.balanceUsd * 100) / 100 : NaN;
  const mode = b?.mode as CollectionMode;
  if (!setupIntentId) return json({ error: "setupIntentId is required" }, 422);
  if (!Number.isFinite(balanceUsd) || balanceUsd < 1) return json({ error: "Balance must be at least $1" }, 422);
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
    logError("final-invoice", err);
    const detail = err instanceof WhopApiError ? `${err.status}: ${err.body.slice(0, 300)}` : err instanceof Error ? err.message : "";
    return json({ error: `Could not create the invoice. ${detail}`.trim() }, 502);
  }
}
