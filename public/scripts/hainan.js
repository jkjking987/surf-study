// =========================================================
// 衝浪研究室 — Hainan Issue (No. 002)
// =========================================================

const CITIES = [
  { id: "wanning",  ch: "萬寧", short: "WAN", en: "Wanning",  match: /萬寧|万宁|wanning|riyue/i },
  { id: "sanya",    ch: "三亞", short: "SAN", en: "Sanya",    match: /三亞|三亚|sanya|houhai|后海|後海|haitang|dadonghai/i },
  { id: "haikou",   ch: "海口", short: "HK",  en: "Haikou",   match: /海口|haikou|fuxing|wet'?n.?wild|wetnwild|hangzhou|guanlanhu|觀瀾湖|观澜湖/i },
  { id: "lingshui", ch: "陵水", short: "LSH", en: "Lingshui", match: /陵水|lingshui|fuli|qingshui|清水|香水/i },
  { id: "wenchang", ch: "文昌", short: "WC",  en: "Wenchang", match: /文昌|wenchang|tonggu/i },
  { id: "danzhou",  ch: "儋州", short: "DZ",  en: "Danzhou",  match: /儋州|danzhou|ocean.flower/i }
];

const CAT_MAP = {
  artificial_wave_pool: { ch: "人工浪池", short: "POOL",   tagClass: "tag-ocean" },
  natural_surf_spot:    { ch: "自然浪點", short: "SPOT",   tagClass: "tag-verm" },
  surf_school:          { ch: "衝浪學校", short: "SCHOOL", tagClass: "tag-teal" },
  surf_club:            { ch: "衝浪俱樂部", short: "CLUB", tagClass: "tag-teal" },
  water_resort_family:  { ch: "水樂園/度假", short: "RESORT", tagClass: "tag-must" },
  event_festival:       { ch: "賽事/節日", short: "EVENT",  tagClass: "tag-blood" }
};

const STATUS_MAP = {
  operating:           { ch: "營運中",       tagClass: "tag-teal", weight: 3 },
  annual:              { ch: "年度賽事",     tagClass: "tag-must", weight: 2 },
  unverified:          { ch: "未驗證",       tagClass: "tag-ink",  weight: 1 },
  planning_unverified: { ch: "規劃中/未驗",  tagClass: "tag-ink",  weight: 0 },
  not_found:           { ch: "查無證據",     tagClass: "tag-blood", weight: -1 }
};

let ALL = [];
let RAW = null;
let FILTERS = { q: "", city: "all", category: "all", status: "all" };
let COMPARE = [];
const MAX_COMPARE = 4;

function lc(s){ return (s||"").toLowerCase(); }
function asArr(x){ return Array.isArray(x)?x:(x?[x]:[]); }
function escape(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function inferCity(text){
  for(const c of CITIES) if(c.match.test(text||"")) return c;
  return null;
}

function shortName(s){
  if(!s) return "";
  // Take only the portion before first " ("
  const i = s.indexOf(" (");
  if(i > 0) return s.slice(0, i).trim();
  return s.trim();
}
function extractCh(s){
  if(!s) return "";
  // First parenthetical that contains Chinese
  const m = s.match(/\(([^()]*[\u4e00-\u9fff][^()]*)\)/);
  if(m) {
    // Clean it up - take just the Chinese portion if mixed with prefix like "Chinese: ..."
    let ch = m[1].trim();
    ch = ch.replace(/^.*Chinese:\s*/i, "");
    ch = ch.replace(/^.*中文[:：]\s*/i, "");
    // If multiple variants separated by /, keep first
    if(ch.includes("/") && ch.split("/").length > 1) ch = ch.split("/")[0].trim();
    return ch;
  }
  if(/^[\u4e00-\u9fff·\s\/]+$/.test(s)) return s;
  return "";
}

function normalize(key, raw){
  const bi = raw.basic_info || {};
  const ts = raw.technical_specs || {};
  const ps = raw.pricing_sessions || {};
  const eg = raw.experience_guide || {};
  const sr = raw.surroundings || {};
  const rr = raw.reviews_reputation || {};
  const vf = raw.verification || {};

  const name = bi.name || key;
  const city = inferCity(bi.location || name);
  const cat = bi.category || "";
  const status = bi.status || "";

  // Skill range
  let skill = [];
  const skillText = eg.skill_required || "";
  if(/all\s*levels?|beginner|初學/i.test(skillText)) skill.push("B");
  if(/intermediate|中階/i.test(skillText)) skill.push("I");
  if(/advanced|進階/i.test(skillText)) skill.push("A");
  if(/pro/i.test(skillText)) skill.push("P");
  if(!skill.length && cat === "natural_surf_spot") skill = ["B","I","A"];
  if(!skill.length) skill = ["B","I"];

  return {
    key, raw,
    name: shortName(name),
    name_full: name,
    ch: extractCh(name),
    category: cat,
    cat_short: CAT_MAP[cat]?.short || "—",
    cat_ch:    CAT_MAP[cat]?.ch    || cat,
    cat_class: CAT_MAP[cat]?.tagClass || "tag-ink",
    city,
    city_short: city?.short || "—",
    city_ch: city?.ch || "—",
    status,
    status_ch: STATUS_MAP[status]?.ch || status,
    status_class: STATUS_MAP[status]?.tagClass || "tag-ink",
    status_weight: STATUS_MAP[status]?.weight || 0,
    skill,
    technology: ts.wave_technology_brand || "",
    pool_size: ts.pool_size || "",
    wave_height: ts.wave_height || "",
    waves_per_hour: ts.waves_per_hour || "",
    price_range: ps.price_range || "",
    session_length: ts.session_length || "",
    best_season: eg.best_season || "",
    operator: bi.operator || "",
    opening_date: bi.opening_date || "",
    accommodation: sr.on_site_accommodation || sr.nearby_accommodation || "",
    pros: rr.pros || "",
    cons: rr.cons || ""
  };
}

const SKILL_LABELS = {
  B: { ch: "初學", short: "B" },
  I: { ch: "中階", short: "I" },
  A: { ch: "進階", short: "A" },
  P: { ch: "Pro",  short: "P" }
};

async function boot(){
  const res = await fetch("/api/hainan.json");
  RAW = await res.json();
  ALL = Object.entries(RAW).map(([k,v]) => normalize(k, v));

  ALL.sort((a,b) => {
    if(b.status_weight !== a.status_weight) return b.status_weight - a.status_weight;
    const catOrder = ["artificial_wave_pool","natural_surf_spot","surf_school","surf_club","water_resort_family","event_festival"];
    const ai = catOrder.indexOf(a.category), bi = catOrder.indexOf(b.category);
    if(ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  hydrateFilters();
  render();
  document.querySelectorAll(".mode-btn").forEach(b => {
    b.addEventListener("click", () => switchMode(b.dataset.mode));
  });
  document.getElementById("search").addEventListener("input", e => {
    FILTERS.q = e.target.value.trim();
    renderIndex();
  });
}

function hydrateFilters(){
  // Category
  const cats = ["all", ...new Set(ALL.map(i => i.category))];
  document.getElementById("cat-chips").innerHTML = cats.map(c => {
    const cnt = c==="all" ? ALL.length : ALL.filter(i=>i.category===c).length;
    const label = c==="all" ? "全部" : (CAT_MAP[c]?.ch || c);
    return `<span class="chip ${c==='all'?'active':''}" data-cat="${c}">${label} <small style="opacity:.55">${cnt}</small></span>`;
  }).join("");
  document.querySelectorAll("#cat-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.category = el.dataset.cat;
      document.querySelectorAll("#cat-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });

  // City
  const cityIds = ["all", ...new Set(ALL.filter(i=>i.city).map(i=>i.city.id))];
  document.getElementById("city-chips").innerHTML = cityIds.map(id => {
    const c = CITIES.find(x=>x.id===id);
    const label = id==="all" ? "全部" : `${c.ch} ${c.short}`;
    return `<span class="chip ${id==='all'?'active':''}" data-city="${id}">${label}</span>`;
  }).join("");
  document.querySelectorAll("#city-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.city = el.dataset.city;
      document.querySelectorAll("#city-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });

  // Status
  const statuses = ["all", ...new Set(ALL.map(i => i.status))];
  document.getElementById("status-chips").innerHTML = statuses.map(s => {
    const label = s==="all" ? "全部" : (STATUS_MAP[s]?.ch || s);
    return `<span class="chip ${s==='all'?'active':''}" data-status="${s}">${label}</span>`;
  }).join("");
  document.querySelectorAll("#status-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.status = el.dataset.status;
      document.querySelectorAll("#status-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });
}

function matches(it){
  if(FILTERS.category!=="all" && it.category!==FILTERS.category) return false;
  if(FILTERS.city!=="all" && it.city?.id !== FILTERS.city) return false;
  if(FILTERS.status!=="all" && it.status!==FILTERS.status) return false;
  if(FILTERS.q){
    const q = lc(FILTERS.q);
    const hay = [it.name, it.name_full, it.ch, it.operator, it.technology, it.price_range].join(" ").toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function render(){ renderIndex(); }
function renderIndex(){
  const grid = document.getElementById("grid");
  const list = ALL.filter(matches);
  document.getElementById("result-count").textContent = `${list.length} 項 / ${ALL.length}`;
  if(!list.length){
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">沒有符合條件的項目</div>`;
    return;
  }
  grid.innerHTML = list.map((it,i) => cardHTML(it, i)).join("");
  grid.querySelectorAll(".card").forEach(c => {
    c.addEventListener("click", (e) => {
      if(e.target.closest(".compare-btn")) return;
      if(e.target.closest(".fav-btn")) return;
      openDetail(c.dataset.key);
    });
  });
  grid.querySelectorAll(".compare-btn").forEach(c => {
    c.addEventListener("click", e => { e.stopPropagation(); toggleCompare(c.closest(".card").dataset.key); });
  });
  grid.querySelectorAll(".fav-btn").forEach(c => {
    c.addEventListener("click", e => {
      e.stopPropagation();
      const on = toggleFav("hainan", c.dataset.fav);
      c.classList.toggle("on", on);
    });
  });
  window.SS_CURRENT_LIST = list.map(i => i.key);
}

function cardHTML(it, i){
  const inCmp = COMPARE.includes(it.key);
  const fav = isFav("hainan", it.key);
  const num = String(i+1).padStart(2,'0');
  const blurb = (it.technology || it.wave_height || it.best_season || it.operator).slice(0,140);

  const dataRows = [];
  if(it.wave_height) dataRows.push(['WAVE H', it.wave_height.slice(0,60)]);
  else if(it.technology) dataRows.push(['TECH', it.technology.slice(0,60)]);
  if(it.pool_size) dataRows.push(['POOL', it.pool_size.slice(0,60)]);
  if(it.price_range) dataRows.push(['PRICE', it.price_range.slice(0,60)]);
  if(it.opening_date) dataRows.push(['OPEN', it.opening_date]);

  return `
    <div class="card ${inCmp?'in-compare':''}" data-key="${it.key}">
      <button class="fav-btn ${fav?'on':''}" data-fav="${it.key}" title="收藏"></button>
      <button class="compare-btn ${inCmp?'added':''}">${inCmp?'✓ COMPARE':'+ COMPARE'}</button>
      <div class="row1">
        <span class="num">${num}</span>
        <div class="name" style="padding-right:32px;">
          ${it.name}
          ${it.ch ? `<span class="ch">${it.ch}</span>` : ''}
        </div>
      </div>
      <div class="meta-row">
        <span class="tag ${it.cat_class}">${it.cat_short}</span>
        ${it.city ? `<span class="tag">${it.city_ch}</span>` : ''}
        <span class="tag ${it.status_class}">${it.status_ch}</span>
      </div>
      ${blurb ? `<div class="blurb">${escape(blurb)}${blurb.length>=140?'…':''}</div>` : ''}
      <dl class="data">
        ${dataRows.map(([k,v]) => `<dt>${k}</dt><dd>${escape(v)}</dd>`).join("")}
      </dl>
    </div>
  `;
}

// ===== Map view =====
function renderMap(){
  // Map = city columns × category rows
  const wrap = document.getElementById("map-wrap");
  const cities = CITIES;
  const cats = ["artificial_wave_pool","natural_surf_spot","surf_school","surf_club","water_resort_family","event_festival"];
  let html = `<div class="map-grid">`;
  // header
  html += `<div class="map-corner">類別 / 城市</div>`;
  cities.forEach(c => {
    html += `<div class="map-h">${c.ch}<small>${c.short}</small></div>`;
  });
  // rows
  cats.forEach(cat => {
    html += `<div class="map-cat">
      <strong>${CAT_MAP[cat].ch}</strong>
      <small>${CAT_MAP[cat].short}</small>
    </div>`;
    cities.forEach(c => {
      const items = ALL.filter(it => it.category===cat && it.city?.id===c.id);
      html += `<div class="map-cell">`;
      if(items.length === 0){
        html += `<div class="map-empty">—</div>`;
      } else {
        items.forEach(it => {
          html += `<div class="map-chip ${it.status_class}" data-key="${it.key}">${it.name}</div>`;
        });
      }
      html += `</div>`;
    });
  });
  html += `</div>`;
  wrap.innerHTML = html;
  wrap.querySelectorAll(".map-chip").forEach(el => {
    el.addEventListener("click", () => openDetail(el.dataset.key));
  });
}

// ===== Compare =====
function toggleCompare(key){
  const i = COMPARE.indexOf(key);
  if(i>=0) COMPARE.splice(i,1);
  else if(COMPARE.length < MAX_COMPARE) COMPARE.push(key);
  else { alert(`最多 ${MAX_COMPARE} 項`); return; }
  renderIndex();
  renderCompareTray();
  if(document.querySelector(".mode-btn.active")?.dataset.mode === "compare") renderCompare();
}
window.toggleCompare = toggleCompare;
function renderCompareTray(){
  const tray = document.getElementById("compare-tray");
  if(!COMPARE.length){ tray.classList.remove("visible"); return; }
  tray.classList.add("visible");
  tray.querySelector(".items").innerHTML = COMPARE.map(k => {
    const it = ALL.find(x => x.key === k);
    return `<span class="item">${it.name} <span class="x" onclick="toggleCompare('${k}')">×</span></span>`;
  }).join("");
}
function renderCompare(){
  const grid = document.getElementById("compare-grid");
  if(!COMPARE.length){
    grid.innerHTML = `<div class="compare-empty">尚未加入比較項目。回到 Index 頁,在卡片右下角按下 <strong>+ COMPARE</strong>。</div>`;
    grid.style.display = "block";
    return;
  }
  const items = COMPARE.map(k => ALL.find(x => x.key === k));
  const rows = [
    ["類別", it => CAT_MAP[it.category]?.ch || "—"],
    ["城市", it => it.city_ch],
    ["營運狀態", it => it.status_ch],
    ["營運者 / 品牌", it => it.operator || "—"],
    ["開幕日 / 起始", it => it.opening_date || "—"],
    ["造浪技術", it => it.technology || "—"],
    ["池/場域大小", it => it.pool_size || "—"],
    ["浪高範圍", it => it.wave_height || "—"],
    ["每小時浪數", it => it.waves_per_hour || "—"],
    ["單節時長", it => it.session_length || "—"],
    ["價格區間", it => it.price_range || "—"],
    ["最佳季節 / 時段", it => it.best_season || "—"],
    ["住宿", it => (it.accommodation||"—").slice(0,200) + (it.accommodation?.length>200?'…':'')],
    ["評價 · 優", it => (it.pros||"—").slice(0,200) + (it.pros?.length>200?'…':'')],
    ["評價 · 缺", it => (it.cons||"—").slice(0,200) + (it.cons?.length>200?'…':'')]
  ];
  let html = `<div class="ch"></div>`;
  items.forEach(it => html += `<div class="hd">${it.name}${it.ch?`<small>${it.ch}</small>`:''}</div>`);
  for(const [label, fn] of rows){
    html += `<div class="ch">${label}</div>`;
    items.forEach(it => html += `<div class="cv">${escape(fn(it))}</div>`);
  }
  grid.style.display = "grid";
  grid.style.setProperty("--cols", items.length);
  grid.style.gridTemplateColumns = `200px repeat(${items.length}, 1fr)`;
  grid.innerHTML = html;
}

// ===== Detail =====
function openDetail(key){
  const it = ALL.find(x => x.key === key);
  if(!it) return;
  const r = it.raw;
  const sections = [];
  function kvSection(title, keymap, source){
    if(!source) return "";
    const rows = [];
    for(const [k,label] of keymap){
      const v = source[k];
      if(v==null || v==="") continue;
      const isU = (r.uncertain||[]).includes(k);
      rows.push(`<div class="k">${label}</div><div class="v">${escape(v)}${isU?'<span class="uncertain">不確定</span>':''}</div>`);
    }
    if(!rows.length) return "";
    return `<div class="detail-section"><h3>${title}</h3><div class="kv">${rows.join("")}</div></div>`;
  }
  sections.push(kvSection("Basic / 基本", [
    ["category","類別"],["location","地址"],["operator","營運者"],
    ["opening_date","開幕日"],["status","狀態"]
  ], r.basic_info));
  sections.push(kvSection("Technical Specs / 技術規格", [
    ["wave_technology_brand","造浪技術"],["pool_size","池/場域大小"],
    ["wave_height","浪高"],["wave_height_adjustability","浪高調節"],
    ["wave_types","浪型"],["waves_per_hour","每小時浪數"],
    ["wave_count_per_set","每組浪數"],["session_length","單節時長"],
    ["stance_rotation_schedule","Goofy/Regular 輪替"],["wave_type_classification","浪型分類"]
  ], r.technical_specs));
  sections.push(kvSection("Pricing & Sessions / 價格", [
    ["price_range","價格區間"],["session_skill_tiers","技術等級分檔"],
    ["equipment_rental","裝備租借"],["coaching_fee","教練費"],
    ["coaching_packages","教練套裝"],["membership_program","會員制"],
    ["corporate_team_building","企業包場"]
  ], r.pricing_sessions));
  sections.push(kvSection("Experience / 體驗", [
    ["best_season","最佳季節"],["best_swell_window","Swell 窗口"],
    ["crowd_level","擁擠度"],["booking_method","預約方式"],
    ["booking_platform","預約平台"],["payment_options","付款方式"],
    ["skill_required","技術需求"],["age_eligibility","年齡限制"],
    ["child_friendly_score","親子友善"],["sup_paddleboard_offering","SUP"],
    ["photography_video_service","攝影服務"],["language_support","語言支援"],
    ["accessibility_for_disabled","無障礙"],["stance_preference_input","Stance 選擇"],
    ["safety_notes","安全"],["events_competitions_calendar","賽事行事曆"]
  ], r.experience_guide));
  sections.push(kvSection("Surroundings / 周邊", [
    ["nearby_accommodation","附近住宿"],["on_site_accommodation","場內住宿"],
    ["nearby_food","附近餐飲"],["transport","交通"],
    ["transport_to_nearest_airport","到最近機場"],["combined_itinerary","行程組合"]
  ], r.surroundings));
  sections.push(kvSection("Reviews / 評價", [
    ["pros","優點"],["cons","缺點"],["user_reviews","用戶評價"],
    ["recommended_for","推薦對象"],["operator_brand_partnership","品牌合作"]
  ], r.reviews_reputation));
  sections.push(kvSection("Verification / 驗證", [
    ["existence_verified","存在驗證"],["verification_sources","來源"],
    ["last_updated","最後更新"]
  ], r.verification));

  const tags = [
    `<span class="tag ${it.cat_class}">${it.cat_ch}</span>`,
    `<span class="tag">${it.city_ch}</span>`,
    `<span class="tag ${it.status_class}">${it.status_ch}</span>`
  ];

  // Citations from verification_sources (may be string, array, or undefined)
  const rawSources = r.verification?.verification_sources;
  let items = [];
  if(Array.isArray(rawSources)){
    items = rawSources.map(s => String(s).replace(/^\d+\)\s*/, '').trim()).filter(Boolean);
  } else if(typeof rawSources === "string" && rawSources){
    items = rawSources.split(/;\s*\d+\)\s*|;\s*(?=\d+\))/).map(s => s.replace(/^\d+\)\s*/, '').trim()).filter(Boolean);
  } else if(rawSources && typeof rawSources === "object"){
    items = Object.values(rawSources).map(s => String(s).replace(/^\d+\)\s*/, '').trim()).filter(Boolean);
  }
  let citesHTML = "";
  if(items.length){
    citesHTML = `<div class="detail-citations">
      <h4>引用來源 / SOURCES (${items.length})</h4>
      <ol>${items.map(c => `<li>${escape(c)}</li>`).join("")}</ol>
    </div>`;
  }

  const list = window.SS_CURRENT_LIST.length ? window.SS_CURRENT_LIST : ALL.map(i=>i.key);
  const idx = list.indexOf(key);
  const posLabel = idx >= 0 ? `${idx+1}/${list.length}` : "";
  const fav = isFav("hainan", key);

  document.getElementById("detail-panel").innerHTML = `
    <div class="detail-head">
      <div>
        <h2>
          ${it.ch ? `<span class="ch">${it.ch}</span>` : ''}
          ${it.name}
        </h2>
        <div class="detail-tagrow">${tags.join("")}</div>
      </div>
      <div class="detail-head-actions">
        <button class="fav-btn ${fav?'on':''}" onclick="(() => { const on = toggleFav('hainan','${key}'); event.target.classList.toggle('on', on); })()" title="收藏"></button>
        <button class="detail-nav-btn" onclick="detailPrevNext(-1)">←</button>
        <span style="font-family:var(--mono); font-size:11px; color:var(--paper); opacity:.6;">${posLabel}</span>
        <button class="detail-nav-btn" onclick="detailPrevNext(1)">→</button>
        <button class="close" onclick="closeDetail()">×</button>
      </div>
    </div>
    <div class="detail-body">${sections.filter(Boolean).join("")}${citesHTML}</div>
  `;
  document.getElementById("detail-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
  window.SS_CURRENT_KEY = key;
  history.replaceState(null, "", "#detail=" + encodeURIComponent(key));
}
window.openDetail = openDetail;
window.closeDetail = function(){
  document.getElementById("detail-overlay").classList.remove("open");
  document.body.style.overflow = "";
  window.SS_CURRENT_KEY = null;
  if(location.hash.startsWith("#detail=")) history.replaceState(null, "", location.pathname);
};

// ===== Geo Island Map =====
// Hainan projection:
//   lng 108.0 → x=0, lng 111.5 → x=700 (scale 200 per deg lng)
//   lat 20.5 → y=0, lat 17.5 → y=600 (scale 200 per deg lat)
//   cos(19°) ≈ 0.946 — close enough for 1:1 scale
const HAINAN_CITY_COORDS = {
  haikou:   { x: 464, y: 92,  label: "海口 HAIKOU",     gps: [20.04, 110.32] },
  wenchang: { x: 548, y: 176, label: "文昌 WENCHANG",   gps: [19.62, 110.74] },
  qionghai: { x: 500, y: 280, label: "瓊海 QIONGHAI",   gps: [19.25, 110.50] },
  wanning:  { x: 478, y: 340, label: "萬寧 WANNING",    gps: [18.80, 110.39] },
  lingshui: { x: 408, y: 400, label: "陵水 LINGSHUI",   gps: [18.50, 110.04] },
  sanya:    { x: 302, y: 450, label: "三亞 SANYA",      gps: [18.25, 109.51] },
  danzhou:  { x: 316, y: 196, label: "儋州 DANZHOU",    gps: [19.52, 109.58] }
};

function renderIslandMap(){
  const container = document.getElementById("island-map");
  if(!container) return;
  // Group items by city
  const byCity = {};
  ALL.forEach(it => {
    if(!it.city?.id) return;
    if(!byCity[it.city.id]) byCity[it.city.id] = [];
    byCity[it.city.id].push(it);
  });

  // Build city pins with stats
  const pins = Object.entries(byCity).map(([cid, items]) => {
    const c = HAINAN_CITY_COORDS[cid];
    if(!c) return "";
    const operating = items.filter(i => i.status === "operating").length;
    const total = items.length;
    return `<g class="city-pin" data-city="${cid}" transform="translate(${c.x},${c.y})">
      <circle r="24" fill="var(--paper)" stroke="var(--ink)" stroke-width="2"/>
      <circle r="24" fill="var(--vermillion)" opacity="${0.18 + total*0.05}"/>
      <text y="3" text-anchor="middle" font-family="var(--display)" font-size="20" fill="var(--ink)">${total}</text>
      <text y="44" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink)" letter-spacing="1.5" style="paint-order: stroke; stroke: var(--paper); stroke-width: 3px;">${c.label}</text>
      <text y="58" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-soft)" style="paint-order: stroke; stroke: var(--paper); stroke-width: 2.5px;">${operating}/${total} 營運</text>
    </g>`;
  }).join("");

  // Hainan island outline — clockwise from NW (Lingao cape), 15 anchor points from real coordinates
  const hainanOutline = `
    M 370 90
    L 464 92 L 510 100 L 572 130 L 600 168
    L 588 220 L 556 280 L 500 280 L 478 340
    L 392 418 L 332 460 L 302 450 L 200 468
    L 130 380 L 124 280 L 130 156
    L 215 110 L 310 100
    Z`;

  // Wuzhi Shan (central mountain) location ≈ 18.93°N, 109.67°E → x=334, y=314
  // Five Finger Mountain peak in the central interior

  // Riyue Bay (Wanning) — Surfland location
  // ≈ 18.65°N, 110.28°E → x=456, y=370

  container.innerHTML = `
    <div class="hainan-map">
      <svg viewBox="0 0 700 600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ocean2" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 0 7 Q 3.5 4, 7 7 T 14 7" stroke="var(--ocean)" stroke-width="0.6" fill="none" opacity="0.28"/>
          </pattern>
          <pattern id="land-tex2" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill="var(--paper-warm)"/>
            <circle cx="2" cy="2" r=".7" fill="rgba(26,22,20,.10)"/>
          </pattern>
        </defs>

        <!-- Ocean -->
        <rect width="700" height="600" fill="url(#ocean2)"/>

        <!-- Mainland China (Leizhou peninsula) to the north -->
        <path d="M 280 0 L 450 0 L 510 0 L 600 0 L 600 30 L 550 50 L 500 65 L 470 70 L 420 65 L 380 55 L 340 50 L 290 35 L 280 0 Z"
              fill="var(--paper-deep)" opacity=".55" stroke="var(--ink)" stroke-width=".9"/>
        <text x="445" y="20" text-anchor="middle" font-family="var(--display-3)" font-size="10" fill="var(--ink-soft)" opacity=".75" letter-spacing="2">廣東 雷州半島 · LEIZHOU PENINSULA</text>

        <!-- Vietnam coast hint (NW corner) -->
        <path d="M 0 350 L 60 380 L 50 480 L 30 560 L 0 600 Z"
              fill="var(--paper-deep)" opacity=".4" stroke="var(--ink)" stroke-width=".8" stroke-dasharray="2,3"/>
        <text x="20" y="450" font-family="var(--display-3)" font-size="9" fill="var(--ink-soft)" opacity=".65" letter-spacing="2" transform="rotate(-90 20 450)">VN ↑</text>

        <!-- Hainan island -->
        <path d="${hainanOutline}" fill="url(#land-tex2)" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round"/>

        <!-- Wuzhishan (Five Finger Mountains) central highlands -->
        <g opacity=".55">
          <path d="M 290 290 L 308 268 L 326 290 L 344 258 L 362 285 L 380 268 L 398 290"
                stroke="var(--ink)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
          <text x="344" y="248" text-anchor="middle" font-family="var(--display-3)" font-size="10" fill="var(--ink)" letter-spacing="1.5">五指山 · WUZHISHAN</text>
        </g>

        <!-- Riyue Bay (日月灣 / SURFLAND) highlight -->
        <g>
          <circle cx="478" cy="372" r="14" fill="none" stroke="var(--vermillion)" stroke-width="2.5" stroke-dasharray="4,3"/>
          <line x1="490" y1="362" x2="540" y2="335" stroke="var(--vermillion-d)" stroke-width="1" stroke-dasharray="2,2"/>
          <text x="545" y="328" font-family="var(--display-3)" font-size="11" fill="var(--vermillion-d)" letter-spacing="1">日月灣</text>
          <text x="545" y="342" font-family="var(--mono)" font-size="9" fill="var(--vermillion-d)" letter-spacing="1.5">RIYUE BAY · SURFLAND</text>
        </g>

        <!-- Hainan/China surf current note -->
        <path d="M 620 50 Q 660 200 640 380 Q 620 500 600 580"
              fill="none" stroke="var(--vermillion)" stroke-width="10" opacity=".07" stroke-linecap="round"/>
        <path d="M 620 50 Q 660 200 640 380 Q 620 500 600 580"
              fill="none" stroke="var(--vermillion-d)" stroke-width=".8" opacity=".25" stroke-dasharray="3,4"/>

        <!-- Sea labels -->
        <text x="350" y="42" text-anchor="middle" font-family="var(--display-2)" font-size="13" fill="var(--ocean)" font-style="italic">瓊州海峽 · Qiongzhou Strait</text>
        <text x="90" y="220" font-family="var(--display-2)" font-size="12" fill="var(--ocean)" font-style="italic">北部灣</text>
        <text x="80" y="240" font-family="var(--display-3)" font-size="10" fill="var(--ocean)" opacity=".75" letter-spacing="2">BEIBU GULF</text>
        <text x="680" y="300" font-family="var(--display-2)" font-size="13" fill="var(--ocean)" font-style="italic" transform="rotate(90, 680, 300)">南海 · South China Sea</text>
        <text x="350" y="555" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="3" opacity=".75">HAINAN ISLAND · 海 南 島</text>

        <!-- Compass -->
        <g transform="translate(645,80)">
          <circle r="20" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.3"/>
          <path d="M 0 -15 L 4.5 0 L 0 15 L -4.5 0 Z" fill="var(--vermillion)" stroke="var(--ink)" stroke-width=".8"/>
          <text y="-25" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink)">N</text>
        </g>

        <!-- Scale: 1° ≈ 111 km, 1° = 200 px → 50 km = 90 px -->
        <g transform="translate(560,575)">
          <line x1="0" y1="0" x2="90" y2="0" stroke="var(--ink)" stroke-width="1.5"/>
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--ink)" stroke-width="1.5"/>
          <line x1="45" y1="-3" x2="45" y2="3" stroke="var(--ink)" stroke-width="1.2"/>
          <line x1="90" y1="-4" x2="90" y2="4" stroke="var(--ink)" stroke-width="1.5"/>
          <text x="0" y="-6" text-anchor="start" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">0</text>
          <text x="90" y="-6" text-anchor="end" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">50 km</text>
        </g>

        <!-- City pins last -->
        ${pins}
      </svg>
      <div class="map-legend" style="border-left:1.5px solid var(--ink);">
        <div style="font-family:var(--display-2); font-style:italic; font-size:18px; color:var(--ocean); margin-bottom:8px;">城市總覽</div>
        ${Object.entries(byCity).map(([cid, items]) => {
          const c = HAINAN_CITY_COORDS[cid];
          const ops = items.filter(i => i.status==="operating").length;
          return `<div class="map-legend-row" style="flex-direction:column; align-items:flex-start; gap:2px; padding:6px 0; border-bottom:1px dashed var(--ink); cursor:pointer;" data-city-legend="${cid}">
            <strong style="font-family:var(--display-2); font-size:15px;">${c?.label || cid}</strong>
            <span style="font-family:var(--mono); font-size:10px; color:var(--ink-soft);">${items.length} 項 · ${ops} 營運中</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
  container.querySelectorAll(".city-pin").forEach(p => {
    p.addEventListener("click", () => {
      FILTERS.city = p.dataset.city;
      document.querySelectorAll("#city-chips .chip").forEach(x =>
        x.classList.toggle("active", x.dataset.city === p.dataset.city));
      document.querySelector(".mode-btn[data-mode=index]").click();
    });
  });

  // Zoom + pan + control bar
  const svg = container.querySelector("svg");
  const sidebar = container.querySelector(".map-legend");
  if(svg && window.attachMapControls){
    const host = sidebar || container;
    host.querySelector(".map-zoom-controls")?.remove();
    window.attachMapControls(svg, host);
  }
}
window.renderIslandMap = renderIslandMap;

// ===== Price Comparison =====
function renderPriceTable(){
  const wrap = document.getElementById("price-wrap");
  if(!wrap) return;
  const priced = ALL.filter(it => it.price_range || it.raw.pricing_sessions?.session_skill_tiers);
  // Build per-tier table when possible
  const tiers = ["Beginner","Intermediate","Advanced","PRO","Private"];
  function parsePrice(text){
    // extract RMB prices from text like "Beginner 398 RMB, Intermediate 388 RMB, Advanced 498 RMB, PRO 545 RMB"
    if(!text) return {};
    const out = {};
    tiers.forEach(t => {
      const re = new RegExp(t + "\\s*([\\d,]+)\\s*RMB", "i");
      const m = text.match(re);
      if(m) out[t] = m[1];
    });
    return out;
  }
  const rows = priced.map(it => {
    const p = parsePrice(it.raw.pricing_sessions?.session_skill_tiers || it.price_range);
    return { it, p, raw: it.raw.pricing_sessions?.session_skill_tiers || it.price_range };
  });
  wrap.innerHTML = `
    <div style="border:1.5px solid var(--ink); overflow-x:auto;">
      <table class="price-table">
        <thead>
          <tr>
            <th>項目</th>
            <th>類別</th>
            ${tiers.map(t => `<th>${t}</th>`).join("")}
            <th>原始定價</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({it,p,raw}) => `
            <tr onclick="openDetail('${it.key}')">
              <td><strong>${it.name}</strong></td>
              <td><span class="tag ${it.cat_class}" style="font-size:9.5px;">${it.cat_short}</span></td>
              ${tiers.map(t => `<td class="${p[t]?'has':''}">${p[t] ? p[t]+' RMB' : '—'}</td>`).join("")}
              <td class="raw">${escape(raw||'').slice(0,140)}${raw && raw.length>140 ? '…' : ''}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    <div style="margin-top:10px; font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft);">
      ※ 自動從來源欄位抽取 · 私人時段價格通常另計 · 點擊列查看完整資料
    </div>
  `;
}

// ===== Goofy/Regular Calendar (SURFLAND only) =====
function renderStanceCalendar(){
  const wrap = document.getElementById("stance-wrap");
  if(!wrap) return;
  // Show next 60 days. Pattern: alternate by date.
  // Use 2026-01-01 as "Regular" anchor (arbitrary).
  const now = new Date();
  const days = [];
  for(let i = -3; i < 35; i++){
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    // alternate goofy/regular
    const dayOfYear = Math.floor((d - new Date(d.getFullYear(),0,0)) / 86400000);
    const isGoofy = dayOfYear % 2 === 0;
    days.push({
      d,
      isGoofy,
      isToday: i === 0,
      isPast: i < 0
    });
  }
  const monthLabel = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}`;
  wrap.innerHTML = `
    <div style="display:flex; align-items:baseline; gap:12px; margin-bottom:10px;">
      <div style="font-family:var(--display-2); font-style:italic; font-size:22px; color:var(--ocean);">SURFLAND Goofy / Regular 輪替日曆</div>
      <div style="font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft);">本月 ${monthLabel} · 訂位前確認</div>
    </div>
    <div class="stance-grid">
      ${days.map(({d,isGoofy,isToday,isPast}) => `
        <div class="stance-cell ${isGoofy?'goofy':'regular'} ${isToday?'today':''} ${isPast?'past':''}">
          <div class="stance-date">${d.getMonth()+1}/${d.getDate()}</div>
          <div class="stance-label">${isGoofy?'GOOFY':'REGULAR'}</div>
          <div class="stance-dow">${["日","一","二","三","四","五","六"][d.getDay()]}</div>
        </div>
      `).join("")}
    </div>
    <div style="margin-top:14px; display:flex; gap:10px; align-items:center; font-family:var(--mono); font-size:10.5px; letter-spacing:.08em;">
      <span class="tag tag-verm">GOOFY day</span>
      <span class="tag tag-ocean">REGULAR day</span>
      <span style="margin-left:auto; font-style:italic; font-family:var(--serif);">
        ※ 本日曆為示意輪替模式 · 實際請以 SURFLAND 官方預約系統為準
      </span>
    </div>
  `;
}
window.renderIslandMap = renderIslandMap;
window.renderPriceTable = renderPriceTable;
window.renderStanceCalendar = renderStanceCalendar;

function switchMode(mode){
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  document.querySelectorAll(".pane").forEach(p => p.style.display = p.dataset.mode === mode ? "" : "none");
  if(mode === "map") renderMap();
  if(mode === "island") renderIslandMap();
  if(mode === "price") renderPriceTable();
  if(mode === "stance") renderStanceCalendar();
  if(mode === "compare") renderCompare();
  if(mode === "index") renderIndex();
}

window.addEventListener("DOMContentLoaded", boot);
