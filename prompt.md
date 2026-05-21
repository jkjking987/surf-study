# 衝浪研究室 (The Surf Study) — Next Steps Prompt

這份文件用於交接給下一次的 AI Assistant，記錄了目前的專案狀態以及接下來需要執行的實作目標。

## 📍 目前專案狀態 (Current State, 2026-05-20)

- **框架**：Astro v4.16.19(刻意停留在 v4,v5/v6 對應的 `@astrojs/db` 走 Vite 7 架構不相容)
- **資料庫**:Astro DB (`@astrojs/db` v0.14.3) → 遠端 Turso libSQL `libsql://surf-study-jkjking987.aws-us-west-2.turso.io`(憑證在本機 `.env`,已 gitignore;CF 端 build + runtime 兩處各設一份)
- **資料狀態**:**8 期共 257 筆**(Bali 50 / Hainan 21 / Australia 42 / Taiwan 33 / Japan 27 / Korea 22 / Boards 33 / BigWave 29)。本機 dev 用記憶體 SQLite,build 用 `--remote` 連 Turso
- **資料 key 約定**:DB id 是 lowercase-slug(`snapper-rocks`、`a1`),但前端 JS 對某些 key 做精確比對(`SERVICE_KEYS.has(key)`、`GROUP_MAP[key[0]]`)。所以對 **Bali / AU / TW / JP / KR / BigWave** 在 seed 時注入 `content._key = originalKey`,API 端用 `content._key ?? spot.id` 還原大寫底線形式。Hainan 不需要(JS 不做 case-compare)。Boards 用 `id.toUpperCase()` 代替。
- **adapter**:`@astrojs/cloudflare@11.2.0`,`output: 'hybrid'`,`imageService: 'passthrough'`(專案無 `<Image />`)
- **CI/CD**:GitHub `jkjking987/surf-study` → Cloudflare Workers Builds(新版統一平台)
- **build 流程**:`prebuild`(`scripts/ci-env.mjs` 把 process.env → .env)→ `astro build --remote` → `postbuild`(寫 `dist/.assetsignore` 把 `_worker.js/` 排除靜態服務)→ `wrangler deploy`(依 `wrangler.jsonc`)
- **部署資訊**:worker name = `surf-study`,main = `./dist/_worker.js/index.js`,assets dir = `./dist`,`nodejs_compat`,compatibility_date `2024-09-23`
- **線上 URL**:https://surf-study.jkjking987.workers.dev(free workers.dev 子網域,未綁 custom domain)

## ✅ 已完成

- Phase 1(本機 dev + Cloudflare adapter)
- Phase 2(雲端 DB;Astro Studio 已於 2025-03-10 停服,改走 Turso 直連)
- Phase 2.5(內容擴張 6→8 期;新增 Japan / Korea / Australia / Taiwan / Big Wave;首頁 8 卡 + 動畫 hero `.surf-scene`)
- 多輪 audit 找出並修正:Taiwan SERVICE_KEYS copy-paste、Bali / AU `raw?.category` fallback、common.js 全域搜尋只索引 3 期、首頁 stale 數字、孤立 src/styles/ + public/data/ 等

## ⚠️ 已知 caveat

- Astro v5/v6 升級會 break `@astrojs/db@0.14.3`(peer 對 Astro 6)。升 framework 要同步升 db + cloudflare adapter
- Worker 目前 `No bindings found`——所有路由都 prerendered,runtime worker 幾乎沒做事。Phase 3 動態 API/SSR 一旦啟動,要確認 runtime 能讀到 `ASTRO_DB_REMOTE_URL` / `ASTRO_DB_APP_TOKEN`
- `wrangler.jsonc` 首次 deploy 會印「last published via the Cloudflare Dashboard … overridden」warning,正常
- **生產 URL 在 2026-05-20 時段是 NXDOMAIN**(Cloudflare workers.dev route 可能被關 / 帳號 subdomain 未確認)。要去 CF dashboard → Workers & Pages → `surf-study` → Settings → Triggers 看 workers.dev route 是不是啟用,並確認帳號 subdomain 真的是 `jkjking987`
- 還沒做:custom 404 頁、sitemap.xml、JSON-LD、og:image 預設、a11y(mode-btn 鍵盤可達性、heading h2 跳過)、`@astrojs/sitemap` 整合

---

## 🎯 接下來的目標 (Phase 3: 互動功能擴充)

按優先序：

1. **使用者帳號 (Auth)**：Lucia v3 或 Clerk。Lucia 較輕、能用 Astro DB 當 store;Clerk 較快上線但要外部服務。`db/config.ts` 加 `Users` / `Sessions` 表。
2. **雲端收藏夾**：localStorage 的 favorites 改寫到 Astro DB,新建 `UserFavorites(userId, issue, spotId, kind, createdAt)`。需要 Phase 3-1 的 user session 先到位。
3. **即時浪況 API**:浪點詳情頁串接 Surfline / Stormglass。要在 Astro server endpoint(記得 `export const prerender = false` 讓它走 runtime worker);浪況快取建議用 Cloudflare KV 或 Cache API,免費額度內可控。

## 🛠️ 收尾候選(非阻塞)

- 修生產 URL(Cloudflare dashboard workers.dev route)
- 綁 custom domain → 同步改 `astro.config.mjs` 的 `site`
- 升 wrangler 到 v4(目前 CF 預設 3.114)
- 加 `@astrojs/sitemap`、`src/pages/404.astro`、預設 og:image
- a11y:把 `.mode-btn` `<div>` 改成 `<button>` + `role="tab"` + `aria-selected`;補 h2 層級
- 抽 8 個 issue 腳本的共用邏輯到 common module(目前 ~55-60% boilerplate 重複)
