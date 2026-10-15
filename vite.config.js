import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

function garminSyncPlugin() {
  return {
    name: "garmin-sync-api",
    configureServer(server) {
      server.middlewares.use("/api/garmin-sync", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });

        req.on("end", async () => {
          try {
            const tokenstoreFile = path.join(os.homedir(), ".racebook_garmin_tokens", userId || "", "garmin_tokens.json");
            const hasCachedToken = fs.existsSync(tokenstoreFile);

            if (!email || (!password && !hasCachedToken)) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: "가민 계정 이메일과 비밀번호를 입력해주세요." }));
              return;
            }

            const tempOutputFile = path.join(os.tmpdir(), `garmin_${Date.now()}_result.json`);
            const pythonArgs = [
              "scripts/sync-garmin.py",
              "--mode", mode,
              "--email", email,
              "--password", password,
              "--user-id", userId || "anonymous-user",
              "--output-json", tempOutputFile
            ];

            if (accessToken) {
              pythonArgs.push("--access-token", accessToken);
            }

            console.log(`[*] [Vite API] Starting Garmin Sync for user: ${email}...`);
            const pyProc = spawn("python", pythonArgs, {
              cwd: process.cwd(),
              env: { ...process.env, PYTHONIOENCODING: "utf-8" }
            });

            let stdoutLog = "";
            let stderrLog = "";

            pyProc.stdout.on("data", (data) => {
              stdoutLog += data.toString();
              console.log("[garmin-sync]:", data.toString().trim());
            });

            pyProc.stderr.on("data", (data) => {
              stderrLog += data.toString();
              console.error("[garmin-sync err]:", data.toString().trim());
            });

            pyProc.on("close", (code) => {
              res.setHeader("Content-Type", "application/json; charset=utf-8");

              if (fs.existsSync(tempOutputFile)) {
                try {
                  const content = fs.readFileSync(tempOutputFile, "utf-8");
                  fs.unlinkSync(tempOutputFile);
                  const parsed = JSON.parse(content);
                  if (parsed.success === false) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: parsed.error || "가민 계정 인증에 실패했습니다." }));
                    return;
                  }
                  res.statusCode = 200;
                  res.end(content);
                  return;
                } catch (readErr) {
                  console.error("Failed to read output json:", readErr);
                }
              }

              if (code !== 0) {
                let errorMsg = "가민 계정 동기화 중 오류가 발생했습니다.";
                if (stdoutLog.includes("Garmin Auth Error") || stderrLog.includes("GarminConnectAuthenticationError") || stdoutLog.includes("올바르지 않습니다")) {
                  errorMsg = "가민 이메일 또는 비밀번호가 올바르지 않습니다. 가민 커넥트 앱의 로그인 정보를 확인해주세요.";
                } else if (stdoutLog.includes("TooManyRequestsError") || stderrLog.includes("TooManyRequestsError") || stdoutLog.includes("429")) {
                  errorMsg = "가민 서버의 요청 제한(429)이 발생했습니다. 2~3분 후 다시 시도해주세요.";
                }
                res.statusCode = 400;
                res.end(JSON.stringify({ error: errorMsg }));
              } else {
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, count: 0, activities: [], laps: {} }));
              }
            });
          } catch (parseErr) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: parseErr.message }));
          }
        });
      });
    }
  };
}

const repoFull = process.env.GITHUB_REPOSITORY || "";
const repoName = repoFull.split("/")[1] || "";
const isUserSiteRepo = repoName.toLowerCase().endsWith(".github.io");
const basePath = process.env.BASE_PATH || (process.env.GITHUB_ACTIONS ? (isUserSiteRepo ? "/" : `/${repoName}/`) : "/");

export default defineConfig({
  base: basePath,
  plugins: [
    garminSyncPlugin(),
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
