/* =========================================================
   衝浪研究室 — Common UI: Tweaks panel, Favorites,
   Uncertain toggle, Print mode, Global search, Detail nav
   ========================================================= */

// ===== Favorites (localStorage) =====
const FAV_KEY = "surf-study.favs.v1";
function getFavs(){ try { return JSON.parse(localStorage.getItem(FAV_KEY) || "{}"); } catch(e){ return {}; } }
function setFavs(o){ localStorage.setItem(FAV_KEY, JSON.stringify(o)); }
function isFav(issue, key){ return !!getFavs()[`${issue}/${key}`]; }
function toggleFav(issue, key){
  const f = getFavs();
  const k = `${issue}/${key}`;
  if(f[k]) delete f[k]; else f[k] = Date.now();
  setFavs(f);
  document.dispatchEvent(new CustomEvent("favchange", { detail: { issue, key }}));
  return !!f[k];
}
window.toggleFav = toggleFav;
window.isFav = isFav;
window.getFavs = getFavs;

// ===== Theme / palette variants =====
const THEMES = {
  vermillion: { name: "朱紅 · Vermillion", desc: "預設熱帶版",
    vars: { '--paper':'#F2E6D0','--paper-deep':'#E8D9B8','--ink':'#1A1614',
            '--vermillion':'#E84F1B','--ocean':'#0D3B5C','--teal':'#2A8378',
            '--mustard':'#D9A640','--oxblood':'#882F25' }},
  ocean:      { name: "深海 · Ocean", desc: "Surfline 風",
    vars: { '--paper':'#EEF1F2','--paper-deep':'#DEE3E6','--ink':'#0B1E2D',
            '--vermillion':'#0D5B9C','--ocean':'#0B1E2D','--teal':'#057A85',
            '--mustard':'#E3A33B','--oxblood':'#2A4A6B' }},
  zine:       { name: "黑白 · Zine", desc: "影印機美學",
    vars: { '--paper':'#EFE9DA','--paper-deep':'#DAD1B8','--ink':'#0F0F0F',
            '--vermillion':'#0F0F0F','--ocean':'#2F2F2F','--teal':'#4A4A4A',
            '--mustard':'#8C8C8C','--oxblood':'#1F1F1F' }},
  jungle:     { name: "雨林 · Jungle", desc: "Boardroom 深綠",
    vars: { '--paper':'#EFE6CE','--paper-deep':'#E1D5B5','--ink':'#1B2614',
            '--vermillion':'#D14E2A','--ocean':'#1B2614','--teal':'#4B6C2A',
            '--mustard':'#C98D2A','--oxblood':'#6E2515' }}
};

const TWEAKS_KEY = "surf-study.tweaks.v1";
function getTweaks(){
  try { return JSON.parse(localStorage.getItem(TWEAKS_KEY)) || {}; }
  catch(e){ return {}; }
}
function applyTweaks(){
  const t = getTweaks();
  const theme = t.theme || "vermillion";
  const vars = THEMES[theme]?.vars || THEMES.vermillion.vars;
  const root = document.documentElement;
  for(const [k,v] of Object.entries(vars)) root.style.setProperty(k, v);
  document.body.dataset.theme = theme;
  document.body.dataset.density = t.density || "default";
  document.body.dataset.hideUncertain = t.hideUncertain ? "1" : "";
}
window.applyTweaks = applyTweaks;
window.getTweaks = getTweaks;
window.setTweaks = function(t){
  localStorage.setItem(TWEAKS_KEY, JSON.stringify(t));
  applyTweaks();
  document.dispatchEvent(new CustomEvent("tweakschange"));
};

// ===== Tweaks panel UI =====
function mountTweaksFAB(){
  if(document.getElementById("tweaks-fab")) return;
  const fab = document.createElement("button");
  fab.id = "tweaks-fab";
  fab.title = "Tweaks · 主題與顯示";
  fab.innerHTML = "TWEAKS";
  fab.onclick = () => openTweaks();
  document.body.appendChild(fab);
}
window.openTweaks = function(){
  let p = document.getElementById("tweaks-panel");
  if(!p){
    p = document.createElement("div");
    p.id = "tweaks-panel";
    document.body.appendChild(p);
  }
  const t = getTweaks();
  const theme = t.theme || "vermillion";
  const density = t.density || "default";
  const hideUncertain = !!t.hideUncertain;
  p.innerHTML = `
    <div class="tw-head">
      <span>TWEAKS · 顯示設定</span>
      <button onclick="closeTweaks()" class="tw-close">×</button>
    </div>
    <div class="tw-body">
      <div class="tw-section">
        <div class="tw-label">配色 / PALETTE</div>
        <div class="tw-swatches">
          ${Object.entries(THEMES).map(([id,th]) => `
            <button class="tw-sw ${theme===id?'active':''}" data-theme="${id}" title="${th.desc}">
              <span class="tw-sw-paper" style="background:${th.vars['--paper']}; border:2px solid ${th.vars['--ink']};">
                <span class="tw-sw-dot" style="background:${th.vars['--vermillion']};"></span>
                <span class="tw-sw-dot" style="background:${th.vars['--ocean']};"></span>
                <span class="tw-sw-dot" style="background:${th.vars['--teal']};"></span>
                <span class="tw-sw-dot" style="background:${th.vars['--mustard']};"></span>
              </span>
              <span class="tw-sw-name">${th.name}</span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="tw-section">
        <div class="tw-label">密度 / DENSITY</div>
        <div class="tw-row">
          ${[["default","標準"],["compact","緊湊"]].map(([v,l])=>`
            <button class="tw-btn ${density===v?'active':''}" data-density="${v}">${l}</button>
          `).join("")}
        </div>
      </div>
      <div class="tw-section">
        <div class="tw-label">顯示 / DISPLAY</div>
        <div class="tw-row">
          <button class="tw-btn ${hideUncertain?'active':''}" data-toggle="hideUncertain">
            ${hideUncertain?'☑':'☐'} 隱藏 <em>[uncertain]</em> 欄位
          </button>
        </div>
        <div class="tw-row" style="margin-top:8px;">
          <button class="tw-btn" onclick="window.print()">🖨 列印 / 匯出 PDF</button>
        </div>
      </div>
      <div class="tw-section">
        <div class="tw-label">收藏 / FAVORITES (${Object.keys(getFavs()).length})</div>
        <div id="tw-fav-list" class="tw-fav-list"></div>
      </div>
      <div class="tw-section">
        <div class="tw-label">重設</div>
        <div class="tw-row">
          <button class="tw-btn" onclick="window.setTweaks({});location.reload();">重設主題</button>
          <button class="tw-btn" onclick="localStorage.removeItem('${FAV_KEY}'); openTweaks();">清空收藏</button>
        </div>
      </div>
    </div>
  `;
  p.classList.add("open");
  // bind clicks
  p.querySelectorAll("[data-theme]").forEach(el => {
    el.onclick = () => { window.setTweaks({...getTweaks(), theme: el.dataset.theme}); openTweaks(); };
  });
  p.querySelectorAll("[data-density]").forEach(el => {
    el.onclick = () => { window.setTweaks({...getTweaks(), density: el.dataset.density}); openTweaks(); };
  });
  p.querySelectorAll("[data-toggle]").forEach(el => {
    el.onclick = () => {
      const k = el.dataset.toggle;
      const cur = getTweaks();
      window.setTweaks({...cur, [k]: !cur[k]});
      openTweaks();
    };
  });
  renderFavList();
};
window.closeTweaks = function(){
  document.getElementById("tweaks-panel")?.classList.remove("open");
};
function renderFavList(){
  const wrap = document.getElementById("tw-fav-list");
  if(!wrap) return;
  const favs = Object.entries(getFavs());
  if(!favs.length){
    wrap.innerHTML = `<div class="tw-fav-empty">尚無收藏 — 在卡片或詳情頁按 ★ 即可加入</div>`;
    return;
  }
  const issueLabels = { bali: "Bali", hainan: "海南", board: "Board" };
  const issueUrl = { bali: "/bali", hainan: "/hainan", board: "/boards" };
  wrap.innerHTML = favs.sort((a,b)=>b[1]-a[1]).map(([k,t]) => {
    const [issue, key] = k.split("/");
    return `<div class="tw-fav">
      <span class="tw-fav-issue">${issueLabels[issue]||issue}</span>
      <a href="${issueUrl[issue]||'index.html'}#detail=${encodeURIComponent(key)}" class="tw-fav-name">${key.replace(/_/g,' ')}</a>
      <button class="tw-fav-x" onclick="toggleFav('${issue}','${key}');renderFavList();">×</button>
    </div>`;
  }).join("");
}
window.renderFavList = renderFavList;

// ===== Global search across all issues =====
let GLOBAL_INDEX = null;
async function loadGlobalIndex(){
  if(GLOBAL_INDEX) return GLOBAL_INDEX;
  const [bali, hainan, board] = await Promise.all([
    fetch("/api/bali.json").then(r=>r.json()).catch(()=>({})),
    fetch("/api/hainan.json").then(r=>r.json()).catch(()=>({})),
    fetch("/api/board.json").then(r=>r.json()).catch(()=>({}))
  ]);
  const idx = [];
  for(const [k,v] of Object.entries(bali)){
    const name = v.basic_info?.name || v.name || k;
    idx.push({issue: "bali", key: k, name: String(name), region: v.basic_info?.region || v.region || "",
              blurb: v.surf_conditions?.wave_type || v.wave_type || "" });
  }
  for(const [k,v] of Object.entries(hainan)){
    const name = v.basic_info?.name || k;
    idx.push({issue: "hainan", key: k, name: String(name), region: v.basic_info?.location?.slice(0,40) || "",
              blurb: v.technical_specs?.wave_technology_brand || v.basic_info?.operator || "" });
  }
  for(const [k,v] of Object.entries(board)){
    const name = v.basic_info?.["名稱"] || k;
    idx.push({issue: "board", key: k, name: String(name), region: v.basic_info?.["分類"] || "",
              blurb: v.basic_info?.["一句話定位"] || "" });
  }
  GLOBAL_INDEX = idx;
  return idx;
}
window.openGlobalSearch = async function(){
  let p = document.getElementById("global-search");
  if(!p){
    p = document.createElement("div");
    p.id = "global-search";
    document.body.appendChild(p);
  }
  p.innerHTML = `
    <div class="gs-mask" onclick="closeGlobalSearch()"></div>
    <div class="gs-panel">
      <div class="gs-head">
        <input id="gs-input" placeholder="搜尋 104 個項目 · SEARCH ALL ENTRIES…" autofocus />
        <button onclick="closeGlobalSearch()" class="gs-close">ESC</button>
      </div>
      <div class="gs-results" id="gs-results">
        <div class="gs-hint">輸入關鍵字搜尋 Bali / 海南 / Board · 50+21+33 = 104 項</div>
      </div>
    </div>
  `;
  p.classList.add("open");
  await loadGlobalIndex();
  const input = document.getElementById("gs-input");
  input.focus();
  input.addEventListener("input", e => doGlobalSearch(e.target.value));
  document.addEventListener("keydown", gsKeyHandler);
};
window.closeGlobalSearch = function(){
  document.getElementById("global-search")?.classList.remove("open");
  document.removeEventListener("keydown", gsKeyHandler);
};
function gsKeyHandler(e){ if(e.key === "Escape") closeGlobalSearch(); }
function doGlobalSearch(q){
  const out = document.getElementById("gs-results");
  if(!GLOBAL_INDEX) return;
  q = q.toLowerCase().trim();
  if(!q){ out.innerHTML = `<div class="gs-hint">輸入關鍵字搜尋 Bali / 海南 / Board · 104 項</div>`; return; }
  const matches = GLOBAL_INDEX.filter(x => {
    const hay = `${x.name} ${x.region} ${x.blurb} ${x.key}`.toLowerCase();
    return hay.includes(q);
  }).slice(0, 30);
  if(!matches.length){
    out.innerHTML = `<div class="gs-hint">沒有結果</div>`;
    return;
  }
  const issueLabels = { bali: ["BALI","tag-verm","/bali"], hainan: ["HAINAN","tag-ocean","/hainan"], board: ["BOARD","tag-must","/boards"] };
  out.innerHTML = matches.map(m => {
    const [lbl, cls, url] = issueLabels[m.issue];
    return `<a class="gs-row" href="${url}#detail=${encodeURIComponent(m.key)}">
      <span class="tag ${cls}">${lbl}</span>
      <span class="gs-name">${m.name.replace(/\s*\(.*?$/,'').slice(0,80)}</span>
      <span class="gs-blurb">${(m.region||m.blurb||'').slice(0,80)}</span>
    </a>`;
  }).join("");
}

// ===== Detail prev/next nav helper (page-specific JS must set this) =====
window.SS_CURRENT_LIST = []; // array of keys currently displayed
window.SS_CURRENT_KEY = null;
window.detailPrevNext = function(dir){
  const list = window.SS_CURRENT_LIST;
  const cur = window.SS_CURRENT_KEY;
  if(!list.length || !cur) return;
  const i = list.indexOf(cur);
  if(i < 0) return;
  const next = list[(i + dir + list.length) % list.length];
  if(window.openDetail) window.openDetail(next);
};

// ===== Boot =====
window.addEventListener("DOMContentLoaded", () => {
  applyTweaks();
  mountTweaksFAB();
  // Open detail if URL hash says so
  if(location.hash.startsWith("#detail=")){
    const key = decodeURIComponent(location.hash.slice(8));
    setTimeout(() => window.openDetail && window.openDetail(key), 600);
  }
  // Keyboard
  document.addEventListener("keydown", e => {
    if(e.key === "/" && !e.target.matches("input,textarea")){
      e.preventDefault();
      openGlobalSearch();
    }
    if(e.key === "Escape"){
      closeTweaks();
      if(typeof closeDetail === "function") closeDetail();
    }
    if(e.key === "ArrowRight" && document.querySelector(".detail-overlay.open")){
      window.detailPrevNext(1);
    }
    if(e.key === "ArrowLeft" && document.querySelector(".detail-overlay.open")){
      window.detailPrevNext(-1);
    }
  });
});
