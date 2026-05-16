// =========================================================
// 衝浪研究室 — Board Issue (No. 003)
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
  if(/Pro|pro|高手|職業/.test(t)) out.add("P");
  if(/全程度/.test(t)) ["B","I","A","P"].forEach(x => out.add(x));
  return out.size ? [...out] : ["I","A"];
}

function normalize(key, raw){
  const bi = raw.basic_info || {};
  const groupLetter = key[0]; // A/B/C/D/E
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
    // Specific fields for selector / compare:
    GF: raw.buoyancy_strategy?.Guild_Factor_GF || raw.buoyancy_strategy?.Guild_Factor || "",
    formula: raw.buoyancy_strategy?.浮力公式 || "",
    length: raw.shape_details?.["Length 板長"] || "",
    width: raw.shape_details?.["Width 板寬"] || "",
    thickness: raw.shape_details?.["Thickness 板厚"] || "",
    tail: raw.shape_details?.["Tail_Shape 板尾形狀"] || raw.shape_details?.["Tail Shape"] || "",
    bottom: raw.shape_details?.["Bottom_Contour 板底設計"] || "",
    fin_setup: raw.fin_setup?.主要_Setup || raw.fin_setup?.["主要 Setup"] || "",
    waves_range: raw.conditions_fit?.浪高範圍 || "",
    not_for: raw.conditions_fit?.不適合場景 || "",
    paddle: raw.performance?.划水容易度 || "",
    pump: raw.performance?.["Pump 效率"] || "",
    vertical: raw.performance?.["Vertical 能力"] || "",
    air: raw.performance?.空中動作能力 || "",
    reps: raw.practical_selection?.代表板款 || "",
    mistakes: raw.practical_selection?.常見錯誤 || "",
    budget: raw.practical_selection?.預算建議 || "",
    taiwan: raw.local_taiwan_context?.浪點適配 || raw.local_taiwan_context?.["浪點適配"] || ""
  };
}

async function boot(){
  const res = await fetch("/api/board.json");
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
  // Group chips
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

  // Level chips
  const levels = ["all","B","I","A","P"];
  const lvLabels = { B:"初學", I:"中階", A:"進階", P:"Pro" };
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
      const on = toggleFav("board", c.dataset.fav);
      c.classList.toggle("on", on);
    });
  });
  window.SS_CURRENT_LIST = list.map(i => i.key);
}

function cardHTML(it){
  const inCmp = COMPARE.includes(it.key);
  const fav = isFav("board", it.key);
  const lvTags = it.levels.map(l => `<span class="tag tag-ink">${l}</span>`).join("");
  return `
    <div class="card ${inCmp?'in-compare':''}" data-key="${it.key}">
      <button class="fav-btn ${fav?'on':''}" data-fav="${it.key}" title="收藏"></button>
      <button class="compare-btn ${inCmp?'added':''}">${inCmp?'✓ COMPARE':'+ COMPARE'}</button>
      <div class="row1">
        <span class="num">${it.key}</span>
        <div class="name" style="padding-right:32px;">
          ${it.name_ch}
          ${it.name_en ? `<span class="ch" style="font-family:var(--mono); font-size:11px; letter-spacing:.04em; text-transform:none;">${it.name_en}</span>` : ''}
        </div>
      </div>
      <div class="meta-row">
        <span class="tag ${it.group.tagClass}">${it.group.short} · ${it.group.ch}</span>
        ${lvTags}
      </div>
      <div class="blurb">${escape(it.positioning).slice(0,200)}${it.positioning.length>200?'…':''}</div>
      <dl class="data">
        ${it.length ? `<dt>LENGTH</dt><dd>${escape(it.length).slice(0,90)}</dd>`:''}
        ${it.waves_range ? `<dt>WAVE</dt><dd>${escape(it.waves_range).slice(0,90)}</dd>`:''}
        ${it.fin_setup ? `<dt>FIN</dt><dd>${escape(it.fin_setup).slice(0,90)}</dd>`:''}
      </dl>
    </div>
  `;
}

// ===== Volume Calculator + Recommender =====
const SELECTOR = {
  weight: 72,
  level: "I",      // B/I/A/P
  wave_size: "small",  // tiny / small / medium / overhead
  wave_quality: "soft",// soft / fat / hollow
  vibe: "fun",     // fun / performance / style / air
  age_extra: false,
  asian_body: true
};

// GF table by board-type-id → { gfLow, gfHigh, +addPlus, fits wave } for ranking
const BOARD_PRESETS = {
  C1: { gf: [0.40, 0.50], name: "經典 Groveler", waves: ["tiny","small"], qualities: ["soft","fat"], levels:["B","I"] },
  C2: { gf: [0.36, 0.42], name: "Hybrid Shortboard", waves: ["small","medium"], qualities:["soft","fat","hollow"], levels:["I","A","P"] },
  C3: { gf: [0.42, 0.50], name: "Modern Fish", waves: ["tiny","small","medium"], qualities:["soft","fat"], levels:["B","I","A"] },
  C4: { gf: [0.38, 0.44], name: "Modern Twin Fin", waves: ["small","medium","overhead"], qualities:["soft","fat","hollow"], levels:["I","A","P"] },
  C5: { gf: [0.38, 0.44], name: "Twin + Stabilizer (2+1)", waves: ["small","medium","overhead"], qualities:["soft","fat","hollow"], levels:["I","A"] },
  C6: { gf: [0.45, 0.55], name: "Modern Mid-length", waves: ["tiny","small","medium"], qualities:["soft","fat"], levels:["B","I","A"] },
  C7: { gf: [0.36, 0.42], name: "Step-Down", waves: ["small","medium"], qualities:["soft","fat","hollow"], levels:["I","A","P"] },
  C8: { gf: [0.50, 0.65], name: "Performance Soft-top", waves: ["tiny","small"], qualities:["soft"], levels:["B","I"] },
  C9: { gf: [0.36, 0.44], name: "Tomo Planing Hull", waves: ["small","medium"], qualities:["soft","fat"], levels:["I","A","P"] },
  C10:{ gf: [0.42, 0.50], name: "Wide Swallow / Bat Tail", waves: ["small","medium"], qualities:["soft","fat"], levels:["I","A"] }
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
        ${[["B","初學 (popup·軟板·whitewater)"],["I","中階 (cutback·green wave)"],["A","進階 (vertical snap·hollow)"],["P","Pro (barrel·air·大浪)"]].map(([v,l]) => `<div class="opt ${SELECTOR.level===v?'selected':''}" data-k="level" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q3 · 浪況 — 浪高 / Wave Size</div>
      <div class="opts">
        ${[["tiny","極軟 膝~腰 Knee-Waist"],["small","小 腰~胸 Waist-Chest"],["medium","中 胸~頭高 Chest-Head"],["overhead","頭高+ Overhead+"]].map(([v,l]) => `<div class="opt ${SELECTOR.wave_size===v?'selected':''}" data-k="wave_size" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q4 · 浪況 — 浪質 / Wave Quality</div>
      <div class="opts">
        ${[["soft","軟糊 Soft·Mushy"],["fat","飽滿 Fat·Full"],["hollow","陡空心 Steep·Hollow"]].map(([v,l]) => `<div class="opt ${SELECTOR.wave_quality===v?'selected':''}" data-k="wave_quality" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q5 · 風格 / Style</div>
      <div class="opts">
        ${[["fun","Fun·上浪率優先"],["performance","Performance·上唇 snap"],["style","Style·Pacey-flow"],["air","Air·空中動作"]].map(([v,l]) => `<div class="opt ${SELECTOR.vibe===v?'selected':''}" data-k="vibe" data-v="${v}">${l}</div>`).join("")}
      </div>
    </div>
    <div class="skill-question">
      <div class="q">Q6 · 體型修正 / Body Adjustments</div>
      <div class="opts">
        <div class="opt ${SELECTOR.asian_body?'selected':''}" data-k="asian_body" data-v="${!SELECTOR.asian_body}">
          ${SELECTOR.asian_body?'✓ ':'☐ '} 亞洲體型修正 (-2~3L)
        </div>
        <div class="opt ${SELECTOR.age_extra?'selected':''}" data-k="age_extra" data-v="${!SELECTOR.age_extra}">
          ${SELECTOR.age_extra?'✓ ':'☐ '} 45 歲以上 / paddle 體能弱 (+3L)
        </div>
      </div>
    </div>
  `;

  // Bind weight slider
  const ws = document.getElementById("sel-weight");
  ws.addEventListener("input", e => {
    SELECTOR.weight = +e.target.value;
    document.getElementById("sel-weight-val").textContent = SELECTOR.weight;
    renderSelectorResult();
  });

  // Bind opts
  document.querySelectorAll("#selector-questions .opt").forEach(el => {
    el.addEventListener("click", () => {
      const k = el.dataset.k, v = el.dataset.v;
      if(k === "asian_body" || k === "age_extra"){
        SELECTOR[k] = v === "true";
      } else {
        SELECTOR[k] = v;
      }
      renderSelector(); // re-render to update selection
    });
  });

  renderSelectorResult();
}

function renderSelectorResult(){
  // Compute volume range based on level + wave + body adjustments
  const w = SELECTOR.weight;
  // base GF range from level
  const levelGF = {
    B: [0.50, 0.60],
    I: [0.42, 0.50],
    A: [0.36, 0.44],
    P: [0.32, 0.40]
  }[SELECTOR.level];
  let [lo, hi] = levelGF;
  // wave adjustment
  if(SELECTOR.wave_size === "tiny") { lo += 0.04; hi += 0.06; }
  if(SELECTOR.wave_size === "small") { lo += 0.02; hi += 0.03; }
  if(SELECTOR.wave_size === "overhead") { lo -= 0.04; hi -= 0.02; }
  // quality
  if(SELECTOR.wave_quality === "soft") { lo += 0.02; hi += 0.03; }
  if(SELECTOR.wave_quality === "hollow") { lo -= 0.02; hi -= 0.01; }
  // vibe
  if(SELECTOR.vibe === "performance") { lo -= 0.02; hi -= 0.02; }
  if(SELECTOR.vibe === "air") { lo -= 0.02; hi -= 0.02; }
  if(SELECTOR.vibe === "fun") { lo += 0.02; hi += 0.02; }
  
  let volLo = w * lo;
  let volHi = w * hi;
  if(SELECTOR.asian_body) { volLo -= 2.5; volHi -= 2.5; }
  if(SELECTOR.age_extra) { volLo += 3; volHi += 3; }

  // Rank board types
  const ranked = Object.entries(BOARD_PRESETS).map(([k,p]) => {
    let score = 0;
    const reasons = [];
    // Wave size match
    if(p.waves.includes(SELECTOR.wave_size)) { score += 30; reasons.push("浪高匹配"); }
    // Quality match
    if(p.qualities.includes(SELECTOR.wave_quality)) { score += 20; reasons.push("浪質匹配"); }
    // Level match
    if(p.levels.includes(SELECTOR.level)) { score += 25; reasons.push("等級匹配"); }
    // GF range overlap with our preferred
    const presetGF = p.gf;
    const overlap = Math.min(presetGF[1], hi) - Math.max(presetGF[0], lo);
    if(overlap > 0) { score += 15; reasons.push("浮力區間吻合"); }
    // Vibe pairing
    const vibeAffinity = {
      C1: ["fun","style"], C2: ["performance","fun"], C3: ["fun","style"], C4: ["style","performance","fun"],
      C5: ["performance","style"], C6: ["style","fun"], C7: ["performance","fun"], C8: ["fun"],
      C9: ["performance","fun"], C10: ["fun","style"]
    };
    if((vibeAffinity[k]||[]).includes(SELECTOR.vibe)) { score += 10; reasons.push("風格匹配"); }
    return { id: k, p, score, reasons };
  }).sort((a,b) => b.score - a.score);

  // Find matching D entries (brands) too? We can; for now keep simple.
  const top = ranked.slice(0, 5);

  document.getElementById("selector-result").innerHTML = `
    <div style="background:var(--ink); color:var(--paper); padding:18px 22px; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; align-items:end;">
      <div>
        <div style="font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; opacity:.7;">建議浮力 / Volume Range</div>
        <div style="font-family:var(--display); font-size:54px; line-height:.95; color:var(--vermillion);">
          ${volLo.toFixed(1)}<small style="font-family:var(--mono); font-size:18px; color:var(--paper);">–${volHi.toFixed(1)} L</small>
        </div>
      </div>
      <div>
        <div style="font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; opacity:.7;">GF 係數</div>
        <div style="font-family:var(--display); font-size:38px; line-height:1;">
          ${lo.toFixed(2)}–${hi.toFixed(2)}
        </div>
      </div>
      <div>
        <div style="font-family:var(--mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; opacity:.7;">公式</div>
        <div style="font-family:var(--mono); font-size:14px; line-height:1.4;">
          ${SELECTOR.weight}kg × ${lo.toFixed(2)}–${hi.toFixed(2)}<br/>
          ${SELECTOR.asian_body ? `<span style="opacity:.7;">−2.5 亞洲體型</span><br/>`:''}
          ${SELECTOR.age_extra ? `<span style="opacity:.7;">+3 體能修正</span>`:''}
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
            <small>GF ${p.gf[0]}–${p.gf[1]} · ${(p.waves||[]).join("·")}</small>
          </div>
          <div class="why">${reasons.slice(0,3).join(" · ")||"—"}</div>
        </div>
      `).join("")}
    </div>

    <div style="margin-top:18px; font-family:var(--serif); font-size:13.5px; line-height:1.6; color:var(--ink-soft); border-top:1px dashed var(--ink); padding-top:14px;">
      <strong>注意:</strong> 上面是「板型類別」推薦,具體挑哪一支請進入詳情或查看
      <a href="javascript:void(0)" onclick="FILTERS.group='D'; document.querySelector('#group-chips .chip[data-group=D]').click(); document.querySelector('.mode-btn[data-mode=index]').click();">D 群 · 品牌板款</a>
      。常見錯誤:浮力照搬日常板、追隨 Pro 尺寸但忽略體重差。
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
    ["浪高範圍", it => it.waves_range || "—"],
    ["不適合", it => it.not_for || "—"],
    ["划水", it => it.paddle || "—"],
    ["Pump 效率", it => it.pump || "—"],
    ["Vertical", it => it.vertical || "—"],
    ["代表板款", it => (it.reps||"—").slice(0,250) + (it.reps?.length>250?'…':'')],
    ["預算", it => it.budget || "—"]
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
  // For C-preset shortcuts coming from selector
  if(BOARD_PRESETS[key] && !ALL.find(x => x.key === key)){
    // fall back: just open the C entry
  }
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

  const list = window.SS_CURRENT_LIST.length ? window.SS_CURRENT_LIST : ALL.map(i=>i.key);
  const idx = list.indexOf(key);
  const posLabel = idx >= 0 ? `${idx+1}/${list.length}` : "";
  const fav = isFav("board", key);

  // Brand → Shape cross-reference
  let crossRefHTML = "";
  if(it.groupLetter === "D"){
    // Map brand → likely shape groups based on naming
    const brandShapeMap = {
      D1: ["C2","C3","C4","C6"], // Channel Islands
      D2: ["C1","C2","C3"], // Lost
      D3: ["C2","C4"], // Pyzel
      D4: ["C2","C7"], // JS
      D5: ["C3","C4","C9","C10"], // Firewire/Slater
      D6: ["C2","C7"], // DHD
      D7: ["C2","C4"], // Haydenshapes
      D8: ["C4","C9"]  // Album/Sharp Eye
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
    // Reverse: which brands have this shape
    const shapeBrandMap = {
      C1: ["D2"], C2: ["D1","D2","D3","D4","D6","D7"], C3: ["D1","D5"], C4: ["D1","D3","D7","D8"],
      C5: ["D3"], C6: ["D1","D5"], C7: ["D2","D4","D6"], C8: [], C9: ["D5","D8"], C10: ["D5"]
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

  // Board silhouette SVG for C-group entries
  const silhouetteHTML = it.groupLetter === "C" ? boardSilhouette(it.key) : "";

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
        <button class="fav-btn ${fav?'on':''}" onclick="(() => { const on = toggleFav('board','${key}'); event.target.classList.toggle('on', on); })()" title="收藏"></button>
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

// ===== Board silhouette SVG (top-down + side rocker) =====
function boardSilhouette(key){
  // Each board type has [length_ratio, width_ratio, nose_type, tail_type, bottom_concave]
  const specs = {
    C1:  { L:38, W:11, nose:"round",    tail:"swallow",     concave:"single→double", desc:"短·寬·厚 經典 groveler" },
    C2:  { L:42, W: 9.5, nose:"pulled",  tail:"squash",      concave:"single→double", desc:"Hybrid · HPSB 與 groveler 折衷" },
    C3:  { L:38, W:12, nose:"wide",     tail:"swallow-deep",concave:"single→deep V",  desc:"寬尾 swallow · low rocker" },
    C4:  { L:42, W:10, nose:"pulled",   tail:"wing-swallow",concave:"flat→V",         desc:"Modern Twin · point break flow" },
    C5:  { L:42, W:10.5,nose:"pulled",  tail:"swallow",     concave:"single→double", desc:"Twin + Stab · backhand hold" },
    C6:  { L:55, W:11, nose:"round",    tail:"round-pin",   concave:"flat→single",   desc:"Mid-length · glide + paddle" },
    C7:  { L:40, W:10, nose:"pulled",   tail:"squash",      concave:"single→double", desc:"Step-Down · 2-4\" 短於日常板" },
    C8:  { L:36, W:11.5,nose:"wide",    tail:"round",       concave:"flat",          desc:"Performance Soft-top" },
    C9:  { L:38, W:11.5,nose:"square",  tail:"swallow",     concave:"deep double",   desc:"Tomo · parallel rail" },
    C10: { L:40, W:12, nose:"round",    tail:"bat",         concave:"double",        desc:"Wide swallow / bat tail" }
  };
  const s = specs[key];
  if(!s) return "";

  // SVG geometry — board pointing down (nose at top)
  const cx = 50;     // center x
  const length = s.L * 4;  // height in svg units
  const width = s.W * 4;   // max width
  const top = 10;
  const bottom = top + length;
  const wpY = top + length * 0.45;  // wide point

  // Nose shape
  let noseX1, noseX2;
  if(s.nose === "pulled")  { noseX1 = cx - 6;  noseX2 = cx + 6; }
  else if(s.nose === "wide"){ noseX1 = cx - 12; noseX2 = cx + 12; }
  else if(s.nose === "square"){ noseX1 = cx - 14; noseX2 = cx + 14; }
  else /* round */         { noseX1 = cx - 8;  noseX2 = cx + 8; }

  // Tail shape — return path commands from rail-end up tail
  const tailY = bottom;
  const wpX1 = cx - width/2, wpX2 = cx + width/2;
  let tailPath = "";
  let finsMarkers = "";
  // Compute tail rail width (where tail meets bottom curve)
  const tailRailX1 = cx - width*0.35, tailRailX2 = cx + width*0.35;

  switch(s.tail){
    case "swallow":
      tailPath = `L ${tailRailX2} ${tailY-5} L ${cx+5} ${tailY} L ${cx} ${tailY-12} L ${cx-5} ${tailY} L ${tailRailX1} ${tailY-5}`;
      break;
    case "swallow-deep":
      tailPath = `L ${tailRailX2} ${tailY-5} L ${cx+10} ${tailY} L ${cx} ${tailY-22} L ${cx-10} ${tailY} L ${tailRailX1} ${tailY-5}`;
      break;
    case "wing-swallow":
      tailPath = `L ${tailRailX2+2} ${tailY-22} L ${tailRailX2-6} ${tailY-18} L ${cx+8} ${tailY} L ${cx} ${tailY-10} L ${cx-8} ${tailY} L ${tailRailX1+6} ${tailY-18} L ${tailRailX1-2} ${tailY-22}`;
      break;
    case "squash":
      tailPath = `L ${tailRailX2} ${tailY-3} L ${cx+10} ${tailY} L ${cx-10} ${tailY} L ${tailRailX1} ${tailY-3}`;
      break;
    case "round-pin":
      tailPath = `L ${tailRailX2} ${tailY-12} Q ${cx} ${tailY+8} ${tailRailX1} ${tailY-12}`;
      break;
    case "round":
      tailPath = `L ${tailRailX2} ${tailY-6} Q ${cx} ${tailY+4} ${tailRailX1} ${tailY-6}`;
      break;
    case "bat":
      tailPath = `L ${tailRailX2+4} ${tailY-15} L ${tailRailX2-2} ${tailY-8} L ${cx+12} ${tailY} L ${cx+4} ${tailY-10} L ${cx} ${tailY-2} L ${cx-4} ${tailY-10} L ${cx-12} ${tailY} L ${tailRailX1+2} ${tailY-8} L ${tailRailX1-4} ${tailY-15}`;
      break;
    default:
      tailPath = `L ${tailRailX2} ${tailY} L ${tailRailX1} ${tailY}`;
  }

  // Fin markers
  if(["wing-swallow","swallow","swallow-deep","squash"].includes(s.tail) && (key==="C4"||key==="C3"||key==="C9"||key==="C10")){
    // Twin
    finsMarkers = `
      <circle cx="${cx-14}" cy="${bottom-30}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx+14}" cy="${bottom-30}" r="2.5" fill="var(--ink)"/>
    `;
  } else if(key==="C5"){
    // Twin + stab
    finsMarkers = `
      <circle cx="${cx-14}" cy="${bottom-30}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx+14}" cy="${bottom-30}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx}"    cy="${bottom-12}" r="2"   fill="var(--ink)"/>
    `;
  } else if(key==="C6") {
    // Mid-length: single or 2+1
    finsMarkers = `<circle cx="${cx}" cy="${bottom-20}" r="3" fill="var(--ink)"/>`;
  } else if(key==="C8") {
    finsMarkers = `
      <rect x="${cx-1.5}" y="${bottom-22}" width="3" height="10" fill="var(--ink)"/>
    `;
  } else {
    // Thruster default
    finsMarkers = `
      <circle cx="${cx-14}" cy="${bottom-25}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx+14}" cy="${bottom-25}" r="2.5" fill="var(--ink)"/>
      <circle cx="${cx}"    cy="${bottom-12}" r="2.5" fill="var(--ink)"/>
    `;
  }

  // Side-view rocker (small line below the top view)
  const rockerY = bottom + 36;
  const rockerLine = `M 12 ${rockerY} Q ${cx} ${rockerY + (key==="C6"?-4:key==="C3"||key==="C10"?-1:-3)} 88 ${rockerY}`;

  // Compute first tail offset
  const firstTailOffset = s.tail==="round-pin" ? 12 : s.tail==="round" ? 6 : 5;

  return `
    <div class="board-silhouette">
      <svg viewBox="0 0 100 ${bottom+58}" xmlns="http://www.w3.org/2000/svg" style="width:100%; max-height:300px;">
        <!-- Board top-down -->
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
        <!-- Stringer -->
        <line x1="${cx}" y1="${top+4}" x2="${cx}" y2="${bottom-6}" stroke="var(--ink)" stroke-width=".5" stroke-dasharray="2,2" opacity=".4"/>
        <!-- Fins -->
        ${finsMarkers}
        <!-- Side view rocker -->
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
window.boardSilhouette = boardSilhouette;

function switchMode(mode){
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  document.querySelectorAll(".pane").forEach(p => p.style.display = p.dataset.mode === mode ? "" : "none");
  if(mode === "selector") renderSelector();
  if(mode === "compare") renderCompare();
  if(mode === "index") renderIndex();
}

window.addEventListener("DOMContentLoaded", boot);
