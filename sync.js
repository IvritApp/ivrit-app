// =====================================================
// sync.js — АККАУНТ НА СЕРВЕРЕ
//  • Прогресс (серия, заморозки, уроки, очки, медали, герой) хранится на сервере Hirbis
//    и привязан к Telegram-аккаунту. Сменил телефон / перешёл в приложение — всё на месте.
//  • У каждого игрока есть ник (@ник). По нику админ находит игрока.
//  • Режим тестировщика + права админа на сервере → «🛠 Управление игроками».
//  Работает только внутри Telegram (там есть подпись initData). В обычном браузере — всё по-старому, на телефоне.
// =====================================================
(function () {
  const API = "https://89-23-99-107.sslip.io/hapi";
  const NOSYNC = ["testmode", "combo", "nolisten_until", "sync_ver", "sync_hash", "sync_ok", "sync_me", "sync_want"];
  const P = "hirbis_";
  const tgApp = window.Telegram && window.Telegram.WebApp;
  const initData = tgApp && tgApp.initData;
  let me = lsGet("sync_me", null);       // { handle, admin, tg_id }
  let busy = false, again = false, timer = null, online = null;

  function lsGet(k, d) { try { const v = localStorage.getItem(P + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // --- снимок прогресса: все ключи hirbis_*, кроме служебных ---
  function syncKeys() {
    try { return Object.keys(localStorage).filter(k => k.startsWith(P) && !NOSYNC.includes(k.slice(P.length))); } catch (e) { return []; }
  }
  function snapshot() { const o = {}; syncKeys().sort().forEach(k => { o[k.slice(P.length)] = localStorage.getItem(k); }); return o; }
  function hash(o) { const s = JSON.stringify(o); let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h + ":" + s.length; }
  function applyState(state, ver) {
    syncKeys().forEach(k => localStorage.removeItem(k));
    Object.entries(state || {}).forEach(([k, v]) => { if (!NOSYNC.includes(k)) localStorage.setItem(P + k, v); });
    lsSet("sync_ver", ver); lsSet("sync_hash", hash(snapshot()));
  }

  async function api(path, body, keepalive) {
    const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "text/plain" }, keepalive: !!keepalive,
      body: JSON.stringify(Object.assign({ initData }, body)) });
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }

  function gotMe(res) {
    if (res.handle) { me = { handle: res.handle, admin: !!res.admin, tg_id: res.tg_id }; lsSet("sync_me", me); }
    if (res.banned) showBan(res.banned);
  }

  // --- главная функция: сверить прогресс с сервером ---
  async function sync(keepalive) {
    if (!initData || !lsGet("sync_ok", false)) return;
    if (busy) { again = true; return; }
    busy = true;
    try {
      const ver = lsGet("sync_ver", 0), snap = snapshot(), h = hash(snap);
      const changed = ver === 0 || h !== lsGet("sync_hash", "");
      const res = await api("/sync", { ver, state: changed ? snap : null, consent: true }, keepalive);
      online = true; gotMe(res);
      if (res.banned) return;
      const want = lsGet("sync_want", null);                 // ник, выбранный при знакомстве
      if (want) {
        try { const r2 = await api("/handle", { handle: want }); if (!r2.error) gotMe(r2); else if (typeof showToast === "function") showToast(r2.error + " — ник: @" + me.handle); } catch (e) {}
        try { localStorage.removeItem(P + "sync_want"); } catch (e) {}
      }
      if (res.state) {                              // на сервере новее — берём оттуда
        const same = hash(res.state) === h;
        applyState(res.state, res.ver);
        if (!same) { location.reload(); return; }
      } else if (res.ver) { lsSet("sync_ver", res.ver); if (changed) lsSet("sync_hash", h); }
    } catch (e) { online = false; }
    finally { busy = false; if (again) { again = false; schedule(); } }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => sync(), 2500); }

  // Каждое сохранение прогресса → через 2,5 сек отправляем на сервер
  if (typeof store !== "undefined") {
    const orig = store.set.bind(store);
    store.set = (k, v) => { orig(k, v); if (!NOSYNC.includes(k)) schedule(); };
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { clearTimeout(timer); sync(true); }
    else sync();
  });

  // --- согласие на хранение данных (152-ФЗ), один раз ---
  function sheet(id, html, closable) {
    let box = document.getElementById(id);
    if (!box) { box = document.createElement("div"); box.id = id; box.className = "sy-wrap"; document.body.appendChild(box); }
    box.innerHTML = `<div class="set-sheet">${html}</div>`;
    box.classList.add("show");
    if (closable) box.onclick = (e) => { if (e.target === box) box.classList.remove("show"); };
    return box;
  }
  function askConsent() {
    const box = sheet("syConsent", `<div class="set-head"><b>☁️ Сохраняем прогресс</b></div>
      <p class="sy-p">Чтобы твой прогресс не потерялся — при смене телефона и при переходе в будущее приложение Hirbis — мы храним его на нашем сервере в России.</p>
      <p class="sy-p">Что хранится: имя и ник из Telegram, Telegram ID, твой прогресс в уроках, серия и очки. Мы не передаём эти данные третьим лицам.</p>
      <button class="btn blue sy-wide" id="syAgree">Согласен(на), сохранять</button>`);
    box.querySelector("#syAgree").onclick = () => { lsSet("sync_ok", true); box.classList.remove("show"); sync(); };
  }
  function showBan(b) {
    const until = b.until > 4.1e9 ? "навсегда" : "до " + new Date(b.until * 1000).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    const box = sheet("syBan", `<div class="set-head"><b>⛔ Аккаунт заблокирован</b></div>
      <p class="sy-p">Блокировка ${esc(until)}.</p>${b.reason ? `<p class="sy-p">Причина: ${esc(b.reason)}</p>` : ""}`);
    box.classList.add("sy-ban");
  }

  // --- блок «Аккаунт» в настройках ---
  function settingsHTML() {
    if (!initData) return "";
    const tm = typeof testMode === "function" && testMode();
    const status = !lsGet("sync_ok", false) ? "Прогресс пока хранится только на этом телефоне"
      : online === false ? "⚠️ Нет связи с сервером — сохраним, когда появится" : "☁️ Прогресс сохраняется на сервере";
    return `<div class="set-title">Аккаунт</div>
      <div class="set-test" id="syNickRow"><span>Твой ник: <b>${me ? "@" + esc(me.handle) : "…"}</b></span>${me ? `<button class="btn ghost" id="syNickEdit">Изменить</button>` : ""}</div>
      <div class="set-note">${status}${!lsGet("sync_ok", false) ? ` · <a href="#" id="syConsentOpen">включить</a>` : ""}</div>
      ${tm ? (me && me.admin ? `<button class="btn blue sy-wide" id="syAdmin">🛠 Управление игроками</button>`
        : `<div class="set-note">🛠 Управление игроками доступно админам. Твой ID: ${me ? me.tg_id : "—"}</div>`) : ""}`;
  }
  function settingsBind(box) {
    const e = box.querySelector("#syNickEdit");
    if (e) e.onclick = () => {
      const row = box.querySelector("#syNickRow");
      row.innerHTML = `<input id="syNick" value="${esc(me.handle)}" maxlength="32" autocomplete="off" autocapitalize="off"><button class="btn blue" id="syNickSave">Сохранить</button>`;
      const inp = row.querySelector("#syNick"); inp.focus();
      row.querySelector("#syNickSave").onclick = async () => {
        try {
          const res = await api("/handle", { handle: inp.value });
          if (res.error) { showToast(res.error); return; }
          gotMe(res); showToast("Ник сохранён: @" + res.handle); openSettings();
        } catch (er) { showToast("Нет связи с сервером"); }
      };
    };
    const c = box.querySelector("#syConsentOpen"); if (c) c.onclick = (ev) => { ev.preventDefault(); askConsent(); };
    const a = box.querySelector("#syAdmin"); if (a) a.onclick = openAdmin;
  }

  // --- 🛠 Управление игроками (режим тестировщика + права админа) ---
  function openAdmin(handle) {
    const box = sheet("syAdminSheet", `<div class="set-head"><b>🛠 Игроки</b><button class="set-x" id="syAx">✕</button></div>
      <div class="set-test"><input id="syFind" placeholder="ник игрока, например david_k" autocomplete="off" autocapitalize="off" value="${esc(typeof handle === "string" ? handle : "")}"><button class="btn blue" id="syGo">Найти</button></div>
      <div id="syCard"></div>`, true);
    box.querySelector("#syAx").onclick = () => box.classList.remove("show");
    const find = async () => {
      const h = box.querySelector("#syFind").value.trim().replace(/^@/, "");
      if (!h) return;
      box.querySelector("#syCard").innerHTML = `<p class="sy-p">Ищу…</p>`;
      try { const res = await api("/admin/get", { handle: h }); renderCard(box, res); }
      catch (e) { box.querySelector("#syCard").innerHTML = `<p class="sy-p">Нет связи с сервером</p>`; }
    };
    box.querySelector("#syGo").onclick = find;
    box.querySelector("#syFind").onkeydown = (e) => { if (e.key === "Enter") find(); };
    if (typeof handle === "string" && handle) find();
  }
  function renderCard(box, res) {
    const card = box.querySelector("#syCard");
    if (res.error) { card.innerHTML = `<p class="sy-p">${esc(res.error)}</p>`; return; }
    const p = res.player, s = p.streak, now = Date.now() / 1000;
    const dt = t => t ? new Date(t * 1000).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
    const banned = p.banned_until > now;
    const prof = p.profile || {};
    card.innerHTML = `<div class="sy-card">
      <div class="sy-h">@${esc(p.handle)}${p.admin ? " · админ" : ""}</div>
      <div class="sy-grid">
        <span>В игре</span><b>${esc(prof.name || "—")} ${prof.gender === "f" ? "♀" : prof.gender === "m" ? "♂" : ""}</b>
        <span>Telegram</span><b>${esc(p.name || "")} ${p.tg_username ? "@" + esc(p.tg_username) : ""}</b>
        <span>ID</span><b>${p.tg_id}</b>
        <span>С нами с</span><b>${dt(p.created)}</b>
        <span>Был(а)</span><b>${dt(p.last_seen)}</b>
        <span>Уроков</span><b>${p.done} (⭐ ${p.perfect})</b>
        <span>Медали</span><b>${Object.values(p.medals || {}).join(" ") || "—"}</b>
        <span>Очки</span><b>${p.points_total} (сегодня ${p.points_today})</b>
        <span>Статус</span><b>${banned ? "⛔ заблокирован " + (p.banned_until > 4.1e9 ? "навсегда" : "до " + dt(p.banned_until)) + (p.ban_reason ? " — " + esc(p.ban_reason) : "") : "✅ активен"}</b>
      </div>
      <div class="set-title">Изменить</div>
      <label class="sy-f"><span>🔥 Серия, дней</span><input type="number" min="0" id="syCount" value="${s.count}"></label>
      <label class="sy-f"><span>🏆 Лучшая серия</span><input type="number" min="0" id="syBest" value="${s.best}"></label>
      <label class="sy-f"><span>❄️ Заморозки</span><input type="number" min="0" id="syFr" value="${s.freezes}"></label>
      <label class="sy-f"><span>➕ Добавить очков</span><input type="number" id="syPts" value="0"></label>
      <button class="btn blue sy-wide" id="sySave">Сохранить</button>
      <div class="set-title">Блокировка</div>
      ${banned ? `<button class="btn ghost sy-wide" id="syUnban">Разблокировать</button>`
        : `<div class="set-seg" id="syDays"><button data-d="1">1 день</button><button data-d="7" class="on">7 дней</button><button data-d="30">30 дней</button><button data-d="0">Навсегда</button></div>
        <div class="set-test"><input id="syReason" placeholder="Причина" maxlength="200"><button class="btn ghost" id="syBanGo">⛔ Заблок.</button></div>`}
      <div class="set-title">Опасно</div>
      <button class="btn ghost sy-wide" id="syReset">Стереть прогресс игрока</button>
    </div>`;
    const set = async (body, okText) => {
      try { const r = await api("/admin/set", Object.assign({ handle: p.handle }, body)); renderCard(box, r); if (!r.error) showToast(okText); }
      catch (e) { showToast("Нет связи с сервером"); }
    };
    card.querySelector("#sySave").onclick = () => {
      const n = id => card.querySelector(id).value === "" ? null : +card.querySelector(id).value;
      const body = { streak: {} };
      if (n("#syCount") !== s.count) body.streak.count = n("#syCount");
      if (n("#syBest") !== s.best) body.streak.best = n("#syBest");
      if (n("#syFr") !== s.freezes) body.streak.freezes = n("#syFr");
      if (n("#syPts")) body.addPoints = n("#syPts");
      if (!Object.keys(body.streak).length) delete body.streak;
      if (Object.keys(body).length === 0) { showToast("Ничего не изменено"); return; }
      set(body, "Сохранено ✓ Игрок увидит при следующем открытии");
    };
    const days = card.querySelector("#syDays");
    if (days) days.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; days.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); };
    const bg = card.querySelector("#syBanGo");
    if (bg) bg.onclick = () => set({ ban: { days: +days.querySelector(".on").dataset.d, reason: card.querySelector("#syReason").value } }, "Игрок заблокирован");
    const ub = card.querySelector("#syUnban"); if (ub) ub.onclick = () => set({ ban: null }, "Игрок разблокирован");
    const rs = card.querySelector("#syReset");
    rs.onclick = () => {
      if (!rs.classList.contains("confirm")) { rs.classList.add("confirm"); rs.textContent = "Точно стереть? Нажми ещё раз"; return; }
      set({ resetProgress: true }, "Прогресс игрока стёрт");
    };
  }

  // --- «Начать сначала»: стираем и на сервере ---
  async function reset() {
    if (!initData || !lsGet("sync_ok", false)) return;
    try { const r = await api("/reset", {}); return r.ver; } catch (e) { return null; }
  }

  // --- для знакомства: проверить ник и запомнить выбор (согласие даётся кнопкой «Дальше») ---
  async function checkHandle(h) {
    try { return await api("/check", { handle: h }); } catch (e) { return { ok: true, offline: true }; }
  }
  function chooseHandle(h) { if (h) lsSet("sync_want", String(h).replace(/^@/, "").toLowerCase()); lsSet("sync_ok", true); sync(); }

  window.hirbisSync = { sync, reset, settingsHTML, settingsBind, openAdmin, checkHandle, chooseHandle, active: !!initData, me: () => me };
  // окно согласия — только тем, кто уже играл (новички соглашаются на шаге «ник»)
  if (initData) {
    if (lsGet("sync_ok", false)) sync();
    else setTimeout(() => { if (typeof profile !== "undefined" && profile && !lsGet("sync_ok", false)) askConsent(); }, 800);
  }
})();
