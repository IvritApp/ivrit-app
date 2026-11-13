// =====================================================
// friends.js — НИЖНЕЕ МЕНЮ «Обучение / Друзья», РАЗДЕЛ «ДРУЗЬЯ», СТРАНИЦА ПРОФИЛЯ
//  • Друга можно найти по ЛЮБОМУ его нику (их у человека до 3).
//  • Дружба — по заявке: отправил → друг принял.
//  • Профиль как в Telegram + Duolingo: герой, имя, основной ник, «также: @…», серия, очки, курсы.
//  • Команды и командные соревнования — следующий шаг (пока «скоро»).
//  Работает через сервер (sync.js → api). Без Telegram — показываем подсказку.
// =====================================================
(function () {
  const API = "https://89-23-99-107.sslip.io/hapi";
  const tgApp = window.Telegram && window.Telegram.WebApp;
  const initData = tgApp && tgApp.initData;
  const sec = document.getElementById("friends");
  const bar = document.getElementById("tabbar");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let incomingCount = 0;

  async function api(path, body) {
    const r = await fetch(API + path, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify(Object.assign({ initData }, body || {})) });
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }

  // Чужой герой: берём только простые значения (защита), остальное — по умолчанию
  function head(cfg, gender, size) {
    const g = gender === "f" ? "f" : "m";
    const clean = HirbisAvatar.defaults(g);
    if (cfg && typeof cfg === "object") Object.entries(cfg).forEach(([k, v]) => {
      if (k in clean && (typeof v === "number" || (typeof v === "string" && /^[#\w-]{1,24}$/.test(v)))) clean[k] = v;
    });
    clean.gender = g;
    return `<span class="fr-ava" style="width:${size}px;height:${size}px">${HirbisAvatar.svg(HirbisAvatar.sanitize(clean), { view: "head" })}</span>`;
  }

  // ---------- нижнее меню: видно только на главной и в «Друзьях» ----------
  function updateBar() {
    const home = document.getElementById("home");
    const show = (home && !home.hidden) || !sec.hidden;
    if (bar.hidden !== !show) bar.hidden = !show;
    document.body.classList.toggle("has-tabbar", show);
    bar.querySelectorAll("button").forEach(b => b.classList.toggle("on", b.dataset.tab === (sec.hidden ? "learn" : "friends")));
    const badge = bar.querySelector(".tb-badge");
    if (badge.textContent !== String(incomingCount)) badge.textContent = incomingCount;
    if (badge.hidden !== !incomingCount) badge.hidden = !incomingCount;
  }
  // следим только за экранами (body > section), а не за всей страницей
  const mo = new MutationObserver(updateBar);
  document.querySelectorAll("body > section").forEach(s => mo.observe(s, { attributes: true, attributeFilter: ["hidden"] }));
  bar.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tab === "learn") showHome(); else showFriends();
    try { if (typeof vibrate === "function") vibrate("light"); } catch (er) {}
  };

  // ---------- раздел «Друзья» ----------
  async function showFriends() {
    document.querySelectorAll("body > section").forEach(s => s.hidden = s.id !== "friends");
    if (typeof stopHomeBird === "function") stopHomeBird();
    window.scrollTo(0, 0);
    sec.innerHTML = `<h1 class="fr-title">Друзья</h1><div id="frBody"><p class="fr-note">Загружаю…</p></div>`;
    const body = sec.querySelector("#frBody");
    if (!initData) { body.innerHTML = `<p class="fr-note">Друзья работают внутри Telegram — открой Hirbis в боте.</p>`; return; }
    let d;
    try { d = await api("/friends/list"); }
    catch (e) { body.innerHTML = `<p class="fr-note">Нет связи с сервером. Попробуй чуть позже.</p>`; return; }
    if (d.banned || d.error) { body.innerHTML = `<p class="fr-note">${esc(d.error || "Аккаунт заблокирован")}</p>`; return; }
    incomingCount = d.incoming.length; updateBar();
    const row = (x, right) => `<div class="fr-row" data-h="${esc(x.handle)}">${head(x.avatar, x.gender, 46)}
      <div class="fr-who"><b>${esc(x.name || "@" + x.handle)}</b><span>@${esc(x.handle)}</span></div>${right || ""}</div>`;
    const stat = x => `<div class="fr-stat">🔥 ${x.streak}<small>⭐ ${x.points}</small></div>`;
    body.innerHTML = `
      ${row(d.me, `<div class="fr-stat">Мой профиль ›</div>`).replace('class="fr-row"', 'class="fr-row fr-me"')}

      <div class="fr-find"><span>@</span><input id="frFind" placeholder="ник друга" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn blue" id="frGo">Найти</button></div>
      <div id="frFound"></div>

      ${d.incoming.length ? `<div class="fr-h">Заявки в друзья · ${d.incoming.length}</div>
        ${d.incoming.map(x => row(x, `<button class="btn blue fr-mini" data-acc="${esc(x.handle)}">Принять</button><button class="fr-x" data-rm="${esc(x.handle)}">✕</button>`)).join("")}` : ""}

      <div class="fr-h">Мои друзья · ${d.friends.length}</div>
      ${d.friends.length ? d.friends.map((x, i) => row(x, stat(x)).replace('<div class="fr-who">', `<div class="fr-place">${i + 1}</div><div class="fr-who">`)).join("")
        : `<p class="fr-note">Пока никого. Найди друга по нику — подойдёт любой из его ников.</p>`}

      ${d.outgoing.length ? `<div class="fr-h">Ждут ответа</div>
        ${d.outgoing.map(x => row(x, `<button class="fr-x" data-rm="${esc(x.handle)}" title="Отменить">✕</button>`)).join("")}` : ""}

      <div class="fr-h">Команды</div>
      <div class="fr-soon"><b>🏆 Команды и соревнования — скоро</b>
        <span>Собери команду из друзей: общий огонёк серии, командные задания и соревнования — кто первый пройдёт, получит бонусы.</span></div>`;
    body.querySelectorAll(".fr-row").forEach(r => r.onclick = (e) => { if (!e.target.closest("button")) openProfile(r.dataset.h); });
    body.querySelectorAll("[data-acc]").forEach(b => b.onclick = () => act("/friends/accept", b.dataset.acc, "Теперь вы друзья 🎉"));
    body.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => act("/friends/remove", b.dataset.rm, "Готово"));
    const find = async () => {
      const h = sec.querySelector("#frFind").value.trim().replace(/^@/, ""); if (!h) return;
      const box = sec.querySelector("#frFound"); box.innerHTML = `<p class="fr-note">Ищу…</p>`;
      try {
        const r = await api("/profile", { handle: h });
        if (r.error) { box.innerHTML = `<p class="fr-note">${esc(r.error)}</p>`; return; }
        box.innerHTML = `<div class="fr-card">${row(r.profile, relBtn(r.relation, r.profile.handle))}</div>`;
        box.querySelector(".fr-row").onclick = (e) => { if (!e.target.closest("button")) openProfile(r.profile.handle); };
        bindRel(box, null);
      } catch (e) { box.innerHTML = `<p class="fr-note">Нет связи с сервером</p>`; }
    };
    sec.querySelector("#frGo").onclick = find;
    sec.querySelector("#frFind").onkeydown = (e) => { if (e.key === "Enter") find(); };
  }

  async function act(path, h, ok) {
    try {
      const r = await api(path, { handle: h });
      if (r.error) { showToast(r.error); return r; }
      if (ok) showToast(ok);
      if (typeof vibrate === "function") vibrate("success");
      if (!sec.hidden) showFriends();
      return r;
    } catch (e) { showToast("Нет связи с сервером"); }
  }
  function relBtn(rel, h) {
    if (rel === "me") return "";
    if (rel === "friend") return `<button class="btn ghost fr-mini" data-rel="remove" data-h="${esc(h)}">✓ В друзьях</button>`;
    if (rel === "out") return `<button class="btn ghost fr-mini" data-rel="remove" data-h="${esc(h)}">Заявка отправлена</button>`;
    if (rel === "in") return `<button class="btn blue fr-mini" data-rel="accept" data-h="${esc(h)}">Принять заявку</button>`;
    return `<button class="btn blue fr-mini" data-rel="add" data-h="${esc(h)}">➕ Добавить</button>`;
  }
  function bindRel(box, after) {
    box.querySelectorAll("[data-rel]").forEach(b => b.onclick = async () => {
      const k = b.dataset.rel;
      if (k === "remove" && !b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = b.textContent.includes("друзьях") ? "Удалить из друзей?" : "Отменить заявку?"; return; }
      const r = await act("/friends/" + k, b.dataset.h, k === "add" ? "Заявка отправлена ✉️" : k === "accept" ? "Теперь вы друзья 🎉" : "Готово");
      if (r && after) after();
    });
  }

  // ---------- страница профиля ----------
  async function openProfile(h) {
    let box = document.getElementById("frProfile");
    if (!box) { box = document.createElement("div"); box.id = "frProfile"; document.body.appendChild(box); }
    box.innerHTML = `<div class="fr-page"><button class="fr-back" id="frBack">‹ Назад</button><p class="fr-note">Загружаю…</p></div>`;
    box.className = "show";
    box.querySelector("#frBack").onclick = () => { box.className = ""; };
    let r;
    try { r = await api("/profile", h ? { handle: h } : {}); } catch (e) { box.querySelector(".fr-note").textContent = "Нет связи с сервером"; return; }
    if (r.error) { box.querySelector(".fr-note").textContent = r.error; return; }
    const p = r.profile, others = (p.nicks || []).filter(n => n !== p.handle);
    const MG = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const cd = p.created ? new Date(p.created * 1000) : null, since = cd ? MG[cd.getMonth()] + " " + cd.getFullYear() : "";
    const medals = Object.values(p.medals || {});
    box.innerHTML = `<div class="fr-page">
      <button class="fr-back" id="frBack">‹ Назад</button>
      <div class="fr-top">${head(p.avatar, p.gender, 120)}
        <div class="fr-name">${esc(p.name || "@" + p.handle)}${p.admin ? " 👑" : ""}</div>
        <div class="fr-since">${since ? "В Hirbis с " + esc(since) : ""}</div>
        <div class="fr-relbox">${relBtn(r.relation, p.handle)}</div>
      </div>

      <div class="fr-block">
        <div class="fr-line"><b>@${esc(p.handle)}</b><span>Имя пользователя</span></div>
        ${others.length ? `<div class="fr-line"><b>${others.map(n => "@" + esc(n)).join(", ")}</b><span>Также</span></div>` : ""}
      </div>

      <div class="fr-h">Статистика</div>
      <div class="fr-grid">
        <div><b>🔥 ${p.streak}</b><span>серия дней</span></div>
        <div><b>🏆 ${p.best || 0}</b><span>лучшая серия</span></div>
        <div><b>⭐ ${p.points}</b><span>очков</span></div>
        <div><b>📚 ${p.done || 0}</b><span>уроков${p.perfect ? ` · ★ ${p.perfect}` : ""}</span></div>
      </div>
      ${medals.length ? `<div class="fr-h">Медали</div><div class="fr-medals">${medals.map(m => `<span>${esc(m)}</span>`).join("")}</div>` : ""}

      <div class="fr-h">Курсы</div>
      <div class="fr-block"><div class="fr-line"><b>🇮🇱 ${esc(p.course.title)}</b><span>Глава ${esc(p.course.level)}</span></div></div>
    </div>`;
    box.querySelector("#frBack").onclick = () => { box.className = ""; };
    bindRel(box, () => openProfile(p.handle));
  }

  // число заявок — один раз при запуске (для значка на «Друзьях»)
  if (initData) setTimeout(async () => { try { const d = await api("/friends/list"); incomingCount = (d.incoming || []).length; updateBar(); } catch (e) {} }, 2500);
  updateBar();
  window.showFriends = showFriends;
  window.openProfile = openProfile;
})();
