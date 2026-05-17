// =========================================================
//   衝浪研究室 — Shared Map Zoom / Pan utility
//   Works with any <svg> with viewBox set.
//   - Mouse wheel  → zoom around cursor
//   - Mouse drag   → pan
//   - Touch pinch  → zoom; touch drag → pan
//   - + / − / Reset buttons (UI provided by attachMapControls)
//   - At zoom > 1.8x, SVG gets class `zoomed-in` (used by CSS to
//     reveal pin labels, which are hidden by default to avoid clutter)
// =========================================================
(function(){
  function attachMapZoom(svg){
    if(!svg || !svg.viewBox) return null;
    const orig = {
      x: svg.viewBox.baseVal.x,
      y: svg.viewBox.baseVal.y,
      w: svg.viewBox.baseVal.width,
      h: svg.viewBox.baseVal.height
    };
    let cur = { ...orig };
    let dragging = false, dragStart = null;
    let pinchStart = null;
    svg.style.cursor = "grab";
    svg.style.touchAction = "none";

    function applyVB(){
      svg.setAttribute("viewBox", `${cur.x.toFixed(2)} ${cur.y.toFixed(2)} ${cur.w.toFixed(2)} ${cur.h.toFixed(2)}`);
      // Mark zoom band on the svg element so CSS can react
      const zoom = orig.w / cur.w;
      svg.classList.toggle("zoomed-in",  zoom >= 1.8);
      svg.classList.toggle("zoomed-far", zoom <  1.05);
      svg.dataset.zoom = zoom.toFixed(2);
    }

    function clientToSvg(clientX, clientY){
      const pt = svg.createSVGPoint ? svg.createSVGPoint() : new DOMPoint();
      pt.x = clientX; pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if(!ctm) return null;
      return pt.matrixTransform(ctm.inverse());
    }

    function zoomAt(factor, cx, cy){
      const nextW = cur.w / factor;
      const nextH = cur.h / factor;
      // Clamp 0.5x .. 16x
      const z = orig.w / nextW;
      if(z < 0.5 || z > 16) return;
      cur.x = cx - (cx - cur.x) / factor;
      cur.y = cy - (cy - cur.y) / factor;
      cur.w = nextW;
      cur.h = nextH;
      applyVB();
    }
    function zoomBy(factor){
      const cx = cur.x + cur.w / 2;
      const cy = cur.y + cur.h / 2;
      zoomAt(factor, cx, cy);
    }
    function reset(){
      cur = { ...orig };
      applyVB();
    }

    // Wheel
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const p = clientToSvg(e.clientX, e.clientY);
      if(!p) return;
      const factor = e.deltaY < 0 ? 1.18 : 1/1.18;
      zoomAt(factor, p.x, p.y);
    }, { passive: false });

    // Mouse drag (pan)
    svg.addEventListener("mousedown", (e) => {
      // pins handle their own click — but pan is OK to start on them
      if(e.button !== 0) return;
      dragging = true;
      svg.style.cursor = "grabbing";
      dragStart = { x: e.clientX, y: e.clientY, vbx: cur.x, vby: cur.y };
      e.preventDefault();
    });
    addEventListener("mousemove", (e) => {
      if(!dragging) return;
      const ctm = svg.getScreenCTM();
      if(!ctm) return;
      const dx = (e.clientX - dragStart.x) / ctm.a;
      const dy = (e.clientY - dragStart.y) / ctm.d;
      cur.x = dragStart.vbx - dx;
      cur.y = dragStart.vby - dy;
      applyVB();
    });
    addEventListener("mouseup", () => {
      if(!dragging) return;
      dragging = false;
      svg.style.cursor = "grab";
    });

    // Touch
    function touchPos(t){
      return { x: t.clientX, y: t.clientY };
    }
    svg.addEventListener("touchstart", (e) => {
      if(e.touches.length === 1){
        const t = e.touches[0];
        dragStart = { x: t.clientX, y: t.clientY, vbx: cur.x, vby: cur.y };
        pinchStart = null;
      } else if(e.touches.length === 2){
        const a = e.touches[0], b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        pinchStart = { dist, cx, cy };
        dragStart = null;
      }
    }, { passive: true });
    svg.addEventListener("touchmove", (e) => {
      if(pinchStart && e.touches.length === 2){
        e.preventDefault();
        const a = e.touches[0], b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const cx = (a.clientX + b.clientX) / 2;
        const cy = (a.clientY + b.clientY) / 2;
        const factor = dist / pinchStart.dist;
        if(Math.abs(factor - 1) < 0.02) return;
        const p = clientToSvg(cx, cy);
        if(p) zoomAt(factor, p.x, p.y);
        pinchStart.dist = dist;
        pinchStart.cx = cx; pinchStart.cy = cy;
      } else if(dragStart && e.touches.length === 1){
        e.preventDefault();
        const t = e.touches[0];
        const ctm = svg.getScreenCTM();
        if(!ctm) return;
        const dx = (t.clientX - dragStart.x) / ctm.a;
        const dy = (t.clientY - dragStart.y) / ctm.d;
        cur.x = dragStart.vbx - dx;
        cur.y = dragStart.vby - dy;
        applyVB();
      }
    }, { passive: false });
    svg.addEventListener("touchend", () => {
      dragStart = null; pinchStart = null;
    }, { passive: true });

    return { zoomIn: () => zoomBy(1.4), zoomOut: () => zoomBy(1/1.4), reset, applyVB, getZoom: () => orig.w / cur.w };
  }

  // Build a little toolbar with + / − / reset buttons and append it
  // into `parent`. Returns the toolbar node.
  function attachMapControls(svg, parent){
    const ctl = attachMapZoom(svg);
    if(!ctl) return null;
    const bar = document.createElement("div");
    bar.className = "map-zoom-controls";
    bar.innerHTML = `
      <button data-act="in" title="放大 (Zoom in)">＋</button>
      <button data-act="out" title="縮小 (Zoom out)">−</button>
      <button data-act="reset" title="重設 (Reset)">⟳</button>
      <span class="map-zoom-readout" title="目前縮放">1.0×</span>
    `;
    parent.appendChild(bar);
    const readout = bar.querySelector(".map-zoom-readout");
    function refreshReadout(){
      readout.textContent = ctl.getZoom().toFixed(1) + "×";
    }
    bar.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-act]");
      if(!b) return;
      const a = b.dataset.act;
      if(a === "in") ctl.zoomIn();
      else if(a === "out") ctl.zoomOut();
      else if(a === "reset") ctl.reset();
      refreshReadout();
    });
    // Also refresh readout on user gesture
    svg.addEventListener("wheel", refreshReadout, { passive: true });
    svg.addEventListener("mouseup", refreshReadout);
    svg.addEventListener("touchend", refreshReadout, { passive: true });
    refreshReadout();
    return ctl;
  }

  window.attachMapZoom = attachMapZoom;
  window.attachMapControls = attachMapControls;
})();
