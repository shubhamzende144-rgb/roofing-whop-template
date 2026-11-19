import { StrictMode, useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { WhopElements } from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import { App } from "./App";
import { FinalInvoicePanel } from "./admin/FinalInvoicePanel";
import { WhopLoadContext } from "./lib/whop-status";
import "./styles.css";

// Load the Elements SDK once, outside render.
const whop = loadWhop();
const environment = import.meta.env.VITE_WHOP_ENVIRONMENT === "sandbox" ? "sandbox" : "production";
const isAdmin = window.location.pathname.startsWith("/admin");

function Site() {
  const [load, setLoad] = useState<{ failed: boolean; retry: () => void }>({ failed: false, retry: () => {} });

  // With onLoadError set, a failed SDK load no longer unmounts the page: the site, phone number,
  // and estimate form keep working, and only the checkout shows a fallback with a retry.
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
        <App />
      </WhopElements>
    </WhopLoadContext.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isAdmin ? <FinalInvoicePanel /> : <Site />}</StrictMode>,
);
