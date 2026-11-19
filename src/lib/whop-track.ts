// Client-side pixel events via whop.track.
// `window.whop` exists before app code runs on whop.app / whop.site, so these calls
// are safe to make directly. Page views and checkout events are tracked automatically.

export type TemplateEvent = "estimate_requested" | "service_viewed" | "deposit_started";

interface TrackOptions {
  value?: number;
  currency?: string;
  /** Use a stable ID from your own system so retries/refreshes count once. */
  event_id?: string;
  product_id?: string;
  variant_id?: string;
}

declare global {
  interface Window {
    whop?: { track: (event: string, options?: TrackOptions) => void };
  }
}

export function track(event: TemplateEvent, options?: TrackOptions): void {
  if (typeof window === "undefined") return;
  try {
    window.whop?.track(event, options);
  } catch {
    // Tracking must never break the user flow.
  }
}
