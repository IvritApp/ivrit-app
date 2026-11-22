// =====================================================
// ОШИБКИ И СОБЫТИЯ (22.11, бета) → сервер /hapi/log → админка «🐞 Ошибки»
// Подключается ПЕРВЫМ скриптом, чтобы ловить ошибки даже при загрузке. Ни от чего не зависит.
// • Ошибки JS (window.onerror, unhandledrejection): текст, файл:строка, версия ?v, платформа, экран, где был игрок.
//   Одинаковые за сессию не повторяются, не больше 10 за сессию.
// • События: track("lesson_start", "a1-1-3.p2") — начал/закончил/бросил урок или квест и т. п. (список — EVENTS в players_api.py).
// Отправка пачкой раз в 20 с и при сворачивании; только в Telegram и только после согласия (hirbis_sync_ok).
// Ничего не хранит в localStorage (чтобы не попасть в синхронизацию прогресса).
// =====================================================
(function () {
  const errs = [], evs = [], seen = {};
  let sentErr = 0;
  const ver = () => { const s = document.querySelector('script[src*="app.js?v="]'); const m = s && s.src.match(/v=([\w]+)/); return m ? m[1] : "?"; };
  const where = () => { try { const s = [...document.querySelectorAll("body > section")].find(x => !x.hidden); return s ? s.id : ""; } catch (e) { return ""; } };
  function info() {
    const tg = window.Telegram && Telegram.WebApp;
    return `v=${ver()} · ${tg ? (tg.platform || "") + " " + (tg.version || "") : "browser"} · ${innerWidth}×${innerHeight} · ${where()} · ${navigator.userAgent.slice(0, 160)}`;
  }
  // шум, который ничего не говорит: чужие скрипты без подробностей, ResizeObserver
  const NOISE = /^(Script error\.?|ResizeObserver loop)/i;
  function addErr(msg, src, line, col, stack) {
    msg = String(msg || "").slice(0, 300);
    if (!msg || NOISE.test(msg)) return;
    src = String(src || "").replace(location.origin, "").replace(/\?v=\w+/, "") + (line ? ":" + line + (col ? ":" + col : "") : "");
    const key = msg + "|" + src;
    if (seen[key] || sentErr >= 10) return;
    seen[key] = 1; sentErr++;
    errs.push({ msg, src, info: info() + (stack ? " · " + String(stack).split("\n").slice(0, 4).join(" ← ").slice(0, 300) : "") });
  }
  window.addEventListener("error", (e) => {
    if (e && e.target && e.target !== window && (e.target.src || e.target.href)) return;   // не загрузилась картинка/скрипт — не ошибка кода
    addErr(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  }, true);
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && e.reason;
    if (r && (r.name === "AbortError" || /Failed to fetch|NetworkError|Load failed/i.test(String(r.message || r)))) return;   // нет сети — не ошибка
    addErr("Promise: " + (r && r.message ? r.message : String(r)), "", 0, 0, r && r.stack);
  });

  // события: x — короткая метка (урок, часть, квест): только a–z, 0–9, точка, дефис
  window.track = function (name, x) {
    try {
      x = String(x == null ? "" : x).toLowerCase().replace(/[^a-z0-9.\-]/g, "").slice(0, 24);
      if (evs.length < 60) evs.push({ name: String(name), x });
    } catch (e) {}
  };

  function canSend() {
    try { return !!(window.hirbisSync && hirbisSync.active && localStorage.getItem("hirbis_sync_ok") === "true"); } catch (e) { return false; }
  }
  function flush(keepalive) {
    if ((!errs.length && !evs.length) || !canSend()) return;
    const body = { errors: errs.splice(0, 10), events: evs.splice(0, 40) };
    try { hirbisSync.api("/log", body, keepalive).catch(() => {}); } catch (e) {}
  }
  setInterval(() => flush(false), 20000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(true); });
  window.addEventListener("load", () => { track("app_open"); setTimeout(() => flush(false), 5000); });
  window.HirbisTelemetry = { flush, errors: errs, events: evs };
})();
