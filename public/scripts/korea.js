// =========================================================
// 衝浪研究室 — Korea Issue (No. 006) logic
// =========================================================

const REGION_MAP = {
  "襄陽 / Yangyang":          { ch: "襄陽",       short: "YYG" },
  "束草 / Sokcho":            { ch: "束草",       short: "SCH" },
  "高城 / Goseong":           { ch: "高城",       short: "GSG" },
  "釜山 / Busan":             { ch: "釜山",       short: "BSN" },
  "慶尚北道 / Pohang":        { ch: "浦項",       short: "PHG" },
  "濟州島 / Jeju":            { ch: "濟州",       short: "JEJ" },
  "東海離島 / East Sea Islands": { ch: "東海離島", short: "ESI" },
  "全韓國 / Korea-wide":      { ch: "全韓國",     short: "KR-ALL" }
};

const SERVICE_KEYS = new Set([
  "Surf_Schools_Korea", "Visa_Entry_Korea", "Surf_Forecast_Korea", "Season_Typhoon_Korea"
]);

// Monthly mean SST in °C — region-level (Jan…Dec)
const WATER_TEMP_META = {
  "襄陽 / Yangyang":          { temps: [ 8, 7, 8,10,13,17,21,24,22,18,14,10], note: "東海岸 NE swell 主場;2月可低至 6–8°C → 4/3 + booties 或 5/4 + hood" },
  "束草 / Sokcho":            { temps: [ 8, 7, 7,10,13,17,21,24,22,18,14,10], note: "外擁峙 / 大浦;雪嶽山下,寒流冷;同襄陽" },
  "高城 / Goseong":           { temps: [ 7, 6, 6, 9,12,16,20,23,21,17,13, 9], note: "近 DMZ 最北端,北韓寒流影響;2月可低至 6°C → 5/4 + hood + boots + gloves" },
  "釜山 / Busan":             { temps: [13,12,13,14,17,20,23,26,24,21,18,15], note: "東南岸對馬暖流經過;冬季比襄陽暖 5°C → 4/3 全年可" },
  "慶尚北道 / Pohang":        { temps: [11,10,10,12,15,19,23,25,23,19,16,13], note: "東岸南端,暖流寒流交界;冬季 4/3 + hood 為宜" },
  "濟州島 / Jeju":            { temps: [15,14,14,16,18,22,25,27,26,23,20,17], note: "黑潮分支進入;南韓最暖海域;1月仍可 14°C (3/2 或 4/3)" },
  "東海離島 / East Sea Islands": { temps: [ 9, 8, 8,10,13,17,21,23,22,18,14,10], note: "鬱陵島;東海中央,冬季 5/4 + hood;船班受天氣影響" },
  "全韓國 / Korea-wide":      { temps: [10, 9,10,12,14,18,22,25,23,19,16,12], note: "全國平均;東岸 vs 濟州 vs 東南岸有 ±5°C 差異" }
};

const CATEGORY_LABELS = {
  spot:      { ch: "浪點",       short: "SPOT" },
  hidden:    { ch: "私房浪點",   short: "HIDDEN" },
  extension: { ch: "延伸目的地", short: "EXT" },
  service:   { ch: "商業服務",   short: "SERVICE" },
  practical: { ch: "實用資訊",   short: "PRACTICAL" }
};

const SKILL_LABELS = {
  B: { ch: "初學",       short: "B" },
  I: { ch: "中階",       short: "I" },
  A: { ch: "進階",       short: "A" },
  P: { ch: "Pro",        short: "P" }
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_NUM_NAME = {
  "jan":1,"january":1,"feb":2,"february":2,"mar":3,"march":3,"apr":4,"april":4,"may":5,
  "jun":6,"june":6,"jul":7,"july":7,"aug":8,"august":8,
  "sep":9,"sept":9,"september":9,"oct":10,"october":10,"nov":11,"november":11,"dec":12,"december":12
};

function asArr(x){ if(!x) return []; return Array.isArray(x)?x:[x]; }
function lc(s){ return (s||"").toLowerCase(); }

function parseMonthsFromText(text){
  if(!text) return [];
  const t = lc(text);
  const set = new Set();
  if(/year[\s\-]?round|all\s*year|全年/.test(t)) {
    for(let i=1;i<=12;i++) set.add(i);
    return [...set];
  }
  const re = /([a-z]{3,9})(?:\/[a-z]{3,9})?\s*(?:-|to|–|—|至|~)\s*([a-z]{3,9})/g;
  let m;
  while((m = re.exec(t))){
    const a = monthNum(m[1]), b = monthNum(m[2]);
    if(a && b){
      let i = a;
      while(true){
        set.add(i);
        if(i === b) break;
        i = i === 12 ? 1 : i+1;
      }
    }
  }
  return [...set].sort((a,b)=>a-b);
}

function monthNum(name){
  for(const [k2,v] of Object.entries(MONTHS_NUM_NAME)){
    if(k2.startsWith(lc(name).slice(0,3))) return v;
  }
  return MONTHS_NUM_NAME[lc(name)];
}

function parsePeakMonths(text){
  if(!text) return [];
  const t = lc(text);
  const m = t.match(/peak[^.]*?\(?\s*([a-z]+(?:-[a-z]+)?(?:\s*-\s*[a-z]+)?)\)?/);
  if(m) return parseMonthsFromText(m[1]);
  return [];
}

function parseSkill(text){
  if(!text) return [];
  const t = lc(text);
  const out = [];
  if(/beginner|初學/.test(t)) out.push("B");
  if(/intermediate|中階/.test(t)) out.push("I");
  if(/advanced|進階/.test(t)) out.push("A");
  if(/\bpro\b|pro\s*only|職業|expert/.test(t)) out.push("P");
  if(!out.length){
    if(/all\s*levels?|各程度|全程度/.test(t)) return ["B","I","A","P"];
  }
  return out;
}

function parseCrowd(text){
  if(!text) return null;
  const m = String(text).match(/^(\d)\b/);
  if(m) return +m[1];
  return null;
}

function classifyCategory(key, raw){
  const cat = raw?.basic_info?.category || raw?.category || "";
  if(SERVICE_KEYS.has(key)){
    if(["Visa_Entry_Korea","Season_Typhoon_Korea"].includes(key)) return "practical";
    return "service";
  }
  if(cat === "surf_spot_hidden") return "hidden";
  if(cat === "extension_destination") return "extension";
  if(cat === "practical") return "practical";
  if(cat === "event_culture") return "service";
  if(cat === "surf_business" || cat === "surf_resource") return "service";
  return "spot";
}

function shortName(name){
  if(!name) return "";
  const i = name.indexOf(" (");
  if(i > 0) return name.slice(0, i).trim();
  return name.trim();
}

function extractCh(name){
  if(!name) return "";
  const m = name.match(/\(([^()]*[\u4e00-\u9fff][^()]*)\)/);
  if(m){
    let ch = m[1].trim();
    ch = ch.replace(/.*Chinese:\s*/i, "");
    ch = ch.replace(/\s*;.*$/, "");
    if(ch.includes("/") && ch.split("/").length > 1) ch = ch.split("/")[0].trim();
    return ch;
  }
  if(/^[\u4e00-\u9fff·\s\/]+$/.test(name)) return name;
  return "";
}

// ===== Water temp helpers =====
function suitFor(t){
  if(t < 8)  return "5/4mm + hood + boots + gloves";
  if(t < 12) return "5/4mm + booties";
  if(t < 16) return "4/3mm + booties";
  if(t < 19) return "3/2mm 全身";
  if(t < 23) return "2mm spring 或 3/2mm";
  return "Boardshorts + rashguard";
}
function tempColor(t){
  if(t < 8)  return "oklch(0.58 0.16 245)";
  if(t < 13) return "oklch(0.68 0.14 220)";
  if(t < 17) return "oklch(0.78 0.13 200)";
  if(t < 21) return "oklch(0.80 0.13 150)";
  if(t < 26) return "oklch(0.84 0.16 80)";
  return "oklch(0.74 0.18 35)";
}
function waterTempSectionHTML(region){
  const data = WATER_TEMP_META[region];
  if(!data) return "";
  const months = MONTHS;
  const min = Math.min(...data.temps), max = Math.max(...data.temps);
  const minIdx = data.temps.indexOf(min), maxIdx = data.temps.indexOf(max);
  const cells = data.temps.map((t,i) => {
    return `<div class="wt-cell">
      <div class="wt-mo">${months[i]}</div>
      <div class="wt-deg" style="background:${tempColor(t)};">${t}°</div>
      <div class="wt-suit">${suitFor(t).split(' ')[0]}</div>
    </div>`;
  }).join("");
  return `<div class="detail-section wt-section">
    <h3>Water Temp / 水溫 (年度月均 SST)</h3>
    <div class="wt-row">${cells}</div>
    <div class="wt-summary">
      <div><strong>最冷:</strong>${min}°C (${months[minIdx]}) → ${suitFor(min)}</div>
      <div><strong>最熱:</strong>${max}°C (${months[maxIdx]}) → ${suitFor(max)}</div>
      <div class="wt-note">${escape(data.note||"")}</div>
    </div>
  </div>`;
}

function flattenForView(raw){
  if(raw.basic_info) return raw;
  const r = raw;
  const fields = {
    basic_info: ["name","category","region","gps_location","distance_from_icn_airport_km"],
    surf_conditions: ["wave_type","skill_level","wave_height_range","bottom_type","best_season","best_tide","best_wind","best_swell_direction","swell_consistency_rating","wave_length_meters","peak_crowd_level"],
    practical_info: ["access","paddle_out_method","entry_fee","recommended_session_time","nearby_warung","alternative_spot_within_10min"],
    safety_culture: ["hazards","marine_hazards","rip_current_pattern","localism_intensity","respect_protocol"],
    services: ["nearest_surf_school","board_rental_availability","accommodation_options"],
    pricing: ["avg_lesson_price"],
    events_community: ["annual_competition_window","community_events"]
  };
  const out = { uncertain: r.uncertain || [] };
  for(const [section, keys] of Object.entries(fields)){
    const obj = {};
    for(const k of keys){
      if(r[k] != null) obj[k] = r[k];
    }
    if(Object.keys(obj).length) out[section] = obj;
  }
  const known = new Set([].concat(...Object.values(fields), ["uncertain"]));
  for(const [k,v] of Object.entries(r)){
    if(known.has(k)) continue;
    out[k] = v;
  }
  return out;
}

function normalize(key, raw){
  raw = flattenForView(raw);
  const bi = raw.basic_info || {};
  const sc = raw.surf_conditions || {};
  const name = bi.name || key.replace(/_/g,' ');
  const category = classifyCategory(key, raw);
  const region = bi.region || "全韓國 / Korea-wide";

  let months = parseMonthsFromText(sc.best_season || "");
  let monthsPeak = parsePeakMonths(sc.best_season || "");
  let season = "";
  if(sc.best_season){
    const t = lc(sc.best_season);
    const hasTyphoon = /颱風|typhoon|jul|aug|sep|oct/.test(t);
    const hasWinter = /秋冬|冬季|winter|ne\s*swell|nov|dec|jan|feb|mar/.test(t);
    if(/year[\s\-]?round|全年|all\s*year/.test(t)) season = "year";
    else if(hasTyphoon && hasWinter) season = "both";
    else if(hasWinter) season = "ne";
    else if(hasTyphoon) season = "typhoon";
    else season = "both";
  }
  if(!months.length){
    if(season === "ne") months = [9,10,11,12,1,2,3];
    else if(season === "typhoon") months = [7,8,9,10];
    else if(season === "year") months = [1,2,3,4,5,6,7,8,9,10,11,12];
    else if(season === "both") months = [1,2,3,7,8,9,10,11,12];
  }
  if(!monthsPeak.length){
    if(season === "ne") monthsPeak = [11,12,1,2];
    else if(season === "typhoon") monthsPeak = [8,9];
    else if(season === "both") monthsPeak = [9,10,11];
  }

  return {
    key, raw,
    name: shortName(name),
    name_full: name,
    ch: extractCh(name),
    category,
    region,
    region_short: REGION_MAP[region]?.short || "—",
    region_ch: REGION_MAP[region]?.ch || region,
    skill: parseSkill(sc.skill_level),
    season,
    months,
    monthsPeak,
    wave_height_raw: sc.wave_height_range || "",
    bottom: sc.bottom_type || "",
    swell: sc.best_swell_direction || "",
    wind: sc.best_wind || "",
    tide: sc.best_tide || "",
    wave_type: sc.wave_type || "",
    consistency: parseCrowd(sc.swell_consistency_rating),
    crowd: parseCrowd(sc.peak_crowd_level),
    skill_raw: sc.skill_level || "",
    paddle: raw.practical_info?.paddle_out_method || "",
    access: raw.practical_info?.access || "",
    alt_nearby: raw.practical_info?.alternative_spot_within_10min || "",
    hazards: raw.safety_culture?.hazards || "",
    localism: raw.safety_culture?.localism_intensity || "",
    accommodation: raw.services?.accommodation_options || "",
    lesson_price: raw.pricing?.avg_lesson_price || "",
    nearest_school: raw.services?.nearest_surf_school || "",
    gps: bi.gps_location || ""
  };
}

let ALL = [];
let RAW = null;
let FILTERS = { q: "", category: "all", region: "all", skill: "all", season: "all" };
let COMPARE = [];
const MAX_COMPARE = 4;

async function boot(){
  const res = await fetch("/api/korea.json");
  RAW = await res.json();
  ALL = Object.entries(RAW).map(([k,v]) => normalize(k, v));

  const order = ["spot","hidden","extension","service","practical"];
  ALL.sort((a,b) => {
    const ai = order.indexOf(a.category), bi = order.indexOf(b.category);
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
  const cats = ["all", ...new Set(ALL.map(i => i.category))];
  document.getElementById("cat-chips").innerHTML = cats.map(c => {
    const cnt = c==="all"?ALL.length:ALL.filter(i=>i.category===c).length;
    const label = c==="all"?"全部":(CATEGORY_LABELS[c]?.ch || c);
    return `<span class="chip ${c==='all'?'active':''}" data-cat="${c}">${label} <small style="opacity:.6">${cnt}</small></span>`;
  }).join("");
  document.querySelectorAll("#cat-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.category = el.dataset.cat;
      document.querySelectorAll("#cat-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });

  const regs = ["all", ...Object.keys(REGION_MAP)].filter(r => r==="all" || ALL.some(i=>i.region===r));
  document.getElementById("reg-chips").innerHTML = regs.map(r => {
    const label = r==="all"?"全部":(REGION_MAP[r]?.short || r);
    return `<span class="chip ${r==='all'?'active':''}" data-reg="${r}">${label}</span>`;
  }).join("");
  document.querySelectorAll("#reg-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.region = el.dataset.reg;
      document.querySelectorAll("#reg-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });

  const sk = ["all","B","I","A","P"];
  document.getElementById("sk-chips").innerHTML = sk.map(s => {
    const label = s==="all"?"全部":SKILL_LABELS[s].ch;
    return `<span class="chip ${s==='all'?'active':''}" data-sk="${s}">${label}</span>`;
  }).join("");
  document.querySelectorAll("#sk-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.skill = el.dataset.sk;
      document.querySelectorAll("#sk-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });

  const ss = [
    ["all","全部"], ["ne","秋冬 NE Sep–Mar"], ["typhoon","颱風季 Jul–Oct"], ["both","雙季"], ["year","全年"]
  ];
  document.getElementById("ss-chips").innerHTML = ss.map(([v,l]) =>
    `<span class="chip ${v==='all'?'active':''}" data-ss="${v}">${l}</span>`
  ).join("");
  document.querySelectorAll("#ss-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.season = el.dataset.ss;
      document.querySelectorAll("#ss-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });
}

function matchesFilters(it){
  if(FILTERS.category!=="all" && it.category!==FILTERS.category) return false;
  if(FILTERS.region!=="all" && it.region!==FILTERS.region) return false;
  if(FILTERS.skill!=="all" && !it.skill.includes(FILTERS.skill)) return false;
  if(FILTERS.season!=="all"){
    if(FILTERS.season === "year" && it.season!=="year") return false;
    else if(FILTERS.season!=="year" && it.season!==FILTERS.season && it.season!=="year" && it.season!=="both") return false;
  }
  if(FILTERS.q){
    const q = lc(FILTERS.q);
    const hay = [it.name, it.name_full, it.ch, it.region, it.bottom, it.skill_raw, it.wave_type, it.swell].join(" ").toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function switchMode(mode){
  document.querySelectorAll(".mode-btn").forEach(b => { const on = b.dataset.mode === mode; b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll(".pane").forEach(p => p.style.display = p.dataset.mode === mode ? "" : "none");
  if(mode === "season") renderSeason();
  if(mode === "skill") renderSkillRec();
  if(mode === "compare") renderCompare();
  if(mode === "index") renderIndex();
  if(mode === "map") renderMap();
}

function render(){ renderIndex(); }
function renderIndex(){
  const grid = document.getElementById("grid");
  const filtered = ALL.filter(matchesFilters);
  document.getElementById("result-count").textContent = `${filtered.length} 項 / ${ALL.length}`;
  if(filtered.length === 0){
    grid.innerHTML = `<div class="empty" style="grid-column: 1/-1;">沒有符合條件的項目 — 試試重設篩選器。</div>`;
    return;
  }
  grid.innerHTML = filtered.map((it,i) => cardHTML(it, i)).join("");
  grid.querySelectorAll(".card").forEach(c => {
    c.addEventListener("click", (e) => {
      if(e.target.closest(".compare-btn")) return;
      if(e.target.closest(".fav-btn")) return;
      openDetail(c.dataset.key);
    });
  });
  grid.querySelectorAll(".compare-btn").forEach(c => {
    c.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCompare(c.closest(".card").dataset.key);
    });
  });
  grid.querySelectorAll(".fav-btn").forEach(c => {
    c.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = c.dataset.fav;
      const on = toggleFav("korea", key);
      c.classList.toggle("on", on);
    });
  });
  window.SS_CURRENT_LIST = filtered.map(i => i.key);
}

function cardHTML(it, idx){
  const inCmp = COMPARE.includes(it.key);
  const fav = isFav("korea", it.key);
  const skills = it.skill.map(s => `<span class="tag tag-ink">${SKILL_LABELS[s].short}</span>`).join("");
  const seasonTag = it.season==="ne"
    ? `<span class="tag tag-must">秋冬 NE</span>`
    : it.season==="typhoon"
    ? `<span class="tag tag-verm">颱風季</span>`
    : it.season==="both"
    ? `<span class="tag tag-ocean">雙季</span>`
    : it.season==="year"
    ? `<span class="tag tag-teal">全年</span>`
    : "";
  const catBadge = `<span class="tag ${
    it.category==='spot'?'tag-verm':
    it.category==='hidden'?'tag-blood':
    it.category==='extension'?'tag-ocean':
    it.category==='service'?'tag-teal':
    'tag-ink'}">${CATEGORY_LABELS[it.category]?.short || ""}</span>`;
  const num = String(idx+1).padStart(2,'0');
  const blurb = it.wave_type || it.raw?.basic_info?.gps_location || "";
  return `
    <div class="card ${inCmp?'in-compare':''}" data-key="${it.key}">
      <button class="fav-btn ${fav?'on':''}" data-fav="${it.key}" title="加入收藏"></button>
      <button class="compare-btn ${inCmp?'added':''}" title="加入比較">${inCmp?'✓ COMPARE':'+ COMPARE'}</button>
      <div class="row1">
        <span class="num">${num}</span>
        <div class="name" style="padding-right:32px;">
          ${it.name}
          ${it.ch ? `<span class="ch">${it.ch}</span>` : ''}
        </div>
      </div>
      <div class="meta-row">
        ${catBadge}
        <span class="tag">${it.region_short}</span>
        ${seasonTag}
        ${skills}
      </div>
      ${blurb ? `<div class="blurb">${escape(blurb).slice(0,140)}${blurb.length>140?'…':''}</div>` : ''}
      <dl class="data">
        ${it.wave_height_raw ? `<dt>WAVE</dt><dd>${escape(it.wave_height_raw).slice(0,60)}</dd>`:''}
        ${it.bottom ? `<dt>BOTTOM</dt><dd>${escape(it.bottom).slice(0,60)}</dd>`:''}
        ${it.crowd ? `<dt>CROWD</dt><dd>${dotsRating(it.crowd)}</dd>`:''}
        ${it.consistency ? `<dt>CONSIST</dt><dd>${dotsRating(it.consistency)}</dd>`:''}
      </dl>
    </div>
  `;
}

function dotsRating(n){
  let s='<span class="dots-rating">';
  for(let i=1;i<=5;i++) s += `<span class="d ${i<=n?'on':''}"></span>`;
  return s + '</span>';
}

function escape(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function openDetail(key){
  const it = ALL.find(x => x.key === key);
  if(!it) return;
  const r = it.raw;
  const sections = [];

  function kvSection(title, keymap, source){
    const rows = [];
    for(const [k,label] of keymap){
      const v = source?.[k];
      if(v==null || v==="") continue;
      const isUncertain = (r.uncertain||[]).includes(k);
      rows.push(`<div class="k">${label}</div><div class="v">${escape(v)}${isUncertain?'<span class="uncertain">不確定</span>':''}</div>`);
    }
    if(!rows.length) return "";
    return `<div class="detail-section"><h3>${title}</h3><div class="kv">${rows.join("")}</div></div>`;
  }

  sections.push(kvSection("Basic / 基本資料", [
    ["category","類別"],["region","區域"],["gps_location","GPS"],
    ["distance_from_icn_airport_km","距機場 / 交通"]
  ], r.basic_info));

  sections.push(kvSection("Surf / 浪況", [
    ["wave_type","浪型"],["skill_level","技術等級"],["wave_height_range","浪高"],
    ["bottom_type","底質"],["best_season","最佳季節"],["best_tide","最佳潮汐"],
    ["best_wind","最佳風向"],["best_swell_direction","Swell 方向"],
    ["swell_consistency_rating","穩定度 1-5"],["wave_length_meters","浪長"],
    ["peak_crowd_level","擁擠度 1-5"]
  ], r.surf_conditions));

  sections.push(kvSection("Practical / 實用", [
    ["access","進場路線"],["paddle_out_method","划出路線"],
    ["entry_fee","費用"],["recommended_session_time","建議時段"],
    ["nearby_warung","附近食堂 / Warung"],
    ["alternative_spot_within_10min","10 分鐘內備案"]
  ], r.practical_info));

  sections.push(waterTempSectionHTML(it.region));

  sections.push(kvSection("Safety / 安全與文化", [
    ["hazards","危險"],["marine_hazards","海洋生物"],
    ["rip_current_pattern","Rip 流"],
    ["localism_intensity","Localism 程度"],["respect_protocol","禮儀守則"]
  ], r.safety_culture));

  sections.push(kvSection("Services / 服務", [
    ["nearest_surf_school","附近學校"],["board_rental_availability","板租"],
    ["accommodation_options","住宿"]
  ], r.services));

  sections.push(kvSection("Pricing / 價格", [
    ["avg_lesson_price","平均課程價"]
  ], r.pricing));

  sections.push(kvSection("Events / 賽事 · 社群", [
    ["annual_competition_window","賽事窗口"],["community_events","社群活動"]
  ], r.events_community));

  const known = new Set(["basic_info","surf_conditions","practical_info","safety_culture","services","pricing","events_community","uncertain"]);
  for(const [k,v] of Object.entries(r)){
    if(known.has(k)) continue;
    if(typeof v !== "object" || Array.isArray(v)) continue;
    const rows = [];
    for(const [k2,v2] of Object.entries(v)){
      if(v2==null || v2==="" ) continue;
      if(typeof v2 === "object") continue;
      const isUncertain = (r.uncertain||[]).includes(k2);
      rows.push(`<div class="k">${escape(k2.replace(/_/g,' '))}</div><div class="v">${escape(v2)}${isUncertain?'<span class="uncertain">不確定</span>':''}</div>`);
    }
    if(rows.length){
      sections.push(`<div class="detail-section"><h3>${escape(k.replace(/_/g,' '))}</h3><div class="kv">${rows.join("")}</div></div>`);
    }
  }

  const tags = [];
  if(CATEGORY_LABELS[it.category]) tags.push(`<span class="tag tag-verm">${CATEGORY_LABELS[it.category].ch}</span>`);
  tags.push(`<span class="tag">${it.region_ch}</span>`);
  if(it.season==="ne") tags.push(`<span class="tag tag-must">秋冬 NE</span>`);
  if(it.season==="typhoon") tags.push(`<span class="tag tag-verm">颱風季</span>`);
  if(it.season==="both") tags.push(`<span class="tag tag-ocean">雙季</span>`);
  if(it.season==="year") tags.push(`<span class="tag tag-teal">全年</span>`);
  it.skill.forEach(s => tags.push(`<span class="tag tag-ink">${SKILL_LABELS[s].ch}</span>`));

  const list = window.SS_CURRENT_LIST.length ? window.SS_CURRENT_LIST : ALL.map(i=>i.key);
  const idx = list.indexOf(key);
  const posLabel = idx >= 0 ? `${idx+1}/${list.length}` : "";

  const cites = [];
  if(r.basic_info?.gps_location){
    const gps = r.basic_info.gps_location;
    const m = gps.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if(m) cites.push(`GPS · <a href="https://www.google.com/maps?q=${m[1]},${m[2]}" target="_blank">${m[1]}, ${m[2]} (Google Maps)</a>`);
  }
  const citesHTML = cites.length ? `
    <div class="detail-citations">
      <h4>外部連結 / EXTERNAL LINKS</h4>
      <ol>${cites.map(c => `<li>${c}</li>`).join("")}</ol>
    </div>
  ` : "";

  const fav = isFav("korea", key);

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
        <button class="fav-btn ${fav?'on':''}" onclick="(() => { const on = toggleFav('korea','${key}'); event.target.classList.toggle('on', on); })()" title="收藏"></button>
        <button class="detail-nav-btn" onclick="detailPrevNext(-1)" title="← 上一個">←</button>
        <span style="font-family:var(--mono); font-size:11px; color:var(--paper); opacity:.6;">${posLabel}</span>
        <button class="detail-nav-btn" onclick="detailPrevNext(1)" title="下一個 →">→</button>
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
window.closeDetail = function(){
  document.getElementById("detail-overlay").classList.remove("open");
  document.body.style.overflow = "";
  window.SS_CURRENT_KEY = null;
  if(location.hash.startsWith("#detail=")) history.replaceState(null, "", location.pathname);
};
window.openDetail = openDetail;

function toggleCompare(key){
  const i = COMPARE.indexOf(key);
  if(i >= 0) COMPARE.splice(i,1);
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
    grid.innerHTML = `<div class="compare-empty">尚未加入比較項目。回到 Index 頁,在卡片右上角按下 <strong>+ COMPARE</strong> 按鈕,最多可加入 4 項。</div>`;
    grid.style.display = "block";
    grid.style.gridTemplateColumns = "";
    return;
  }
  const items = COMPARE.map(k => ALL.find(x => x.key === k));
  const rows = [
    ["區域 Region", (it) => `${it.region_ch}`],
    ["類別", (it) => CATEGORY_LABELS[it.category]?.ch || ""],
    ["浪型 Wave Type", (it) => it.wave_type || "—"],
    ["技術 Skill", (it) => it.skill_raw || (it.skill.map(s=>SKILL_LABELS[s].ch).join("、")) || "—"],
    ["浪高 Range", (it) => it.wave_height_raw || "—"],
    ["底質 Bottom", (it) => it.bottom || "—"],
    ["最佳季 Season", (it) => it.raw.surf_conditions?.best_season || "—"],
    ["最佳潮 Tide", (it) => it.tide || "—"],
    ["最佳風 Wind", (it) => it.wind || "—"],
    ["Swell 方向", (it) => it.swell || "—"],
    ["穩定度", (it) => it.consistency ? dotsRating(it.consistency) : "—"],
    ["擁擠度", (it) => it.crowd ? dotsRating(it.crowd) : "—"],
    ["危險 Hazards", (it) => (it.hazards||"—").slice(0,180) + (it.hazards?.length>180?'…':'')],
    ["Localism", (it) => it.localism || "—"],
    ["近備案", (it) => it.alt_nearby || "—"],
    ["平均課程價", (it) => it.lesson_price || "—"]
  ];
  let html = `<div class="ch"></div>`;
  items.forEach(it => {
    html += `<div class="hd">${it.name}${it.ch?`<small>${it.ch}</small>`:''}</div>`;
  });
  for(const [label, fn] of rows){
    html += `<div class="ch">${label}</div>`;
    items.forEach(it => {
      html += `<div class="cv">${fn(it)}</div>`;
    });
  }
  grid.style.display = "grid";
  grid.style.setProperty("--cols", items.length);
  grid.style.gridTemplateColumns = `200px repeat(${items.length}, 1fr)`;
  grid.innerHTML = html;
}

function renderSeason(){
  const spots = ALL.filter(it => (it.category==="spot" || it.category==="hidden" || it.category==="extension") && it.months.length>0);
  spots.sort((a,b) => {
    if(a.region !== b.region) return a.region.localeCompare(b.region);
    return (a.monthsPeak[0]||13) - (b.monthsPeak[0]||13);
  });
  const now = new Date();
  const curMonth = now.getMonth() + 1;

  const head = `
    <div class="season-head">
      <div class="lbl">浪點 / 月份</div>
      ${MONTHS.map((m,i) => `<div class="m ${i+1===curMonth?'peak':''}">${m}</div>`).join("")}
    </div>
  `;
  const rows = spots.map(it => {
    let cells = "";
    for(let m=1;m<=12;m++){
      const peak = it.monthsPeak.includes(m);
      const good = it.months.includes(m);
      const cls = peak ? "peak" : good ? "good" : "off";
      cells += `<div class="month ${cls}" title="${MONTHS[m-1]}"></div>`;
    }
    return `
      <div class="season-row">
        <div class="spot-name" onclick="openDetail('${it.key}')">
          ${it.name}
          <small>${it.region_short} · ${it.category.toUpperCase()}</small>
        </div>
        ${cells}
      </div>
    `;
  }).join("");

  document.getElementById("season-table").innerHTML = head + rows;
  document.getElementById("season-legend").innerHTML = `
    <span class="tag tag-verm">PEAK 招牌月</span>
    <span class="tag" style="background:rgba(232,79,27,.45);border-color:var(--ink);">GOOD 可衝</span>
    <span class="tag tag-must">SHOULDER</span>
    <span class="tag" style="background:transparent;border-color:var(--ink-soft);color:var(--ink-soft);">OFF</span>
    <span style="margin-left:auto; font-family:var(--mono); font-size:10.5px;">本月: ${MONTHS[curMonth-1]} · 點選浪點查看完整資料</span>
  `;
  renderWaterTempMatrix();
}

function renderWaterTempMatrix(){
  const host = document.getElementById("water-temp-matrix");
  if(!host) return;
  const regions = Object.keys(WATER_TEMP_META).filter(r => r !== "全韓國 / Korea-wide");
  const head = `
    <div class="wt-mx-head">
      <div class="wt-mx-lbl">區域 / 月份</div>
      ${MONTHS.map((m,i) => `<div class="wt-mx-m ${i+1===new Date().getMonth()+1?'cur':''}">${m}</div>`).join("")}
      <div class="wt-mx-suit">建議裝備 (年最低)</div>
    </div>
  `;
  const rows = regions.map(reg => {
    const data = WATER_TEMP_META[reg];
    const min = Math.min(...data.temps);
    const cells = data.temps.map(t => `<div class="wt-mx-cell" style="background:${tempColor(t)};" title="${t}°C → ${suitFor(t)}">${t}</div>`).join("");
    return `
      <div class="wt-mx-row">
        <div class="wt-mx-name">
          ${REGION_MAP[reg]?.ch || reg}
          <small>${REGION_MAP[reg]?.short || ""}</small>
        </div>
        ${cells}
        <div class="wt-mx-suit-cell">${suitFor(min)}</div>
      </div>
    `;
  }).join("");
  host.innerHTML = `
    <div class="wt-mx-title">
      <div>
        <div class="eyebrow" style="color:var(--ocean);">SEA SURFACE TEMP / 水溫年度</div>
        <h3 style="font-family:var(--display); font-size:32px; margin:6px 0 4px; line-height:1;">月均水溫 × 區域</h3>
        <p style="font-family:var(--serif); font-size:13.5px; margin:0; color:var(--ink-soft);">
          色階:<span style="display:inline-block; width:14px; height:14px; background:${tempColor(6)}; border:1px solid var(--ink); vertical-align:-3px;"></span> &lt;8°
          <span style="display:inline-block; width:14px; height:14px; background:${tempColor(11)}; border:1px solid var(--ink); vertical-align:-3px; margin-left:6px;"></span> 8–12°
          <span style="display:inline-block; width:14px; height:14px; background:${tempColor(15)}; border:1px solid var(--ink); vertical-align:-3px; margin-left:6px;"></span> 13–16°
          <span style="display:inline-block; width:14px; height:14px; background:${tempColor(19)}; border:1px solid var(--ink); vertical-align:-3px; margin-left:6px;"></span> 17–20°
          <span style="display:inline-block; width:14px; height:14px; background:${tempColor(24)}; border:1px solid var(--ink); vertical-align:-3px; margin-left:6px;"></span> 21–25°
          <span style="display:inline-block; width:14px; height:14px; background:${tempColor(28)}; border:1px solid var(--ink); vertical-align:-3px; margin-left:6px;"></span> ≥26°
        </p>
      </div>
    </div>
    <div class="wt-mx">${head}${rows}</div>
  `;
}

const SKILL_FLOW = {
  level: "I",
  budget: "mid",
  travel: "east",
  season: "ne"
};

function renderSkillRec(){
  document.getElementById("skill-questions").innerHTML = `
    <div class="skill-question">
      <div class="q">Q1 · 技術等級 / Skill Level</div>
      <div class="opts">
        ${[
          ["B","初學者(會 pop-up,搭軟板白浪)"],
          ["I","中階(會 cutback,綠浪 trim)"],
          ["A","進階(會 vertical snap, hollow takeoff)"],
          ["P","Pro 級(barrel, air, 大浪)"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.level===v?'selected':''}" data-k="level" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q2 · 預算 / Budget</div>
      <div class="opts">
        ${[
          ["shoestring","背包客 < ₩50,000/晚"],
          ["mid","中等 ₩50,000–150,000/晚"],
          ["lux","Resort ₩150,000+/晚"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.budget===v?'selected':''}" data-k="budget" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q3 · 旅行範圍 / Range</div>
      <div class="opts">
        ${[
          ["east","東岸 · 襄陽 / 束草 / 高城"],
          ["south","東南岸 · 釜山 / 浦項"],
          ["jeju","濟州島"],
          ["far","不限"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.travel===v?'selected':''}" data-k="travel" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q4 · 季節 / When</div>
      <div class="opts">
        ${[
          ["ne","秋冬 NE Sep–Mar"],
          ["typhoon","颱風季 Jul–Oct"],
          ["any","不限"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.season===v?'selected':''}" data-k="season" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
  `;
  document.querySelectorAll("#skill-questions .opt").forEach(el => {
    el.addEventListener("click", () => {
      SKILL_FLOW[el.dataset.k] = el.dataset.v;
      renderSkillRec();
    });
  });
  const EAST_REGIONS = new Set(["襄陽 / Yangyang","束草 / Sokcho","高城 / Goseong"]);
  const SOUTH_REGIONS = new Set(["釜山 / Busan","慶尚北道 / Pohang"]);
  const JEJU_REGIONS = new Set(["濟州島 / Jeju"]);

  const matches = ALL
    .filter(it => it.category==="spot" || it.category==="hidden" || it.category==="extension")
    .map(it => {
      let score = 0;
      const reasons = [];
      if(it.skill.includes(SKILL_FLOW.level)){ score += 40; reasons.push("技術等級匹配"); }
      else {
        const order = ["B","I","A","P"];
        const wanted = order.indexOf(SKILL_FLOW.level);
        const closest = it.skill.map(s=>order.indexOf(s)).reduce((a,b)=>Math.min(a, Math.abs(b-wanted)), 99);
        if(closest === 1) score += 15;
      }
      if(SKILL_FLOW.travel === "east"){
        if(EAST_REGIONS.has(it.region)) { score += 25; reasons.push("東岸首爾近郊"); }
      } else if(SKILL_FLOW.travel === "south"){
        if(SOUTH_REGIONS.has(it.region)) { score += 25; reasons.push("東南岸 KTX 直達"); }
      } else if(SKILL_FLOW.travel === "jeju"){
        if(JEJU_REGIONS.has(it.region)) { score += 30; reasons.push("濟州島颱風期"); }
      } else {
        score += 18;
      }
      if(SKILL_FLOW.season && SKILL_FLOW.season !== "any"){
        if(it.season === SKILL_FLOW.season || it.season === "both") { score += 20; reasons.push(SKILL_FLOW.season==="ne"?"秋冬 NE 主場":"颱風主場"); }
        else if(it.season === "year") { score += 8; reasons.push("全年可衝"); }
        else score -= 8;
      } else { score += 10; }
      if(SKILL_FLOW.level === "B" && it.crowd && it.crowd >= 4){ score -= 6; }
      if(SKILL_FLOW.level === "P" && it.consistency && it.consistency >= 4){ score += 5; reasons.push("一致性高"); }
      return { it, score, reasons };
    })
    .filter(x => x.score >= 30)
    .sort((a,b) => b.score - a.score)
    .slice(0, 12);

  const list = matches.map(({it,score,reasons}) => `
    <div class="match-row" onclick="openDetail('${it.key}')">
      <div class="score">${Math.round(score)}</div>
      <div class="name">
        ${it.name}
        <small>${it.region_short} · ${it.skill.map(s=>SKILL_LABELS[s].short).join("·")}</small>
      </div>
      <div class="why">${reasons.slice(0,3).join(" · ")||"—"}</div>
    </div>
  `).join("") || `<div class="empty">沒有強匹配 — 試試放寬條件。</div>`;

  document.getElementById("skill-results").innerHTML = `
    <h4>推薦浪點 / ${matches.length} 項</h4>
    <div style="font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft);">
      WEIGHTED SCORE · BAYESIAN-ISH MATCH
    </div>
    <div class="match-list">${list}</div>
  `;
}

// ===== Korea SVG Map (geo-accurate) =====
// viewBox 480x720
//   lng 125.0 → x=0, lng 130.8 → x=480   (scale 82.76 per deg lng)
//   lat 39.0  → y=0, lat 32.5  → y=720   (scale 110.77 per deg lat)
function gpsToXY(gps){
  if(!gps) return null;
  const m = gps.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if(!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  return {
    x: (lng - 125.0) * 82.76,
    y: (39.0 - lat) * 110.77
  };
}

function renderMap(){
  const container = document.getElementById("map-wrap");
  if(!container) return;

  const fillByCat = {
    spot:      "var(--vermillion)",
    hidden:    "var(--oxblood)",
    extension: "var(--ocean)",
    service:   "var(--mustard)",
    practical: "var(--teal)"
  };

  const items = ALL.filter(it => matchesFilters(it)).filter(it => it.gps);
  const pins = items.map(it => {
    const p = gpsToXY(it.gps);
    if(!p) return "";
    const fill = fillByCat[it.category] || "var(--ink)";
    const label = (it.ch || it.name).slice(0, 10);
    const eastPin = p.x > 270;
    const tx = eastPin ? 10 : -10;
    const anchor = eastPin ? "start" : "end";
    return `<g class="map-pin" data-key="${it.key}" transform="translate(${p.x},${p.y})">
      <circle r="6" fill="${fill}" stroke="var(--ink)" stroke-width="1.4"/>
      <circle r="2.4" fill="var(--paper)" opacity=".45"/>
      <text x="${tx}" y="3.5" font-family="var(--mono)" font-size="9.5" text-anchor="${anchor}" fill="var(--ink)" style="paint-order: stroke; stroke: var(--paper); stroke-width: 3px;">${label}</text>
    </g>`;
  }).join("");

  // ===== South Korean peninsula — clockwise from DMZ (Goseong NE coast) =====
  // ~30 anchor points based on real ports/capes
  const peninsula = `
    M 273 51
    L 280 80 L 287 110 L 292 145
    L 295 175 L 295 200 L 298 230 L 305 260
    L 312 290 L 312 320 L 305 350 L 290 380
    L 270 405 L 240 420 L 215 420 L 195 410
    L 175 395 L 168 372 L 155 348 L 137 330
    L 118 315 L 100 295 L 88 275 L 80 245
    L 68 215 L 60 180 L 60 150 L 75 120
    L 88 95 L 105 75 L 130 60 L 158 53
    L 195 50 L 235 48
    Z`;

  // Jeju Island (33.4°N, 126.55°E) — distinctive elongated oval
  const jeju = `M 90 600 L 145 600 L 160 620 L 158 640 L 130 658 L 95 658 L 75 645 L 75 620 Z`;

  // Ulleungdo (37.5°N, 130.87°E)
  const ulleung = `<circle cx="465" cy="166" r="7" fill="url(#kr-land)" stroke="var(--ink)" stroke-width="1.4"/>
                   <text x="455" y="155" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-soft)">鬱陵島</text>`;

  container.innerHTML = `
    <div class="bali-map korea-map">
      <svg viewBox="0 0 480 720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="kr-grain" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".55" fill="rgba(13,59,92,.16)"/>
          </pattern>
          <pattern id="kr-land" width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill="var(--paper-warm)"/>
            <circle cx="2" cy="2" r=".7" fill="rgba(26,22,20,.10)"/>
          </pattern>
          <pattern id="kr-nk" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="var(--paper-deep)"/>
            <line x1="0" y1="6" x2="6" y2="0" stroke="var(--ink-soft)" stroke-width=".5"/>
          </pattern>
        </defs>

        <rect width="480" height="720" fill="url(#kr-grain)"/>

        <!-- North Korea (above DMZ at 38°N) -->
        <path d="M 0 0 L 480 0 L 480 50 L 235 48 L 195 50 L 158 53 L 130 60 L 105 75 L 88 95 L 75 120 L 60 150 L 60 70 L 0 50 Z"
              fill="url(#kr-nk)" opacity=".85" stroke="var(--ink)" stroke-width=".8"/>
        <text x="240" y="25" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" opacity=".75" letter-spacing="3">DPRK · 朝 鮮</text>

        <!-- DMZ -->
        <line x1="50" y1="55" x2="280" y2="50" stroke="var(--vermillion-d)" stroke-width="2" stroke-dasharray="4,3"/>
        <text x="160" y="68" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--vermillion-d)" letter-spacing="2">— DMZ 38°N —</text>

        <!-- Tsushima warm current along E coast -->
        <path d="M 380 700 Q 400 600 410 470 Q 420 350 410 250 Q 400 160 420 80"
              fill="none" stroke="var(--vermillion)" stroke-width="10" opacity=".07" stroke-linecap="round"/>
        <path d="M 380 700 Q 400 600 410 470 Q 420 350 410 250 Q 400 160 420 80"
              fill="none" stroke="var(--vermillion-d)" stroke-width=".8" opacity=".3" stroke-dasharray="3,4"/>

        <!-- South Korea peninsula -->
        <path d="${peninsula}" fill="url(#kr-land)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>

        <!-- Jeju Island -->
        <path d="${jeju}" fill="url(#kr-land)" stroke="var(--ink)" stroke-width="1.4"/>
        <text x="117" y="680" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="2">JEJU · 濟州島</text>

        <!-- Ulleungdo -->
        ${ulleung}

        <!-- Japan (Tsushima + Kyushu hint) lower-right -->
        <path d="M 430 380 L 480 370 L 480 720 L 460 720 L 445 700 L 435 670 L 432 640 L 442 600 L 450 560 L 458 510 L 458 460 L 446 420 Z"
              fill="var(--paper-deep)" opacity=".5" stroke="var(--ink)" stroke-width=".8" stroke-dasharray="2,3"/>
        <text x="460" y="540" text-anchor="end" font-family="var(--display-3)" font-size="9" fill="var(--ink-soft)" opacity=".7" letter-spacing="1">JP →</text>

        <!-- China (far left edge) -->
        <path d="M 0 60 L 50 70 L 55 200 L 50 360 L 40 500 L 20 660 L 0 720 Z"
              fill="var(--paper-deep)" opacity=".45" stroke="var(--ink)" stroke-width=".8" stroke-dasharray="2,3"/>

        <!-- City anchors -->
        <g class="city-anchors" font-family="var(--display-3)" font-size="10.5" fill="var(--ink-soft)" opacity=".62" letter-spacing="1">
          <circle cx="183" cy="158" r="2.5" fill="var(--ink-soft)"/><text x="178" y="153" text-anchor="end">首爾 SEL</text>
          <circle cx="225" cy="280" r="2.2" fill="var(--ink-soft)"/><text x="220" y="285" text-anchor="end">大田</text>
          <circle cx="285" cy="335" r="2.5" fill="var(--ink-soft)"/><text x="297" y="338">釜山</text>
          <circle cx="265" cy="230" r="2.2" fill="var(--ink-soft)"/><text x="276" y="234">江陵</text>
          <circle cx="190" cy="385" r="2.2" fill="var(--ink-soft)"/><text x="185" y="390" text-anchor="end">光州</text>
        </g>

        <!-- Compass -->
        <g transform="translate(440,120)">
          <circle r="20" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.3"/>
          <path d="M 0 -15 L 4.5 0 L 0 15 L -4.5 0 Z" fill="var(--vermillion)" stroke="var(--ink)" stroke-width=".8"/>
          <text y="-25" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink)">N</text>
        </g>

        <!-- Scale (100 km ≈ 100 px at this lat) -->
        <g transform="translate(360,700)">
          <line x1="0" y1="0" x2="100" y2="0" stroke="var(--ink)" stroke-width="1.6"/>
          <line x1="0" y1="-4" x2="0" y2="4" stroke="var(--ink)" stroke-width="1.6"/>
          <line x1="50" y1="-3" x2="50" y2="3" stroke="var(--ink)" stroke-width="1.4"/>
          <line x1="100" y1="-4" x2="100" y2="4" stroke="var(--ink)" stroke-width="1.6"/>
          <text x="0" y="-7" text-anchor="start" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">0</text>
          <text x="100" y="-7" text-anchor="end" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">100 km</text>
        </g>

        <!-- Sea labels -->
        <text x="240" y="-2" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="3">KOREA 衝浪檔案</text>
        <text x="445" y="280" text-anchor="end" font-family="var(--display-3)" font-size="13" fill="var(--ink-soft)" letter-spacing="3" opacity=".7">EAST SEA</text>
        <text x="445" y="298" text-anchor="end" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="3" opacity=".55">日 本 海</text>
        <text x="35" y="280" font-family="var(--display-3)" font-size="12" fill="var(--ink-soft)" letter-spacing="2" opacity=".55">YELLOW SEA</text>
        <text x="35" y="298" font-family="var(--display-3)" font-size="10" fill="var(--ink-soft)" letter-spacing="2.5" opacity=".55">黃 海</text>
        <text x="240" y="510" text-anchor="middle" font-family="var(--display-3)" font-size="10" fill="var(--ink-soft)" letter-spacing="3" opacity=".55">KOREA STRAIT · 大 韓 海 峽</text>

        ${pins}
      </svg>
      <div class="map-legend">
        <div class="map-legend-row"><span class="map-dot" style="background:var(--vermillion);"></span> 浪點 Spot</div>
        <div class="map-legend-row"><span class="map-dot" style="background:var(--oxblood);"></span> 私房 Hidden</div>
        <div class="map-legend-row"><span class="map-dot" style="background:var(--ocean);"></span> 延伸 Ext.</div>
        <div class="map-legend-row"><span class="map-dot" style="background:var(--mustard);"></span> 服務 Service</div>
        <div class="map-legend-row"><span class="map-dot" style="background:var(--teal);"></span> 實用 Practical</div>
        <hr style="border:0; border-top:1px dashed var(--ink); margin:8px 0;"/>
        <div style="font-family:var(--mono); font-size:10px; color:var(--ink-soft); line-height:1.55;">
          ${items.length} 項顯示 / ${ALL.length} 總計<br/>
          點擊圓點 → 詳情<br/>
          套用 INDEX 篩選會同步
        </div>
      </div>
    </div>
  `;
  container.querySelectorAll(".map-pin").forEach(p => {
    p.addEventListener("click", () => openDetail(p.dataset.key));
  });

  const svg = container.querySelector("svg");
  const legend = container.querySelector(".map-legend");
  if(svg && legend && window.attachMapControls){
    legend.querySelector(".map-zoom-controls")?.remove();
    window.attachMapControls(svg, legend);
  }
}
window.renderMap = renderMap;

function renderTrip(){}
window.renderTrip = renderTrip;

window.addEventListener("DOMContentLoaded", boot);
