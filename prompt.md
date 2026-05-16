# 衝浪研究室 (The Surf Study) — Next Steps Prompt

這份文件用於交接給下一次的 AI Assistant，記錄了目前的專案狀態以及接下來需要執行的實作目標。

## 📍 目前專案狀態 (Current State)
- **框架**：Astro v4.16.19 
- **資料庫**：Astro DB (`@astrojs/db` v0.14.3) + Drizzle ORM，Schema 位於 `db/config.ts`。
- **資料狀態**：104 筆資料已成功從靜態 JSON 轉移至 Astro DB，寫死於 `db/seed.ts`，並在每次 `astro build` 時成功灌入。
- **渲染與路由**：所有頁面 (`[slug].astro`) 皆已改為 `db.select()` 直接向資料庫查詢；舊有的純前端 Vanilla JS 介面 (如 `bali.js`) 已改為抓取 `/api/bali.json` 等 API Endpoint。
- **已知環境問題**：目前本機環境有防火牆或權限問題 (`listen EPERM ::1:4321`)，導致 Node.js 無法監聽 port 開啟 `npm run dev` 伺服器，但 `astro build` 編譯靜態網頁與資料庫是 100% 成功的。

---

## 🎯 接下來的目標 (Next Objectives)

當你開始下一個 Session 時，請協助 User 依照下列優先順序進行實作：

### Phase 1: 解決本機伺服器與部署 (Dev Server & Deployment)
1. **排解 Localhost 阻擋問題**：協助排查 `listen EPERM` 錯誤（例如檢查系統防火牆、防毒軟體、或使用 `npx vite --host` 等方式繞過），讓 User 能夠在本機開啟 dev server。
2. **雲端部署設定**：安裝 `@astrojs/cloudflare` 或 `@astrojs/vercel` adapter，並將 `astro.config.mjs` 中的 `output: 'static'` 改為 `output: 'server'` 或 `hybrid`，以便支援 SSR 與即時 API。

### Phase 2: 雲端 CMS 與資料庫連線 (Astro Studio Integration)
目前的 DB 是跑在 Local (SQLite)。
1. 指導 User 執行 `npx astro login` 與 `npx astro link` 連接專案至 Astro Studio。
2. 執行 `npx astro db push`，將本機 `seed.ts` 內的 104 筆資料推送到雲端的 Turso Edge Database。
3. 驗證從 Astro Studio 後台可以直接編輯浪點資訊，且網頁能即時更新。

### Phase 3: 升級互動功能 (Backend Feature Expansion)
既然已經有真正的後端了，接下來可以將原本存放在 `localStorage` 的功能升級：
1. **使用者帳號系統 (Auth)**：整合 Lucia v3 或 Clerk，讓使用者可以註冊/登入。
2. **雲端收藏夾**：把原本記錄在 `localStorage` 的「Favorites」功能改為寫入 Astro DB（需建立新的 `UserFavorites` table）。
3. **即時浪況 API (可選)**：在 Astro 的 Server 端串接 Surfline 或 Stormglass API，讓浪點詳情頁可以顯示當天的即時浪高與風向。

---

**🤖 給 AI 的指示：**
讀取本檔案後，請詢問 User：「目前專案已經完成 Astro DB 的整併。請問我們要先解決本機 Dev Server 無法啟動的問題，還是要直接進行雲端部署與連線 Astro Studio 呢？」
