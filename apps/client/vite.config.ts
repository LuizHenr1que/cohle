import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// Web build: open the connection to the API while the page is still loading (saves a TLS handshake before the first request).
export default defineConfig(({ mode }) => {
  const api = loadEnv(mode, process.cwd(), "VITE_").VITE_API_URL || process.env.VITE_API_URL;
  return {
    base: "./",
    plugins: [react(), tailwind(), {
      name: "preconnect-api",
      transformIndexHtml: () => (api ? [{ tag: "link", attrs: { rel: "preconnect", href: new URL(api).origin, crossorigin: "" }, injectTo: "head-prepend" as const }] : []),
    }],
    server: { port: 5173 },
  };
});
