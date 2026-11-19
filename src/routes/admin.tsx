import { createFileRoute } from "@tanstack/react-router";
import { FinalInvoicePanel } from "../components/FinalInvoicePanel";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Office · Bill final balance" }, { name: "robots", content: "noindex" }] }),
  component: FinalInvoicePanel,
});
