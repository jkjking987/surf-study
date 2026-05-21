// =========================================================
// 衝浪研究室 — Big Wave Issue (No. 004)
// =========================================================

const GROUP_MAP = {
  A: { ch: "浪況情境",     short: "A",  tagClass: "tag-ocean", desc: "依浪況分類" },
  B: { ch: "騎手程度",     short: "B",  tagClass: "tag-teal",  desc: "依騎手程度" },
  C: { ch: "板型分類",     short: "C",  tagClass: "tag-verm",  desc: "依板型分類" },
  D: { ch: "品牌板款",     short: "D",  tagClass: "tag-must",  desc: "依品牌" },
  E: { ch: "特殊情境",     short: "E",  tagClass: "tag-blood", desc: "特殊情境" }
};

let ALL = [];
let RAW = null;
let FILTERS = { q: "", group: "all", level: "all" };
let COMPARE = [];
const MAX_COMPARE = 4;
const ISSUE_KEY = "bigwave";

function lc(s){ return (s||"").toLowerCase(); }
function escape(s){
  return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function shortName(s){
  if(!s) return "";
  const i = s.indexOf(" (");
  if(i>0) return s.slice(0,i).trim();
  return s.trim();
}
function enInParens(s){
  if(!s) return "";
  const m = s.match(/\(([^()]*[A-Za-z][^()]*)\)/);
  if(m) return m[1].trim();
  return "";
}
function parseLevels(text){
  if(!text) return ["B","I","A","P"];
  const t = text;
  const out = new Set();
  if(/初學/.test(t)) out.add("B");
  if(/中階/.test(t)) out.add("I");
  if(/進階/.test(t)) out.add("A");
  if(/Pro|pro|高手|職業|專業|charger|Charger|BWWT|巨浪/.test(t)) out.add("P");
  if(/全程度/.test(t)) ["B","I","A","P"].forEach(x => out.add(x));
  return out.size ? [...out] : ["I","A"];
}

// ===== Card-content distill helpers (same as board.js) =====
function distill(text, maxChars){
  if(!text) return "";
  const t = String(text).trim();
  const parts = t.split(/[。;\n]/).map(s => s.trim()).filter(Boolean);
  let out = parts[0] || t;
  if(out.length < maxChars * 0.55 && parts[1]){
    out = out + "。" + parts[1];
  }
  if(out.length > maxChars) out = out.slice(0, maxChars - 1) + "…";
  out = out.replace(/\(來源[^)]*\)/g, "").replace(/\[uncertain\]/gi, "").replace(/\s+/g, " ").trim();
  return out;
}
function firstRange(text, suffix){
  if(!text) return "";
  let m = text.match(/(\d+'\d{1,2}"?)\s*[~\-–至到]\s*(\d+'\d{1,2}"?)/);
  if(m) return m[1] + "–" + m[2];
  m = text.match(/([\d.]+)\s*"?\s*[~\-–至到]\s*([\d.]+)\s*"/);
  if(m) return m[1] + "–" + m[2] + '"';
  m = text.match(/([\d.]+)\s*[~\-–至到]\s*([\d.]+)\s*(L|ft|公升|公斤|kg)?/);
  if(m) return m[1] + "–" + m[2] + (m[3] ? " " + m[3] : (suffix || ""));
  return "";
}
function distillWaves(text){
  if(!text) return "";
  let m = text.match(/([\d.]+)\s*[~\-–]\s*([\d.]+)\s*ft/i);
  const range = m ? `${m[1]}–${m[2]} ft` : "";
  const descMatch = text.match(/([膝腰胸頭肩齊軟陡空中超頭高雙倍三倍巨]{1}[^,。;()(）\s]{0,15})/);
  const desc = descMatch ? descMatch[1] : "";
  if(range && desc) return `${range} · ${desc}`;
  if(range) return range;
  return distill(text, 60);
}
function distillReps(text){
  if(!text) return [];
  let stripped = String(text);
  let prev;
  do {
    prev = stripped;
    stripped = stripped.replace(/[(][^()]*[)]/g, "");
  } while(stripped !== prev);
  const segs = stripped
    .split(/\s*(?:\(?\d+[\.)\u3001]\)?|[;;]|→)\s*/)
    .map(s => s.trim())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for(const s of segs){
    let name = s.split(/[::—,\,]/)[0].trim();
    name = name.replace(/^[\.\u2026·•\-、,,\s]+/, "").trim();
    const asciiWords = name.match(/[A-Za-z][A-Za-z'.\-]{1,}/g) || [];
    if(asciiWords.length < 2) continue;
    if(/[@#]/.test(name)) continue;
    if(/^\d/.test(name)) continue;
    if(!name || name.length < 4 || name.length > 42) continue;
    if(/concave|rocker|tail|swallow|squash|setup|glassing|EPS|PU|HD|FCS|Futures|fin|配置|構造|系列|官方/i.test(name) && !/^[A-Z][a-z]+\s+[A-Z]/.test(name)) continue;
    const lcn = name.toLowerCase();
    if(seen.has(lcn)) continue;
    seen.add(lcn);
    out.push(name);
    if(out.length >= 3) break;
  }
  return out;
}
function distillBudget(text){
  if(!text) return "";
  const t = String(text);
  let m = t.match(/USD\s*([\d,]+)\s*[-~–]\s*([\d,]+)/i);
  if(m) return `USD ${m[1]}–${m[2]}`;
  m = t.match(/\$\s*([\d,]+)\s*[-~–]\s*([\d,]+)/);
  if(m) return `USD ${m[1]}–${m[2]}`;
  m = t.match(/NTD?\$?\s*([\d,]+)\s*[-~–]\s*([\d,]+)/i);
  if(m) return `NTD ${m[1]}–${m[2]}`;
  return distill(text, 26);
}

function normalize(key, raw){
  const bi = raw.basic_info || {};
  const groupLetter = key[0];
  const nameRaw = bi["名稱"] || key;
  const subCat = bi["分類"] || "";
  const fit = bi["適用程度"] || "";
  const positioning = bi["一句話定位"] || "";
  return {
    key, raw, groupLetter,
    name_ch: shortName(nameRaw),
    name_en: enInParens(nameRaw),
    group: GROUP_MAP[groupLetter],
    sub: subCat,
    fit,
    positioning,
    levels: parseLevels(fit),
    GF: raw.buoyancy_strategy?.Guild_Factor_GF || "",
    formula: raw.buoyancy_strategy?.浮力公式 || "",
    length: raw.shape_details?.["Length 板長"] || "",
    width: raw.shape_details?.["Width 板寬"] || "",
    thickness: raw.shape_details?.["Thickness 板厚"] || "",
    tail: raw.shape_details?.["Tail_Shape 板尾形狀"] || "",
    bottom: raw.shape_details?.["Bottom_Contour 板底設計"] || "",
    fin_setup: raw.fin_setup?.主要_Setup || "",
    glassing: raw.construction?.Glassing_Schedule || "",
    waves_range: raw.conditions_fit?.浪高範圍 || "",
    not_for: raw.conditions_fit?.不適合場景 || "",
    reps: raw.practical_selection?.代表板款 || "",
    mistakes: raw.practical_selection?.常見錯誤 || "",
    budget: raw.practical_selection?.預算建議 || "",
    safety: raw.local_taiwan_context?.安全裝備 || "",
    taiwan: raw.local_taiwan_context?.浪點適配 || ""
  };
}

async function boot(){
  const res = await fetch("/api/bigwave.json");
  RAW = await res.json();
  ALL = Object.entries(RAW).map(([k,v]) => normalize(k, v));
  ALL.sort((a,b) => a.key.localeCompare(b.key, "en", { numeric: true }));

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
  const groups = ["all","A","B","C","D","E"];
  document.getElementById("group-chips").innerHTML = groups.map(g => {
    const cnt = g==="all" ? ALL.length : ALL.filter(i=>i.groupLetter===g).length;
    const label = g==="all" ? "全部" : `${g} ${GROUP_MAP[g].ch}`;
    return `<span class="chip ${g==='all'?'active':''}" data-group="${g}">${label} <small style="opacity:.55">${cnt}</small></span>`;
  }).join("");
  document.querySelectorAll("#group-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.group = el.dataset.group;
      document.querySelectorAll("#group-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });

  const levels = ["all","B","I","A","P"];
  const lvLabels = { B:"初學", I:"中階", A:"進階", P:"Pro/BWWT" };
  document.getElementById("level-chips").innerHTML = levels.map(l => {
    const label = l==="all" ? "全部" : lvLabels[l];
    return `<span class="chip ${l==='all'?'active':''}" data-level="${l}">${label}</span>`;
  }).join("");
  document.querySelectorAll("#level-chips .chip").forEach(el => {
    el.addEventListener("click", () => {
      FILTERS.level = el.dataset.level;
      document.querySelectorAll("#level-chips .chip").forEach(x=>x.classList.toggle("active", x===el));
      renderIndex();
    });
  });
}

function matches(it){
  if(FILTERS.group!=="all" && it.groupLetter!==FILTERS.group) return false;
  if(FILTERS.level!=="all" && !it.levels.includes(FILTERS.level)) return false;
  if(FILTERS.q){
    const q = lc(FILTERS.q);
    const hay = [it.name_ch, it.name_en, it.positioning, it.reps, it.sub].join(" ").toLowerCase();
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
  grid.innerHTML = list.map(cardHTML).join("");
  grid.querySelectorAll(".card").forEach(c => {
    c.addEventListener("click", e => {
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
      const on = toggleFav(ISSUE_KEY, c.dataset.fav);
      c.classList.toggle("on", on);
    });
  });
  window.SS_CURRENT_LIST = list.map(i => i.key);
}

function cardHTML(it){
  const inCmp = COMPARE.includes(it.key);
  const fav = isFav(ISSUE_KEY, it.key);
  const lvTags = it.levels.map(l => `<span class="tag tag-ink">${l}</span>`).join("");

  const lenR  = firstRange(it.length);
  const widR  = firstRange(it.width);
  const thkR  = firstRange(it.thickness);
  const gfR   = firstRange(it.GF);
  const wave  = distillWaves(it.waves_range);
  const tail  = distill(it.tail, 70);
  const bottom= distill(it.bottom, 70);
  const fin   = distill(it.fin_setup, 80);
  const glass = distill(it.glassing, 60);
  const reps  = distillReps(it.reps);
  const mistake = distill(it.mistakes, 110);
  const tw    = distill(it.taiwan, 110);
  const safety= distill(it.safety, 90);
  const budget= distillBudget(it.budget);
  const blurb = distill(it.positioning, 240);

  const dimCells = [];
  if(lenR) dimCells.push(`<div class="bc-stat"><div class="bc-stat-n">${escape(lenR)}</div><div class="bc-stat-l">L · 板長</div></div>`);
  if(widR) dimCells.push(`<div class="bc-stat"><div class="bc-stat-n">${escape(widR)}</div><div class="bc-stat-l">W · 板寬</div></div>`);
  if(thkR) dimCells.push(`<div class="bc-stat"><div class="bc-stat-n">${escape(thkR)}</div><div class="bc-stat-l">T · 板厚</div></div>`);
  if(gfR)  dimCells.push(`<div class="bc-stat bc-stat-accent"><div class="bc-stat-n">${escape(gfR)}</div><div class="bc-stat-l">GF · 浮力倍率</div></div>`);

  const rows = [];
  if(wave)   rows.push(["WAVE / 浪況", wave]);
  if(tail)   rows.push(["TAIL / 板尾", tail]);
  if(bottom) rows.push(["BOTTOM / 板底", bottom]);
  if(fin)    rows.push(["FIN / 鰭片", fin]);
  if(glass)  rows.push(["GLASS / 玻纖", glass]);

  const repsHTML = reps.length
    ? `<div class="bc-reps"><span class="bc-reps-label">MODELS</span> ${reps.map(r => `<span class="bc-rep">${escape(r)}</span>`).join("")}</div>`
    : "";
  const twHTML = tw
    ? `<div class="bc-foot bc-foot-tw"><span class="bc-foot-l">TW · 台灣浪點</span><span class="bc-foot-v">${escape(tw)}</span></div>`
    : "";
  const safetyHTML = safety
    ? `<div class="bc-foot bc-foot-safety"><span class="bc-foot-l">⚠ 安全裝備</span><span class="bc-foot-v">${escape(safety)}</span></div>`
    : "";
  const mistakeHTML = mistake
    ? `<div class="bc-foot bc-foot-warn"><span class="bc-foot-l">!  常見錯誤</span><span class="bc-foot-v">${escape(mistake)}</span></div>`
    : "";

  return `
    <div class="card ${inCmp?'in-compare':''}" data-key="${it.key}">
      <button class="fav-btn ${fav?'on':''}" data-fav="${it.key}" title="收藏"></button>
      <button class="compare-btn ${inCmp?'added':''}">${inCmp?'✓ COMPARE':'+ COMPARE'}</button>

      <div class="row1">
        <span class="num">${it.key}</span>
        <div class="name" style="padding-right:38px;">
          ${escape(it.name_ch)}
          ${it.name_en ? `<span class="ch" style="font-family:var(--mono); font-size:11px; letter-spacing:.04em; text-transform:none;">${escape(it.name_en)}</span>` : ''}
        </div>
      </div>

      <div class="meta-row">
        <span class="tag ${it.group.tagClass}">${it.group.short} · ${escape(it.group.ch)}</span>
        ${lvTags}
      </div>

      ${blurb ? `<div class="blurb">${escape(blurb)}</div>` : ''}

      ${dimCells.length ? `<div class="bc-stats">${dimCells.join("")}</div>` : ''}

      ${rows.length ? `<dl class="bc-rows">${rows.map(([k,v]) => `<dt>${k}</dt><dd>${escape(v)}</dd>`).join("")}</dl>` : ''}

      ${repsHTML}
      ${twHTML}
      ${safetyHTML}
      ${mistakeHTML}
      ${budget ? `<div class="bc-budget-row"><span class="bc-budget-l">$ · 預算</span><span class="bc-budget-v">${escape(budget)}</span></div>` : ''}
    </div>
  `;
}

// ===== Big-Wave Length Calculator + Recommender =====
const SELECTOR = {
  weight: 72,
  level: "I",       // B/I/A/P
  wave_size: "overhead",  // headhigh / overhead / dohead / xxl
  wave_type: "reef",      // beach / reef / point / slab
  intent: "paddle",       // paddle / tow / either
  age_extra: false,
  asian_body: true
};

// Board-type presets for big-wave: id → { length range, gf range, fits wave / type, levels }
const BOARD_PRESETS = {
  C1: { len: [6.2, 7.0], gf: [0.32, 0.36], name: "Step-Up",         waves: ["headhigh","overhead"],         types: ["beach","reef","point"], levels:["I","A"] },
  C2: { len: [6.8, 7.5], gf: [0.30, 0.34], name: "Mini-Gun",        waves: ["overhead","dohead"],           types: ["reef","point"],         levels:["A","P"] },
  C3: { len: [7.4, 8.4], gf: [0.29, 0.33], name: "Semi-Gun",        waves: ["dohead","xxl"],                types: ["reef","point"],         levels:["A","P"] },
  C4: { len: [8.4, 9.5], gf: [0.28, 0.32], name: "Gun",             waves: ["xxl"],                         types: ["reef","point"],         levels:["P"] },
  C5: { len: [9.5, 11.0],gf: [0.26, 0.30], name: "Rhino Chaser",    waves: ["xxl"],                         types: ["reef"],                  levels:["P"] },
  C6: { len: [5.4, 6.4], gf: [0.22, 0.28], name: "Tow-In Board",    waves: ["xxl"],                         types: ["reef","point","slab"],   levels:["P"] },
  C7: { len: [6.2, 7.0], gf: [0.34, 0.38], name: "Wide-Point Step-Up", waves: ["headhigh","overhead"],      types: ["beach","reef","point"], levels:["I","A"] }
};

function renderSelector(){
  const qs = document.getElementById("selector-questions");
  qs.innerHTML = `
    <div class="skill-question">
      <div class="q">Q1 · 體重 / Weight (KG)</div>
      <div class="opts" style="flex-direction:row; align-items:center; gap:10px; padding:10px;">
        <input id="sel-weight" type="range" min="45" max="110" step="1" value="${SELECTOR.weight}" style="flex:1;" />
        <div style="font-family:var(--display); font-size:38px; line-height:1; color:var(--vermillion); min-width:80px; text-align:right;">
          <span id="sel-weight-val">${SELECTOR.weight}</span>
          <small style="font-family:var(--mono); font-size:11px;">kg</small>
        </div>
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q2 · 技術等級 / Level</div>
      <div class="opts">
        ${[["B","初學/首攻 (1st head-high attempt)"],["I","中階 (overhead 流暢)"],["A","進階 (double-overhead committed)"],["P","Pro / BWWT (XXL paddle)"]].map(([v,l]) => `<div class="opt ${SELECTOR.level===v?'selected':''}" data-k="level" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q3 · 目標浪況 / Target Wave Size</div>
      <div class="opts">
        ${[["headhigh","頭高 Head-High 5–7ft"],["overhead","頭高+ Overhead 6–10ft"],["dohead","雙倍頭 Double-Overhead 10–18ft"],["xxl","XXL Paddle 18ft+"]].map(([v,l]) => `<div class="opt ${SELECTOR.wave_size===v?'selected':''}" data-k="wave_size" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q4 · 浪型 / Wave Type</div>
      <div class="opts">
        ${[["beach","Beach Break 沙底"],["reef","Reef Break 礁底"],["point","Point Break 點位"],["slab","Slab / 厚浪"]].map(([v,l]) => `<div class="opt ${SELECTOR.wave_type===v?'selected':''}" data-k="wave_type" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q5 · 攻擊方式 / Intent</div>
      <div class="opts">
        ${[["paddle","Paddle-In 划水"],["tow","Tow-In jet-ski 拉入"],["either","兩者 / 不限"]].map(([v,l]) => `<div class="opt ${SELECTOR.intent===v?'selected':''}" data-k="intent" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q6 · 體型修正 / Body Adjustments</div>
      <div class="opts">
        <div class="opt ${SELECTOR.asian_body?'selected':''}" data-k="asian_body" data-v="${!SELECTOR.asian_body}">
          ${SELECTOR.asian_body?'✓ ':'☐ '} 亞洲體型修正 (−1 吋 / 大浪不縮厚度)
        </div>
        <div class="opt ${SELECTOR.age_extra?'selected':''}" data-k="age_extra" data-v="${!SELECTOR.age_extra}">
          ${SELECTOR.age_extra?'✓ ':'☐ '} 45 歲以上 / paddle 體能弱 (+0.5L 緩衝)
        </div>
      </div>
    </div>
  `;

  const ws = document.getElementById("sel-weight");
  ws.addEventListener("input", e => {
    SELECTOR.weight = +e.target.value;
    document.getElementById("sel-weight-val").textContent = SELECTOR.weight;
    renderSelectorResult();
  });
  document.querySelectorAll("#selector-questions .opt").forEach(el => {
    el.addEventListener("click", () => {
      const k = el.dataset.k, v = el.dataset.v;
      if(k === "asian_body" || k === "age_extra"){
        SELECTOR[k] = v === "true";
      } else {
        SELECTOR[k] = v;
      }
      renderSelector();
    });
  });

  renderSelectorResult();
}

function renderSelectorResult(){
  const w = SELECTOR.weight;
  // Length range by wave size (in feet, decimal)
  const waveLen = {
    headhigh: [6.2, 6.8],
    overhead: [6.4, 7.2],
    dohead:   [7.0, 8.0],
    xxl:      [8.4, 9.6]
  }[SELECTOR.wave_size];
  let [lenLo, lenHi] = waveLen;

  // GF range by level
  const levelGF = {
    B: [0.34, 0.38],
    I: [0.32, 0.36],
    A: [0.30, 0.34],
    P: [0.28, 0.32]
  }[SELECTOR.level];
  let [gfLo, gfHi] = levelGF;

  // wave size adjustment to GF
  if(SELECTOR.wave_size === "xxl") { gfLo -= 0.02; gfHi -= 0.02; }
  if(SELECTOR.wave_size === "dohead") { gfLo -= 0.01; gfHi -= 0.01; }
  // slab adjustment — narrower, lower GF
  if(SELECTOR.wave_type === "slab") { gfLo -= 0.01; gfHi -= 0.01; }
  // tow vs paddle — tow doesn't use GF formula at all
  const isTow = SELECTOR.intent === "tow";

  if(isTow){
    lenLo = 5.4; lenHi = 6.4;
  }

  let volLo = w * gfLo;
  let volHi = w * gfHi;
  if(SELECTOR.asian_body && !isTow){ lenLo -= 1/12; lenHi -= 1/12; }
  if(SELECTOR.age_extra){ volLo += 0.5; volHi += 0.5; }

  // helper to format decimal feet to f'i"
  const fmtFt = ft => {
    const f = Math.floor(ft);
    let i = Math.round((ft - f) * 12);
    let fOut = f;
    if(i === 12){ fOut += 1; i = 0; }
    return `${fOut}'${i}"`;
  };

  // Rank board presets
  const ranked = Object.entries(BOARD_PRESETS).map(([k,p]) => {
    let score = 0;
    const reasons = [];
    if(p.waves.includes(SELECTOR.wave_size)) { score += 30; reasons.push("浪高匹配"); }
    if(p.types.includes(SELECTOR.wave_type)) { score += 20; reasons.push("浪型匹配"); }
    if(p.levels.includes(SELECTOR.level)) { score += 25; reasons.push("等級匹配"); }
    // length overlap
    const overlap = Math.min(p.len[1], lenHi) - Math.max(p.len[0], lenLo);
    if(overlap > 0) { score += 15; reasons.push("板長吻合"); }
    // intent
    if(isTow){
      if(k === "C6"){ score += 25; reasons.push("Tow-only 專屬"); }
      else { score -= 30; }
    } else {
      if(k === "C6"){ score -= 30; }
    }
    return { id: k, p, score, reasons };
  }).sort((a,b) => b.score - a.score);

  const top = ranked.slice(0, 5);

  document.getElementById("selector-result").innerHTML = `
    <div style="background:var(--ink); color:var(--paper); padding:18px 22px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; align-items:end;">
      <div>
        <div style="font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; opacity:.7;">建議板長 / Length</div>
        <div style="font-family:var(--display); font-size:46px; line-height:.95; color:var(--vermillion);">
          ${fmtFt(lenLo)}<small style="font-family:var(--mono); font-size:18px; color:var(--paper);"> – ${fmtFt(lenHi)}</small>
        </div>
      </div>
      <div>
        <div style="font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; opacity:.7;">${isTow ? "Tow 板浮力(供參)" : "建議浮力 / Volume"}</div>
        <div style="font-family:var(--display); font-size:38px; line-height:1;">
          ${volLo.toFixed(1)}<small style="font-family:var(--mono); font-size:14px;">–${volHi.toFixed(1)} L</small>
        </div>
      </div>
      <div>
        <div style="font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; opacity:.7;">公式</div>
        <div style="font-family:var(--mono); font-size:13px; line-height:1.45;">
          ${isTow ? "Tow board:5'4\"–6'4\" + foot strap + lead 配重" : `LENGTH:${fmtFt(lenLo)}–${fmtFt(lenHi)} 由浪況決定<br/>GF:${gfLo.toFixed(2)}–${gfHi.toFixed(2)} × ${SELECTOR.weight}kg`}
          ${SELECTOR.asian_body && !isTow ? `<br/><span style="opacity:.7;">−1\" 亞洲身材</span>`:''}
          ${SELECTOR.age_extra ? `<br/><span style="opacity:.7;">+0.5L 體能修正</span>`:''}
        </div>
      </div>
    </div>

    <h4 style="font-family:var(--display); font-size:32px; margin:24px 0 6px; line-height:1;">推薦板型 · Top 5</h4>
    <div style="font-family:var(--mono); font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-soft); margin-bottom:14px;">
      Weighted match · 點選查看完整資料
    </div>
    <div class="match-list">
      ${top.map(({id,p,score,reasons}) => `
        <div class="match-row" onclick="openDetail('${id}')">
          <div class="score">${id}</div>
          <div class="name">
            ${p.name}
            <small>${fmtFt(p.len[0])}–${fmtFt(p.len[1])} · GF ${p.gf[0]}–${p.gf[1]}</small>
          </div>
          <div class="why">${reasons.slice(0,3).join(" · ")||"—"}</div>
        </div>
      `).join("")}
    </div>

    <div style="margin-top:18px; font-family:var(--serif); font-size:13.5px; line-height:1.6; color:var(--ink-soft); border-top:1px dashed var(--ink); padding-top:14px;">
      <strong>注意:</strong> 大浪選板以 LENGTH 為主、Volume 為輔;板款由
      <a href="javascript:void(0)" onclick="FILTERS.group='D'; document.querySelector('#group-chips .chip[data-group=D]').click(); document.querySelector('.mode-btn[data-mode=index]').click();">D 群 · 品牌板款</a> 進一步篩選。
      ${SELECTOR.level === "B" ? "<br/><strong style=\"color:var(--vermillion-d);\">⚠ 首次大浪嘗試:</strong> 強烈建議先在 Step-Up (C1 / C7) 累積 5+ session,再考慮 Mini-Gun。Inflation vest + 7\\' 大浪 leash 視為必須。" : ""}
      ${SELECTOR.wave_size === "xxl" ? "<br/><strong style=\"color:var(--vermillion-d);\">⚠ XXL Paddle:</strong> 此情境台灣 0% 適用,請赴 Mavericks / Nazaré / Jaws 並有完整 BWWT 訓練與 jet-ski safety team。" : ""}
    </div>
  `;
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
    return `<span class="item">${it.key} ${it.name_ch} <span class="x" onclick="toggleCompare('${k}')">×</span></span>`;
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
    ["群組 Group", it => `${it.groupLetter} · ${it.group.ch}`],
    ["子分類", it => it.sub || "—"],
    ["適用程度", it => it.fit || "—"],
    ["GF 係數", it => it.GF || "—"],
    ["浮力公式", it => it.formula || "—"],
    ["板長 Length", it => it.length || "—"],
    ["板寬 Width", it => it.width || "—"],
    ["板厚 Thickness", it => it.thickness || "—"],
    ["板尾 Tail", it => it.tail || "—"],
    ["Bottom 板底", it => it.bottom || "—"],
    ["Fin Setup", it => it.fin_setup || "—"],
    ["Glassing", it => it.glassing || "—"],
    ["浪高範圍", it => it.waves_range || "—"],
    ["不適合", it => it.not_for || "—"],
    ["代表板款", it => (it.reps||"—").slice(0,250) + (it.reps?.length>250?'…':'')],
    ["預算", it => it.budget || "—"],
    ["安全裝備", it => it.safety || "—"]
  ];
  let html = `<div class="ch"></div>`;
  items.forEach(it => html += `<div class="hd">${it.name_ch}${it.name_en?`<small>${it.name_en.slice(0,50)}</small>`:''}</div>`);
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

  function obSection(title, obj){
    if(!obj || typeof obj !== "object") return "";
    const rows = [];
    for(const [k,v] of Object.entries(obj)){
      if(v==null || v==="") continue;
      if(typeof v === "object") continue;
      const isU = (r.uncertain||[]).includes(k);
      rows.push(`<div class="k">${escape(k.replace(/_/g,' '))}</div><div class="v">${escape(v)}${isU?'<span class="uncertain">不確定</span>':''}</div>`);
    }
    if(!rows.length) return "";
    return `<div class="detail-section"><h3>${title}</h3><div class="kv">${rows.join("")}</div></div>`;
  }

  sections.push(obSection("Basic / 基本資料", r.basic_info));
  sections.push(obSection("Buoyancy Strategy / 浮力策略", r.buoyancy_strategy));
  sections.push(obSection("Shape Details / 版型細節", r.shape_details));
  sections.push(obSection("Fin Setup / 鰭片配置", r.fin_setup));
  sections.push(obSection("Construction / 構造", r.construction));
  sections.push(obSection("Conditions Fit / 適合條件", r.conditions_fit));
  sections.push(obSection("Performance / 性能", r.performance));
  sections.push(obSection("Practical Selection / 實用選擇", r.practical_selection));
  sections.push(obSection("Pro Reference / 職業選手參考", r.pro_reference));
  sections.push(obSection("Local Taiwan Context / 台灣浪點", r.local_taiwan_context));

  const tags = [
    `<span class="tag ${it.group.tagClass}">${it.group.short} · ${it.group.ch}</span>`,
    ...it.levels.map(l => `<span class="tag tag-ink">${l}</span>`)
  ];

  const list = window.SS_CURRENT_LIST?.length ? window.SS_CURRENT_LIST : ALL.map(i=>i.key);
  const idx = list.indexOf(key);
  const posLabel = idx >= 0 ? `${idx+1}/${list.length}` : "";
  const fav = isFav(ISSUE_KEY, key);

  // Brand → Shape cross-reference (big-wave-specific maps)
  let crossRefHTML = "";
  if(it.groupLetter === "D"){
    const brandShapeMap = {
      D1: ["C1","C2","C4"],          // Pyzel
      D2: ["C1","C2","C3"],          // JS
      D3: ["C1","C2","C4"],          // CI
      D4: ["C1","C2"],               // Chilli
      D5: ["C2","C3","C4"],          // ...Lost
      D6: ["C3","C4","C6"],          // Stretch
      D7: ["C4","C5"],               // Pearson Arrow / Walden
      D8: ["C1","C7"]                // Haydenshapes
    };
    const refs = brandShapeMap[it.key] || [];
    if(refs.length){
      crossRefHTML = `<div class="detail-section">
        <h3>板型對應 / SHAPE FAMILIES</h3>
        <div style="padding:12px 14px; font-family:var(--serif); font-size:13.5px; line-height:1.65;">
          ${refs.map(rk => {
            const r2 = ALL.find(x => x.key === rk);
            return r2 ? `<a href="javascript:openDetail('${rk}')" class="cross-ref">${rk} · ${r2.name_ch}</a>` : '';
          }).join("")}
        </div>
      </div>`;
    }
  }
  if(it.groupLetter === "C"){
    const shapeBrandMap = {
      C1: ["D1","D2","D3","D4","D8"],
      C2: ["D1","D2","D3","D4","D5"],
      C3: ["D1","D2","D5","D6"],
      C4: ["D1","D3","D6","D7"],
      C5: ["D6","D7"],
      C6: ["D1","D6"],
      C7: ["D8"]
    };
    const refs = shapeBrandMap[it.key] || [];
    if(refs.length){
      crossRefHTML = `<div class="detail-section">
        <h3>品牌代表 / BRAND MODELS</h3>
        <div style="padding:12px 14px; font-family:var(--serif); font-size:13.5px; line-height:1.65;">
          ${refs.map(rk => {
            const r2 = ALL.find(x => x.key === rk);
            return r2 ? `<a href="javascript:openDetail('${rk}')" class="cross-ref">${rk} · ${r2.name_ch}</a>` : '';
          }).join("")}
        </div>
      </div>`;
    }
  }

  const silhouetteHTML = it.groupLetter === "C" ? bigWaveSilhouette(it.key) : "";

  document.getElementById("detail-panel").innerHTML = `
    <div class="detail-head">
      <div>
        <h2>
          <span class="ch" style="font-family:var(--mono); font-size:13px; letter-spacing:.08em; color:var(--vermillion-d);">${it.key} · ${it.sub}</span>
          ${it.name_ch}
        </h2>
        <div style="font-family:var(--serif); font-size:14px; font-style:italic; color:var(--ink-soft); margin-top:6px;">${escape(it.positioning)}</div>
        <div class="detail-tagrow">${tags.join("")}</div>
      </div>
      <div class="detail-head-actions">
        <button class="fav-btn ${fav?'on':''}" onclick="(() => { const on = toggleFav('${ISSUE_KEY}','${key}'); event.target.classList.toggle('on', on); })()" title="收藏"></button>
        <button class="detail-nav-btn" onclick="detailPrevNext(-1)">←</button>
        <span style="font-family:var(--mono); font-size:11px; color:var(--paper); opacity:.6;">${posLabel}</span>
        <button class="detail-nav-btn" onclick="detailPrevNext(1)">→</button>
        <button class="close" onclick="closeDetail()">×</button>
      </div>
    </div>
    <div class="detail-body">${silhouetteHTML}${sections.filter(Boolean).join("")}${crossRefHTML}</div>
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
window.FILTERS = FILTERS;

// ===== Big-wave board silhouette (longer, narrower than small-wave) =====
function bigWaveSilhouette(key){
  // [length×4, width×4, nose, tail, bottom-desc, summary]
  const specs = {
    C1: { L:55, W: 9.5, nose:"pulled",  tail:"squash",   concave:"single→double V",  desc:"Step-Up · 日常 +2~4 吋" },
    C2: { L:62, W: 9,   nose:"pulled",  tail:"round-pin",concave:"deep single→V",   desc:"Mini-Gun · 7'0 級" },
    C3: { L:70, W: 9.25,nose:"pulled",  tail:"pin",      concave:"single concave",  desc:"Semi-Gun · 7'4–8'4" },
    C4: { L:80, W: 9.5, nose:"pin",     tail:"pin",      concave:"pure single",     desc:"Gun · 8'4–9'6 巨浪" },
    C5: { L:92, W: 9.75,nose:"pin",     tail:"pin",      concave:"single + spiral V", desc:"Rhino Chaser · 10'+" },
    C6: { L:50, W: 8,   nose:"square",  tail:"pin",      concave:"flat→V",          desc:"Tow Board · 5'10–6'4" },
    C7: { L:55, W:10,   nose:"pulled",  tail:"squash",   concave:"single→double→V", desc:"Wide-Point Step-Up" }
  };
  const s = specs[key];
  if(!s) return "";

  const cx = 50;
  const length = s.L * 2.2;
  const width = s.W * 4;
  const top = 10;
  const bottom = top + length;
  const wpY = top + length * 0.45;

  let noseX1, noseX2;
  if(s.nose === "pulled"){ noseX1 = cx - 4; noseX2 = cx + 4; }
  else if(s.nose === "pin"){ noseX1 = cx - 2.5; noseX2 = cx + 2.5; }
  else if(s.nose === "square"){ noseX1 = cx - 8; noseX2 = cx + 8; }
  else { noseX1 = cx - 6; noseX2 = cx + 6; }

  const tailY = bottom;
  const wpX1 = cx - width/2, wpX2 = cx + width/2;
  const tailRailX1 = cx - width*0.25, tailRailX2 = cx + width*0.25;

  let tailPath = "";
  switch(s.tail){
    case "squash":
      tailPath = `L ${tailRailX2} ${tailY-3} L ${cx+7} ${tailY} L ${cx-7} ${tailY} L ${tailRailX1} ${tailY-3}`;
      break;
    case "round-pin":
      tailPath = `L ${tailRailX2} ${tailY-12} Q ${cx} ${tailY+6} ${tailRailX1} ${tailY-12}`;
      break;
    case "pin":
      tailPath = `L ${tailRailX2-3} ${tailY-18} Q ${cx} ${tailY+4} ${tailRailX1+3} ${tailY-18}`;
      break;
    default:
      tailPath = `L ${tailRailX2} ${tailY} L ${tailRailX1} ${tailY}`;
  }

  // Fin markers — thruster for most, quad for C6 (tow)
  let finsMarkers = "";
  if(key === "C6"){
    finsMarkers = `
      <circle cx="${cx-10}" cy="${bottom-22}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx+10}" cy="${bottom-22}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx-6}"  cy="${bottom-10}" r="2"   fill="var(--ink)"/>
      <circle cx="${cx+6}"  cy="${bottom-10}" r="2"   fill="var(--ink)"/>
      <rect x="${cx-10}" y="${top+30}" width="20" height="4" rx="1" fill="var(--vermillion)"/>
      <rect x="${cx-10}" y="${top+60}" width="20" height="4" rx="1" fill="var(--vermillion)"/>
    `;
  } else {
    // thruster
    const finOffset = key === "C5" ? 38 : key === "C4" ? 32 : key === "C3" ? 28 : 24;
    finsMarkers = `
      <circle cx="${cx-10}" cy="${bottom-finOffset}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx+10}" cy="${bottom-finOffset}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx}"    cy="${bottom-finOffset+12}" r="2.5" fill="var(--ink)"/>
    `;
  }

  // Side rocker — bigger boards have more rocker
  const rockerY = bottom + 36;
  const rockerCurve = key === "C5" ? -7 : key === "C4" ? -6 : key === "C3" ? -5 : key === "C2" ? -4 : -3;
  const rockerLine = `M 12 ${rockerY} Q ${cx} ${rockerY + rockerCurve} 88 ${rockerY}`;

  const firstTailOffset = s.tail === "squash" ? 3 : s.tail === "round-pin" ? 12 : 18;

  // Foot strap label for tow board
  const towLabel = key === "C6" ? `<text x="${cx+22}" y="${top+62}" font-family="var(--mono)" font-size="3.5" fill="var(--vermillion)">FOOT STRAPS</text>` : "";

  return `
    <div class="board-silhouette">
      <svg viewBox="0 0 100 ${bottom+58}" xmlns="http://www.w3.org/2000/svg" style="width:100%; max-height:340px;">
        <path d="
          M ${noseX2} ${top+4}
          Q ${wpX2+4} ${wpY-4} ${wpX2} ${wpY}
          Q ${wpX2+2} ${wpY+20} ${tailRailX2} ${tailY - firstTailOffset}
          ${tailPath}
          Q ${wpX1-2} ${wpY+20} ${wpX1} ${wpY}
          Q ${wpX1-4} ${wpY-4} ${noseX1} ${top+4}
          Q ${cx} ${top-3} ${noseX2} ${top+4}
          Z"
          fill="var(--paper-deep)" stroke="var(--ink)" stroke-width="1.4" stroke-linejoin="round"/>
        <line x1="${cx}" y1="${top+4}" x2="${cx}" y2="${bottom-6}" stroke="var(--ink)" stroke-width=".5" stroke-dasharray="2,2" opacity=".4"/>
        ${finsMarkers}
        ${towLabel}
        <path d="${rockerLine}" fill="none" stroke="var(--ink)" stroke-width="1.2" opacity=".7"/>
        <text x="${cx}" y="${rockerY+12}" text-anchor="middle" font-family="var(--mono)" font-size="3" fill="var(--ink-soft)">SIDE PROFILE · ROCKER</text>
      </svg>
      <div class="silhouette-tag">
        <div class="silhouette-row"><strong>NOSE</strong> ${s.nose}</div>
        <div class="silhouette-row"><strong>TAIL</strong> ${s.tail}</div>
        <div class="silhouette-row"><strong>BOTTOM</strong> ${s.concave}</div>
        <div class="silhouette-row"><em>${s.desc}</em></div>
      </div>
    </div>
  `;
}
window.bigWaveSilhouette = bigWaveSilhouette;

function switchMode(mode){
  document.querySelectorAll(".mode-btn").forEach(b => { const on = b.dataset.mode === mode; b.classList.toggle("active", on); b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; });
  document.querySelectorAll(".pane").forEach(p => p.style.display = p.dataset.mode === mode ? "" : "none");
  if(mode === "selector") renderSelector();
  if(mode === "compare") renderCompare();
  if(mode === "index") renderIndex();
}

window.addEventListener("DOMContentLoaded", boot);
