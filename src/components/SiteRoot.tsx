import { useCallback, useState } from "react";
import { WhopElements } from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import { WhopLoadContext } from "../lib/whop-status";
import { HomePage } from "./HomePage";

const environment = import.meta.env.VITE_WHOP_ENVIRONMENT === "sandbox" ? "sandbox" : "production";

/** Browser-only: loads Whop Payment Elements once and keeps the page up if the SDK fails to load. */
export function SiteRoot() {
  const [whop] = useState(() => loadWhop());
  const [load, setLoad] = useState<{ failed: boolean; retry: () => void }>({ failed: false, retry: () => {} });

  const onLoadError = useCallback((error: Error, retry: () => void) => {
    console.error("[whop] Elements failed to load", error);
    setLoad({
      failed: true,
      retry: () => {
        setLoad((s) => ({ ...s, failed: false }));
        retry();
      },
    });
  }, []);

  return (
    <WhopLoadContext.Provider value={load}>
      <WhopElements elements={whop} environment={environment} onLoadError={onLoadError}>
        <HomePage />
      </WhopElements>
    </WhopLoadContext.Provider>
  );
}
