/* Moth & Lantern — interactions: menu, gallery filter + lightbox, consultation form */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  $("#year").textContent = new Date().getFullYear();

  /* ---------- header & mobile menu ---------- */
  const top = $(".top"), burger = $("#burger"), nav = $("#nav");
  const onScroll = () => top.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  const setMenu = open => {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });

  /* ---------- reveal on scroll (only for blocks below the first screen) ---------- */
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js");
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    $$(".sechead, .file, .pillars li, .g, .card-id, .cv, .steps li, .form, .contact__info").forEach(el => {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add("reveal"); io.observe(el); }
    });
  }

  /* ---------- gallery filter ---------- */
  const chips = $$(".chip"), items = $$("#gallery-grid .g");
  function filter(cat) {
    chips.forEach(c => { const on = c.dataset.filter === cat; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", String(on)); });
    items.forEach(it => it.classList.toggle("is-hidden", cat !== "all" && it.dataset.cat !== cat));
  }
  chips.forEach(c => c.addEventListener("click", () => filter(c.dataset.filter)));
  $$("[data-filter-link]").forEach(a => a.addEventListener("click", () => filter(a.dataset.filterLink)));

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
  let list = [], pos = 0, lastFocus = null;
  function show(i) {
    pos = (i + list.length) % list.length;
    const b = list[pos];
    lbImg.src = b.dataset.full;
    lbImg.alt = $("img", b).alt;
    lbCap.textContent = b.dataset.caption || "";
  }
  function open(btn) {
    list = items.filter(it => !it.classList.contains("is-hidden")).map(it => $(".g__btn", it));
    lastFocus = btn;
    show(list.indexOf(btn));
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    $("#lb-close").focus();
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$(".g__btn").forEach(b => b.addEventListener("click", () => open(b)));
  $("#lb-close").addEventListener("click", close);
  $("#lb-prev").addEventListener("click", () => show(pos - 1));
  $("#lb-next").addEventListener("click", () => show(pos + 1));
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(pos - 1);
    if (e.key === "ArrowRight") show(pos + 1);
  });
  let touchX = null; // swipe on phones
  lb.addEventListener("touchstart", e => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- consultation form → /api/contact → Telegram ---------- */
  const form = $("#lead-form"), status = $("#f-status"), submit = $("#f-submit");
  const rules = {
    name: v => v.trim().length >= 2 || "Please enter your name.",
    contact: v => /^@[\w]{4,32}$/.test(v.trim()) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || /^\+?[\d\s()-]{7,20}$/.test(v.trim()) || "Enter an email, a Telegram @username or a phone number.",
    type: v => !!v || "Choose a project type.",
    message: v => v.trim().length >= 10 || "Tell us a bit more (at least 10 characters).",
    consent: (v, el) => el.checked || "Please confirm so we can reply to you.",
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
      website: form.elements.website.value, // honeypot
    };
    submit.disabled = true;
    submit.textContent = "Sending…";
    setStatus("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok) throw new Error(out.error || "Something went wrong. Please try again.");
      form.classList.add("is-sent");
      submit.textContent = "Request sent";
      setStatus("Thank you, " + data.name + "! We have your request and will reply within one working day.", "ok");
    } catch (err) {
      submit.disabled = false;
      submit.textContent = "Send request";
      setStatus(err.message === "Failed to fetch" ? "No connection to the server. Check your internet and try again." : err.message, "err");
    }
  });
})();
