import { useRef, useState, type FormEvent } from "react";
import { Payments, PaymentElement, BrandingElement, useWhop, type PaymentsHandle } from "@whop/elements-react";
import { site } from "../config/site";

/**
 * Card on file for the final balance, collected right after the deposit is paid.
 * <Payments mode="setup"> saves a method without charging it. The confirmation token goes
 * to /api/card-setup, which creates the setup intent server-side. BrandingElement is
 * required: the payment element stays in its loading state until it is mounted.
 */
export function CardOnFile({ depositPaymentId, onSaved }: { depositPaymentId?: string; onSaved: (setupIntentId: string) => void }) {
  const payments = useRef<{ handle: PaymentsHandle | null }>(null);
  const whop = useWhop();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const handle = payments.current?.handle;
    if (!handle) return setError("The payment form is still loading.");
    setBusy(true);
    setError("");
    try {
      const { confirmationToken } = await handle.createConfirmationToken({ billingDetails: { email } });
      const res = await fetch("/api/card-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken, email, depositPaymentId }),
      });
      const data = (await res.json()) as { setupIntentId?: string; status?: string; clientSecret?: string | null; error?: string };
      if (!res.ok || !data.setupIntentId) throw new Error(data.error ?? "We couldn't save your card.");

      if (data.status === "requires_action" && data.clientSecret) {
        if (!whop) throw new Error("Payment SDK not loaded.");
        const next = await whop.payments.handleNextAction({ clientSecret: data.clientSecret, returnUrl: window.location.href });
        if (next.redirected) return; // Off-site step; the buyer comes back to this page.
        if (next.status !== "succeeded") throw new Error(next.lastPaymentError?.message ?? "Card verification failed.");
      }
      onSaved(data.setupIntentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="checkout" onSubmit={onSubmit}>
      <h3>Save a card for the final balance</h3>
      <p className="muted">
        Nothing is charged now. When the job is finished, we bill the remaining balance to this card and email you a
        receipt. You can also ask to pay the balance by invoice instead.
      </p>
      <label>
        Email for receipts
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>

      <Payments ref={payments} accountId={site.whopCompanyId} mode="setup" currency="usd">
        <PaymentElement />
        <BrandingElement />
      </Payments>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "Saving…" : "Save card"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
