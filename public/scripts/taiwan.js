// =========================================================
// 衝浪研究室 — Australia Issue (No. 005) logic
// =========================================================

const REGION_MAP = {
  "Gold Coast":                { ch: "黃金海岸",         short: "GC" },
  "Sydney Northern Beaches":   { ch: "雪梨北部",           short: "SYD-N" },
  "Sydney Eastern Beaches":    { ch: "雪梨東部",           short: "SYD-E" },
  "Northern NSW":              { ch: "新南威爾斯北",       short: "NNSW" },
  "Mid North NSW":             { ch: "新南中北",           short: "MNNSW" },
  "Newcastle / Hunter":        { ch: "紐卡素",             short: "NCL" },
  "Illawarra — Wollongong":     { ch: "伊拉瓦拉 / 窩龍崗",   short: "WOL" },
  "Victoria — Surf Coast":     { ch: "維多利亞 · 衝浪岸",   short: "VIC-SC" },
  "Victoria — South":          { ch: "維多利亞 · 南部",     short: "VIC-S" },
  "WA — Margaret River":       { ch: "西澳 · 瑪格麗特河",   short: "WA-MR" },
  "WA — Southern":             { ch: "西澳 · 南部",         short: "WA-S" },
  "WA — Coral Coast":          { ch: "西澳 · 珊瑚海岸",     short: "WA-CC" },
  "SA — Eyre Peninsula":       { ch: "南澳 · 艾爾半島",     short: "SA-EY" },
  "Tasmania":                  { ch: "塔斯马尼亞",         short: "TAS" },
  "Australia-wide":            { ch: "全澳",               short: "ALL" },
  "Australia-wide / Online":   { ch: "全澳 / 線上",         short: "WEB" }
};

// Manual category mapping by key (overrides basic_info.category)
const SERVICE_KEYS = new Set([
  "Surf_Schools_Australia", "Board_Rental_Australia",
  "Surf_Forecast_Australia", "Visa_Entry_AU",
  "Quiksilver_Pro_Bells_Festivals"
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
    else if(/year[\s\-]?round|全年/.test(t)) season = "year";
    else if(/東北季風|冬季|10月.*3月|10–3月/.test(t) && !/颱風/.test(t)) season = "dry";
    else if(/颱風|夏季|6.*10月|6–10月/.test(t) && !/東北/.test(t)) season = "wet";
    else if(/東北季風|颱風|冬季|夏季/.test(t)) season = "both";
    else season = "both";
  }
  if(!months.length && season === "dry") months = [10,11,12,1,2,3];
  if(!months.length && season === "wet") months = [6,7,8,9,10];
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
    nearest_school: raw.services?.nearest_surf_school || "",
    gps: bi.gps_location || ""
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
  const res = await fetch("/api/taiwan.json");
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
    ["all","全部"], ["dry","東北季風 Oct–Mar"], ["wet","颱風季 Jun–Oct"], ["year","全年"]
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
      const on = toggleFav("taiwan", key);
      c.classList.toggle("on", on);
    });
  });
  // Update SS_CURRENT_LIST for prev/next nav
  window.SS_CURRENT_LIST = filtered.map(i => i.key);
}

function cardHTML(it, idx){
  const inCmp = COMPARE.includes(it.key);
  const fav = isFav("taiwan", it.key);
  const skills = it.skill.map(s => `<span class="tag tag-ink">${SKILL_LABELS[s].short}</span>`).join("");
  const seasonTag = it.season==="dry"
    ? `<span class="tag tag-must">東北季風</span>`
    : it.season==="wet"
    ? `<span class="tag tag-ocean">颱風季</span>`
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
  if(it.season==="dry") tags.push(`<span class="tag tag-must">東北季風</span>`);
  if(it.season==="wet") tags.push(`<span class="tag tag-ocean">颱風季</span>`);
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

  const fav = isFav("taiwan", key);

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
        <button class="fav-btn ${fav?'on':''}" onclick="(() => { const on = toggleFav('taiwan','${key}'); event.target.classList.toggle('on', on); })()" title="收藏"></button>
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
    ["最佳季 Season", (it) => it.raw.surf_conditions?.best_season || (it.season==="dry"?"東北季風 Oct–Mar":it.season==="wet"?"颱風季 Jun–Oct":it.season==="year"?"全年":"—")],
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
  travel: "east", // east coast / west coast / anywhere
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
          ["east","東岸 · GC / NSW / VIC"],
          ["west","西岸 · WA"],
          ["far","不限 · 包含 TAS / SA 偏遠点"]
        ].map(([v,l]) => `<div class="opt ${SKILL_FLOW.travel===v?'selected':''}" data-k="travel" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q4 · 季節 / When</div>
      <div class="opts">
        ${[
          ["dry","東北季風 Oct–Mar"],
          ["wet","颱風季 Jun–Oct"],
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
      if(SKILL_FLOW.travel === "east"){
        if(["東部 / East Coast","東北部 / Northeast Coast"].includes(it.region)) score += 25;
      } else if(SKILL_FLOW.travel === "north"){
        if(["北部 / North Coast","東北部 / Northeast Coast"].includes(it.region)) score += 25;
      } else {
        score += 22;
        if(["南部 / South — Kenting","離島 / Outer Islands","西南部 / Southwest"].includes(it.region)) { score += 10; reasons.push("偏遠目的地"); }
      }
      // season
      if(SKILL_FLOW.season && SKILL_FLOW.season !== "any"){
        if(it.season === SKILL_FLOW.season) { score += 20; reasons.push(SKILL_FLOW.season==="dry"?"主季招牌":"次季招牌"); }
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

// ===== Taiwan SVG Map =====
// Lat/lng → SVG coordinate mapping
//   lng 119.8 → x=0, lng 122.2 → x=400  (scale 166.67)
//   lat 25.5  → y=0, lat 21.5  → y=720  (scale 180)
function gpsToXY(gps){
  if(!gps) return null;
  const m = gps.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if(!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  return {
    x: (lng - 119.8) * 166.67,
    y: (25.5 - lat) * 180
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

  // Collect items with GPS, respect current filters where reasonable
  const items = ALL.filter(it => matchesFilters(it)).filter(it => it.gps);
  const pins = items.map(it => {
    const p = gpsToXY(it.gps);
    if(!p) return "";
    const fill = fillByCat[it.category] || "var(--ink)";
    const label = (it.ch || it.name).slice(0, 10);
    // For very-east Outer Islands (Lanyu, Green Island), label points right;
    // for SW pins (Kaohsiung / 小琉球), label points left.
    const eastPin = p.x > 320;
    const tx = eastPin ? -10 : 10;
    const anchor = eastPin ? "end" : "start";
    return `<g class="map-pin" data-key="${it.key}" transform="translate(${p.x},${p.y})">
      <circle r="6" fill="${fill}" stroke="var(--ink)" stroke-width="1.4"/>
      <text x="${tx}" y="3" font-family="var(--mono)" font-size="9" text-anchor="${anchor}" fill="var(--ink)" style="paint-order: stroke; stroke: var(--paper); stroke-width: 2.5px;">${label}</text>
    </g>`;
  }).join("");

  // Simplified Taiwan main-island outline (clockwise from north)
  // Coordinates derived via the same gpsToXY mapping
  const mainIsland = `
    M 287 38
    L 302 50  L 320 70  L 350 90  L 367 110
    L 360 145 L 345 175 L 330 210 L 318 245
    L 308 280 L 300 320 L 295 360 L 295 400
    L 290 440 L 280 480 L 260 520 L 235 560
    L 210 595 L 185 620 L 175 645 L 170 660
    L 145 660 L 110 620 L 85 580 L 70 540
    L 60 500 L 55 450 L 55 400 L 60 350
    L 75 300 L 95 260 L 115 220 L 130 180
    L 150 145 L 175 115 L 200 90 L 230 65
    L 260 48 Z`;

  container.innerHTML = `
    <div class="bali-map taiwan-map">
      <svg viewBox="0 0 480 720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="tw-grain" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".55" fill="rgba(13,59,92,.18)"/>
          </pattern>
          <pattern id="tw-land" width="9" height="9" patternUnits="userSpaceOnUse">
            <rect width="9" height="9" fill="var(--paper-warm)"/>
            <circle cx="2" cy="2" r=".7" fill="rgba(26,22,20,.10)"/>
          </pattern>
        </defs>

        <!-- Ocean -->
        <rect width="480" height="720" fill="url(#tw-grain)"/>

        <!-- Mainland China hint (left edge) -->
        <path d="M 0 0 L 30 0 L 28 200 L 22 380 L 18 540 L 0 720 Z"
              fill="var(--paper-deep)" opacity=".55" stroke="var(--ink)" stroke-width=".8" stroke-dasharray="2,3"/>

        <!-- Taiwan main island -->
        <path d="${mainIsland}" fill="url(#tw-land)" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>

        <!-- Outer Islands -->
        <!-- 蘭嶼 Lanyu -->
        <g>
          <circle cx="292" cy="617" r="9" fill="url(#tw-land)" stroke="var(--ink)" stroke-width="1.4"/>
          <text x="305" y="620" font-family="var(--mono)" font-size="9" fill="var(--ink-soft)">蘭嶼</text>
        </g>
        <!-- 綠島 Green Island -->
        <g>
          <circle cx="285" cy="540" r="6" fill="url(#tw-land)" stroke="var(--ink)" stroke-width="1.2"/>
          <text x="298" y="544" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">綠島</text>
        </g>
        <!-- 小琉球 Liuqiu -->
        <g>
          <circle cx="95" cy="569" r="5" fill="url(#tw-land)" stroke="var(--ink)" stroke-width="1.2"/>
          <text x="105" y="572" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">小琉球</text>
        </g>
        <!-- 澎湖 Penghu (group hint) -->
        <g opacity=".55">
          <circle cx="35"  cy="395" r="3" fill="var(--paper-warm)" stroke="var(--ink)" stroke-width=".8"/>
          <circle cx="45"  cy="385" r="2" fill="var(--paper-warm)" stroke="var(--ink)" stroke-width=".8"/>
          <circle cx="40"  cy="410" r="2.5" fill="var(--paper-warm)" stroke="var(--ink)" stroke-width=".8"/>
          <text x="20" y="430" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">澎湖</text>
        </g>

        <!-- Compass + scale -->
        <g transform="translate(420,40)">
          <circle r="18" fill="var(--paper)" stroke="var(--ink)" stroke-width="1.2"/>
          <path d="M 0 -14 L 4 0 L 0 14 L -4 0 Z" fill="var(--vermillion)" stroke="var(--ink)" stroke-width=".8"/>
          <text y="-22" text-anchor="middle" font-family="var(--display-3)" font-size="10" fill="var(--ink)">N</text>
        </g>
        <g transform="translate(390,690)">
          <line x1="0" y1="0" x2="50" y2="0" stroke="var(--ink)" stroke-width="1.4"/>
          <line x1="0" y1="-3" x2="0" y2="3" stroke="var(--ink)" stroke-width="1.4"/>
          <line x1="50" y1="-3" x2="50" y2="3" stroke="var(--ink)" stroke-width="1.4"/>
          <text x="25" y="14" text-anchor="middle" font-family="var(--mono)" font-size="8" fill="var(--ink-soft)">50 km</text>
        </g>

        <!-- Cardinal labels -->
        <text x="240" y="20" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="2">NORTH 北</text>
        <text x="475" y="370" text-anchor="end" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="2">PACIFIC OCEAN 太平洋</text>
        <text x="5"   y="370" text-anchor="start" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="2">海峽</text>
        <text x="240" y="710" text-anchor="middle" font-family="var(--display-3)" font-size="11" fill="var(--ink-soft)" letter-spacing="2">SOUTH 南</text>

        <!-- Pins -->
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

  // Zoom + pan + control bar
  const svg = container.querySelector("svg");
  const legend = container.querySelector(".map-legend");
  if(svg && legend && window.attachMapControls){
    // Remove any leftover controls from a previous render
    legend.querySelector(".map-zoom-controls")?.remove();
    window.attachMapControls(svg, legend);
  }
}
window.renderMap = renderMap;

// (Trip Planner not used on Taiwan issue)
function renderTrip(){ /* no-op */ }
window.renderTrip = renderTrip;

window.addEventListener("DOMContentLoaded", boot);
