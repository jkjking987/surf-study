# 衝浪研究室 (The Surf Study) — Next Steps Prompt

這份文件用於交接給下一次的 AI Assistant，記錄了目前的專案狀態以及接下來需要執行的實作目標。

## 📍 目前專案狀態 (Current State, 2026-05-16)

- **框架**：Astro v4.16.19（注意：刻意停留在 v4，因為 v5/v6 對應的 `@astrojs/db` 版本走 Vite 7 架構，未升級）
- **資料庫**：Astro DB (`@astrojs/db` v0.14.3) + Drizzle ORM；schema 在 `db/config.ts`，seed 在 `db/seed.ts`
- **遠端 DB**：Turso libSQL，URL = `libsql://surf-study-jkjking987.aws-us-west-2.turso.io`；憑證在本機 `.env`，已 gitignore；CF 端在 Build 與 Runtime 兩個區段各設了一份
- **資料狀態**：50 Bali + 21 Hainan + 33 Boards = 104 筆。本機 dev 用記憶體 SQLite，build 用 `--remote` 連 Turso
- **adapter**：`@astrojs/cloudflare@11.2.0`，`output: 'hybrid'`，配 `passthroughImageService`（專案無 `<Image />`，避開 Sharp 警告）
- **CI/CD**：GitHub `jkjking987/surf-study` → Cloudflare Workers Builds（新版統一平台,非舊版 Pages）
- **build 流程**：`prebuild`(scripts/ci-env.mjs，把 process.env 寫成 .env 給 Vite loadEnv) → `astro build --remote` → `postbuild`(scripts/post-build.mjs，寫 dist/.assetsignore 排除 `_worker.js/`) → `wrangler deploy`（依 `wrangler.jsonc`）
- **部署資訊**：worker 名稱 `surf-study`，main = `./dist/_worker.js/index.js`，assets = `./dist`，`nodejs_compat`，compatibility_date `2024-09-23`
- **線上 URL**：https://surf-study.jkjking987.workers.dev（free workers.dev 子網域，未綁 custom domain）

## ✅ 已完成

- Phase 1（本機 dev 與雲端部署 adapter）
- Phase 2（雲端資料庫；Astro Studio 已於 2025-03-10 停服，改走 Turso 直連）

## ⚠️ 已知 caveat

- Astro v5/v6 升級會 break `@astrojs/db@0.14.3`（peer 對 Astro 6）。升 framework 時要同步升 db、cloudflare adapter
- Worker 目前 `No bindings found`——所有路由 prerendered，runtime worker 沒做事。Phase 3 動態 API/SSR 一旦上線，需要確認 runtime 能讀到 `ASTRO_DB_REMOTE_URL` / `ASTRO_DB_APP_TOKEN`（dashboard 已有設,但若改用 wrangler `[vars]` 走 git source-of-truth 要小心 token 不要進 git）
- `wrangler.jsonc` deploy 會印 warning「last published via the Cloudflare Dashboard. Edits ... will be overridden」，因為這個專案以前是手動部署，現在用 wrangler 覆寫了——正常,首次 push 後不再出現

---

## 🎯 接下來的目標 (Phase 3: 互動功能擴充)

按優先序：

1. **使用者帳號 (Auth)**：Lucia v3 或 Clerk。Lucia 較輕、能用 Astro DB 當 store；Clerk 較快上線但要外部服務。`db/config.ts` 加 `Users` / `Sessions` 表。
2. **雲端收藏夾**：localStorage 的 favorites 改寫到 Astro DB，新建 `UserFavorites(userId, spotId, kind, createdAt)`。需要 Phase 3-1 的 user session 先到位。
3. **即時浪況 API**：浪點詳情頁串接 Surfline / Stormglass。要在 Astro server endpoint（記得 `export const prerender = false` 讓它走 runtime worker）；浪況快取建議用 Cloudflare KV 或 Cache API，免費額度內可控。

## 🛠️ 收尾候選（非阻塞）

- 綁 custom domain（CF dashboard → Custom Domains），完成後同步改 `astro.config.mjs` 的 `site`
- 升 wrangler 到 v4（目前 CF 預設 3.114，build log 持續提示）
- `prompt.md` 隨進度增刪
