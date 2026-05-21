# 衝浪研究室 (The Surf Study) — Next Steps Prompt

這份文件用於交接給下一次的 AI Assistant，記錄了目前的專案狀態以及接下來需要執行的實作目標。

## 📍 目前專案狀態 (Current State, 2026-05-21)

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
- Phase 2.7 SEO + a11y 收尾(commit `38851fa` + `<next>`):
  - `@astrojs/sitemap@3.2.1`(3.7 走 Astro 5 hook 會炸)→ 自動產 `dist/sitemap-{index,0}.xml`
  - `src/pages/404.astro` magazine-style 404 頁(masthead lockup + 8 期 grid)
  - `Base.astro` 預設 `WebSite` JSON-LD + 預設 og:image(1200×630 PNG,scripts/gen-og-image.mjs 用 sharp 生成,placed at `public/og-default.png`)
  - 全 8 個 `<div class="mode-btn">` → `<button role=tab>` + `aria-selected` 同步;`<nav class="modes">` 加 `role="tablist"`
  - 8 個 issue script 的 switchMode 現在同步更新 `aria-selected` + `tabIndex`
  - `common.js` 加 ←→↑↓/Home/End roving tab focus
  - `.mode-btn` 加 `:focus-visible` 朱紅外框 + `<380px` 強制 `min-height: 44px` 觸控目標(WCAG 2.5.5)
  - `board.json` B4 兩處字面 `\\u00d7` → `×`;`seed.ts` 變 idempotent(每張表 seed 前先 `db.delete()`);remote Turso 已重 seed
  - `package.json` 加 `npm run check`(astro check);`.github/workflows/ci.yml` 跑 JSON parse + `node --check`

## ⚠️ 已知 caveat

- Astro v5/v6 升級會 break `@astrojs/db@0.14.3`(peer 對 Astro 6)。升 framework 要同步升 db + cloudflare adapter
- `@astrojs/sitemap` 不能升到 3.3+(新版用 Astro 5 的 `astro:routes:resolved` hook,Astro 4 不會 fire,build 會炸 `Cannot read properties of undefined (reading 'reduce')`)。Pin `3.2.1`
- Worker 目前 `No bindings found`——所有路由都 prerendered,runtime worker 幾乎沒做事。Phase 3 動態 API/SSR 一旦啟動,要確認 runtime 能讀到 `ASTRO_DB_REMOTE_URL` / `ASTRO_DB_APP_TOKEN`
- `wrangler.jsonc` 首次 deploy 會印「last published via the Cloudflare Dashboard … overridden」warning,正常
- **生產 URL 仍是 NXDOMAIN 在 2026-05-21**(`dig @1.1.1.1 surf-study.jkjking987.workers.dev` 空回應;TLS 直連 CF anycast 也 SNI handshake fail)。已確認:`workers.dev` 本身正常解析,但 `jkjking987.workers.dev` 整個 subdomain 沒有 record。**必須由 user 親自去 CF dashboard 處理**:
  1. Workers & Pages → Subdomain → 確認帳號 subdomain 是不是真的 `jkjking987`(如果是別的名字,要把 `astro.config.mjs` `site:` 跟 `wrangler.jsonc` 跟 `robots.txt` 都同步換掉)
  2. Workers & Pages → 找 `surf-study` worker → Settings → Triggers → 確認 workers.dev route 是 enabled
  3. 如果 worker 不存在,代表 CF Workers Builds 從 GitHub 那邊還沒成功 deploy 過——去 CF dashboard 看 build log
- 還沒做:
  - 8 個 issue script 抽 common module。看過了,真正 byte-identical 的只有 `escape()` / `asArr()` / `lc()` 三個 1-liner(× 8 files = ~24 行)。其他「看起來重複」的(detail overlay / chip render / card grid)其實 data shape 各家不同,真要 DRY 需要 config-driven 重寫,單次 commit 一次性弄完風險太高。建議分多次 commit 逐個函式 extract
  - bigwave C6 + D2-D8 沒有 `buoyancy_strategy`:**這是 schema 故意的不是 bug**。C6 是 tow-in board(沒 paddle,沒 Guild Factor 概念);D2-D8 是品牌系列概覽(浮力資料分散在各品牌每塊板的 model spec 裡,不該 aggregate 到 family 層)。`bigwave.js:140-141` 已用 optional chaining 處理,UI 不會壞
  - a11y heading h2 hierarchy 跳過、modal ARIA(`role="dialog"` + `aria-modal`)、`--vermillion` contrast ratio 對 paper 背景檢查

---

## 🎯 接下來的目標 (Phase 3: 互動功能擴充)

按優先序：

1. **使用者帳號 (Auth)**：Lucia v3 或 Clerk。Lucia 較輕、能用 Astro DB 當 store;Clerk 較快上線但要外部服務。`db/config.ts` 加 `Users` / `Sessions` 表。
2. **雲端收藏夾**：localStorage 的 favorites 改寫到 Astro DB,新建 `UserFavorites(userId, issue, spotId, kind, createdAt)`。需要 Phase 3-1 的 user session 先到位。
3. **即時浪況 API**:浪點詳情頁串接 Surfline / Stormglass。要在 Astro server endpoint(記得 `export const prerender = false` 讓它走 runtime worker);浪況快取建議用 Cloudflare KV 或 Cache API,免費額度內可控。

## 🛠️ 收尾候選(非阻塞)

- 修生產 URL(Cloudflare dashboard workers.dev route)→ **user action 必要**
- 綁 custom domain → 同步改 `astro.config.mjs` 的 `site`、`wrangler.jsonc`、`public/robots.txt`、`public/og-default.png` 重生成
- 升 wrangler 到 v4(目前 CF 預設 3.114)
- a11y 補:h2 跳過層級、`role="dialog"` + `aria-modal` 在 detail overlay 跟 Tweaks panel、`--vermillion` 對 paper 背景的 WCAG AA contrast 檢查
- 抽 8 個 issue 腳本的共用邏輯到 common module — 詳見上方 caveat 段落。建議從 `escape/asArr/lc` 開始(零風險),再 phase 2 弄 compare-tray,phase 3 才弄 detail overlay(需 config-driven design)
- bigwave 若想統一加 `buoyancy_strategy` 到 D2-D8(D1 已有單 key 範例),建議照 D1 那種 brand-family-aggregate 寫法,不是抄 A/B/C 的完整浮力策略 block
