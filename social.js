// =====================================================
// ЧАТ И КОМАНДЫ (раздел «Друзья»). Сервер: /hapi/chat/*, /hapi/team/* (players_api.py).
//  • Писать можно только друзьям (личный чат) и своей команде (командный чат).
//  • Команда: название + значок, вход по коду из 6 знаков, до 20 человек, капитан может убрать игрока.
//  • Соревнование: очки команды за неделю (пн–вс) = сумма очков участников; рейтинг всех команд.
//  • Новые сообщения: значок на «Друзьях» и у друга; открытый чат обновляется каждые 4 секунды.
// Если сервер ещё не обновлён — показываем мягкое «скоро», ничего не ломаем.
// =====================================================
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const api = (p, b) => window.hirbisApi(p, b);
  const BOT = "https://t.me/HIRBIS_APP_Bot";
  window.chatUnread = { by: {}, team: 0, total: 0 };

  // ---------- непрочитанные: при запуске и раз в 30 секунд, пока приложение открыто ----------
  async function refreshUnread() {
    if (!window.hirbisAgreed || !hirbisAgreed() || document.hidden) return;
    try {
      const u = await api("/chat/unread");
      if (u && !u.error && typeof u.total === "number") {
        const grew = u.total > (window.chatUnread.total || 0);
        window.chatUnread = u;
        if (window.updateTabBar) updateTabBar();
        if (grew && !document.getElementById("friends").hidden) markRows();
      }
    } catch (e) { /* сервер без чата или нет сети — молчим */ }
  }
  function markRows() {
    document.querySelectorAll("[data-chat]").forEach(b => {
      const n = window.chatUnread.by[b.dataset.chat] || 0;
      b.innerHTML = "💬" + (n ? `<i>${n}</i>` : "");
    });
    const tb = document.getElementById("tmChatN");
    if (tb) { tb.textContent = window.chatUnread.team || ""; tb.hidden = !window.chatUnread.team; }
  }
  setTimeout(refreshUnread, 3500);
  setInterval(refreshUnread, 30000);

  // ---------- окно чата ----------
  let C = null;                         // открытый чат: { key, lastId, timer }
  function hhmm(t) { const d = new Date(t * 1000); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); }

  window.openChat = function (o) {
    let box = document.getElementById("frChat");
    if (!box) { box = document.createElement("div"); box.id = "frChat"; document.body.appendChild(box); }
    const key = o.team ? { team: true } : { with: o.with };
    box.innerHTML = `
      <div class="ch-top"><button class="fr-back" id="chBack">‹</button>
        <div class="ch-ava">${o.ava || ""}</div>
        <div class="ch-who"><b>${esc(o.title)}</b><span>${esc(o.sub || "")}</span></div></div>
      <div class="ch-list" id="chList"><p class="fr-note">Загружаю…</p></div>
      <form class="ch-bar" id="chForm"><input id="chIn" maxlength="500" placeholder="${o.team ? "Написать команде…" : "Сообщение…"}" autocomplete="off">
        <button class="ch-send" id="chSend" aria-label="Отправить">➤</button></form>`;
    requestAnimationFrame(() => box.className = "show");
    C = { key, lastId: 0, team: !!o.team, timer: null, busy: false };
    const close = () => { box.className = ""; if (C) clearInterval(C.timer); C = null; refreshUnread(); if (!document.getElementById("friends").hidden) markRows(); };
    box.querySelector("#chBack").onclick = close;
    box.querySelector("#chForm").onsubmit = (e) => { e.preventDefault(); send(); };
    load(true);
    C.timer = setInterval(() => load(false), 4000);
  };

  async function load(first) {
    if (!C || C.busy) return;
    const my = C;
    try {
      const r = await api("/chat/list", Object.assign({ since: my.lastId }, my.key));
      if (my !== C) return;
      if (r.error) { document.getElementById("chList").innerHTML = `<p class="fr-note">${esc(r.error)}</p>`; return; }
      add(r.messages, first);
    } catch (e) { if (first) document.getElementById("chList").innerHTML = `<p class="fr-note">Нет связи с сервером</p>`; }
  }
  function add(msgs, first) {
    const list = document.getElementById("chList");
    if (!list) return;
    if (first) list.innerHTML = msgs.length ? "" : `<p class="fr-note ch-empty">${C.team ? "Здесь пока тихо. Поздоровайся с командой 👋" : "Напиши первым — например «שָׁלוֹם!» 👋"}</p>`;
    if (!msgs.length) return;
    const empty = list.querySelector(".ch-empty"); if (empty) empty.remove();
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    msgs.forEach(m => {
      if (m.id <= C.lastId) return;
      C.lastId = m.id;
      const el = document.createElement("div");
      el.className = "ch-msg" + (m.me ? " me" : "") + (first ? "" : " new");
      el.dataset.id = m.id;
      el.innerHTML = `${C.team && !m.me ? `<div class="ch-from">${esc(m.from.name || "@" + m.from.handle)}</div>` : ""}<div class="ch-text"></div><div class="ch-time">${hhmm(m.at)}</div>`;
      el.querySelector(".ch-text").textContent = m.text;          // текст — только как текст (защита)
      if (!m.me) el.onclick = () => report(el, m.id);
      list.appendChild(el);
    });
    if (first || nearBottom || msgs.some(m => m.me)) list.scrollTop = list.scrollHeight;
  }
  async function send() {
    const inp = document.getElementById("chIn");
    const text = inp.value.trim();
    if (!text || !C || C.busy) return;
    C.busy = true; inp.value = "";
    try {
      const r = await api("/chat/send", Object.assign({ text, since: C.lastId }, C.key));
      if (r.error) { showToast(r.error); inp.value = text; }
      else { add(r.messages, false); if (typeof vibrate === "function") vibrate("light"); if (typeof playSound === "function") playSound("pop"); }
    } catch (e) { showToast("Не отправилось — нет связи"); inp.value = text; }
    if (C) C.busy = false;
    inp.focus();
  }
  // нажатие на чужое сообщение → «Пожаловаться» (второе нажатие отправляет жалобу)
  function report(el, id) {
    const b = el.querySelector(".ch-rep");
    if (!b) {
      document.querySelectorAll(".ch-rep").forEach(x => x.remove());
      const btn = document.createElement("button"); btn.className = "ch-rep"; btn.textContent = "🚩 Пожаловаться";
      btn.onclick = async (e) => {
        e.stopPropagation();
        try { const r = await api("/chat/report", { id }); showToast(r.error || "Спасибо, админ посмотрит 🚩"); } catch (er) { showToast("Нет связи"); }
        btn.remove();
      };
      el.appendChild(btn);
    }
  }

  // ---------- команда ----------
  let emojis = ["🦁", "🐪", "🦊", "🐬", "🦉", "🐝", "🌵", "🍉", "🔥", "⭐", "🚀", "🕍"];
  window.loadTeam = async function (el) {
    if (!el) return;
    let r;
    try { r = await api("/team/me"); } catch (e) { r = null; }
    if (!el.isConnected) return;
    if (!r || r.error === "not found" || (!("team" in r) && !r.error)) { el.innerHTML = soon(); return; }
    if (r.error) { el.innerHTML = `<p class="fr-note">${esc(r.error)}</p>`; return; }
    if (r.emoji) emojis = r.emoji;
    r.team ? teamCard(el, r.team) : noTeam(el);
    markRows();
  };
  const soon = () => `<div class="fr-soon"><b>🏆 Команды и чат — уже почти</b><span>Обновление сервера ещё не установлено. Скоро здесь можно будет собрать команду и переписываться с друзьями.</span></div>`;

  function noTeam(el) {
    el.innerHTML = `<div class="tm-empty">
        <div class="tm-hero">🏆</div>
        <b>Соревнуйся вместе с друзьями</b>
        <span>Команда — до 20 человек. Очки всех за неделю складываются, а команды соревнуются в общем рейтинге. Есть командный чат.</span>
        <div class="tm-btns"><button class="btn blue" id="tmNew">＋ Создать команду</button><button class="btn ghost tm-join-b" id="tmJoin">Вступить по коду</button></div>
        <div id="tmForm"></div>
        <button class="link-btn" id="tmTop">Рейтинг команд</button>
      </div>`;
    el.querySelector("#tmNew").onclick = () => createForm(el);
    el.querySelector("#tmJoin").onclick = () => joinForm(el);
    el.querySelector("#tmTop").onclick = () => topSheet();
  }
  function createForm(el) {
    let pick = emojis[0];
    const f = el.querySelector("#tmForm");
    f.innerHTML = `<div class="tm-form"><div class="tm-emo">${emojis.map((e, i) => `<button class="${i ? "" : "on"}" data-e="${e}">${e}</button>`).join("")}</div>
      <input id="tmName" maxlength="30" placeholder="Название команды" autocomplete="off"><button class="btn blue" id="tmCreate">Создать</button></div>`;
    f.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { pick = b.dataset.e; f.querySelectorAll("[data-e]").forEach(x => x.classList.toggle("on", x === b)); });
    f.querySelector("#tmName").focus();
    f.querySelector("#tmCreate").onclick = async () => {
      const name = f.querySelector("#tmName").value.trim();
      if (name.length < 2) { showToast("Название — хотя бы 2 буквы"); return; }
      try {
        const r = await api("/team/create", { name, emoji: pick });
        if (r.error) { showToast(r.error); return; }
        if (window.HAnim) HAnim.confetti({ size: "small" });
        if (typeof vibrate === "function") vibrate("success");
        teamCard(el, r.team, true);
      } catch (e) { showToast("Нет связи с сервером"); }
    };
  }
  function joinForm(el) {
    const f = el.querySelector("#tmForm");
    f.innerHTML = `<div class="tm-form"><input id="tmCode" maxlength="6" placeholder="Код из 6 знаков" autocomplete="off" autocapitalize="characters" class="tm-code-in">
      <button class="btn blue" id="tmGo">Вступить</button></div>`;
    f.querySelector("#tmCode").focus();
    f.querySelector("#tmGo").onclick = async () => {
      const code = f.querySelector("#tmCode").value.trim();
      if (code.length < 6) { showToast("В коде 6 знаков"); return; }
      try {
        const r = await api("/team/join", { code });
        if (r.error) { showToast(r.error); return; }
        if (window.HAnim) HAnim.confetti({ size: "small" });
        if (typeof vibrate === "function") vibrate("success");
        teamCard(el, r.team, true);
      } catch (e) { showToast("Нет связи с сервером"); }
    };
  }

  function teamCard(el, t, fresh) {
    const H = window.hirbisHead;
    const n = window.chatUnread.team || 0;
    el.innerHTML = `<div class="tm-card${fresh ? " fresh" : ""}">
        <div class="tm-head"><div class="tm-badge">${esc(t.emoji)}</div>
          <div class="tm-title"><b>${esc(t.name)}</b><span>${t.members.length} из ${t.max} · ${t.i_own ? "ты капитан 👑" : "в команде"}</span></div></div>
        <div class="tm-week"><div><b id="tmWeek">${t.week}</b><span>очков команды за неделю</span></div><div id="tmPlace"></div></div>
        <div class="tm-actions">
          <button class="btn blue" id="tmChat">💬 Чат команды <i id="tmChatN" class="tm-n"${n ? "" : " hidden"}>${n || ""}</i></button>
          <button class="btn ghost" id="tmInvite">📨 Пригласить · код <b>${esc(t.code)}</b></button>
        </div>
        <div class="tm-list">${t.members.map((m, i) => `<div class="tm-row${m.me ? " me" : ""}" style="--i:${i}">
            <span class="tm-place">${i + 1}</span>${H ? H(m.avatar, m.gender, 36) : ""}
            <div class="tm-who"><b>${esc(m.name || "@" + m.handle)}${m.owner ? " 👑" : ""}</b><span>@${esc(m.handle)} · 🔥 ${m.streak}</span></div>
            <div class="tm-pts">⭐ ${m.week}</div>
            ${t.i_own && !m.me ? `<button class="fr-x" data-kick="${esc(m.handle)}" title="Убрать из команды">✕</button>` : ""}
          </div>`).join("")}</div>
        <div class="tm-foot"><button class="link-btn" id="tmTop">🏆 Рейтинг команд</button><button class="link-btn danger" id="tmLeave">Выйти из команды</button></div>
      </div>`;
    if (window.HAnim && fresh) HAnim.countUp(el.querySelector("#tmWeek"), 0, t.week, 800);
    el.querySelector("#tmChat").onclick = () => openChat({ team: true, title: t.name, sub: `${t.members.length} участник${t.members.length === 1 ? "" : t.members.length < 5 ? "а" : "ов"}`,
      ava: `<span class="tm-badge sm">${esc(t.emoji)}</span>` });
    el.querySelector("#tmInvite").onclick = () => invite(t);
    el.querySelector("#tmTop").onclick = () => topSheet();
    const lv = el.querySelector("#tmLeave");
    lv.onclick = async () => {
      if (!lv.classList.contains("confirm")) { lv.classList.add("confirm"); lv.textContent = "Точно выйти? Нажми ещё раз"; return; }
      try { const r = await api("/team/leave"); r.team ? teamCard(el, r.team) : noTeam(el); showToast(g("Ты вышел{m:}{f:а} из команды")); } catch (e) { showToast("Нет связи с сервером"); }
    };
    el.querySelectorAll("[data-kick]").forEach(b => b.onclick = async () => {
      if (!b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = "Убрать?"; return; }
      try { const r = await api("/team/kick", { handle: b.dataset.kick }); if (r.error) showToast(r.error); else teamCard(el, r.team); } catch (e) { showToast("Нет связи с сервером"); }
    });
    // место в рейтинге
    api("/team/top").then(r => {
      const p = el.querySelector("#tmPlace");
      if (p && r && r.place) p.innerHTML = `<b>#${r.place}</b><span>из ${r.total} команд</span>`;
    }).catch(() => {});
  }

  function invite(t) {
    const text = `Вступай в мою команду «${t.name}» ${t.emoji} в Hirbis — учим иврит вместе! Открой бота → «Друзья» → «Вступить по коду»: ${t.code}`;
    const tgApp = window.Telegram && window.Telegram.WebApp;
    if (tgApp && tgApp.openTelegramLink) { tgApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(BOT)}&text=${encodeURIComponent(text)}`); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text + " " + BOT).then(() => showToast("Приглашение скопировано 📋")).catch(() => showToast("Код: " + t.code));
    else showToast("Код: " + t.code);
  }

  async function topSheet() {
    const old = document.getElementById("tmTopSheet"); if (old) old.remove();
    const s = document.createElement("div");
    s.id = "tmTopSheet";
    s.innerHTML = `<div class="pt-card"><div class="pt-h">🏆 Рейтинг команд</div><div class="pt-sub">Очки за эту неделю · обнуляется в понедельник</div>
      <div class="tm-top" id="tmTopList"><p class="fr-note">Загружаю…</p></div><button class="btn ghost" id="tmTopClose">Закрыть</button></div>`;
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add("show"));
    const close = () => { s.classList.remove("show"); setTimeout(() => s.remove(), 250); };
    s.onclick = (e) => { if (e.target === s) close(); };
    s.querySelector("#tmTopClose").onclick = close;
    try {
      const r = await api("/team/top");
      const list = s.querySelector("#tmTopList");
      list.innerHTML = r.top && r.top.length ? r.top.map((x, i) => `<div class="tm-trow${x.id === r.my_id ? " me" : ""}" style="--i:${i}">
          <span class="tm-place">${i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span><span class="tm-badge sm">${esc(x.emoji)}</span>
          <div class="tm-who"><b>${esc(x.name)}</b><span>${x.size} чел.</span></div><div class="tm-pts">⭐ ${x.week}</div></div>`).join("")
        : `<p class="fr-note">Пока ни одной команды — создай первую!</p>`;
    } catch (e) { s.querySelector("#tmTopList").innerHTML = `<p class="fr-note">Нет связи с сервером</p>`; }
  }
})();
