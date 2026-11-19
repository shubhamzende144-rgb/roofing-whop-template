import { useState, type FormEvent } from "react";
import { services } from "../config/site";
import { track } from "../lib/whop-track";

type Phase = "idle" | "submitting" | "done" | "error";

export function EstimateForm({ defaultService }: { defaultService?: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [leadId, setLeadId] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setPhase("submitting");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { leadId?: string; error?: string };
      if (!res.ok || !data.leadId) throw new Error(data.error ?? "Could not submit your request.");
      setLeadId(data.leadId);
      // Use the lead ID as event_id so a retry or refresh counts once.
      track("estimate_requested", { event_id: data.leadId });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your request.");
      setPhase("error");
    }
  }

  if (phase === "done") {
    return (
      <div className="form-ok" role="status">
        <h3>Thanks, we have your request.</h3>
        <p className="muted">Reference #{leadId.slice(0, 8)}. An estimator will reach out within one business day.</p>
      </div>
    );
  }

  return (
    <form className="estimate-form" onSubmit={onSubmit} noValidate>
      <div className="grid-2">
        <label>
          Full name
          <input name="name" required minLength={2} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label>
          Service
          <select name="service" required defaultValue={defaultService ?? services[0].key}>
            {services.map((s) => (
              <option key={s.key} value={s.key}>{s.title}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Property address
        <input name="address" autoComplete="street-address" />
      </label>
      <label>
        What's going on with your roof?
        <textarea name="message" rows={4} />
      </label>
      <button type="submit" className="btn btn-primary btn-block" disabled={phase === "submitting"}>
        {phase === "submitting" ? "Sending..." : "Request an estimate"}
      </button>
      {phase === "error" && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}
