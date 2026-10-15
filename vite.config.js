import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repoFull = process.env.GITHUB_REPOSITORY || "";
const repoName = repoFull.split("/")[1] || "";
const isUserSiteRepo = repoName.toLowerCase().endsWith(".github.io");
const basePath = process.env.BASE_PATH || (process.env.GITHUB_ACTIONS ? (isUserSiteRepo ? "/" : `/${repoName}/`) : "/");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "RACEBOOK",
        short_name: "RACEBOOK",
        description: "전국 마라톤 대회 일정 탐색 및 러너를 위한 올인원 아카이브 RACEBOOK",
        theme_color: "#0A0D17",
        background_color: "#0A0D17",
        display: "standalone",
        start_url: "./",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      }
    })
  ]
});
