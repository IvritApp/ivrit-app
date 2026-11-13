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
  const NOSYNC = ["testmode", "combo", "nolisten_until", "sync_ver", "sync_hash", "sync_ok", "sync_me", "sync_want", "adminmode", "allru"];
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

  // сессия админа (после входа по паролю), живёт 12 часов
  const admSess = () => { const a = lsGet("adminmode", null); return a && a.t && a.until * 1000 > Date.now() ? a.t : null; };
  async function api(path, body, keepalive) {
    const extra = path.startsWith("/admin/") ? { session: admSess() } : {};
    const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "text/plain" }, keepalive: !!keepalive,
      body: JSON.stringify(Object.assign({ initData }, extra, body)) });
    if (!r.ok) throw new Error("http " + r.status);
    const res = await r.json();
    if (res && res.error === "need_pin") {                  // сессия кончилась — просим пароль заново
      lsSet("adminmode", null);
      const sh = document.getElementById("syAdminSheet"); if (sh) sh.classList.remove("show");
      if (typeof showToast === "function") showToast("🔒 Введи пароль админа заново (⚙️)");
      throw new Error("need_pin");
    }
    return res;
  }

  function gotMe(res) {
    if (res.handle) { me = { handle: res.handle, nicks: res.nicks || [res.handle], nick_limit: res.nick_limit == null ? 3 : res.nick_limit, admin: !!res.admin, pin_set: !!res.pin_set, tg_id: res.tg_id }; lsSet("sync_me", me); }
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

  // --- блок «Аккаунт» в настройках: ники; «Режим админа» — только для админов ---
  const adminMode = () => !!(me && me.admin && admSess());
  function settingsHTML() {
    if (!initData) return "";
    const ok = lsGet("sync_ok", false);
    const status = !ok ? "Прогресс пока хранится только на этом телефоне"
      : online === false ? "⚠️ Нет связи с сервером — сохраним, когда появится" : "☁️ Прогресс сохраняется на сервере";
    const nicks = (me && me.nicks) || (me ? [me.handle] : []);
    const lim = me ? me.nick_limit : 3, unl = lim === -1;
    const canAdd = me && (unl || nicks.length < lim);
    return `<div class="set-title">Аккаунт</div>
      ${me ? `<div class="sy-nicks">${nicks.map(n => `<span class="sy-chip ${n === me.handle ? "main" : ""}" data-n="${esc(n)}">@${esc(n)}${n === me.handle ? " ⭐" : ""}</span>`).join("")}</div>
      <div class="set-note">⭐ — основной ник, его видят друзья. Ников: ${nicks.length} из ${unl ? "∞" : lim}. Нажми на ник, чтобы сделать основным или удалить.</div>
      <div id="syNickAct"></div>
      ${canAdd ? `<div class="set-test"><input id="syNickNew" maxlength="32" placeholder="ещё один ник" autocomplete="off" autocapitalize="off"><button class="btn blue" id="syNickAdd">Добавить</button></div>
        <div class="set-note">Только маленькие латинские буквы (a–z), цифры и _ — от 3 до 32 символов. Ник уникальный: если его уже кто-то занял, взять его нельзя. 🛒 Скоро ники можно будет покупать и продавать на площадке внутри Hirbis.</div>` : ""}` : `<div class="set-note">Ник появится, когда приложение свяжется с сервером.</div>`}
      <div class="set-note">${status}${!ok ? ` · <a href="#" id="syConsentOpen">включить</a>` : ""}</div>
      ${!(me && me.admin) ? `<div class="set-note sy-lost"><a href="#" id="syLost">Потерял старый Telegram? Войти в свой аккаунт</a></div><div id="syLostBox"></div>` : ""}
      ${me && me.admin ? `<div class="set-title">👑 Режим админа</div>
        ${!me.pin_set
          ? `<div class="set-note">Придумай пароль админа (любой длины). Без него админ-панель не откроется, даже с твоего телефона.</div>
             <div class="set-test"><input type="password" id="syPin1" placeholder="пароль" autocomplete="new-password"></div>
             <div class="set-test"><input type="password" id="syPin2" placeholder="ещё раз" autocomplete="new-password"><button class="btn blue" id="syPinSet">Сохранить</button></div>`
          : adminMode()
          ? `<div class="set-test"><span>👑 Включён: полный доступ к любому аккаунту</span><button class="btn ghost" id="syAdmOff">Выйти</button></div>
             <button class="btn blue sy-wide" id="syAdmin">👑 Админ-панель</button>
             <div class="set-note"><a href="#" id="syPinChange">Сменить пароль</a> · <a href="#" id="syRecSetup">🛟 Восстановление аккаунта</a></div><div id="syPinBox"></div>`
          : `<div class="set-test"><input type="password" id="syPin" placeholder="пароль админа" autocomplete="current-password"><button class="btn blue" id="syAdmOn">Войти</button></div>`}` : ""}`;
  }
  async function nickCall(path, handle, okText) {
    try {
      const res = await api(path, { handle });
      if (res.error) { showToast(res.error); return; }
      gotMe(res); if (okText) showToast(okText); openSettings();
    } catch (e) { showToast("Нет связи с сервером"); }
  }
  function settingsBind(box) {
    box.querySelectorAll(".sy-chip").forEach(ch => ch.onclick = () => {
      const n = ch.dataset.n, act = box.querySelector("#syNickAct");
      box.querySelectorAll(".sy-chip").forEach(x => x.classList.toggle("sel", x === ch));
      act.innerHTML = `<div class="set-test"><span>@${esc(n)}</span>
        ${n !== me.handle ? `<button class="btn blue" id="syMain">⭐ Основной</button>` : ""}
        ${(me.nicks || []).length > 1 ? `<button class="btn ghost" id="syDel">Удалить</button>` : ""}</div>`;
      const m = act.querySelector("#syMain"); if (m) m.onclick = () => nickCall("/nicks/main", n, "Основной ник: @" + n);
      const d = act.querySelector("#syDel");
      if (d) d.onclick = () => {
        if (!d.classList.contains("confirm")) { d.classList.add("confirm"); d.textContent = "Точно? Ник освободится"; return; }
        nickCall("/nicks/remove", n, "Ник @" + n + " удалён");
      };
    });
    const ni = box.querySelector("#syNickNew");
    if (ni) ni.oninput = () => { ni.value = ni.value.toLowerCase().replace(/[^a-z0-9_]/g, ""); };
    const add = box.querySelector("#syNickAdd");
    if (add) add.onclick = () => nickCall("/nicks/add", box.querySelector("#syNickNew").value, "Ник добавлен");
    const c = box.querySelector("#syConsentOpen"); if (c) c.onclick = (ev) => { ev.preventDefault(); askConsent(); };
    // пароль админа: задать / войти / выйти / сменить
    const call = async (path, body) => { try { return await api(path, body); } catch (e) { if (e.message !== "need_pin") showToast("Нет связи с сервером"); return null; } };
    const ps = box.querySelector("#syPinSet");
    if (ps) ps.onclick = async () => {
      const a = box.querySelector("#syPin1").value, b = box.querySelector("#syPin2").value;
      if (!a) { showToast("Введи пароль"); return; }
      if (a !== b) { showToast("Пароли не совпадают"); return; }
      const r = await call("/admin/pin/set", { pin: a }); if (!r) return;
      if (r.error) { showToast(r.error); return; }
      gotMe(r); const l = await call("/admin/login", { pin: a });
      if (l && l.session) lsSet("adminmode", { t: l.session, until: l.until });
      showToast("Пароль сохранён 🔐"); openSettings();
    };
    const on = box.querySelector("#syAdmOn");
    if (on) on.onclick = async () => {
      const r = await call("/admin/login", { pin: box.querySelector("#syPin").value }); if (!r) return;
      if (r.error) { showToast(r.error); vibrate("error"); return; }
      lsSet("adminmode", { t: r.session, until: r.until }); showToast("👑 Режим админа включён"); vibrate("success"); openSettings();
    };
    const pinIn = box.querySelector("#syPin"); if (pinIn) pinIn.onkeydown = (e) => { if (e.key === "Enter") on.click(); };
    const off = box.querySelector("#syAdmOff");
    if (off) off.onclick = async () => { await call("/admin/logout", { session: admSess() }); lsSet("adminmode", null); showToast("Режим админа выключен"); openSettings(); };
    // 🛟 Настройка восстановления (только админ, после входа по паролю)
    const rs = box.querySelector("#syRecSetup");
    if (rs) rs.onclick = async (ev) => {
      ev.preventDefault();
      const pb = box.querySelector("#syPinBox");
      const cur = await call("/admin/recovery/get", {});
      pb.innerHTML = `<div class="set-note">${cur && cur.set ? `✅ Восстановление настроено (юз @${esc(cur.user)}). Можно задать заново:` : "Если потеряешь Telegram — войдёшь в этот аккаунт с нового Telegram по этим трём данным. Запомни их!"}</div>
        <div class="set-test"><input id="syRecPhone" type="tel" placeholder="номер телефона, +7…" autocomplete="off"></div>
        <div class="set-test"><input id="syRecUser" placeholder="твой юз в Telegram (без @)" autocomplete="off" autocapitalize="off" value="${esc((cur && cur.user) || "")}"></div>
        <div class="set-test"><input id="syRecPass" type="password" placeholder="пароль восстановления" autocomplete="new-password"></div>
        <div class="set-test"><input id="syRecPass2" type="password" placeholder="пароль ещё раз" autocomplete="new-password"><button class="btn blue" id="syRecSave">Сохранить</button></div>`;
      pb.querySelector("#syRecSave").onclick = async () => {
        const pw = pb.querySelector("#syRecPass").value;
        if (pw !== pb.querySelector("#syRecPass2").value) { showToast("Пароли не совпадают"); return; }
        const r = await call("/admin/recovery/set", { phone: pb.querySelector("#syRecPhone").value, tg: pb.querySelector("#syRecUser").value, password: pw });
        if (!r) return;
        if (r.error) { showToast(r.error); return; }
        showToast("🛟 Восстановление настроено"); pb.innerHTML = `<div class="set-note">✅ Восстановление настроено (юз @${esc(r.user)}).</div>`;
      };
    };
    // Потерял Telegram: вход в свой аккаунт
    const lost = box.querySelector("#syLost");
    if (lost) lost.onclick = (ev) => {
      ev.preventDefault();
      const lb = box.querySelector("#syLostBox");
      lb.innerHTML = `<div class="set-note">Если ты заранее настроил восстановление — введи те же данные. Весь прогресс перейдёт на этот Telegram.</div>
        <div class="set-test"><input id="syLPhone" type="tel" placeholder="номер телефона" autocomplete="off"></div>
        <div class="set-test"><input id="syLUser" placeholder="старый юз в Telegram" autocomplete="off" autocapitalize="off"></div>
        <div class="set-test"><input id="syLPass" type="password" placeholder="пароль восстановления" autocomplete="current-password"><button class="btn blue" id="syLGo">Войти</button></div>`;
      lb.querySelector("#syLGo").onclick = async () => {
        let r;
        try { r = await api("/recover", { phone: lb.querySelector("#syLPhone").value, tg: lb.querySelector("#syLUser").value, password: lb.querySelector("#syLPass").value }); }
        catch (e) { showToast("Нет связи с сервером"); return; }
        if (r.error) { showToast(r.error); vibrate("error"); return; }
        // аккаунт перенесён: забираем прогресс с сервера заново
        lsSet("sync_ver", 0); lsSet("sync_hash", ""); lsSet("sync_ok", true); lsSet("adminmode", null);
        showToast("С возвращением, @" + r.handle + "! Загружаю прогресс…"); vibrate("success");
        syncKeys().forEach(k => localStorage.removeItem(k));
        setTimeout(() => location.reload(), 1200);
      };
    };
    const pc = box.querySelector("#syPinChange");
    if (pc) pc.onclick = (ev) => {
      ev.preventDefault();
      const pb = box.querySelector("#syPinBox");
      pb.innerHTML = `<div class="set-test"><input type="password" id="syPinOld" placeholder="старый"></div>
        <div class="set-test"><input type="password" id="syPinNew" placeholder="новый пароль"><button class="btn blue" id="syPinSave">Сменить</button></div>`;
      pb.querySelector("#syPinSave").onclick = async () => {
        const nw = pb.querySelector("#syPinNew").value;
        if (!nw) { showToast("Введи новый пароль"); return; }
        const r = await call("/admin/pin/set", { pin: nw, old: pb.querySelector("#syPinOld").value }); if (!r) return;
        if (r.error) { showToast(r.error); return; }
        const l = await call("/admin/login", { pin: nw });
        lsSet("adminmode", l && l.session ? { t: l.session, until: l.until } : null);
        showToast("Пароль изменён 🔐"); openSettings();
      };
    };
    const a = box.querySelector("#syAdmin"); if (a) a.onclick = () => openAdmin();
  }

  // --- 👑 АДМИН-ПАНЕЛЬ: любой аккаунт, все функции ---
  const dt = t => t ? new Date(t * 1000).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
  function openAdmin(handle) {
    const box = sheet("syAdminSheet", `<div class="set-head"><b>👑 Админ-панель</b><button class="set-x" id="syAx">✕</button></div>
      <div class="set-seg" id="syTabs"><button data-t="find" class="on">Игроки</button><button data-t="log">Журнал</button></div>
      <div class="set-test"><input id="syFind" placeholder="ник, имя или ID" autocomplete="off" autocapitalize="off"><button class="btn blue" id="syGo">Найти</button></div>
      <div id="syCard"></div>`, true);
    box.querySelector("#syAx").onclick = () => box.classList.remove("show");
    const card = box.querySelector("#syCard"), inp = box.querySelector("#syFind");
    const list = async () => {
      card.innerHTML = `<p class="sy-p">Ищу…</p>`;
      try {
        const res = await api("/admin/list", { q: inp.value.trim().replace(/^@/, "") });
        if (res.error) { card.innerHTML = `<p class="sy-p">${esc(res.error)}</p>`; return; }
        card.innerHTML = `<div class="set-note">Всего игроков: <b>${res.total}</b>${inp.value ? ` · найдено: ${res.players.length}` : " · все, сверху — кто заходил недавно"}</div>` +
          res.players.map((x, i) => `<button class="sy-row" data-h="${esc(x.handle)}"><b>${inp.value ? "" : (i + 1) + ". "}${esc(x.game_name || x.name || "без имени")}</b> @${esc(x.handle)}${x.admin ? " 👑" : ""}${x.banned ? " ⛔" : ""}
            <span>${x.tg_username ? "tg @" + esc(x.tg_username) + " · " : ""}был(а) ${dt(x.last_seen)} · 🔥 ${x.streak} · 📚 ${x.done} · ⭐ ${x.points}</span></button>`).join("");
        card.querySelectorAll(".sy-row").forEach(b => b.onclick = () => openPlayer(b.dataset.h));
      } catch (e) { card.innerHTML = `<p class="sy-p">Нет связи с сервером</p>`; }
    };
    const openPlayer = async (h) => {
      card.innerHTML = `<p class="sy-p">Открываю @${esc(h)}…</p>`;
      try { renderCard(box, await api("/admin/get", { handle: h }), list); } catch (e) { card.innerHTML = `<p class="sy-p">Нет связи с сервером</p>`; }
    };
    const log = async () => {
      card.innerHTML = `<p class="sy-p">Загружаю…</p>`;
      try {
        const res = await api("/admin/log", {});
        card.innerHTML = (res.log || []).map(x => `<div class="sy-log"><b>${dt(x.at)}</b> @${esc(x.admin)} → @${esc(x.target)}<span>${esc(x.what)}</span></div>`).join("") || `<p class="sy-p">Пока пусто</p>`;
      } catch (e) { card.innerHTML = `<p class="sy-p">Нет связи с сервером</p>`; }
    };
    box.querySelector("#syTabs").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      box.querySelectorAll("#syTabs button").forEach(x => x.classList.toggle("on", x === b));
      b.dataset.t === "log" ? log() : list();
    };
    box.querySelector("#syGo").onclick = list;
    inp.onkeydown = (e) => { if (e.key === "Enter") list(); };
    if (typeof handle === "string" && handle) openPlayer(handle); else list();
  }
  function renderCard(box, res, back) {
    const card = box.querySelector("#syCard");
    if (res.error && !res.player) { card.innerHTML = `<p class="sy-p">${esc(res.error)}</p>`; return; }
    if (res.error) showToast(res.error);
    const p = res.player, s = p.streak, now = Date.now() / 1000, prof = p.profile || {};
    const banned = p.banned_until > now, isMe = me && p.tg_id === me.tg_id;
    const lim = p.nick_limit_raw === -1 ? "inf" : String(p.nick_limit_raw == null ? 3 : p.nick_limit_raw);
    card.innerHTML = `<div class="sy-card">
      <button class="btn ghost" id="syBack">‹ Все игроки</button>
      <div class="sy-h">@${esc(p.handle)}${p.admin ? " 👑" : ""}${isMe ? " (это ты)" : ""}</div>
      <div class="sy-grid">
        <span>В игре</span><b>${esc(prof.name || "—")} ${prof.gender === "f" ? "♀" : prof.gender === "m" ? "♂" : ""}</b>
        <span>Telegram</span><b>${esc(p.name || "")} ${p.tg_username ? "@" + esc(p.tg_username) : ""}</b>
        <span>ID</span><b>${p.tg_id}</b>
        <span>С нами с</span><b>${dt(p.created)}</b>
        <span>Был(а)</span><b>${dt(p.last_seen)}</b>
        <span>Согласие</span><b>${p.consent ? "✓ " + dt(p.consent) : "—"}</b>
        <span>Уроков</span><b>${p.done} (⭐ ${p.perfect}) · квестов ${p.quests}</b>
        <span>Медали</span><b>${Object.values(p.medals || {}).join(" ") || "—"}</b>
        <span>Очки</span><b>${p.points_total} (сегодня ${p.points_today})</b>
        <span>Серия</span><b>🔥 ${s.count} · лучшая ${s.best} · ❄️ ${s.freezes}</b>
        <span>Статус</span><b>${banned ? "⛔ заблокирован " + (p.banned_until > 4.1e9 ? "навсегда" : "до " + dt(p.banned_until)) + (p.ban_reason ? " — " + esc(p.ban_reason) : "") : "✅ активен"}</b>
      </div>

      <div class="set-title">Прогресс</div>
      <label class="sy-f"><span>🔥 Серия, дней</span><input type="number" min="0" id="syCount" value="${s.count}"></label>
      <label class="sy-f"><span>🏆 Лучшая серия</span><input type="number" min="0" id="syBest" value="${s.best}"></label>
      <label class="sy-f"><span>❄️ Заморозки</span><input type="number" min="0" id="syFr" value="${s.freezes}"></label>
      <label class="sy-f"><span>➕ Добавить очков</span><input type="number" id="syPts" value="0"></label>
      <label class="sy-f"><span>Имя в игре</span><input id="syName" value="${esc(prof.name || "")}" maxlength="20"></label>
      <div class="set-seg" id="syGender"><button data-g="m" class="${prof.gender === "m" ? "on" : ""}">Парень</button><button data-g="f" class="${prof.gender === "f" ? "on" : ""}">Девушка</button></div>
      <button class="btn blue sy-wide" id="sySave">Сохранить</button>

      <div class="set-title">Ники</div>
      <div class="sy-nicks">${p.nicks.map(n => `<span class="sy-chip ${n === p.handle ? "main" : ""}" data-n="${esc(n)}">@${esc(n)}${n === p.handle ? " ⭐" : ""}</span>`).join("")}</div>
      <div id="syANickAct"></div>
      <div class="set-test"><input id="syANick" maxlength="32" placeholder="дать ник" autocomplete="off" autocapitalize="off"><button class="btn blue" id="syANickAdd">Дать</button></div>
      <div class="set-note" id="syANickNote"></div>
      <label class="sy-f"><span>Лимит ников</span><select id="syLim">${["1", "2", "3", "5", "10", "inf"].map(v => `<option value="${v}" ${v === lim ? "selected" : ""}>${v === "inf" ? "∞ без ограничений" : v}</option>`).join("")}${["1", "2", "3", "5", "10", "inf"].includes(lim) ? "" : `<option selected value="${lim}">${lim}</option>`}</select></label>

      <div class="set-title">Блокировка</div>
      ${banned ? `<button class="btn ghost sy-wide" id="syUnban">Разблокировать</button>`
        : isMe ? `<div class="set-note">Себя заблокировать нельзя</div>`
        : `<div class="set-seg" id="syDays"><button data-d="1">1 день</button><button data-d="7" class="on">7 дней</button><button data-d="30">30 дней</button><button data-d="0">Навсегда</button></div>
        <div class="set-test"><input id="syReason" placeholder="Причина" maxlength="200"><button class="btn ghost" id="syBanGo">⛔ Заблок.</button></div>`}

      <div class="set-title">Права</div>
      ${isMe ? `<div class="set-note">Ты владелец 👑</div>` : `<button class="btn ghost sy-wide" id="syAdm">${p.admin ? "Снять права админа" : "👑 Сделать админом"}</button>`}

      <div class="set-title">Опасно</div>
      <button class="btn ghost sy-wide" id="syReset">Стереть прогресс игрока</button>
    </div>`;
    const set = async (body, okText) => {
      try { const r = await api("/admin/set", Object.assign({ handle: p.handle }, body)); renderCard(box, r, back); if (!r.error) showToast(okText); return r; }
      catch (e) { showToast("Нет связи с сервером"); }
    };
    const confirm2 = (btn, text, fn) => () => { if (!btn.classList.contains("confirm")) { btn.classList.add("confirm"); btn.textContent = text; return; } fn(); };
    card.querySelector("#syBack").onclick = back;
    const gsel = card.querySelector("#syGender");
    gsel.onclick = (e) => { const b = e.target.closest("button"); if (b) gsel.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); };
    card.querySelector("#sySave").onclick = () => {
      const n = id => card.querySelector(id).value === "" ? null : +card.querySelector(id).value;
      const body = { streak: {} };
      if (n("#syCount") !== s.count) body.streak.count = n("#syCount");
      if (n("#syBest") !== s.best) body.streak.best = n("#syBest");
      if (n("#syFr") !== s.freezes) body.streak.freezes = n("#syFr");
      if (!Object.keys(body.streak).length) delete body.streak;
      if (n("#syPts")) body.addPoints = n("#syPts");
      const nm = card.querySelector("#syName").value.trim(), g = (gsel.querySelector(".on") || {}).dataset;
      const prf = {};
      if (nm && nm !== prof.name) prf.name = nm;
      if (g && g.g && g.g !== prof.gender) prf.gender = g.g;
      if (Object.keys(prf).length) body.profile = prf;
      if (!Object.keys(body).length) { showToast("Ничего не изменено"); return; }
      set(body, "Сохранено ✓ Игрок увидит при следующем открытии");
    };
    // ники
    card.querySelectorAll(".sy-chip").forEach(ch => ch.onclick = () => {
      const n = ch.dataset.n, act = card.querySelector("#syANickAct");
      act.innerHTML = `<div class="set-test"><span>@${esc(n)}</span>${n !== p.handle ? `<button class="btn blue" id="syAMain">⭐ Основной</button>` : ""}<button class="btn ghost" id="syADel">Забрать</button></div>`;
      const m = act.querySelector("#syAMain"); if (m) m.onclick = () => set({ nick: { action: "main", handle: n } }, "Основной ник: @" + n);
      const d = act.querySelector("#syADel"); d.onclick = confirm2(d, "Точно забрать?", () => set({ nick: { action: "remove", handle: n } }, "Ник @" + n + " забран"));
    });
    card.querySelector("#syANickAdd").onclick = async () => {
      const h = card.querySelector("#syANick").value;
      const r = await set({ nick: { action: "add", handle: h } }, "Ник выдан");
      if (r && r.error && /уже у другого/.test(r.error)) {
        const note = box.querySelector("#syANickNote");
        note.innerHTML = `${esc(r.error)} <button class="btn ghost" id="syForce">Забрать и отдать</button>`;
        note.querySelector("#syForce").onclick = () => set({ nick: { action: "add", handle: h, force: true } }, "Ник передан");
      }
    };
    card.querySelector("#syLim").onchange = (e) => set({ nickLimit: e.target.value === "inf" ? "inf" : +e.target.value }, "Лимит ников изменён");
    // бан, права, сброс
    const days = card.querySelector("#syDays");
    if (days) days.onclick = (e) => { const b = e.target.closest("button"); if (!b) return; days.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); };
    const bg = card.querySelector("#syBanGo");
    if (bg) bg.onclick = () => set({ ban: { days: +days.querySelector(".on").dataset.d, reason: card.querySelector("#syReason").value } }, "Игрок заблокирован");
    const ub = card.querySelector("#syUnban"); if (ub) ub.onclick = () => set({ ban: null }, "Игрок разблокирован");
    const ad = card.querySelector("#syAdm");
    if (ad) ad.onclick = confirm2(ad, p.admin ? "Точно снять?" : "Точно дать полный доступ?", () => set({ admin: !p.admin }, p.admin ? "Права сняты" : "Теперь админ 👑"));
    const rs = card.querySelector("#syReset");
    rs.onclick = confirm2(rs, "Точно стереть? Нажми ещё раз", () => set({ resetProgress: true }, "Прогресс игрока стёрт"));
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
