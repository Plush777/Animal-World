import { defineConfig } from "vite";
import path from "path";
import htmlInject from "vite-plugin-html-inject";

export default defineConfig({
  plugins: [htmlInject()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    open: true,
  },
});
