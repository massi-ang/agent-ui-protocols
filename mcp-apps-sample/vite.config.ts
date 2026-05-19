import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const app = process.env.APP;

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: "esnext",
    outDir: "dist/ui",
    emptyOutDir: false,
    rollupOptions: {
      input: app ? `src/${app}-app.html` : "src/weather-app.html",
    },
  },
});
