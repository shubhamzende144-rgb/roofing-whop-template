import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { SiteRoot } from "../components/SiteRoot";
import { site } from "../config/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${site.companyName} | Roof Repair, Replacement & Inspection` },
      { name: "description", content: site.tagline },
    ],
  }),
  component: Home,
});

function Home() {
  // Payment Elements need the browser, so the page renders client-side.
  return (
    <ClientOnly fallback={<p style={{ padding: "4rem 1rem", textAlign: "center" }}>Loading {site.companyName}…</p>}>
      <SiteRoot />
    </ClientOnly>
  );
}
