import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import chromiumManifest from "./manifest.json";
import firefoxManifest from "./manifests/manifest.firefox.json";
import safariManifest from "./manifests/manifest.safari.json";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const manifests = {
    chromium: chromiumManifest,
    firefox: firefoxManifest,
    safari: safariManifest,
  } as const;
  const target = mode in manifests ? (mode as keyof typeof manifests) : "chromium";

  return {
    plugins: [react(), crx({ manifest: manifests[target] })],
    build: {
      outDir: `dist/${target}`,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: "popup.html",
        },
      },
    },
  };
});
