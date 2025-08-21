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
    port: 3333,
    proxy: {
      "/socket.io": {
        target: "http://localhost:8000",
        ws: true,
      },
    },
  },
});
