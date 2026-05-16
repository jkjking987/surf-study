// =========================================================
// 衝浪研究室 — Bali Issue (No. 001) logic
// =========================================================

const REGION_MAP = {
  "South Bukit Peninsula": { ch: "Bukit · 南半島", short: "BUKIT" },
  "West Coast":            { ch: "西岸",           short: "WEST" },
  "East Coast":            { ch: "東岸",           short: "EAST" },
  "Nearby Islands":        { ch: "離島",           short: "ISLE" },
  "Java":                  { ch: "爪哇 / Java",    short: "JAVA" },
  "Lombok":                { ch: "Lombok",         short: "LBK" },
  "Sumbawa":               { ch: "Sumbawa",        short: "SBW" },
  "Sumba":                 { ch: "Sumba",          short: "SMB" },
  "Sumatra":               { ch: "Sumatra",        short: "MEN" },
  "Rote":                  { ch: "Rote",           short: "RTE" },
  "Bali-wide":             { ch: "全島服務",       short: "ALL" },
  "Online":                { ch: "線上工具",       short: "WEB" }
};

// Manual category mapping by key (overrides basic_info.category)
const SERVICE_KEYS = new Set([
  "Surf_Schools", "Surf_Camps", "Women_Surf_Retreats", "Eco_Surf_Camps",
  "Board_Rental_Ding_Repair", "Surf_Photography", "Surf_Guide_Boat",
  "Surf_Forecast_Tools", "Surf_Competitions", "Community_Events",
  "Season_Safety_Medical", "Transport_Logistics", "Visa_Entry_Logistics"
]);

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
  "jan":1, "january":1,
  "feb":2, "february":2,
  "mar":3, "march":3,
  "apr":4, "april":4,
  "may":5,
  "jun":6, "june":6,
  "jul":7, "july":7,
  "aug":8, "august":8,
  "sep":9, "sept":9, "september":9,
  "oct":10, "october":10,
  "nov":11, "november":11,
  "dec":12, "december":12
};

// ===== Helpers =====
function asArr(x){ if(!x) return []; return Array.isArray(x)?x:[x]; }
function lc(s){ return (s||"").toLowerCase(); }

function parseMonthsFromText(text){
  // returns array of 1..12 numbers covered by the text
  if(!text) return [];
  const t = lc(text);
  const set = new Set();
  // Direct year-round
  if(/year[\s\-]?round|all\s*year|全年/.test(t)) {
    for(let i=1;i<=12;i++) set.add(i);
    return [...set];
  }
  // Patterns: "may-october", "May to October", "Apr/May-October"
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
  // Also: "in May, June, July"
  const re2 = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/g;
  // (Don't double-add if range already covers)
  return [...set].sort((a,b)=>a-b);
}

function monthNum(name){
  const k = lc(name).slice(0, 4);
  for(const [k2,v] of Object.entries(MONTHS_NUM_NAME)){
    if(k2.startsWith(lc(name).slice(0,3))) return v;
  }
  return MONTHS_NUM_NAME[lc(name)];
}

function parsePeakMonths(text){
  // Find "(peak X-Y)" or "peak Aug-Sep" within text
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
    if(/all\s*levels?|各程度/.test(t)) return ["B","I","A","P"];
  }
  return out;
}

function parseWaveHeight(text){
  if(!text) return null;
  const m = lc(text).match(/(\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)\s*(ft|feet|m|公尺|米)/);
  if(m) return { min: +m[1], max: +m[2], unit: m[3]==="m"||m[3]==="公尺"||m[3]==="米" ? "m" : "ft" };
  return null;
}

function parseCrowd(text){
  if(!text) return null;
  const m = String(text).match(/^(\d)\b/);
  if(m) return +m[1];
  return null;
}

function classifyCategory(key, raw){
  const cat = raw?.basic_info?.category || "";
  if(SERVICE_KEYS.has(key)){
    if(["Season_Safety_Medical","Transport_Logistics","Visa_Entry_Logistics","Surf_Forecast_Tools"].includes(key)) return "practical";
    return "service";
  }
  if(cat === "surf_spot_hidden") return "hidden";
  if(cat === "extension_destination") return "extension";
  if(cat === "practical") return "practical";
  if(cat === "event_culture") return "service"; // group with services
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
  // Find first parenthetical containing Chinese, strip "Chinese:" prefix etc.
  const m = name.match(/\(([^()]*[\u4e00-\u9fff][^()]*)\)/);
  if(m){
    let ch = m[1].trim();
    ch = ch.replace(/.*Chinese:\s*/i, "");
    // Strip "Indonesian: ..." suffix
    ch = ch.replace(/\s*;.*$/, "");
    if(ch.includes("/") && ch.split("/").length > 1) ch = ch.split("/")[0].trim();
    return ch;
  }
  if(/^[\u4e00-\u9fff·\s\/]+$/.test(name)) return name;
  return "";
}

// Some items are flat (Balangan) and others nested (Uluwatu). Flatten + alias.
function flattenForView(raw){
  if(raw.basic_info) return raw; // already nested form
  // flat form -> rebuild a nested-looking object for downstream code
  const r = raw;
  const fields = {
    basic_info: ["name","category","region","gps_location","distance_from_dps_airport_km","distance_from_canggu_uluwatu_min"],
    surf_conditions: ["wave_type","skill_level","wave_height_range","bottom_type","best_season","best_tide","best_wind","best_swell_direction","swell_consistency_rating","wave_length_meters","wave_speed_rating","takeoff_zone_difficulty","secondary_peaks","peak_crowd_level"],
    practical_info: ["access","paddle_out_method","entry_fee","recommended_session_time","best_time_of_day","nearby_warung","alternative_spot_within_10min","boat_charter_required","combo_trip_potential"],
    safety_culture: ["hazards","marine_hazards","reef_cut_severity_index","rip_current_pattern","lineup_etiquette","localism_intensity","respect_protocol","resident_local_legends","religious_sensitivity","medical_nearby","nearest_clinic_distance_km","rescue_jet_ski_available","emergency_contact"],
    services: ["nearest_surf_school","board_rental_availability","surf_photographer_available","photographer_recommendation","accommodation_options","webcam_url","drone_allowed","coworking_nearby"],
    pricing: ["avg_lesson_price","board_rental_daily"],
    sustainability: ["water_quality_rating"],
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
  // also keep any unknown top-level keys
  const known = new Set([].concat(...Object.values(fields), ["uncertain"]));
  for(const [k,v] of Object.entries(r)){
    if(known.has(k)) continue;
    out[k] = v;
  }
  return out;
}

// ===== Normalize one item =====
function normalize(key, raw){
  raw = flattenForView(raw);
  const bi = raw.basic_info || {};
  const sc = raw.surf_conditions || {};
  const name = bi.name || key.replace(/_/g,' ');
  const category = classifyCategory(key, raw);
  const region = bi.region || "Bali-wide";

  let months = parseMonthsFromText(sc.best_season || bi.best_season || "");
  let monthsPeak = parsePeakMonths(sc.best_season || bi.best_season || "");
  let season = "";
  if(sc.best_season){
    const t = lc(sc.best_season);
    if(/dry/.test(t) && !/wet/.test(t)) season = "dry";
    else if(/wet/.test(t) && !/dry/.test(t)) season = "wet";
    else if(/year[\s\-]?round/.test(t)) season = "year";
    else season = "both";
  }
  if(!months.length && season === "dry") months = [4,5,6,7,8,9,10];
  if(!months.length && season === "wet") months = [11,12,1,2,3];
  if(!months.length && season === "year") months = [1,2,3,4,5,6,7,8,9,10,11,12];

  if(!monthsPeak.length){
    if(season === "dry") monthsPeak = [6,7,8,9];
    if(season === "wet") monthsPeak = [12,1,2];
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
    accommodation: raw.services?.accommodation_options || raw.surroundings?.nearby_accommodation || "",
    lesson_price: raw.pricing?.avg_lesson_price || "",
    nearest_school: raw.services?.nearest_surf_school || ""
  };
}

// ===== Boot =====
let ALL = [];       // normalized items
let RAW = null;     // raw data
let FILTERS = {
  q: "",
  category: "all",
  region: "all",
  skill: "all",
  season: "all"
};
let COMPARE = []; // keys
const MAX_COMPARE = 4;

async function boot(){
  const res = await fetch("/api/bali.json");
  RAW = await res.json();
  ALL = Object.entries(RAW).map(([k,v]) => normalize(k, v));

  // Order: keep outline ordering — define by category then name
  const order = ["spot","hidden","extension","service","practical"];
  ALL.sort((a,b) => {
    const ai = order.indexOf(a.category), bi = order.indexOf(b.category);
    if(ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });

  // populate filter chips
  hydrateFilters();
  render();
  // mode tabs
  document.querySelectorAll(".mode-btn").forEach(b => {
    b.addEventListener("click", () => switchMode(b.dataset.mode));
  });
  // search
  document.getElementById("search").addEventListener("input", e => {
    FILTERS.q = e.target.value.trim();
    renderIndex();
  });
}

function hydrateFilters(){
  // Category chips
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

  // Region chips
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

  // Skill chips
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

  // Season chips
  const ss = [
    ["all","全部"], ["dry","乾季 Apr–Oct"], ["wet","雨季 Nov–Mar"], ["year","全年"]
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
    else if(FILTERS.season!=="year" && it.season!==FILTERS.season && it.season!=="year") return false;
  }
  if(FILTERS.q){
    const q = lc(FILTERS.q);
    const hay = [it.name, it.name_full, it.ch, it.region, it.bottom, it.skill_raw, it.wave_type, it.swell].join(" ").toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

// ===== Mode switcher =====
function switchMode(mode){
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  document.querySelectorAll(".pane").forEach(p => p.style.display = p.dataset.mode === mode ? "" : "none");
  if(mode === "season") renderSeason();
  if(mode === "skill") renderSkillRec();
  if(mode === "compare") renderCompare();
  if(mode === "index") renderIndex();
  if(mode === "map") renderMap();
  if(mode === "trip") renderTrip();
}

// ===== Index pane =====
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
  // bind clicks
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
      const on = toggleFav("bali", key);
      c.classList.toggle("on", on);
    });
  });
  // Update SS_CURRENT_LIST for prev/next nav
  window.SS_CURRENT_LIST = filtered.map(i => i.key);
}

function cardHTML(it, idx){
  const inCmp = COMPARE.includes(it.key);
  const fav = isFav("bali", it.key);
  const skills = it.skill.map(s => `<span class="tag tag-ink">${SKILL_LABELS[s].short}</span>`).join("");
  const seasonTag = it.season==="dry"
    ? `<span class="tag tag-must">乾季</span>`
    : it.season==="wet"
    ? `<span class="tag tag-ocean">雨季</span>`
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
  // Special warning for Bingin (post-demolition)
  const warning = it.key === "Bingin"
    ? `<div class="card-warn">⚠ 2025 拆遷後住宿與通道重組,行前必查最新狀況</div>`
    : "";
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
      ${warning}
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

// ===== Detail overlay =====
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
    ["distance_from_dps_airport_km","距 DPS 機場"],["distance_from_canggu_uluwatu_min","距 Canggu/Uluwatu"]
  ], r.basic_info));

  sections.push(kvSection("Surf / 浪況", [
    ["wave_type","浪型"],["skill_level","技術等級"],["wave_height_range","浪高"],
    ["bottom_type","底質"],["best_season","最佳季節"],["best_tide","最佳潮汐"],
    ["best_wind","最佳風向"],["best_swell_direction","Swell 方向"],
    ["swell_consistency_rating","穩定度 1-5"],["wave_length_meters","浪長"],
    ["wave_speed_rating","速度"],["takeoff_zone_difficulty","起乘難度"],
    ["secondary_peaks","副點"],["peak_crowd_level","擁擠度 1-5"]
  ], r.surf_conditions));

  sections.push(kvSection("Practical / 實用", [
    ["access","進場路線"],["paddle_out_method","划出路線"],
    ["entry_fee","費用"],["recommended_session_time","建議時段"],
    ["best_time_of_day","一日中最佳時間"],["nearby_warung","附近 Warung"],
    ["alternative_spot_within_10min","10 分鐘內備案"],["boat_charter_required","需要船"]
  ], r.practical_info));

  sections.push(kvSection("Safety / 安全與文化", [
    ["hazards","危險"],["marine_hazards","海洋生物"],
    ["reef_cut_severity_index","Reef Cut 嚴重度"],["rip_current_pattern","Rip 流"],
    ["lineup_etiquette","禮儀"],["localism_intensity","Localism 程度"],
    ["respect_protocol","禮儀守則"],["resident_local_legends","在地傳奇"],
    ["religious_sensitivity","宗教/節日"],["medical_nearby","醫療"],
    ["nearest_clinic_distance_km","最近診所"],["emergency_contact","急救電話"]
  ], r.safety_culture));

  sections.push(kvSection("Services / 服務", [
    ["nearest_surf_school","附近學校"],["board_rental_availability","板租"],
    ["surf_photographer_available","攝影"],["photographer_recommendation","攝影推薦"],
    ["accommodation_options","住宿"],["webcam_url","Webcam"],
    ["drone_allowed","空拍允許"],["coworking_nearby","Co-working"]
  ], r.services));

  sections.push(kvSection("Pricing / 價格", [
    ["avg_lesson_price","平均課程價"],["board_rental_daily","板租 / 日"]
  ], r.pricing));

  sections.push(kvSection("Events / 賽事 · 社群", [
    ["annual_competition_window","賽事窗口"],["community_events","社群活動"]
  ], r.events_community));

  sections.push(kvSection("Sustainability / 永續", [
    ["water_quality_rating","水質"]
  ], r.sustainability));

  // For service-style items the data may be at top level — render any remaining fields
  const known = new Set(["basic_info","surf_conditions","practical_info","safety_culture","services","pricing","sustainability","events_community","uncertain"]);
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
  if(it.season==="dry") tags.push(`<span class="tag tag-must">乾季</span>`);
  if(it.season==="wet") tags.push(`<span class="tag tag-ocean">雨季</span>`);
  if(it.season==="year") tags.push(`<span class="tag tag-teal">全年</span>`);
  it.skill.forEach(s => tags.push(`<span class="tag tag-ink">${SKILL_LABELS[s].ch}</span>`));

  // Prev/next within current filtered list
  const list = window.SS_CURRENT_LIST.length ? window.SS_CURRENT_LIST : ALL.map(i=>i.key);
  const idx = list.indexOf(key);
  const posLabel = idx >= 0 ? `${idx+1}/${list.length}` : "";

  // Citations / sources: Bali entries don't have verification_sources but may have webcam_url & gps_location links
  const cites = [];
  if(r.services?.webcam_url) cites.push(`Webcam · <a href="${r.services.webcam_url}" target="_blank">${r.services.webcam_url}</a>`);
  if(r.basic_info?.gps_location){
    const gps = r.basic_info.gps_location;
    const m = gps.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if(m) cites.push(`GPS · <a href="https://www.google.com/maps?q=${m[1]},${m[2]}" target="_blank">${m[1]}, ${m[2]} (Google Maps)</a>`);
  }
  // Bingin demolition note
  if(it.key === "Bingin"){
    cites.push(`<strong style="color:var(--vermillion-d);">⚠ 2025 Bingin 拆遷:</strong> 政府於 2025 年中拆除海岸線非法 villa,30 餘間住宿/餐廳消失。行前查最新狀況。`);
  }
  const citesHTML = cites.length ? `
    <div class="detail-citations">
      <h4>外部連結 / EXTERNAL LINKS</h4>
      <ol>${cites.map(c => `<li>${c}</li>`).join("")}</ol>
    </div>
  ` : "";

  const fav = isFav("bali", key);

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
        <button class="fav-btn ${fav?'on':''}" onclick="(() => { const on = toggleFav('bali','${key}'); event.target.classList.toggle('on', on); })()" title="收藏"></button>
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

// ===== Compare =====
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
    ["最佳季 Season", (it) => it.raw.surf_conditions?.best_season || (it.season==="dry"?"乾季 Apr–Oct":it.season==="wet"?"雨季 Nov–Mar":it.season==="year"?"全年":"—")],
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

// ===== Season calendar =====
function renderSeason(){
  // Filters that apply: region, category, skill
  const spots = ALL.filter(it => (it.category==="spot" || it.category==="hidden" || it.category==="extension") && it.months.length>0);
  // Order by region then peak start
  spots.sort((a,b) => {
    if(a.region !== b.region) return a.region.localeCompare(b.region);
    return (a.monthsPeak[0]||13) - (b.monthsPeak[0]||13);
  });
  // current month from system date
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
  // legend
  document.getElementById("season-legend").innerHTML = `
    <span class="tag tag-verm">PEAK 招牌月</span>
    <span class="tag" style="background:rgba(232,79,27,.45);border-color:var(--ink);">GOOD 可衝</span>
    <span class="tag tag-must">SHOULDER</span>
    <span class="tag" style="background:transparent;border-color:var(--ink-soft);color:var(--ink-soft);">OFF</span>
    <span style="margin-left:auto; font-family:var(--mono); font-size:10.5px;">本月: ${MONTHS[curMonth-1]} · 點選浪點查看完整資料</span>
  `;
}

// ===== Skill rec =====
const SKILL_FLOW = {
  level: "I",     // B/I/A/P
  vibe: "any",    // crowd / quiet / party / cultural / pro
  budget: "mid",  // shoestring / mid / lux
  travel: "bali", // bali only / nearby ok
  trip_days: 7
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
          ["shoestring","背包客 < USD 50/晚"],
          ["mid","中等 USD 50-150/晚"],
          ["lux","Boutique / Luxury USD 150+/晚"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.budget===v?'selected':''}" data-k="budget" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q3 · 旅行範圍 / Range</div>
      <div class="opts">
        ${[
          ["bali","只在 Bali 本島"],
          ["nearby","可搭船到 Nusa / Lombok"],
          ["far","願意飛到 Mentawai / Sumbawa"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.travel===v?'selected':''}" data-k="travel" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q4 · 季節 / When</div>
      <div class="opts">
        ${[
          ["dry","乾季 Apr–Oct"],
          ["wet","雨季 Nov–Mar"],
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
  // Compute matches
  const matches = ALL
    .filter(it => it.category==="spot" || it.category==="hidden" || it.category==="extension")
    .map(it => {
      let score = 0;
      const reasons = [];
      // skill
      if(it.skill.includes(SKILL_FLOW.level)){ score += 40; reasons.push("技術等級匹配"); }
      else {
        // partial credit if neighbor
        const order = ["B","I","A","P"];
        const wanted = order.indexOf(SKILL_FLOW.level);
        const closest = it.skill.map(s=>order.indexOf(s)).reduce((a,b)=>Math.min(a, Math.abs(b-wanted)), 99);
        if(closest === 1) score += 15;
      }
      // travel
      if(SKILL_FLOW.travel === "bali"){
        if(["Bali-wide","South Bukit Peninsula","West Coast","East Coast"].includes(it.region)) score += 25;
      } else if(SKILL_FLOW.travel === "nearby"){
        if(["Bali-wide","South Bukit Peninsula","West Coast","East Coast","Nearby Islands","Lombok"].includes(it.region)) score += 25;
        if(it.region === "Nearby Islands") { score += 5; reasons.push("近離島"); }
      } else {
        score += 22;
        if(["Sumbawa","Sumatra","Sumba","Java","Rote"].includes(it.region)) { score += 10; reasons.push("遠征點"); }
      }
      // season
      if(SKILL_FLOW.season && SKILL_FLOW.season !== "any"){
        if(it.season === SKILL_FLOW.season) { score += 20; reasons.push(SKILL_FLOW.season==="dry"?"乾季招牌":"雨季招牌"); }
        else if(it.season === "year") { score += 8; reasons.push("全年皆可"); }
        else score -= 8;
      } else { score += 10; }
      // crowd / pro vibe
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

// ===== Bali Map (SVG) =====
const SPOT_COORDS = {
  // South Bukit Peninsula
  Uluwatu:        { x: 215, y: 530, region: "Bukit" },
  Padang_Padang:  { x: 235, y: 528, region: "Bukit" },
  Bingin:         { x: 252, y: 525, region: "Bukit" },
  Impossibles:    { x: 268, y: 520, region: "Bukit" },
  Dreamland:      { x: 282, y: 510, region: "Bukit" },
  Balangan:       { x: 290, y: 495, region: "Bukit" },
  Nyang_Nyang:    { x: 308, y: 540, region: "Bukit" },
  Green_Bowl:     { x: 330, y: 555, region: "Bukit" },
  Thomas_Beach:   { x: 222, y: 540, region: "Bukit" },
  // West Coast
  Kuta_Beach:     { x: 308, y: 410, region: "West" },
  Legian:         { x: 305, y: 395, region: "West" },
  Seminyak:       { x: 300, y: 378, region: "West" },
  Canggu_Batu_Bolong: { x: 290, y: 358, region: "West" },
  Canggu_Berawa:  { x: 286, y: 350, region: "West" },
  Canggu_Echo_Beach: { x: 282, y: 343, region: "West" },
  Canggu_Sandbar: { x: 295, y: 363, region: "West" },
  Pererenan:      { x: 276, y: 338, region: "West" },
  Seseh_Mengening: { x: 270, y: 332, region: "West" },
  Medewi:         { x: 145, y: 310, region: "West" },
  Yeh_Sumbul:     { x: 170, y: 320, region: "West" },
  Balian:         { x: 200, y: 320, region: "West" },
  Tabanan_Soka:   { x: 220, y: 318, region: "West" },
  // East Coast
  Keramas:        { x: 405, y: 388, region: "East" },
  Sanur:          { x: 365, y: 410, region: "East" },
  Nusa_Dua:       { x: 370, y: 480, region: "East" },
  Serangan:       { x: 350, y: 440, region: "East" },
  // Nearby islands
  Nusa_Lembongan: { x: 530, y: 480, region: "Islands" },
  Nusa_Penida:    { x: 560, y: 520, region: "Islands" },
  Gili_Islands:   { x: 680, y: 360, region: "Islands" }
};

function renderMap(){
  const container = document.getElementById("map-wrap");
  if(!container) return;
  // Build pins for matching items
  const pins = ALL.filter(it => SPOT_COORDS[it.key]).map(it => {
    const c = SPOT_COORDS[it.key];
    const fillByCat = {
      spot: "var(--vermillion)",
      hidden: "var(--oxblood)",
      extension: "var(--ocean)"
    };
    const fill = fillByCat[it.category] || "var(--ink)";
    return `<g class="map-pin" data-key="${it.key}" transform="translate(${c.x},${c.y})">
      <circle r="6" fill="${fill}" stroke="var(--ink)" stroke-width="1.4"/>
      <text x="9" y="3" font-family="var(--mono)" font-size="9" fill="var(--ink)" style="paint-order: stroke; stroke: var(--paper); stroke-width: 2.5px;">${it.name.slice(0,18)}</text>
    </g>`;
  }).join("");

  container.innerHTML = `
    <div class="bali-map">
      <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
        <!-- Ocean background grain -->
        <defs>
          <pattern id="ocean" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 0 7 Q 3.5 4, 7 7 T 14 7" stroke="var(--ocean)" stroke-width="0.6" fill="none" opacity="0.25"/>
          </pattern>
          <pattern id="land-tex" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="0.6" fill="var(--ink)" opacity="0.18"/>
          </pattern>
        </defs>
        <rect width="800" height="600" fill="url(#ocean)"/>

        <!-- Bali island outline (stylized) -->
        <path d="
          M 90 240
          Q 160 200, 240 195
          Q 310 188, 380 200
          Q 450 210, 510 215
          Q 580 224, 640 250
          Q 710 280, 715 320
          Q 700 350, 640 360
          Q 580 370, 540 380
          Q 480 392, 440 396
          L 420 396
          L 408 380
          L 396 396
          L 380 396
          L 350 400
          L 320 410
          L 290 422
          L 268 442
          L 250 470
          L 240 500
          L 250 530
          L 270 550
          L 305 560
          L 340 558
          L 360 550
          L 352 530
          L 340 510
          L 320 490
          L 312 470
          L 320 450
          L 340 440
          L 365 432
          L 380 420
          L 396 405
          L 408 396
          L 420 405
          L 430 396
          L 442 400
          L 460 412
          L 478 420
          L 482 440
          L 478 462
          L 470 480
          L 458 490
          L 440 495
          L 426 498
          L 432 480
          L 425 470
          L 420 478
          Q 396 470, 388 460
          Q 360 440, 320 400
          Q 280 380, 240 360
          Q 200 345, 165 330
          Q 130 312, 100 290
          Q 85 265, 90 240
          Z"
          fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round" opacity="0.95"/>
        <path d="
          M 90 240
          Q 160 200, 240 195
          Q 310 188, 380 200
          Q 450 210, 510 215
          Q 580 224, 640 250
          Q 710 280, 715 320
          Q 700 350, 640 360
          Q 580 370, 540 380
          Q 480 392, 440 396
          L 420 396
          L 408 380
          L 396 396
          L 380 396
          L 350 400
          L 320 410
          L 290 422
          L 268 442
          L 250 470
          L 240 500
          L 250 530
          L 270 550
          L 305 560
          L 340 558
          L 360 550
          L 352 530
          L 340 510
          L 320 490
          L 312 470
          L 320 450
          L 340 440
          L 365 432
          L 380 420
          L 396 405
          L 408 396
          L 420 405
          L 430 396
          L 442 400
          L 460 412
          L 478 420
          L 482 440
          L 478 462
          L 470 480
          L 458 490
          L 440 495
          L 426 498
          L 432 480
          L 425 470
          L 420 478
          Q 396 470, 388 460
          Q 360 440, 320 400
          Q 280 380, 240 360
          Q 200 345, 165 330
          Q 130 312, 100 290
          Q 85 265, 90 240
          Z"
          fill="url(#land-tex)"/>

        <!-- Nusa Lembongan/Penida -->
        <ellipse cx="535" cy="480" rx="38" ry="20" fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.6" opacity="0.95"/>
        <ellipse cx="555" cy="520" rx="48" ry="28" fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.6" opacity="0.95"/>
        <text x="535" y="483" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink)">LEMBONGAN</text>
        <text x="555" y="525" text-anchor="middle" font-family="var(--display-3)" font-size="12" fill="var(--ink)">PENIDA</text>

        <!-- Gili islands cluster -->
        <circle cx="680" cy="355" r="9" fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.6"/>
        <circle cx="700" cy="365" r="7" fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.6"/>
        <circle cx="668" cy="375" r="6" fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.6"/>
        <text x="685" y="345" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink)">GILI</text>

        <!-- Region labels -->
        <text x="240" y="170" text-anchor="middle" font-family="var(--display-2)" font-size="22" fill="var(--ink-soft)" font-style="italic">BALI</text>
        <text x="290" y="500" font-family="var(--display-3)" font-size="13" fill="var(--vermillion-d)">BUKIT</text>
        <text x="220" y="295" font-family="var(--display-3)" font-size="13" fill="var(--vermillion-d)">CANGGU</text>
        <text x="380" y="430" font-family="var(--display-3)" font-size="13" fill="var(--vermillion-d)">SANUR</text>
        <text x="450" y="370" font-family="var(--display-3)" font-size="13" fill="var(--vermillion-d)">KERAMAS</text>
        <text x="135" y="340" font-family="var(--display-3)" font-size="13" fill="var(--vermillion-d)">MEDEWI</text>

        <!-- Compass rose -->
        <g transform="translate(745,565)" font-family="var(--mono)" font-size="9" fill="var(--ink)">
          <circle r="22" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.2"/>
          <text x="0" y="-12" text-anchor="middle">N</text>
          <text x="0" y="16" text-anchor="middle">S</text>
          <text x="-14" y="3" text-anchor="middle">W</text>
          <text x="14" y="3" text-anchor="middle">E</text>
          <line x1="0" y1="-4" x2="0" y2="-9" stroke="var(--vermillion)" stroke-width="2"/>
        </g>

        <!-- Wind arrows: dry season SE trade winds (offshore for west) -->
        <g opacity="0.55">
          <text x="640" y="100" font-family="var(--mono)" font-size="9" fill="var(--ocean)">DRY · SE TRADE WIND</text>
          <path d="M 660 110 L 600 140 L 610 135 M 600 140 L 605 130" stroke="var(--ocean)" stroke-width="1.5" fill="none"/>
        </g>

        <!-- Pins -->
        ${pins}
      </svg>
      <div class="map-legend">
        <div class="map-legend-row"><span class="map-dot" style="background:var(--vermillion);"></span> 主要浪點</div>
        <div class="map-legend-row"><span class="map-dot" style="background:var(--oxblood);"></span> 私房浪點</div>
        <div class="map-legend-row"><span class="map-dot" style="background:var(--ocean);"></span> 延伸目的地</div>
        <div class="map-legend-row" style="margin-top:8px; font-style:italic;">點選圓點查看完整資料</div>
      </div>
    </div>
  `;
  container.querySelectorAll(".map-pin").forEach(p => {
    p.addEventListener("click", () => openDetail(p.dataset.key));
  });
}
window.renderMap = renderMap;

// ===== Trip Planner =====
const TRIP_STATE = {
  base: "canggu",     // canggu / uluwatu / sanur
  days: 5,
  level: "I",
  vibe: "balanced"    // balanced / hardcore / chill / explore
};

function renderTrip(){
  const wrap = document.getElementById("trip-wrap");
  if(!wrap) return;
  // Re-compute itinerary
  const itinerary = computeItinerary(TRIP_STATE);
  wrap.innerHTML = `
    <div class="skillrec" style="grid-template-columns: 340px 1fr;">
      <div class="controls" style="padding-bottom:24px;">
        <h3>行程規劃 / Trip Planner</h3>
        <p>排出依潮汐 / 浪點密度 / 距離最佳化的多日 surf 行程。Bukit 主場為乾季,東岸 / Keramas 為雨季。</p>
        <div class="skill-question">
          <div class="q">Base 駐地</div>
          <div class="opts">
            ${[["canggu","Canggu (西岸初中階)"],["uluwatu","Uluwatu / Bukit (進階)"],["sanur","Sanur / 東岸 (雨季)"]].map(([v,l])=>`
              <div class="opt ${TRIP_STATE.base===v?'selected':''}" data-k="base" data-v="${v}">${l}</div>
            `).join("")}
          </div>
        </div>
        <div class="skill-question">
          <div class="q">天數 Days</div>
          <div class="opts" style="flex-direction:row; padding:10px; align-items:center; gap:8px;">
            <input id="trip-days" type="range" min="3" max="14" step="1" value="${TRIP_STATE.days}" style="flex:1;" />
            <div style="font-family:var(--display); font-size:36px; line-height:1; color:var(--vermillion);">
              <span id="trip-days-val">${TRIP_STATE.days}</span><small style="font-family:var(--mono); font-size:10px;">d</small>
            </div>
          </div>
        </div>
        <div class="skill-question">
          <div class="q">技術等級 Level</div>
          <div class="opts">
            ${[["B","初學 B"],["I","中階 I"],["A","進階 A"],["P","Pro P"]].map(([v,l])=>`
              <div class="opt ${TRIP_STATE.level===v?'selected':''}" data-k="level" data-v="${v}">${l}</div>
            `).join("")}
          </div>
        </div>
        <div class="skill-question">
          <div class="q">節奏 / Vibe</div>
          <div class="opts">
            ${[["balanced","均衡 (晨衝+午休+晚衝)"],["hardcore","硬派 (一日多浪點)"],["chill","休閒 (一天一場)"],["explore","探索 (含離島)"]].map(([v,l])=>`
              <div class="opt ${TRIP_STATE.vibe===v?'selected':''}" data-k="vibe" data-v="${v}">${l}</div>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="results">
        <h4>${TRIP_STATE.days} 日 surf 行程</h4>
        <div style="font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft); margin-bottom:10px;">
          BASE: ${TRIP_STATE.base.toUpperCase()} · LEVEL: ${TRIP_STATE.level} · VIBE: ${TRIP_STATE.vibe}
        </div>
        <div class="trip-days">${itinerary.map(d => `
          <div class="trip-day">
            <div class="trip-day-num">DAY<br/><strong>${String(d.day).padStart(2,'0')}</strong></div>
            <div class="trip-day-content">
              <div class="trip-day-title">${d.title}</div>
              <div class="trip-day-spots">
                ${d.spots.map(s => `<a class="trip-spot" onclick="openDetail('${s.key}')"><strong>${s.time}</strong> · ${s.name} <em>${s.note}</em></a>`).join("")}
              </div>
            </div>
          </div>
        `).join("")}</div>
      </div>
    </div>
  `;
  document.getElementById("trip-days").addEventListener("input", e => {
    TRIP_STATE.days = +e.target.value;
    document.getElementById("trip-days-val").textContent = TRIP_STATE.days;
    renderTrip();
  });
  document.querySelectorAll("#trip-wrap .opt").forEach(el => {
    el.addEventListener("click", () => {
      TRIP_STATE[el.dataset.k] = el.dataset.v;
      renderTrip();
    });
  });
}

function computeItinerary(state){
  // Build a list of spots from current data, scored for state
  const candidates = ALL.filter(it =>
    (it.category === "spot" || it.category === "hidden") &&
    it.skill.includes(state.level)
  );
  // Group by region preference based on base
  const base = state.base;
  const baseRegions = {
    canggu:   ["West Coast","South Bukit Peninsula","East Coast"],
    uluwatu:  ["South Bukit Peninsula","Nearby Islands","West Coast"],
    sanur:    ["East Coast","Nearby Islands","South Bukit Peninsula","West Coast"]
  }[base];
  const regionWeight = (r) => {
    const i = baseRegions.indexOf(r);
    if(i < 0) return -3; // unfavored regions
    return 10 - i;
  };
  // Sort candidates by region weight then consistency
  const sorted = candidates.sort((a,b) => regionWeight(b.region) - regionWeight(a.region));
  // Build day plan
  const days = [];
  const used = new Set();
  for(let d = 1; d <= state.days; d++){
    const spotsPerDay = state.vibe === "hardcore" ? 3 : state.vibe === "chill" ? 1 : 2;
    const daySpots = [];
    for(let i = 0; i < spotsPerDay; i++){
      const next = sorted.find(s => !used.has(s.key));
      if(!next) break;
      used.add(next.key);
      // assign time slot
      const slot = i === 0 ? "06:00 DAWN" : i === 1 ? "16:30 PM" : "11:00 MID";
      let note = "";
      if(next.crowd && next.crowd >= 4 && slot === "11:00 MID") note = "中午擁擠,改 dawn 為佳";
      if(next.season === "wet" && d <= state.days/2) note = "雨季點 — 早上 offshore";
      if(next.season === "dry" && d <= state.days/2 && slot === "06:00 DAWN") note = "乾季招牌 dawn patrol";
      if(!note) note = next.consistency ? `穩定度 ${next.consistency}/5` : "";
      daySpots.push({
        time: slot,
        name: next.name,
        key: next.key,
        note
      });
    }
    // Construct day title from theme
    const region = daySpots[0] ? ALL.find(s => s.key === daySpots[0].key)?.region_ch : "";
    days.push({
      day: d,
      title: d === 1 ? `抵達日 · ${region}熟悉` : d === state.days ? `離境日 · 最後一衝` : `${region} 重點日`,
      spots: daySpots
    });
  }
  return days;
}
window.renderTrip = renderTrip;

window.addEventListener("DOMContentLoaded", boot);
