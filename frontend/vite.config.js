import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = process.env.API_PROXY_TARGET || "http://127.0.0.1:5000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      "/api": { target },
      "/uploads": { target },
    },
    watch: {
      usePolling: true,
    },
  },
});
