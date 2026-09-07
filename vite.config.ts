import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: "0.0.0.0" },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("plotly.js")) return "plotly";
          if (id.includes("/three/")) return "three";
          if (id.includes("/katex/")) return "katex";
        },
      },
    },
  },
});
