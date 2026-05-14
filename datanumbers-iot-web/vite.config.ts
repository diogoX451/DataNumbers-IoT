import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    // Respeita o PORT do ambiente (autoPort do preview manager).
    port: Number(process.env.PORT) || 3000,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 3000,
  },
});
