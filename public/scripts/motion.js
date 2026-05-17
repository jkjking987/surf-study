// =========================================================
//   衝浪研究室 — Motion JS
//   - Scroll-reveal observer (.reveal -> .is-in)
//   - Number count-up on first reveal (.num-anim[data-target])
//   - Auto-mark common entry blocks as reveals
//   - Auto-duplicate ticker children for seamless loop
//   Honours prefers-reduced-motion via CSS guard.
// =========================================================
(function(){
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- Mark common blocks as scroll-reveals (idempotent) -----
  function autoReveal(){
    const sel = [
      ".issues .issue",           // index — 6 covers
      ".field-notes",             // index — bottom panel
      ".dossier",                 // detail blocks
      "section.pane > *",         // panes' immediate children (toolbar/grid/etc)
      ".trip-day",
      ".issue-page > div.bali-map, .issue-page > div.hainan-map"
      // NOTE: .issue-page > section / nav are deliberately NOT auto-revealed —
      // .issue-mast / .issue-intro / .modes / .crumb-bar already have their own
      // page-enter CSS animation in motion.css. Layering `.reveal { opacity: 0 }`
      // on top of those animations would leave them stuck invisible.
    ];
    document.querySelectorAll(sel.join(",")).forEach((el,i) => {
      if(el.classList.contains("reveal")) return;
      if(el.closest(".detail-panel")) return;       // detail uses its own anim
      el.classList.add("reveal");
      el.style.setProperty("--reveal-delay", Math.min(i * 35, 240) + "ms");
    });
  }

  // ----- Count up numbers -----
  function tweenNumber(node, target, dur = 900){
    if(reduce){ node.textContent = formatNumber(target, node.dataset.numFmt); return; }
    const start = performance.now();
    const from = 0;
    const fmt = node.dataset.numFmt;
    function step(now){
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(from + (target - from) * eased);
      node.textContent = formatNumber(v, fmt);
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function formatNumber(n, fmt){
    if(fmt === "comma") return n.toLocaleString("en-US");
    return String(n);
  }

  // ----- Wire up Editor's note stat block + meta-grid -----
  function preparseStats(){
    // Look for any `.n` inside `.stat` or `.meta-grid .cell` and try to extract integer target
    document.querySelectorAll(".stat .n, .meta-grid .n").forEach(node => {
      // Skip nodes we've already processed (otherwise re-running this on a
      // MutationObserver tick would clobber a counter that already finished)
      if(node.dataset.numTarget) return;
      const m = (node.textContent || "").match(/^(\d{1,3}(?:,\d{3})+|\d+)/);
      if(!m) return;
      const target = parseInt(m[1].replace(/,/g,""), 10);
      if(!isFinite(target) || target < 1) return;
      // Preserve any tail (e.g. "<small>.05</small>")
      const tail = node.innerHTML.slice(m[1].length);
      node.dataset.numTarget = String(target);
      node.dataset.numTail = tail;
      node.dataset.numFmt = m[1].includes(",") ? "comma" : "plain";
      node.classList.add("num-anim");
      node.textContent = "0" + (tail ? "" : ""); // keep tail hidden until trigger
    });
  }
  function triggerStat(node){
    if(node.dataset.numFired) return;
    node.dataset.numFired = "1";
    const target = parseInt(node.dataset.numTarget, 10);
    const tail = node.dataset.numTail || "";
    tweenNumber(node, target);
    // Restore tail after a tick
    setTimeout(() => {
      node.innerHTML = formatNumber(target, node.dataset.numFmt) + tail;
    }, 920);
  }

  // ----- IntersectionObserver -----
  function observe(){
    const els = document.querySelectorAll(".reveal:not(.is-in)");
    if(!els.length) return;
    if(reduce){ els.forEach(el => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if(e.isIntersecting){
          fire(e.target);
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach(el => io.observe(el));
    // Scroll fallback — if IO is slow / iframe weirdness, anything that scrolls
    // into the viewport gets manually fired.
    let scrollPending = false;
    function onScroll(){
      if(scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(() => {
        scrollPending = false;
        const vh = innerHeight;
        document.querySelectorAll(".reveal:not(.is-in)").forEach(el => {
          const r = el.getBoundingClientRect();
          if(r.top < vh * 0.92 && r.bottom > 0) fire(el);
        });
      });
    }
    addEventListener("scroll", onScroll, { passive: true });
    // Final safety net — anything left invisible after 4s gets shown
    setTimeout(() => {
      document.querySelectorAll(".reveal:not(.is-in)").forEach(fire);
    }, 4000);
  }
  function fire(el){
    el.classList.add("is-in");
    el.querySelectorAll(".num-anim[data-num-target]").forEach(triggerStat);
  }

  // Stat blocks above the fold may already be visible at load.
  // We fire EVERY counter at init — running the count-up off-screen is harmless,
  // and this avoids missed triggers when the meta-grid sits just below the
  // viewport's 85% threshold (Hainan / Board layouts).
  function fireAboveFoldStats(){
    document.querySelectorAll(".num-anim[data-num-target]").forEach(triggerStat);
  }

  // ----- Newswire ticker — duplicate children for seamless loop -----
  function wireTicker(){
    const t = document.querySelector(".ticker");
    if(!t || t.dataset.tickerInit) return;
    // Wrap children into a .ticker-track if not already
    if(!t.querySelector(".ticker-track")){
      const track = document.createElement("div");
      track.className = "ticker-track";
      while(t.firstChild) track.appendChild(t.firstChild);
      // Duplicate content for seamless loop
      const clone = track.cloneNode(true);
      t.appendChild(track);
      t.appendChild(clone);
    }
    t.dataset.tickerInit = "1";
  }

  function init(){
    preparseStats();
    autoReveal();
    wireTicker();
    observe();
    fireAboveFoldStats();
  }

  // Index issue pages have an async cards render — re-observe on mutations
  const grid = () => document.getElementById("grid");
  function observeGridChanges(){
    const g = grid(); if(!g) return;
    const mo = new MutationObserver(() => {
      // Existing cards already get a CSS keyframe anim — no scroll-reveal needed.
      // But meta-grid count-ups may appear: re-parse and re-fire.
      preparseStats();
      fireAboveFoldStats();
    });
    mo.observe(g, { childList: true });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => { init(); observeGridChanges(); });
  } else {
    init();
    observeGridChanges();
  }
})();
