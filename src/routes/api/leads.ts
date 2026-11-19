import { createFileRoute } from "@tanstack/react-router";
import { postLead } from "../../server/handlers";

export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      POST: ({ request }) => postLead(request),
    },
  },
});
