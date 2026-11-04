import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// `--mode beheer` bouwt het beheerdashboard (beheer/index.html) apart naar _site/beheer/, `--mode wijk` de wijkwebsite naar _site/.
// /api gaat in ontwikkeling naar `npm run dev:api` (wrangler, poort 8788); draait die niet, dan blijft de inschrijving dicht.
const server = { proxy: { "/api": "http://127.0.0.1:8788" } };
export default defineConfig(({ mode }) =>
  mode === "beheer"
    ? {
        plugins: [react()],
        base: "./",
        root: "beheer",
        publicDir: false,
        server,
        build: { outDir: "../_site/beheer", emptyOutDir: true },
      }
    : mode === "wijk"
      ? {
          // De algemene wijkwebsite (wijk/index.html) op het hoofdadres; beelden komen uit public/, online onder /sinterklaas/.
          plugins: [react()],
          base: "/",
          root: "wijk",
          publicDir: false,
          server,
          build: { outDir: "../_site", emptyOutDir: false },
        }
      : { plugins: [react()], base: "./", server },
);
