import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file build so dist/index.html can be opened directly (file://)
// without a server. When served over http(s), the Phase 5 service worker
// (public/sw.js) adds installable, offline-first PWA support on top.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: "./",
});
