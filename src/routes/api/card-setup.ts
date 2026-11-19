import { createFileRoute } from "@tanstack/react-router";
import { postCardSetup } from "../../server/handlers";

export const Route = createFileRoute("/api/card-setup")({
  server: {
    handlers: {
      POST: ({ request }) => postCardSetup(request),
    },
  },
});
