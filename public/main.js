/* Moth & Lantern — interactions:
   language switch, lantern hero, menu, gallery + lightbox, project estimate, consultation form */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  $("#year").textContent = new Date().getFullYear();

  /* =====================================================================
     1. LANGUAGE (EN / RU)
     ===================================================================== */
  const RU = (window.I18N && window.I18N.ru) || {};
  const MSG = (window.I18N && window.I18N.msg) || { en: {}, ru: {} };
  let lang = document.documentElement.lang === "ru" ? "ru" : "en";
  const t = key => (MSG[lang] && MSG[lang][key]) || MSG.en[key] || "";
  const onLangChange = [];

  function applyLang(next) {
    lang = next === "ru" ? "ru" : "en";
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach(el => {
      if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
      const key = el.dataset.i18n;
      el.innerHTML = lang === "ru" && RU[key] !== undefined ? RU[key] : el.dataset.en;
    });
    $$("[data-i18n-ph]").forEach(el => {
      if (el.dataset.enPh === undefined) el.dataset.enPh = el.placeholder;
      const key = el.dataset.i18nPh;
      el.placeholder = lang === "ru" && RU[key] !== undefined ? RU[key] : el.dataset.enPh;
    });
    document.title = t("title");
    const md = $('meta[name="description"]');
    if (md) md.content = t("desc");
    $$(".lang__btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
    LS.set("ml.lang", lang);
    onLangChange.forEach(fn => fn());
  }
  $$(".lang__btn").forEach(b => b.addEventListener("click", () => applyLang(b.dataset.lang)));

  /* =====================================================================
     2. HEADER & MOBILE MENU
     ===================================================================== */
  const top = $(".top"), burger = $("#burger"), nav = $("#nav");
  const onScroll = () => top.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  const setMenu = open => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? t("menuClose") : t("menuOpen"));
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
  onLangChange.push(() => setMenu(nav.classList.contains("is-open")));

  /* =====================================================================
     3. LANTERN — darkness over the hero art, a light that follows the
        cursor or finger, and moths circling it
     ===================================================================== */
  (function lantern() {
    const hero = $("#hero"), canvas = $("#lantern"), hint = $("#lantern-hint"), hintText = $("#lantern-hint-text");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    const light = { x: 0, y: 0, tx: 0, ty: 0 };
    let lastInput = -1e9, running = false, visible = true, raf = 0, t0 = performance.now();
    const moths = [];

    const restX = () => W * 0.68, restY = () => H * 0.44;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!light.x) { light.x = light.tx = restX(); light.y = light.ty = restY(); }
      if (!moths.length) {
        const n = W < 600 ? 5 : 8;
        for (let i = 0; i < n; i++) moths.push({
          x: light.x + (Math.random() - .5) * 300, y: light.y + (Math.random() - .5) * 200,
          vx: 0, vy: 0, ph: Math.random() * 6.28, s: 0.7 + Math.random() * 0.6, orbit: (Math.random() < .5 ? -1 : 1) * (0.6 + Math.random() * 0.8),
          rr: 50 + Math.random() * 150, // own distance from the flame
        });
      }
      if (!running) draw(performance.now());
    }

    function setTarget(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      light.tx = clientX - r.left; light.ty = clientY - r.top;
      lastInput = performance.now();
      hint.classList.add("is-used");
    }
    hero.addEventListener("pointermove", e => setTarget(e.clientX, e.clientY));
    hero.addEventListener("pointerdown", e => setTarget(e.clientX, e.clientY));

    function draw(now) {
      const time = (now - t0) / 1000;
      // idle: the light drifts slowly around the hotel
      if (now - lastInput > 3500) {
        light.tx = restX() + Math.sin(time * 0.35) * W * 0.12;
        light.ty = restY() + Math.sin(time * 0.53) * H * 0.08;
      }
      const ease = reduceMotion ? 1 : 0.09;
      light.x += (light.tx - light.x) * ease;
      light.y += (light.ty - light.y) * ease;

      const flick = reduceMotion ? 1 : 1 + Math.sin(time * 9.1) * 0.025 + Math.sin(time * 23.7) * 0.015;
      const R = Math.max(150, Math.min(340, Math.max(W, H) * 0.22)) * flick;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(5,8,7,0.84)";
      ctx.fillRect(0, 0, W, H);

      // cut the light out of the darkness
      ctx.globalCompositeOperation = "destination-out";
      let g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, R);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.45, "rgba(0,0,0,0.85)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(light.x, light.y, R, 0, Math.PI * 2); ctx.fill();

      // warm lamp glow
      ctx.globalCompositeOperation = "lighter";
      g = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, R * 0.75);
      g.addColorStop(0, "rgba(255,190,105,0.22)");
      g.addColorStop(1, "rgba(255,170,80,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(light.x, light.y, R * 0.75, 0, Math.PI * 2); ctx.fill();

      // moths
      ctx.globalCompositeOperation = "source-over";
      for (const m of moths) {
        if (!reduceMotion) {
          const dx = light.x - m.x, dy = light.y - m.y, d = Math.hypot(dx, dy) || 1;
          // each moth keeps its own distance from the flame and circles it
          const radial = Math.max(-1.2, Math.min(1.2, (d - m.rr) * 0.012));
          m.vx += (dx / d) * radial + (-dy / d) * 0.16 * m.orbit;
          m.vy += (dy / d) * radial + (dx / d) * 0.16 * m.orbit;
          for (const o of moths) { // keep apart from each other
            if (o === m) continue;
            const ox = m.x - o.x, oy = m.y - o.y, od = Math.hypot(ox, oy);
            if (od > 0 && od < 28) { m.vx += (ox / od) * 0.35; m.vy += (oy / od) * 0.35; }
          }
          m.vx += (Math.random() - 0.5) * 1.1; m.vy += (Math.random() - 0.5) * 1.1;
          if (Math.random() < 0.004) m.rr = 50 + Math.random() * 150; // sometimes change course
          const sp = Math.hypot(m.vx, m.vy), max = 3.2 * m.s + 0.6;
          if (sp > max) { m.vx *= max / sp; m.vy *= max / sp; }
          m.vx *= 0.96; m.vy *= 0.96;
          m.x += m.vx; m.y += m.vy;
          m.ph += 0.55 + sp * 0.08;
        }
        const d = Math.hypot(light.x - m.x, light.y - m.y);
        const lit = Math.max(0.18, 1 - d / (R * 1.6));
        const flap = Math.abs(Math.sin(m.ph));
        const size = 5.5 * m.s;
        const ang = Math.atan2(m.vy, m.vx) + Math.PI / 2;
        ctx.save();
        ctx.translate(m.x, m.y); ctx.rotate(ang);
        ctx.fillStyle = `rgba(236,222,190,${0.85 * lit})`;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(side * size * 0.9 * (0.35 + flap * 0.65), -size * 0.1, size * (0.35 + flap * 0.65), size * 0.75, side * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(120,100,70,${0.95 * lit})`;
        ctx.beginPath(); ctx.ellipse(0, 0, size * 0.22, size * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    function loop(now) {
      draw(now);
      raf = running ? requestAnimationFrame(loop) : 0;
    }
    function updateRunning() {
      const should = visible && !document.hidden && !reduceMotion;
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; updateRunning(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", updateRunning);
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener("resize", resize);
    resize();
    updateRunning();
    if (reduceMotion) hero.addEventListener("pointermove", () => draw(performance.now()));

    const setHint = () => { hintText.textContent = coarse ? t("hintTouch") : t("hintMouse"); };
    onLangChange.push(setHint);
    setHint();
  })();

  /* =====================================================================
     4. REVEAL ON SCROLL (only blocks below the first screen)
     ===================================================================== */
  if ("IntersectionObserver" in window && !reduceMotion) {
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    $$(".sechead, .file, .pillars li, .g, .card-id, .cv, .steps li, .calc, .form, .contact__info").forEach(el => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("reveal"); io.observe(el); }
    });
  }

  /* =====================================================================
     5. GALLERY FILTER + LIGHTBOX
     ===================================================================== */
  const chips = $$(".chip"), items = $$("#gallery-grid .g");
  function filter(cat) {
    chips.forEach(c => { const on = c.dataset.filter === cat; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on)); });
    items.forEach(it => it.classList.toggle("is-hidden", cat !== "all" && it.dataset.cat !== cat));
  }
  chips.forEach(c => c.addEventListener("click", () => filter(c.dataset.filter)));
  $$("[data-filter-link]").forEach(a => a.addEventListener("click", () => filter(a.dataset.filterLink)));

  const lb = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
  let list = [], pos = 0, lastFocus = null;
  function show(i) {
    pos = (i + list.length) % list.length;
    const b = list[pos], cap = $(".g__cap", b);
    lbImg.src = b.dataset.full;
    lbImg.alt = $("img", b).alt;
    lbCap.textContent = cap ? $("b", cap).textContent + " — " + $("span", cap).textContent : "";
  }
  function openLb(btn) {
    list = items.filter(it => !it.classList.contains("is-hidden")).map(it => $(".g__btn", it));
    lastFocus = btn;
    show(list.indexOf(btn));
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    $("#lb-close").focus();
  }
  function closeLb() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$(".g__btn").forEach(b => b.addEventListener("click", () => openLb(b)));
  $("#lb-close").addEventListener("click", closeLb);
  $("#lb-prev").addEventListener("click", () => show(pos - 1));
  $("#lb-next").addEventListener("click", () => show(pos + 1));
  lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") show(pos - 1);
    if (e.key === "ArrowRight") show(pos + 1);
  });
  let touchX = null;
  lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* =====================================================================
     6. PROJECT ESTIMATE
     Numbers are a starting point — change them to your own prices.
     w = weeks [min, max], c = cost in USD [min, max]
     ===================================================================== */
  const BASE = {
    browser: { w: [3, 5], c: [800, 1600] },
    mobile: { w: [6, 10], c: [3000, 6000] },
    pc: { w: [8, 14], c: [5000, 10000] },
    proto: { w: [2, 3], c: [400, 900] },
  };
  const SIZE = { s: 1, m: 1.8, l: 3 };
  const FEAT = {
    multi: { w: [2, 4], c: [1500, 3000] },
    story: { w: [1, 3], c: [600, 1500] },
    art: { w: [2, 4], c: [1000, 2500] },
    sound: { w: [1, 1], c: [300, 800] },
    saves: { w: [1, 2], c: [400, 900] },
    l10n: { w: [1, 1], c: [300, 700] },
  };
  const FORM_TYPE = { browser: "Browser / multiplayer game", mobile: "Mobile game", pc: "PC or console game", proto: "Prototype or game jam" };
  const MAX_COST = (BASE.pc.c[1] + Object.values(FEAT).reduce((s, f) => s + f.c[1], 0)) * SIZE.l;

  function readCalc() {
    return {
      type: ($('input[name="c-type"]:checked') || {}).value || "browser",
      size: ($('input[name="c-size"]:checked') || {}).value || "m",
      feats: $$('input[name="c-feat"]:checked').map(i => i.value),
    };
  }
  function estimate(sel) {
    const b = BASE[sel.type], k = SIZE[sel.size];
    let w = [...b.w], c = [...b.c];
    sel.feats.forEach(f => { w[0] += FEAT[f].w[0]; w[1] += FEAT[f].w[1]; c[0] += FEAT[f].c[0]; c[1] += FEAT[f].c[1]; });
    w = w.map(x => Math.max(1, Math.round(x * k)));
    c = c.map(x => Math.round((x * k) / 100) * 100);
    return { w, c };
  }
  const money = n => "$" + new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "en-US").format(n);
  function weeksText(w) {
    if (lang !== "ru") return t("weeks").replace("{a}", w[0]).replace("{b}", w[1]);
    const n = w[1] % 100, d = n % 10;
    const word = n > 10 && n < 20 ? "недель" : d === 1 ? "неделя" : d >= 2 && d <= 4 ? "недели" : "недель";
    return `${w[0]}–${w[1]} ${word}`;
  }
  function summary(sel, e) {
    const M = MSG[lang] || MSG.en;
    const feats = sel.feats.map(f => M.feats[f]).join(", ");
    return `${M.types[sel.type]}, ${M.sizes[sel.size]}${feats ? " + " + feats : ""} → ${weeksText(e.w)}, ${money(e.c[0])} – ${money(e.c[1])}`;
  }
  const weeksEl = $("#calc-weeks"), costEl = $("#calc-cost"), bar = $("#calc-bar");
  function renderCalc() {
    const e = estimate(readCalc());
    weeksEl.textContent = weeksText(e.w);
    costEl.textContent = `${money(e.c[0])} – ${money(e.c[1])}`;
    bar.style.width = Math.max(6, Math.min(100, ((e.c[0] + e.c[1]) / 2 / MAX_COST) * 100 * 1.6)) + "%";
  }
  $("#calc").addEventListener("change", renderCalc);
  onLangChange.push(renderCalc);

  // attach the estimate to the request form
  let attached = null; // the calculator selection that was sent to the form
  const attachedBox = $("#attached"), attachedText = $("#attached-text");
  function renderAttached() {
    attachedBox.hidden = !attached;
    if (attached) attachedText.textContent = summary(attached, estimate(attached));
  }
  onLangChange.push(renderAttached);
  $("#calc-send").addEventListener("click", () => {
    attached = readCalc();
    const e = estimate(attached), mid = (e.c[0] + e.c[1]) / 2;
    const form = $("#lead-form");
    form.elements.type.value = FORM_TYPE[attached.type];
    form.elements.budget.value = mid < 1000 ? "Under $1,000" : mid < 5000 ? "$1,000 – $5,000" : mid < 15000 ? "$5,000 – $15,000" : "$15,000+";
    renderAttached();
    $("#contact").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), reduceMotion ? 0 : 600);
  });
  $("#attached-x").addEventListener("click", () => { attached = null; renderAttached(); });

  /* =====================================================================
     7. CONSULTATION FORM → /api/contact → Telegram
     ===================================================================== */
  const form = $("#lead-form"), status = $("#f-status"), submit = $("#f-submit");
  const rules = {
    name: v => v.trim().length >= 2 || t("eName"),
    contact: v => /^@[\w]{4,32}$/.test(v.trim()) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || /^\+?[\d\s()-]{7,20}$/.test(v.trim()) || t("eContact"),
    type: v => !!v || t("eType"),
    message: v => v.trim().length >= 10 || t("eMessage"),
    consent: (v, el) => el.checked || t("eConsent"),
  };
  function check(name) {
    const el = form.elements[name];
    const res = rules[name](el.value, el);
    const err = $(`.field__err[data-for="${name}"]`, form);
    const bad = res !== true;
    err.textContent = bad ? res : "";
    const field = el.closest(".field");
    if (field) field.classList.toggle("is-bad", bad);
    el.setAttribute("aria-invalid", String(bad));
    return !bad;
  }
  Object.keys(rules).forEach(n => {
    const el = form.elements[n];
    el.addEventListener("blur", () => { if (el.value || el.type === "checkbox") check(n); });
    el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") check(n); });
    el.addEventListener("change", () => { if (el.getAttribute("aria-invalid") === "true") check(n); });
  });
  // re-translate visible errors and the button when the language changes
  onLangChange.push(() => {
    Object.keys(rules).forEach(n => { if (form.elements[n].getAttribute("aria-invalid") === "true") check(n); });
    if (!form.classList.contains("is-sent") && !submit.disabled) submit.textContent = t("send");
    if (form.classList.contains("is-sent")) submit.textContent = t("sent");
  });

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = "form__status" + (kind ? " is-" + kind : "");
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const ok = Object.keys(rules).map(check).every(Boolean);
    if (!ok) { const first = $("[aria-invalid='true']", form); if (first) first.focus(); return; }
    const data = {
      name: form.elements.name.value.trim(),
      contact: form.elements.contact.value.trim(),
      type: form.elements.type.value,
      budget: form.elements.budget.value,
      message: form.elements.message.value.trim(),
      estimate: attached ? summary(attached, estimate(attached)) : "",
      lang,
      website: form.elements.website.value, // honeypot
    };
    submit.disabled = true;
    submit.textContent = t("sending");
    setStatus("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) {
        const ruErr = lang === "ru" && MSG.ru.errors && MSG.ru.errors[out.code];
        throw new Error(ruErr || out.error || t("failed"));
      }
      form.classList.add("is-sent");
      submit.textContent = t("sent");
      setStatus(t("thanks").replace("{name}", data.name), "ok");
    } catch (err) {
      submit.disabled = false;
      submit.textContent = t("send");
      setStatus(err.message === "Failed to fetch" ? t("offline") : err.message, "err");
    }
  });

  /* ---------- start ---------- */
  applyLang(lang);
})();