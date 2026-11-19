import { Checkout, CheckoutElement, ExpressCheckoutElement, type CheckoutOptions } from "@whop/elements-react";
import type { PlanConfig } from "../config/site";

type Completion = Parameters<NonNullable<CheckoutOptions["onComplete"]>>[0];

/**
 * Whop-hosted checkout for one plan. Runs entirely on Whop, so any financing options
 * the merchant is approved for (Klarna, Afterpay, Splitit, ...) surface automatically.
 *
 * ExpressCheckoutElement and CheckoutElement share a Checkout's single entry slot, so each
 * gets its own <Checkout>. Wallet buttons render only where the device supports them and
 * the page's domain has Apple Pay enabled (see README "Apple Pay / Google Pay").
 */
export function PlanCheckout({
  plan,
  onPaid,
  metadata,
}: {
  plan: PlanConfig;
  onPaid?: (paymentId: string) => void;
  metadata?: Record<string, string>;
}) {
  const returnUrl =
    typeof window !== "undefined" ? `${window.location.origin}/?checkout_plan=${plan.kind}#book` : undefined;

  const onComplete = (result: Completion) => {
    if (result.result === "payment") onPaid?.(result.paymentId);
  };

  const shared = { plan: plan.planId, returnUrl, metadata: { plan_kind: plan.kind, ...metadata }, onComplete };

  return (
    <div className="checkout">
      <div className="checkout-head">
        <h3>{plan.label}</h3>
        <span className="price">{plan.priceDisplay}</span>
      </div>
      <p className="muted">{plan.description}</p>

      <Checkout {...shared}>
        <ExpressCheckoutElement />
      </Checkout>

      <p className="divider"><span>or pay another way</span></p>

      <Checkout {...shared}>
        <CheckoutElement fallback={<p className="muted">Loading secure checkout…</p>} />
      </Checkout>
    </div>
  );
}
