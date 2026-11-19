import { useEffect, useRef, useState } from "react";
import { plans, site } from "../config/site";
import { useWhopLoad } from "../lib/whop-status";
import { track } from "../lib/whop-track";
import { PlanCheckout } from "./PlanCheckout";
import { CardOnFile } from "./CardOnFile";

type PlanKey = keyof typeof plans;
type DepositStep = { step: "pay" } | { step: "card"; paymentId?: string } | { step: "done"; setupIntentId: string };

const ORDER: PlanKey[] = ["inspection", "flatRate", "deposit"];

export function BookingSection() {
  const [active, setActive] = useState<PlanKey>("inspection");
  const [paid, setPaid] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<DepositStep>({ step: "pay" });
  const depositTracked = useRef(false);
  const whopLoad = useWhopLoad();

  // Returning from an off-site payment step (3DS, bank page): trust `status`, not the visit.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const kind = q.get("checkout_plan");
    if (q.get("status") !== "succeeded" || !kind) return;
    if (kind === "deposit") {
      setActive("deposit");
      setDeposit({ step: "card", paymentId: q.get("payment") ?? undefined });
    } else {
      setPaid(q.get("payment"));
    }
  }, []);

  function choose(key: PlanKey) {
    setActive(key);
    setPaid(null);
    if (key === "deposit" && !depositTracked.current) {
      depositTracked.current = true;
      track("deposit_started", { value: plans.deposit.amountCents / 100, currency: "USD", variant_id: plans.deposit.planId });
    }
  }

  const plan = plans[active];

  return (
    <section id="book" className="section alt">
      <div className="container">
        <h2>Book online</h2>
        <p className="muted">Pay for an inspection, book a flat-rate repair, or reserve your crew date. Payments are processed securely by Whop.</p>

        <div className="plan-tabs" role="tablist">
          {ORDER.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={active === key}
              className={`plan-tab${active === key ? " is-active" : ""}`}
              onClick={() => choose(key)}
            >
              <strong>{plans[key].label}</strong>
              <span>{plans[key].priceDisplay}</span>
            </button>
          ))}
        </div>

        <div className="checkout-wrap">
          {whopLoad.failed && (
            <div className="checkout" role="alert">
              <h3>Online checkout is temporarily unavailable</h3>
              <p className="muted">
                Call us at <a href={`tel:${site.phone}`}>{site.phone}</a> to book, or try again.
              </p>
              <button type="button" className="btn btn-small" onClick={whopLoad.retry}>Try again</button>
            </div>
          )}
          {!whopLoad.failed && active !== "deposit" &&
            (paid ? (
              <div className="checkout form-ok" role="status">
                <h3>You're booked.</h3>
                <p>Payment received. We'll call within one business day to schedule your {plan.label.toLowerCase()}.</p>
              </div>
            ) : (
              // `key` remounts the checkout: its options are fixed when the session is created.
              <PlanCheckout key={active} plan={plan} onPaid={setPaid} />
            ))}

          {!whopLoad.failed && active === "deposit" && (
            <>
              <ol className="steps">
                <li className={deposit.step === "pay" ? "is-current" : "is-done"}>Pay deposit</li>
                <li className={deposit.step === "card" ? "is-current" : deposit.step === "done" ? "is-done" : ""}>Save card for balance</li>
                <li className={deposit.step === "done" ? "is-current" : ""}>Crew date confirmed</li>
              </ol>
              {deposit.step === "pay" && (
                <PlanCheckout plan={plans.deposit} onPaid={(paymentId) => setDeposit({ step: "card", paymentId })} />
              )}
              {deposit.step === "card" && (
                <CardOnFile
                  depositPaymentId={deposit.paymentId}
                  onSaved={(setupIntentId) => setDeposit({ step: "done", setupIntentId })}
                />
              )}
              {deposit.step === "done" && (
                <div className="checkout form-ok" role="status">
                  <h3>Deposit received and card saved.</h3>
                  <p>Your crew date is reserved. We'll bill the remaining balance when the job is complete.</p>
                  <p className="muted small">Reference: {deposit.setupIntentId}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
