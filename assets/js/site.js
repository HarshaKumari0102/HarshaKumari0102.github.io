(function () {
  var root = document.documentElement;
  root.classList.add("js");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- theme: dark by default, light on request ---------------- */
  var themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("hk-theme", next); } catch (e) {}
    });
  }

  /* ---------------- mobile menu ---------------- */
  var menuBtn = document.getElementById("menu-btn");
  var nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------------- slicers (impact report) and filters (case studies) ---------------- */
  function wireFilter(groupSel, itemSel, mode) {
    var chips = document.querySelectorAll(groupSel + " [data-filter]");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
        document.querySelectorAll(itemSel).forEach(function (el) {
          var match = f === "all" || el.getAttribute("data-track") === f;
          if (mode === "dim") el.setAttribute("data-dim", match ? "false" : "true");
          else el.hidden = !match;
        });
      });
    });
  }
  wireFilter("#slicers", ".tile", "dim");
  wireFilter("#filters", ".card", "hide");

  /* ---------------- lineage diagram ---------------- */
  var detail = document.getElementById("node-detail");
  var nodes = document.querySelectorAll(".node");
  nodes.forEach(function (n) {
    n.addEventListener("click", function () {
      nodes.forEach(function (m) { m.setAttribute("aria-pressed", m === n ? "true" : "false"); });
      if (!detail) return;
      detail.querySelector("[data-d='stage']").textContent = n.getAttribute("data-stage");
      detail.querySelector("[data-d='name']").textContent = n.querySelector("b").textContent;
      detail.querySelector("[data-d='tech']").textContent = n.querySelector("span").textContent;
      detail.querySelector("[data-d='text']").textContent = n.getAttribute("data-detail");
      if (window.innerWidth < 900) detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  /* ---------------- copy email ---------------- */
  var copyBtn = document.getElementById("copy-email");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = copyBtn.getAttribute("data-copy");
      function toast(msg) {
        var t = document.createElement("div");
        t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast("Email copied"); }, function () { toast(text); });
      } else { toast(text); }
    });
  }
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------------- count-ups, rings, bars, entrance ---------------- */
  function fmt(n) { return Math.round(n).toLocaleString("en-IN"); }
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (reduce || isNaN(target)) return;
    var start = null, dur = 1300;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = "0";
    requestAnimationFrame(step);
  }
  function animateIn(scope) {
    scope.querySelectorAll("[data-count]").forEach(countUp);
    if (reduce) return;
    scope.querySelectorAll(".ring .fg").forEach(function (c) {
      var final = c.style.strokeDashoffset;
      c.style.transition = "none"; c.style.strokeDashoffset = c.getAttribute("stroke-dasharray");
      c.getBoundingClientRect();
      c.style.transition = ""; c.style.strokeDashoffset = final;
    });
    scope.querySelectorAll(".ba-row i").forEach(function (b) {
      var w = b.style.width;
      b.style.transition = "none"; b.style.width = "0%"; b.getBoundingClientRect();
      b.style.transition = ""; b.style.width = w;
    });
  }
  var animScopes = document.querySelectorAll("[data-animate]");
  var rises = document.querySelectorAll(".rise");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        if (en.target.hasAttribute("data-animate")) animateIn(en.target);
        en.target.classList.remove("pre");
      });
    }, { threshold: 0.15 });
    animScopes.forEach(function (s) { io.observe(s); });
    if (!reduce) {
      rises.forEach(function (r) {
        var b = r.getBoundingClientRect();
        if (b.top > window.innerHeight) { r.classList.add("pre"); io.observe(r); }
      });
    }
  }

  /* ---------------- hero pipeline canvas ---------------- */
  var cv = document.getElementById("pipeline");
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext("2d");
  var SOURCES = ["Vendor API", "CRM", "Excel / Sheets", "Client data", "Sales data", "MF data"];
  var STAGES = [
    { name: "Ingest", sub: "Python · APIs · SSIS" },
    { name: "Warehouse", sub: "SQL views · procedures" },
    { name: "Model", sub: "RFM · DAX" }
  ];
  var C = {}, L = null, packets = [], rows = 48210, bars = [0.5, 0.7, 0.4, 0.85, 0.6, 0.75], last = 0;

  function readColors() {
    var s = getComputedStyle(root);
    ["bg", "bg-2", "panel", "panel-2", "line", "line-2", "ink", "muted", "faint", "gold", "cyan"].forEach(function (k) {
      C[k] = s.getPropertyValue("--" + k).trim();
    });
    C.mono = getComputedStyle(document.body).getPropertyValue("--f-mono") || "monospace";
  }

  function bez(p0, p1, p2, p3, t) {
    var u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
    };
  }

  function layout() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = cv.clientWidth, H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var compact = W < 700;
    var srcs = compact ? SOURCES.slice(0, 5) : SOURCES;
    var stages = compact ? [{ name: "Model", sub: "SQL · Python · DAX" }] : STAGES;
    var sw = compact ? 92 : 118, sh = 28, pad = compact ? 14 : 22;
    var rw = compact ? 112 : 190, rh = compact ? 150 : 176;
    var mw = compact ? 118 : 156, mh = 52;
    var src = srcs.map(function (n, i) {
      var y = pad + (H - pad * 2) * (i + 0.5) / srcs.length;
      return { name: n, x: pad, y: y - sh / 2, w: sw, h: sh, cy: y };
    });
    var left = pad + sw, right = W - pad - rw;
    var gap = (right - left) / (stages.length + 1);
    var mids = stages.map(function (s, i) {
      var cx = left + gap * (i + 1);
      return { name: s.name, sub: s.sub, x: cx - mw / 2, y: H / 2 - mh / 2, w: mw, h: mh, cx: cx };
    });
    var rep = { x: W - pad - rw, y: H / 2 - rh / 2, w: rw, h: rh };
    // one path per source: curve into the first stage, then straight through the rest into the report
    var paths = src.map(function (s) {
      var pts = [];
      var a = { x: s.x + s.w, y: s.cy }, d = { x: mids[0].x, y: H / 2 };
      var dx = (d.x - a.x) * 0.55;
      for (var i = 0; i <= 40; i++) pts.push(bez(a, { x: a.x + dx, y: a.y }, { x: d.x - dx, y: d.y }, d, i / 40));
      mids.forEach(function (m, i) {
        pts.push({ x: m.x + m.w, y: H / 2 });
        var nx = i < mids.length - 1 ? mids[i + 1].x : rep.x;
        pts.push({ x: nx, y: H / 2 });
      });
      var len = 0, seg = [0];
      for (var k = 1; k < pts.length; k++) { len += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); seg.push(len); }
      return { pts: pts, seg: seg, len: len };
    });
    L = { W: W, H: H, src: src, mids: mids, rep: rep, paths: paths, compact: compact };
  }

  function at(path, d) {
    var s = path.seg, i = 1;
    while (i < s.length - 1 && s[i] < d) i++;
    var t = (d - s[i - 1]) / ((s[i] - s[i - 1]) || 1);
    var a = path.pts[i - 1], b = path.pts[i];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function spawn() {
    var pi = Math.floor(Math.random() * L.paths.length);
    packets.push({ p: pi, d: 0, v: 70 + Math.random() * 60, c: Math.random() < 0.55 ? "cyan" : "gold" });
  }

  function draw(dt) {
    var W = L.W, H = L.H;
    ctx.clearRect(0, 0, W, H);
    // pipes
    ctx.lineWidth = 1.5; ctx.strokeStyle = C["line-2"];
    L.paths.forEach(function (p) {
      ctx.beginPath(); ctx.moveTo(p.pts[0].x, p.pts[0].y);
      for (var i = 1; i < p.pts.length; i++) ctx.lineTo(p.pts[i].x, p.pts[i].y);
      ctx.stroke();
    });
    // packets
    for (var i = packets.length - 1; i >= 0; i--) {
      var k = packets[i]; k.d += k.v * dt;
      var path = L.paths[k.p];
      if (k.d >= path.len) { packets.splice(i, 1); rows += 137 + Math.floor(Math.random() * 300); bump(); continue; }
      var pt = at(path, k.d), tail = at(path, Math.max(0, k.d - 18));
      var g = ctx.createLinearGradient(tail.x, tail.y, pt.x, pt.y);
      g.addColorStop(0, "transparent"); g.addColorStop(1, C[k.c]);
      ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
      ctx.fillStyle = C[k.c]; ctx.shadowColor = C[k.c]; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.textBaseline = "middle";
    // sources
    L.src.forEach(function (s) {
      rr(s.x, s.y, s.w, s.h, 6); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(s.x + 11, s.cy, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = "500 " + (L.compact ? 10 : 11) + "px " + C.mono; ctx.fillText(s.name, s.x + 20, s.cy + 0.5);
    });
    // stages
    L.mids.forEach(function (m) {
      rr(m.x, m.y, m.w, m.h, 10); ctx.fillStyle = C["panel-2"]; ctx.fill(); ctx.strokeStyle = C["line-2"]; ctx.stroke();
      ctx.fillStyle = C.ink; ctx.font = "600 13px " + C.mono; ctx.fillText(m.name, m.x + 12, m.y + 18);
      ctx.fillStyle = C.muted; ctx.font = (L.compact ? 9 : 10) + "px " + C.mono; ctx.fillText(m.sub, m.x + 12, m.y + 36);
    });
    // report tile
    var r = L.rep;
    rr(r.x, r.y, r.w, r.h, 12); ctx.fillStyle = C.panel; ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = C.gold; rr(r.x + 12, r.y + 12, 10, 10, 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "600 11px " + C.mono; ctx.fillText("Power BI", r.x + 28, r.y + 17.5);
    ctx.fillStyle = C.muted; ctx.font = "10px " + C.mono; ctx.fillText("rows loaded", r.x + 12, r.y + 40);
    ctx.fillStyle = C.ink; ctx.font = "800 " + (L.compact ? 22 : 28) + "px 'Big Shoulders Display', Impact, sans-serif";
    ctx.fillText(rows.toLocaleString("en-IN"), r.x + 12, r.y + (L.compact ? 60 : 64));
    var bx = r.x + 12, bw = r.w - 24, by = r.y + r.h - 12, bh = r.h - (L.compact ? 88 : 98);
    var n = bars.length, gapb = 5, w = (bw - gapb * (n - 1)) / n;
    bars.forEach(function (v, i) {
      bars[i] += ((targets[i] || v) - v) * Math.min(1, dt * 3);
      var h = Math.max(4, bars[i] * bh);
      ctx.fillStyle = i === n - 1 ? C.gold : C["line-2"];
      rr(bx + i * (w + gapb), by - h, w, h, 3); ctx.fill();
    });
  }
  var targets = bars.slice();
  function bump() {
    targets.shift(); targets.push(0.35 + Math.random() * 0.6);
    bars.shift(); bars.push(0.1);
  }

  var running = true, acc = 0;
  function frame(ts) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016; last = ts;
    acc += dt;
    if (acc > (L.compact ? 0.22 : 0.14)) { acc = 0; spawn(); }
    draw(dt);
    requestAnimationFrame(frame);
  }

  readColors(); layout();
  if (reduce) {
    for (var i = 0; i < 18; i++) { spawn(); packets[i].d = Math.random() * L.paths[packets[i].p].len; }
    rows = 48210; draw(0);
  } else {
    for (var j = 0; j < 10; j++) { spawn(); packets[j].d = Math.random() * L.paths[packets[j].p].len * 0.8; }
    requestAnimationFrame(frame);
  }
  var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); if (reduce) draw(0); }) : null;
  if (ro) ro.observe(cv); else window.addEventListener("resize", layout);
  new MutationObserver(function () { readColors(); if (reduce) draw(0); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  // pause when off screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running && !reduce) { running = true; last = 0; requestAnimationFrame(frame); }
      if (!vis) running = false;
    }).observe(cv);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (reduce) draw(0); });
})();
