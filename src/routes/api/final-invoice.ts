import { createFileRoute } from "@tanstack/react-router";
import { postFinalInvoice } from "../../server/handlers";

export const Route = createFileRoute("/api/final-invoice")({
  server: {
    handlers: {
      POST: ({ request }) => postFinalInvoice(request),
    },
  },
});
