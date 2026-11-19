import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";

// Serves api/routes.ts during `npm run dev` so the estimate form, card-on-file, and
// final-invoice endpoints work locally. In production, mount the same `routes` table in
// the Whop Websites server runtime (see README "Deploying").
function apiRoutes(): Plugin {
  return {
    name: "roofing-api-routes",
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        const { routes } = (await server.ssrLoadModule("/api/routes.ts")) as typeof import("./api/routes");
        const path = req.url.split("?")[0];
        const handler = routes[`${req.method} ${path}`];
        if (!handler) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: "Not found" }));
        }
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
        const response = await handler(
          new Request(`http://localhost${req.url}`, { method: req.method, headers, body: Buffer.concat(chunks) }),
        );
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Expose server-only vars (WHOP_API_KEY etc.) to the API routes during dev.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  // `whop apps init` also adds the `whop()` plugin from `@whop/cli/vite` here for deploys.
  return { plugins: [react(), apiRoutes()] };
});
