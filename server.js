"use strict";
/*
 * Moth & Lantern — studio website server.
 * Serves the site from ./public and forwards consultation requests to a Telegram bot.
 * No dependencies: only built-in Node.js modules (Node 18+).
 *
 * Environment variables:
 *   BOT_TOKEN  — token from @BotFather, e.g. 123456789:AA...
 *   CHAT_ID    — your chat id (where the bot sends requests)
 *   PORT       — port to listen on (default 3000)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = (process.env.BOT_TOKEN || "").trim();
const CHAT_ID = (process.env.CHAT_ID || "").trim();
const TG_API = process.env.TELEGRAM_API || "https://api.telegram.org";
const PUBLIC = path.join(__dirname, "public");

const TYPES = ["PC or console game", "Mobile game", "Browser / multiplayer game", "Prototype or game jam", "Game art & UI", "Other"];
const BUDGETS = ["", "Under $1,000", "$1,000 – $5,000", "$5,000 – $15,000", "$15,000+"];

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf",
};

/* ---------- helpers ---------- */
function send(res, code, body, headers = {}) {
  res.writeHead(code, { "X-Content-Type-Options": "nosniff", ...headers });
  res.end(body);
}
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
const escapeHtml = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const clean = (s, max) => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (fwd ? String(fwd).split(",")[0] : req.socket.remoteAddress || "").trim();
}

/* ---------- simple rate limit: 5 requests per 10 minutes per IP ---------- */
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now);
  hits.set(ip, list);
  return list.length > 5;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) if (list.every(t => now - t > 10 * 60 * 1000)) hits.delete(ip);
}, 60 * 1000).unref();

/* ---------- static files ---------- */
function serveStatic(req, res) {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { return send(res, 400, "Bad request"); }
  if (urlPath.endsWith("/")) urlPath += "index.html";
  const file = path.normalize(path.join(PUBLIC, urlPath));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, "Forbidden");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // unknown path → home page
      return fs.readFile(path.join(PUBLIC, "index.html"), (e, buf) => e ? send(res, 404, "Not found") : send(res, 404, buf, { "Content-Type": MIME[".html"] }));
    }
    const ext = path.extname(file).toLowerCase();
    const cache = ext === ".html" ? "no-cache" : "public, max-age=86400";
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Length": st.size, "Cache-Control": cache, "X-Content-Type-Options": "nosniff" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- POST /api/contact ---------- */
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => {
      size += c.length;
      if (size > limit) { reject(new Error("too_large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleContact(req, res) {
  const ip = clientIp(req);
  if (limited(ip)) return json(res, 429, { ok: false, code: "rate", error: "Too many requests. Please try again in a few minutes." });

  let data;
  try { data = JSON.parse(await readBody(req, 10 * 1024)); }
  catch { return json(res, 400, { ok: false, code: "invalid", error: "Could not read the form. Please try again." }); }
  if (!data || typeof data !== "object") return json(res, 400, { ok: false, code: "invalid", error: "Could not read the form. Please try again." });

  // honeypot: real visitors never fill this hidden field
  if (clean(data.website, 200)) return json(res, 200, { ok: true });

  const lead = {
    name: clean(data.name, 80),
    contact: clean(data.contact, 120),
    type: clean(data.type, 60),
    budget: clean(data.budget, 40),
    message: clean(data.message, 2000),
    estimate: clean(data.estimate, 300),
    lang: data.lang === "ru" ? "RU" : "EN",
  };
  if (lead.name.length < 2) return json(res, 400, { ok: false, code: "invalid", error: "Please enter your name." });
  if (lead.contact.length < 3) return json(res, 400, { ok: false, code: "invalid", error: "Please enter an email or Telegram username." });
  if (!TYPES.includes(lead.type)) return json(res, 400, { ok: false, code: "invalid", error: "Please choose a project type." });
  if (!BUDGETS.includes(lead.budget)) lead.budget = "";
  if (lead.message.length < 10) return json(res, 400, { ok: false, code: "invalid", error: "Please tell us a bit more about the project." });

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("[contact] BOT_TOKEN or CHAT_ID is not set — request not delivered:", lead);
    return json(res, 503, { ok: false, code: "notConfigured", error: "The form is not connected yet. Please contact us on GitHub." });
  }

  const text = [
    "<b>🕯 New consultation request</b>",
    "",
    "<b>Name:</b> " + escapeHtml(lead.name),
    "<b>Contact:</b> " + escapeHtml(lead.contact),
    "<b>Project:</b> " + escapeHtml(lead.type),
    "<b>Budget:</b> " + escapeHtml(lead.budget || "not specified"),
    "<b>Site language:</b> " + lead.lang,
    ...(lead.estimate ? ["", "<b>📐 Estimate:</b> " + escapeHtml(lead.estimate)] : []),
    "",
    "<b>Message:</b>",
    escapeHtml(lead.message),
    "",
    "<i>" + new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC</i>",
  ].join("\n");

  try {
    const r = await fetch(`${TG_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
         signal: AbortSignal.timeout(30000),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out.ok) {
      console.error("[contact] Telegram error:", r.status, out.description || "");
      return json(res, 502, { ok: false, code: "delivery", error: "We could not deliver your request. Please try again later." });
    }
    console.log("[contact] request delivered from", lead.name);
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("[contact] Telegram unreachable:", e.message);
    return json(res, 502, { ok: false, code: "delivery", error: "We could not deliver your request. Please try again later." });
  }
}

/* ---------- router ---------- */
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  if (url === "/api/contact") {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Use POST" });
    return handleContact(req, res).catch(e => { console.error(e); json(res, 500, { ok: false, error: "Server error" }); });
  }
  if (url === "/health") return send(res, 200, "ok", { "Content-Type": "text/plain" });
  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed");
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Moth & Lantern site: http://localhost:${PORT}`);
  if (!BOT_TOKEN || !CHAT_ID) console.log("⚠  BOT_TOKEN / CHAT_ID not set — the contact form will not reach Telegram.");
});