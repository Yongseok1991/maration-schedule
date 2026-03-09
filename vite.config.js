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
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Maraton",
        short_name: "Maraton",
        description: "국내 마라톤 일정을 빠르게 모아 보는 앱",
        theme_color: "#0a1022",
        background_color: "#0a1022",
        display: "standalone",
        start_url: "./",
        icons: [
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
