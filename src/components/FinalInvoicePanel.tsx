import { useState, type FormEvent } from "react";
import { site } from "../config/site";

/**
 * Office tool at /admin: bill a finished job's remaining balance through the Whop Invoices API.
 * The server checks X-Admin-Token against ADMIN_TOKEN; this page holds no secrets itself.
 */
export function FinalInvoicePanel() {
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/final-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": String(f.get("token")) },
        body: JSON.stringify({
          setupIntentId: f.get("setupIntentId"),
          balanceUsd: Number(f.get("balance")),
          mode: f.get("mode"),
          memo: f.get("memo") || undefined,
        }),
      });
      const data = (await res.json()) as { invoiceId?: string; status?: string; mode?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setResult(
        data.mode === "charge_card_on_file"
          ? `Invoice ${data.invoiceId} issued (${data.status}). The saved card is being charged. Confirm on the payment.succeeded webhook or in the dashboard.`
          : `Invoice ${data.invoiceId} emailed (${data.status}). The homeowner pays through Whop checkout.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="section">
      <div className="container narrow">
        <p className="eyebrow">{site.companyName} · Office</p>
        <h1>Bill final balance</h1>
        <p className="muted">Use the setup intent reference (sint_…) shown to the homeowner after their deposit.</p>
        <form onSubmit={onSubmit}>
          <label>Admin token<input name="token" type="password" required autoComplete="off" /></label>
          <label>Setup intent ID<input name="setupIntentId" required placeholder="sint_…" /></label>
          <label>Remaining balance (USD)<input name="balance" type="number" min="1" step="0.01" required placeholder="8450.00" /></label>
          <fieldset className="radio-group">
            <legend>How to collect</legend>
            <label className="radio"><input type="radio" name="mode" value="charge_card_on_file" defaultChecked /> Charge the saved card now</label>
            <label className="radio"><input type="radio" name="mode" value="email_for_payment" /> Email an invoice for manual payment</label>
          </fieldset>
          <label>Memo (optional)<textarea name="memo" rows={3} placeholder="Final balance for full replacement. Deposit of $500 applied." /></label>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create invoice"}</button>
          {result && <p className="form-ok" role="status">{result}</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
      </div>
    </main>
  );
}
