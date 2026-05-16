# 衝浪研究室 — 後端工程交接文件
## The Surf Study · Engineering Handoff

---

## 1. 現況快照 / Current State

**目前是個 100% 靜態原型,部署到 GitHub Pages / Vercel Static 就能跑。**

| 項目 | 內容 |
|---|---|
| 檔案結構 | `index.html` + `bali.html` + `hainan.html` + `board.html` + 3 JS + 4 CSS + 3 JSON (~1.2 MB) |
| 框架 | 無 — vanilla JS + ES2020 + CSS variables |
| 字型 | Google Fonts (Abril Fatface · Noto Serif TC · Noto Sans TC · DM Serif Display · Yeseva One · JetBrains Mono) |
| 互動狀態 | 全在 `localStorage` (favorites, theme tweaks) |
| 路由 | URL hash (`#detail=Uluwatu`) — 非 SEO 友善 |
| 資料 | 3 個靜態 JSON,前端 fetch + 處理 |
| 字數 / 條目 | 104 entries × 平均 25 欄位 = ~2,600 個獨立欄位 |
| 圖片 | 0 張真實照片 — 全是 SVG 佔位 + 文字 |

**已實作功能**: search, filter, season calendar, skill matcher, trip planner, compare, SVG maps (Bali + Hainan), 板型剪影, citations panel, 4 themes, favorites, print mode, global search, keyboard shortcuts.

---

## 2. 變成正式網站缺什麼 / Gaps

### A. 基礎建設 / Infrastructure
1. **Hosting + DNS + SSL** — Vercel / Netlify / Cloudflare Pages + custom domain
2. **CDN** — 靜態資源快取
3. **Error monitoring** — Sentry
4. **Analytics** — Plausible / PostHog / Umami(隱私友善)
5. **Uptime monitoring** — Better Stack / UptimeRobot
6. **CI/CD pipeline** — GitHub Actions: lint → test → deploy

### B. 框架重構 / Framework
7. **改用 Astro 或 Next.js 13+** — 為什麼:
   - 每個 entry 需要自己的 URL(`/bali/spots/uluwatu` 而非 `#detail=Uluwatu`)→ SEO + 分享
   - 靜態生成 104 個 entry 頁,每頁 5 KB → 比現在 1.2 MB JSON 全載入快 100×
   - 圖片 / 字型 / JS 自動優化
   - TypeScript 強型別 → 資料 schema 編譯時驗證
8. **改用 TypeScript** — 104 個 entry 各 25 欄位,沒有型別會災難性
9. **Build pipeline** — Vite / Astro built-in
10. **i18n** — 至少加 English(技術詞彙原本就是英文)

### C. 資料層 / Data Layer
11. **Schema 定義 + 驗證** — Zod schema:
    ```ts
    const SurfSpot = z.object({
      basic_info: z.object({ name: z.string(), region: z.enum([...]), ... }),
      surf_conditions: z.object({ wave_type: z.string(), ... }),
      uncertain: z.array(z.string())
    })
    ```
12. **資料來源切割**:
    - **靜態研究內容** → Markdown + frontmatter in `content/` (git-controlled)
    - **變動資料**(價格、營業時間、活動) → DB
    - **使用者資料**(收藏、行程、評論) → DB
13. **資料 CMS** — 三選一:
    - **Sanity** — 最強編輯體驗,有 free tier
    - **Payload CMS** — self-hosted,TypeScript-native
    - **Markdown + GitHub** — 零成本,適合 1 人維護
14. **Database** — Postgres via:
    - **Supabase** — 一站式(DB + auth + storage + realtime)
    - **Neon** + Auth.js + Cloudflare R2
15. **資料版本歷史** — 報告會隨季節更新,需要時間軸
16. **不確定欄位 → 校驗工作流程** — 目前 `[uncertain]` 標籤,需要編輯介面把它升級成「已驗證」+ 來源連結

### D. 使用者系統 / Users
17. **驗證** — Auth.js / Clerk / Supabase Auth
    - 社群登入(Google · Apple · LINE 對台灣用戶)
    - Email OTP
    - Anonymous → upgrade flow(目前 localStorage 收藏要能遷移)
18. **User profile** — 體重、技術等級、家鄉浪點、板房 quiver
19. **Saved trips** — 雲端同步多裝置
20. **社群功能**(視商業模式):
    - 評論 / 評分(每個 spot 0-5 星)
    - 浪況回報("今早 Uluwatu 4ft clean")
    - 照片上傳
    - 用戶板房分享

### E. 即時資料整合 / Live Data
21. **Surf forecast API** — 幾個選擇:
    - **Surfline API** — 業界標準,但很貴($1k+/月企業方案,沒有公開 API)
    - **Windguru** — 免費但有限制,可 iframe embed
    - **Stormglass.io** — $10/月起,REST API,適合
    - **Open-Meteo Marine API** — 完全免費,wave height + period + direction
22. **Tide chart** — NOAA / TideForecast (印尼 / 中國海域可能要找區域服務)
23. **Webcam** — Surfline 提供 embed URL,不需要 API key,直接 iframe
24. **Weather** — Open-Meteo(免費)/ OpenWeather
25. **Maps** — Mapbox($5/month free tier) 或 Google Maps
26. **News / Events** — 比賽日程要爬蟲或手動

### F. 圖片 / 媒體 / Imagery
27. **真實照片** — 目前全是 placeholder:
    - 每個浪點 1 張英雄圖 + 3-5 張 lineup / takeoff
    - 來源:授權 stock photos(Unsplash 大部分可用)、買 surf photographer 授權、或社群投稿
28. **Image hosting + 優化** — Cloudflare Images / Cloudinary / Vercel Image
29. **影片** — drone shot of each spot(很貴,可延後)
30. **板型剪影升級** — 現在是 SVG 程式畫,可換成 shaper 提供的官方輪廓圖

### G. SEO / 內容發布
31. **每個 entry 一個 URL** — `/bali/spots/uluwatu`、`/hainan/pools/surfland-wanning`、`/boards/c4-modern-twin-fin`
32. **JSON-LD structured data** — schema.org/TouristAttraction、schema.org/Article
33. **Open Graph + Twitter cards** — 每頁要有專屬 OG image(可程式生成)
34. **Sitemap.xml + robots.txt**
35. **Canonical URLs + redirects**
36. **RSS feed** — 訂閱 issue 更新
37. **Email newsletter** — Substack / Buttondown / ConvertKit

### H. 法規 / 商業
38. **Privacy policy + Cookie consent** — GDPR / 台灣個資法
39. **Terms of service**
40. **Affiliate disclosure** — 若會放 Booking.com / 機票連結
41. **Source attribution UI** — 學術引用格式,目前的 verification_sources 要結構化
42. **Content license** — CC-BY-SA / 你自己保留?讓使用者知道能不能轉載

### I. 效能 / 體驗 / Performance
43. **Code splitting** — Bali/Hainan/Board 各自獨立 bundle
44. **Static generation** — pre-render 所有頁面
45. **Service Worker / PWA** — 行前下載離線版,出國沒網路也能查
46. **Image lazy loading**
47. **Font subset** — Noto 字型很大,要 subset 出實際用到的字
48. **Lighthouse 跑分目標**: 90+ all axes

### J. 可選進階 / Nice-to-have
49. **天氣 → 浪況預測模型** — ML 用歷史資料預測哪天去哪個浪點最好
50. **AI assistant** — 接 Claude API,使用者問「我這週末有 3 天,Bali 中階,要去哪?」自動規劃
51. **Surfline integration** — 用使用者的 Surfline 訂閱資料
52. **Marketplace** — surfboard 二手交易、教練預約
53. **Mobile app** — React Native / Expo;當前的 PWA 也許就夠

---

## 3. 建議技術選型 / Stack

### 推薦組合 (boring tech, fast)

```
Frontend:   Astro 4 + TypeScript + Tailwind CSS
Hosting:    Vercel / Cloudflare Pages
DB:         Supabase (Postgres + Auth + Storage + Realtime)
Search:     Pagefind (static, $0) → Meilisearch ($10/mo) when scale
Maps:       Mapbox GL JS
Images:     Cloudflare Images
CMS:        Markdown in repo + GitHub (簡單) 或 Sanity (編輯體驗好)
Analytics:  Plausible
Errors:     Sentry (free tier)
i18n:       Astro built-in (zh-TW + en)
Email:      Resend
Forecast:   Open-Meteo Marine API (free)
Auth:       Supabase Auth (Google + LINE + Email)
```

**為什麼 Astro 而不是 Next**:
- 大部分內容是靜態 — Astro 預設零 JS
- 互動小區塊用 `<island>` 注入 React/Vue/Svelte component(只有那一塊吃 JS)
- 比 Next 簡單,部署快
- 內建 i18n、image optimization、content collections

### 簡化路徑 (one-person, side project)

如果只是個人用 + 偶爾發布:
- 維持靜態 HTML(現在的設計直接 deploy 到 Cloudflare Pages 就行)
- 加 Pagefind 把全域搜尋變成正式索引
- 加 PWA manifest 讓它能 install 到手機
- 不做 backend,user data 永遠在 localStorage
- 估算每月成本 < USD 5

---

## 4. 遷移路線圖 / Migration Roadmap

### Phase 0 — 立即上線 (1 天)
- Cloudflare Pages 或 Vercel deploy 當前的靜態檔案
- 買 domain · 設 SSL
- 加 Plausible analytics
- 加 sitemap.xml(腳本生成)

### Phase 1 — Astro 重寫 (1-2 週)
- `npm create astro@latest` + content collections
- 把 3 個 JSON 轉成 Markdown + frontmatter (104 個檔案)
- 每個 entry 一個獨立 URL
- 把現有 CSS 搬進 Astro,保留設計系統
- 把 vanilla JS 互動轉成 Astro Islands(Map / Selector / Trip Planner / Compare 各自一個 island)
- Pagefind 全文索引
- Zod schema 驗證所有 entries 編譯時不會炸

### Phase 2 — 加使用者 (1-2 週)
- Supabase project + auth
- 收藏資料從 localStorage 遷移到 DB(登入後合併)
- Saved trips 雲端
- 簡單 user profile

### Phase 3 — 接活資料 (1-2 週)
- Open-Meteo Marine API → 每個 spot 顯示未來 7 天浪況
- Surfline webcam embed
- Mapbox 取代手繪 SVG 地圖
- Forecast 結合 spot 條件 → "今天適合的浪點 Top 3"

### Phase 4 — CMS + i18n (2-3 週)
- Sanity Studio 或 Markdown-as-CMS
- English 翻譯(報告原本就是中英混合,英文版補完)
- 編輯流程:research → review → publish

### Phase 5 — 社群 (4+ 週)
- 評論 / 浪況回報
- 照片上傳
- Newsletter
- 視商業模式決定要不要做

**總時程**: 一人全職 ~ 6-8 週可上線到 Phase 3。Phase 5 看商業需求。

---

## 5. 工程 Prompt (給開發者 / AI agent)

> 把下面這段貼給工程師或 Claude Code / Cursor。

````
# 任務:把「衝浪研究室」靜態原型重構成 Astro 網站

## 背景
我有一個 4 頁的靜態 HTML 原型(`index.html`、`bali.html`、`hainan.html`、`board.html`),
是用 vanilla JS + CSS variables 寫的衝浪研究田野誌。資料是 3 個 JSON 檔
(`data/bali.json` 50 項、`data/hainan.json` 21 項、`data/board.json` 33 項)。

請把它重構成正式可上線的 Astro 4 網站,保留設計系統與互動功能,
但讓每個 entry 有自己的 URL,SEO 友善,效能達標 Lighthouse 90+。

## 技術需求

### Stack(固定)
- Astro 4 + TypeScript (strict)
- Tailwind CSS(把現有 CSS 變數遷移成 Tailwind theme config)
- Astro Content Collections + Zod schemas
- Pagefind for static search
- Mapbox GL JS for maps(取代 SVG 手繪)
- Open-Meteo Marine API for live forecast
- Plausible analytics
- 部署 target: Cloudflare Pages

### 資料層
1. 把 3 個 JSON 轉成 104 個 Markdown 檔案,放在:
   - `src/content/bali/{key}.md` — frontmatter 含 surf_conditions / safety_culture 等所有結構化欄位
   - `src/content/hainan/{key}.md`
   - `src/content/boards/{key}.md`
   - `[uncertain]` 標記用 frontmatter `uncertain: ["wave_length_meters", ...]` 保留
2. 用 Zod schema 在 `src/content/config.ts` 嚴格定義每種 collection
3. Schema 對齊原 JSON 結構,但加入 type narrowing
   (e.g. `region: z.enum([...])`、`category: z.enum([...])`)
4. 編譯時若有 entry 不符 schema,build 直接失敗

### 路由
- `/` — 主期刊 masthead
- `/bali` — Bali issue index
- `/bali/spots/uluwatu` — entry detail
- `/bali/season` — season calendar
- `/bali/skill-match` — skill matcher
- `/bali/trip-planner` — trip planner
- `/bali/map` — Mapbox 地圖
- `/bali/compare?keys=Uluwatu,Bingin` — compare 用 query param
- 同樣 pattern 給 hainan 與 boards
- 全部支援 og:image(用 `@vercel/og` 或 Satori 程式生成)

### 互動 Islands
把這些做成 React/Solid/Svelte component,用 `client:visible`:
- `<TweaksPanel />` — 4 themes + density + uncertain toggle + print(現有)
- `<GlobalSearch />` — `/` 鍵開,Pagefind 索引
- `<SeasonCalendar items={spots} />` — 12 月 × spot 矩陣
- `<SkillMatcher />`
- `<TripPlanner />`
- `<CompareTable />`
- `<BaliMapbox />` — 取代當前 SVG
- `<HainanMapbox />`
- `<BoardSelector />` — volume calculator + recommendations
- `<BoardSilhouette spec={...} />` — 保留 SVG 但做成可參數化 component
- `<FavoriteButton issue={...} key={...} />` — 收藏(初期 localStorage,後加 Supabase sync)

### 設計系統
- 把 `style.css` 的 CSS variables 移成 Tailwind theme tokens
- 保留 4 個 theme(vermillion / ocean / zine / jungle) → 用 `data-theme` 屬性 + CSS custom properties
- 字型保留(Abril Fatface / Noto Serif TC / Noto Sans TC / JetBrains Mono / DM Serif Display / Yeseva One)
- 字型 subset:用 `subfont` 或 fontaine 自動處理 Noto 字型,只載入實際出現的字
- 紙紋 SVG noise overlay 保留(現在的 `body::before`)
- 半色調 dot pattern 保留

### SEO
- 每個 entry 自動產生 `<meta>` + `<link rel="canonical">`
- JSON-LD:
  - 浪點 → schema.org/TouristAttraction + Place
  - 浪池 → schema.org/SportsActivityLocation
  - 板款 → schema.org/Product
- sitemap.xml 自動產生
- robots.txt 開放
- OG image:每個 entry 程式生成一張(背景用 theme 配色 + 大字 entry 名 + region tag)

### 效能目標
- LCP < 2s on 4G
- 每個 entry 頁 < 50 KB JS(只載入需要的 islands)
- Pagefind index < 200 KB total
- Lighthouse Performance / Accessibility / Best Practices / SEO ≥ 90

### 不要做的事
- 不要加任何 backend / DB(第一版純靜態)
- 不要加 user auth(收藏先用 localStorage)
- 不要加 comments / 評論
- 不要重新設計 UI — 100% 保留現有視覺與互動模式
- 不要重寫資料 — schema 對齊原 JSON 欄位

### Deliverables
1. `git clone`-able Astro repo,`pnpm i && pnpm dev` 直接跑
2. `pnpm build` 產生靜態檔可丟 Cloudflare Pages
3. `README.md` 含:
   - 本地開發步驟
   - 內容更新流程("要改一個浪點 → 編 `src/content/bali/uluwatu.md`")
   - 部署步驟
   - 環境變數清單(Mapbox token、Open-Meteo 不用 key)
4. 每個 Astro Island component 有對應的 Storybook story 或測試案例
5. 至少一個 Playwright e2e test 跑通 critical path
   (從 home → bali index → uluwatu detail → 收藏 → tweaks 換主題)
6. Lighthouse CI 跑在 GitHub Actions,< 90 分時 fail

### 階段交付
- **Week 1**: Astro skeleton + content collections + 路由 + 靜態 entry 頁
- **Week 2**: Islands (search、map、selector、trip planner、compare、season)
- **Week 3**: Theme system、OG images、SEO、Lighthouse 達標
- **Week 4**: Deploy + monitoring

## 原始資產
所有現有檔案在 zip 內:
- `*.html` × 4
- `*.js` × 4(common.js, bali.js, hainan.js, board.js)
- `*.css` × 3(style.css, issue.css, common.css)
- `data/*.json` × 3
- 完整功能規格詳見 `index.html` (是有意保留的 masthead landing)

## 開始第一步
1. `pnpm create astro@latest surf-study --template basics --typescript strict`
2. 在 `src/content/config.ts` 定義 3 個 Zod schema
3. 寫個 Node 腳本把原 JSON → 104 個 `.md` 檔
4. 把第一個 entry 頁 `/bali/spots/uluwatu` 跑通
5. Demo 給我看,我會決定要不要繼續

問我問題:
- 翻譯英文時你要幫我做還是只做架構保留中文?
- 真實照片你要不要先放 placeholder 等我提供?
- Mapbox token 我要不要先去申請?
````

---

## 6. 預估成本 / Cost Estimate

| 項目 | 月成本 |
|---|---|
| Domain(.com) | ~$1 |
| Cloudflare Pages | $0 |
| Supabase free tier | $0(< 500MB DB,< 50k MAU) |
| Mapbox free tier | $0(< 50k map loads/月) |
| Plausible / PostHog | $9 / $0 |
| Sentry free | $0 |
| Resend free | $0(< 3k emails/月) |
| Open-Meteo | $0 |
| Cloudflare Images | $5(100k images stored) |
| **總計(個人 / 早期)** | **~$15/月** |

升級到付費 tier 大約是 MAU > 10k 或內容量過 1k entries 才需要。

---

## 7. 如果你只想最快上線

**不重構也能做的事**(週末就能完成):

1. **Cloudflare Pages deploy** — 拖整個資料夾上去,5 分鐘上線
2. **加 Pagefind 靜態索引** — `npx pagefind --site .`,把當前 global search 換掉
3. **加 PWA manifest** — 讓手機能加到主畫面
4. **加 sitemap.xml** — 腳本生成
5. **加 OG images** — 一張通用大圖就行(設計檔)
6. **加 Plausible script** — 一行 `<script>` 引入

到這就 95% 的訪客體驗都已經達標了。Astro 重構是當你要長期維護、加新功能、做 SEO 流量才值得投入的事。

---

_Doc generated 2026.05.15 · The Surf Study v1 prototype_
