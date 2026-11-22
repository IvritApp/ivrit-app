// =====================================================
// eco.js — ЭКОНОМИКА HIRBIS (клиент). Подробно — claude-docs/ekonomika.md.
//  • Две валюты: 🥐 бурекасы (за учёбу: 1 очко = 1 🥐) и 💎 хибриллианты (наборы за ⭐, сундуки).
//  • Обе живут ТОЛЬКО на сервере (/hapi/eco/*). Здесь — копия для показа: store "eco" (NOSYNC).
//  • Сундуки: очередь, «Открыть» → сервер решает редкость и награду → ChestFX.play (chest.js) или простой показ.
//  • Экран «🛒 Магазин» (#shop): вкладки Сундуки / Скины / Ники / Полезное / 💎 за ⭐.
//  • Значки 🥐 N · 💎 N · 🎁 N — сверху на главной и в мини-играх.
//  • В обычном браузере (не Telegram) работает МОК-сервер: те же ответы, состояние в store "eco_mock" (NOSYNC).
// =====================================================
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const live = () => !!(window.hirbisSync && hirbisSync.active);
  const MINIGAME_PRICE = 30;

  // ---------- СПРАВОЧНИК: редкости, сундуки, товары (имена и вид — здесь, цены — с сервера) ----------
  const RAR = {
    rare: { n: "Редкий", c: "#3cae5c" }, super: { n: "Сверхредкий", c: "#3a8ad6" }, epic: { n: "Эпический", c: "#8b5cf6" },
    mythic: { n: "Мифический", c: "#e5484d" }, legendary: { n: "Легендарный", c: "#f2b630" }
  };
  const KIND = { chest: { n: "Сундук", ic: "🎁" }, big: { n: "Большой сундук", ic: "🧰" }, daily: { n: "Ежедневный сундук", ic: "📦" }, welcome: { n: "Приветственный сундук", ic: "🎉" } };
  const SRC = { lesson: "за урок", level: "за уровень", quest: "за уровень", daily: "ежедневный", shop: "куплен", buy: "куплен", gift: "подарок", admin: "подарок", welcome: "подарок за старт" };
  // Тот же список, что CATALOG в server/players_api.py (id и цены). kind: chest | frame | color | badge | nick_coupon | nick_slot | freeze | hearts
  // Редкий скин = дороже 80 💎 (как на сервере: дешёвые выпадают с «Мифического», дорогие — с «Легендарного»).
  const CAT = [
    { id: "chest", kind: "chest", name: "Сундук", ic: "🎁", price: { bur: 200 }, gives: "chest" },
    { id: "big_chest", kind: "chest", name: "Большой сундук", ic: "🧰", price: { gems: 40 }, gives: "big" },
    { id: "frame_green", kind: "frame", name: "Изумрудная", price: { gems: 50 } },
    { id: "frame_blue", kind: "frame", name: "Морская", price: { gems: 80 } },
    { id: "frame_purple", kind: "frame", name: "Фиолетовая", price: { gems: 120 } },
    { id: "frame_fire", kind: "frame", name: "Огненная", price: { gems: 180 } },
    { id: "frame_gold", kind: "frame", name: "Золотая", price: { gems: 250 } },
    { id: "color_blue", kind: "color", name: "Синий", price: { gems: 30 } },
    { id: "color_purple", kind: "color", name: "Фиолетовый", price: { gems: 50 } },
    { id: "color_red", kind: "color", name: "Красный", price: { gems: 70 } },
    { id: "color_gold", kind: "color", name: "Золотой", price: { gems: 100 } },
    { id: "badge_fire", kind: "badge", name: "Огонь", ic: "🔥", price: { gems: 20 } },
    { id: "badge_cactus", kind: "badge", name: "Кактус", ic: "🌵", price: { gems: 30 } },
    { id: "badge_owl", kind: "badge", name: "Сова", ic: "🦉", price: { gems: 40 } },
    { id: "badge_rocket", kind: "badge", name: "Ракета", ic: "🚀", price: { gems: 50 } },
    { id: "badge_gem", kind: "badge", name: "Бриллиант", ic: "💎", price: { gems: 60 } },
    { id: "badge_hibri", kind: "badge", name: "Хибри", ic: "🐦", price: { gems: 80 } },
    { id: "nick_coupon", kind: "nick_coupon", name: "Купон «редкий ник»", ic: "🏷", price: { gems: 300 } },
    { id: "nick_slot", kind: "nick_slot", name: "Ещё одно место под ник", ic: "➕", price: { gems: 100 } },
    { id: "freeze", kind: "freeze", name: "Заморозка серии", ic: "❄️", price: { bur: 150 } },
    { id: "hearts", kind: "hearts", name: "Полные сердечки", ic: "❤️", price: { bur: 300 } }
  ];
  CAT.forEach(x => { if (["frame", "color", "badge"].includes(x.kind)) x.rare = (x.price.gems || 0) > 80; });
  const PACKS = [{ id: "g100", stars: 50, gems: 100 }, { id: "g350", stars: 150, gems: 350 }, { id: "g1000", stars: 400, gems: 1000 }];
  const BY_ID = Object.fromEntries(CAT.map(x => [x.id, x]));
  const MAX_FREEZES = 2;
  const HIDDEN = ["frame_rainbow"];             // убрано по решению владельца (21.11) — не показываем, даже если сервер пришлёт

  // каталог: с сервера ({id: {name, icon, cur, price, kind?, slot?}} и packs {id: {stars, gems}}) + наши короткие имена; цены сервера главнее
  function catalog() {
    const m = me(), c = m && m.catalog, pk = m && m.packs;
    let items = CAT, packs = PACKS;
    if (c && typeof c === "object" && !Array.isArray(c) && Object.keys(c).length) {
      items = Object.entries(c).filter(([id, v]) => v && typeof v === "object" && /^[a-z0-9_]{1,32}$/.test(id) && !HIDDEN.includes(id)).map(([id, v]) => {
        const base = BY_ID[id] || {};
        const kind = v.slot || (v.kind === "chest" ? "chest" : base.kind || id);
        const price = v.cur && v.price != null ? { [v.cur === "gems" ? "gems" : "bur"]: +v.price } : base.price || {};
        const rare = ["frame", "color", "badge"].includes(kind) && (price.gems || 0) > 80;
        return Object.assign({}, base, { id, kind, price, rare, name: base.name || String(v.name || id), ic: base.ic || v.icon,
          gives: base.gives || (kind === "chest" ? (/big/.test(id) ? "big" : "chest") : undefined) });
      });
    }
    if (pk && typeof pk === "object" && !Array.isArray(pk) && Object.keys(pk).length)
      packs = Object.entries(pk).map(([id, v]) => ({ id, stars: +v.stars, gems: +v.gems })).sort((a, b) => a.stars - b.stars);
    return { items, packs };
  }
  const itemById = (id) => catalog().items.find(x => x.id === id) || BY_ID[id];
  const priceText = (p) => p.gems != null ? `${p.gems} 💎` : p.bur != null ? `${p.bur} 🥐` : "";

  // ---------- СОСТОЯНИЕ ----------
  function me() { return store.get("eco", null); }
  function setMe(m) {
    if (!m || typeof m !== "object") return;
    const old = me();
    const clean = {
      bur: Math.max(0, Math.floor(+m.bur || 0)), gems: Math.max(0, Math.floor(+m.gems || 0)),
      chests: Array.isArray(m.chests) ? m.chests.filter(x => x && x.id != null) : [],
      inv: { items: (m.inv && Array.isArray(m.inv.items)) ? m.inv.items.map(String) : [], equip: (m.inv && m.inv.equip) || {} },
      nick_coupons: Math.max(0, +m.nick_coupons || 0),
      daily_ready: !!m.daily_ready, catalog: m.catalog || (old && old.catalog) || null, packs: m.packs || (old && old.packs) || null,
      cost: (m.minigame_cost && +m.minigame_cost.wheel) || (old && old.cost) || MINIGAME_PRICE, t: Date.now()
    };
    // пустая строка = «не надето»
    Object.keys(clean.inv.equip).forEach(k => { if (!clean.inv.equip[k]) delete clean.inv.equip[k]; });
    store.set("eco", clean);
    // новый сундук (после урока / квеста) → тост и значок
    if (old) {
      const was = new Set((old.chests || []).map(x => String(x.id)));
      const fresh = clean.chests.filter(x => !was.has(String(x.id)) && x.src !== "shop" && x.src !== "buy" && x.kind !== "daily");
      if (fresh.length && !Eco._quiet) toast(fresh.length > 1 ? `🎁 Новые сундуки: ${fresh.length}!` : "🎁 Новый сундук!");
    }
    paint();
  }
  const bur = () => { const m = me(); return m ? m.bur : 0; };
  const gems = () => { const m = me(); return m ? m.gems : 0; };
  function toast(text) { if (window.HAnim) HAnim.play("toast", { text }); else showToast(text); }

  // ---------- СВЯЗЬ С СЕРВЕРОМ ----------
  // Ответ сервера: поля аккаунта + eco {…}; ошибка — error; нехватка — error:"not_enough", need, cur
  // 152-ФЗ: в Telegram — только после согласия на хранение данных (иначе сервер не заводит аккаунт: error "no_consent")
  const consented = () => { try { return !!JSON.parse(localStorage.getItem("hirbis_sync_ok") || "false"); } catch (e) { return false; } };
  async function call(path, body) {
    if (!live()) return Mock.call(path, body || {});
    if (!consented()) return { error: "Сначала разреши сохранять прогресс (⚙️ → Аккаунт)" };
    try {
      const r = await hirbisSync.api("/eco" + path, body || {});
      if (r && r.error === "no_consent") return { error: "Сначала разреши сохранять прогресс (⚙️ → Аккаунт)" };
      if (r) { try { hirbisSync.gotMe(r); } catch (e) {} }        // ник, Plus (сундук мог продлить), бан
      if (r && r.eco) setMe(r.eco);
      return r || {};
    } catch (e) { return { error: e.server ? (/not found|http 404/.test(e.message) ? "Магазин скоро откроется" : e.message) : "Нет связи с сервером" }; }
  }
  async function refresh() { await call("/me"); return me(); }
  const cost = () => ((me() || {}).cost) || MINIGAME_PRICE;
  const errText = (r) => r.error === "not_enough" ? (r.cur === "gems" ? "Не хватает 💎" : "Не хватает 🥐") : r.error;

  // ❄️ / ❤️ — это данные телефона: их кладёт сам телефон (после покупки и из сундука)
  function applyPerk(type) {
    if (type === "freeze") {
      const s = store.get("streak", {}), f = s.freezes == null ? 1 : s.freezes;
      s.freezes = Math.min(MAX_FREEZES, f + 1); store.set("streak", s);
      if (typeof updateToday === "function" && !document.getElementById("home").hidden) updateToday();
    } else if (type === "hearts") {
      store.set("hearts", { n: (window.Hearts && Hearts.MAX) || 10, t: Date.now() });
      if (window.Hearts) Hearts.render();
    }
  }

  // списать за мини-игру: { ok } или { need: сколько не хватает } или { error }
  async function spend(what, game) {
    const r = await call("/spend", { what: what || "minigame", game: game || "wheel" });
    if (r.error === "not_enough") return { need: +r.need || Math.max(1, cost() - bur()) };
    if (r.error) return { error: r.error };
    return { ok: true };
  }
  async function buy(item) {
    const r = await call("/buy", { item });
    if (!r.error && r.apply && r.apply.type) applyPerk(r.apply.type);
    return r;
  }
  async function equip(slot, item) { return call("/equip", { slot, item: item || "" }); }
  // открыть сундук: сервер решает → красивый показ
  async function open(chestId) {
    const ch = ((me() || {}).chests || []).find(x => String(x.id) === String(chestId));
    Eco._quiet = true;
    const r = await call("/open", { id: chestId });
    Eco._quiet = false;
    if (r.error) { showToast(errText(r)); vibrate("error"); return r; }
    const kind = r.kind || (ch && ch.kind) || "chest";
    const steps = Array.isArray(r.steps) && r.steps.length ? r.steps : [r.rarity || "rare"];
    if (r.reward && (r.reward.type === "hearts" || r.reward.type === "freeze")) applyPerk(r.reward.type);
    if (window.ChestFX && typeof ChestFX.play === "function") {
      try { await ChestFX.play({ kind: KIND[kind] && kind !== "welcome" ? kind : (kind === "welcome" ? "big" : "chest"), steps, reward: r.reward }); }
      catch (e) { await simpleShow(kind, steps, r.reward); }
    } else await simpleShow(kind, steps, r.reward);
    return r;
  }
  async function daily() {
    const before = new Set(((me() || {}).chests || []).map(x => String(x.id)));
    Eco._quiet = true;
    const r = await call("/daily");
    Eco._quiet = false;
    if (r.error) { showToast(errText(r)); return r; }
    const ch = (r.chest && r.chest.id != null) ? r.chest : ((me() || {}).chests || []).find(x => !before.has(String(x.id)));
    if (ch) return open(ch.id);
    return r;
  }
  function rewardText(rw) {
    if (!rw) return "Награда";
    const id = rw.item && typeof rw.item === "object" ? rw.item.id : rw.item;
    const it = id ? Object.assign({}, itemById(id) || {}, typeof rw.item === "object" && !itemById(id) ? { name: rw.item.name } : {}) : null;
    switch (rw.type) {
      case "bur": return `+${rw.amount} 🥐`;
      case "gems": return `+${rw.amount} 💎` + (rw.dup ? " (скин уже был)" : "");
      case "skin": return `✨ Скин: ${it ? it.name : rw.item}`;
      case "hearts": return "❤️ Полные сердечки";
      case "freeze": return "❄️ Заморозка серии";
      case "plus": return `✨ Hirbis Plus: ${rw.amount || 1} ${rw.amount > 1 && rw.amount < 5 ? "дня" : rw.amount >= 5 ? "дней" : "день"}`;
      case "nick_coupon": return "🎟 Купон «редкий ник»";
      default: return "Награда";
    }
  }
  // запасной показ, если chest.js ещё нет: шаги редкости по нажатию, потом награда
  function simpleShow(kind, steps, reward) {
    return new Promise(res => {
      const w = document.createElement("div");
      w.id = "ecoChest";
      document.body.appendChild(w);
      let i = 0;
      const draw = () => {
        const r = RAR[steps[i]] || RAR.rare, last = i >= steps.length - 1;
        w.style.setProperty("--rc", r.c);
        w.innerHTML = `<div class="ec-box">
          <div class="ec-ic ec-bump">${(KIND[kind] || KIND.chest).ic}</div>
          <div class="ec-rar">${r.n}</div>
          ${last ? `<div class="ec-rw">${esc(rewardText(reward))}</div><button class="btn blue" id="ecOk">Забрать</button>`
            : `<div class="ec-tap">Нажми — вдруг лучше? 👆</div>`}</div>`;
        if (last) { if (window.HAnim) HAnim.confetti({ size: steps.length > 2 ? "big" : "small" }); vibrate("success"); playSound("finish");
          w.querySelector("#ecOk").onclick = (e) => { e.stopPropagation(); w.classList.remove("show"); setTimeout(() => { w.remove(); res(); }, 200); }; }
        else { vibrate("medium"); playSound("combo"); }
      };
      w.onclick = () => { if (i < steps.length - 1) { i++; draw(); } };
      draw();
      requestAnimationFrame(() => w.classList.add("show"));
    });
  }

  // ---------- ЗНАЧКИ 🥐 💎 🎁 ----------
  function chipsHTML() {
    const n = ((me() || {}).chests || []).length + ((me() || {}).daily_ready ? 1 : 0);
    return `<button class="eco-chip" data-eco="bur" aria-label="Бурекасы">🥐 <b data-bur>${bur()}</b></button>` +
      `<button class="eco-chip gem" data-eco="gems" aria-label="Хибриллианты">💎 <b data-gems>${gems()}</b></button>` +
      `<button class="eco-chip gift" data-eco="chests" aria-label="Сундуки" ${n ? "" : "hidden"}>🎁 <b data-chests>${n}</b></button>`;
  }
  function paint() {
    const n = ((me() || {}).chests || []).length + ((me() || {}).daily_ready ? 1 : 0);
    document.querySelectorAll("[data-bur]").forEach(e => { e.textContent = bur(); });
    document.querySelectorAll("[data-gems]").forEach(e => { e.textContent = gems(); });
    document.querySelectorAll("[data-chests]").forEach(e => { e.textContent = n; const b = e.closest(".eco-chip"); if (b) b.hidden = !n; });
    const sd = document.getElementById("goShopDesc");
    if (sd) sd.textContent = n ? `🎁 Сундуков: ${n} — открой!` : "Сундуки, скины, ники";
    const gd = document.getElementById("goGamesDesc");
    if (gd) gd.textContent = `🥐 ${bur()} · Вордл и «Буквы по кругу»`;
  }
  // нажатие на значок
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-eco]"); if (!b) return;
    const k = b.dataset.eco;
    openShop(k === "gems" ? "gems" : "chests");
  });
  // на главной — значки сверху слева
  function homeBar() {
    const home = document.getElementById("home"); if (!home) return;
    let bar = document.getElementById("ecoHome");
    if (!bar) { bar = document.createElement("div"); bar.id = "ecoHome"; bar.className = "eco-bar"; home.prepend(bar); }
    bar.innerHTML = chipsHTML();
  }

  // ---------- ЭКРАН «МАГАЗИН» ----------
  const TABS = [["chests", "🎁 Сундуки"], ["skins", "✨ Скины"], ["nicks", "🏷 Ники"], ["useful", "❤️ Полезное"], ["gems", "💎 за ⭐"]];
  let tab = "chests", dailyTimer = null;
  function openShop(t) {
    if (t) tab = t;
    if (typeof stopHomeBird === "function") stopHomeBird();
    document.querySelectorAll("body > section").forEach(s => s.hidden = s.id !== "shop");
    if (tg && tg.BackButton) tg.BackButton.show();
    window.scrollTo(0, 0);
    renderShop();
    refresh().then(() => { if (!document.getElementById("shop").hidden) renderShop(); });
  }
  function renderShop() {
    const v = document.getElementById("shop");
    v.innerHTML = `
      <div class="mg-top"><button class="mg-back" id="shBack" aria-label="Назад">‹</button><div class="mg-title">Магазин</div><span></span></div>
      <div class="eco-bar eco-bar-in">${chipsHTML()}</div>
      <div class="sh-tabs" id="shTabs">${TABS.map(([k, n]) => `<button data-t="${k}" class="${k === tab ? "on" : ""}">${n}</button>`).join("")}</div>
      <div id="shBody"></div>`;
    v.querySelector("#shBack").onclick = () => showHome();
    v.querySelector("#shTabs").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; vibrate("light"); renderShop(); };
    const on = v.querySelector("#shTabs .on"); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center" });
    const body = v.querySelector("#shBody");
    ({ chests: tabChests, skins: tabSkins, nicks: tabNicks, useful: tabUseful, gems: tabGems })[tab](body);
  }
  // кнопка покупки: первое нажатие — «Точно?», второе — купить
  function buyBtn(it, label) {
    const can = it.price.gems != null ? gems() >= it.price.gems : bur() >= (it.price.bur || 0);
    return `<button class="sh-buy${can ? "" : " poor"}" data-buy="${esc(it.id)}">${label || priceText(it.price)}</button>`;
  }
  function bindBuy(body) {
    body.querySelectorAll("[data-buy]").forEach(b => b.onclick = async () => {
      const it = catalog().items.find(x => x.id === b.dataset.buy); if (!it) return;
      const p = it.price, short = p.gems != null ? p.gems - gems() : (p.bur || 0) - bur();
      if (short > 0) { needSheet(p.gems != null ? "gems" : "bur", short); return; }
      if (!b.classList.contains("confirm")) { b.classList.add("confirm"); b.textContent = `Купить за ${priceText(p)}?`; vibrate("light"); return; }
      b.disabled = true; b.textContent = "…";
      const r = await buy(it.id);
      if (r.error === "not_enough") { renderShop(); needSheet(r.cur === "gems" ? "gems" : "bur", +r.need || 1); return; }
      if (r.error) { showToast(r.error); vibrate("error"); renderShop(); return; }
      vibrate("success"); playSound("right");
      toast(it.kind === "chest" ? "🎁 Сундук в очереди!" : `✅ ${it.name}`);
      renderShop();
    });
  }

  function msToMskMidnight() {
    const now = Date.now(), msk = now + 3 * 3600e3, d = new Date(msk);
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - 3 * 3600e3;
    return next - now;
  }
  const hm = (ms) => { const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4); return h ? `${h} ч ${String(m).padStart(2, "0")} мин` : `${m} мин`; };

  function tabChests(body) {
    const m = me() || { chests: [] }, cat = catalog().items;
    const ready = m.daily_ready;
    body.innerHTML = `
      <div class="sh-daily${ready ? " ready" : ""}">
        <div class="sh-ic">📦</div>
        <div class="sh-tx"><b>Ежедневный сундук</b><small>${ready ? "Бесплатно — забирай!" : `Новый через <span id="shDailyLeft">${hm(msToMskMidnight())}</span>`}</small></div>
        ${ready ? `<button class="sh-buy go" id="shDaily">Открыть</button>` : `<span class="sh-wait">⏳</span>`}
      </div>
      <div class="sh-h">Мои сундуки${m.chests.length ? " · " + m.chests.length : ""}</div>
      ${m.chests.length ? `<div class="sh-queue">${m.chests.map(c => { const k = KIND[c.kind] || KIND.chest; return `
        <div class="sh-chest k-${esc(c.kind)}"><div class="sh-ic">${k.ic}</div>
          <div class="sh-tx"><b>${k.n}</b><small>${esc(SRC[c.src] || (String(c.src || "").startsWith("a1-") ? "за урок" : "награда"))}</small></div>
          <button class="sh-buy go" data-open="${esc(c.id)}">Открыть</button></div>`; }).join("")}</div>`
        : `<div class="sh-empty">Пока нет сундуков.<br>Пройди урок — получишь 🎁</div>
           <button class="btn blue sh-learn" id="shLearn">🎯 К урокам</button>`}
      <div class="sh-h">Купить</div>
      ${cat.filter(x => x.kind === "chest").map(it => `<div class="sh-item"><div class="sh-ic">${it.ic || "🎁"}</div>
        <div class="sh-tx"><b>${esc(it.name)}</b><small>${it.gives === "big" ? "Сразу с «Эпического»" : "С «Редкого» и выше"}</small></div>${buyBtn(it)}</div>`).join("")}
      <div class="sh-note">Редкость растёт при открытии: <span class="sh-rars">${Object.values(RAR).map(r => `<i style="--rc:${r.c}">${r.n}</i>`).join("")}</span></div>
      <div class="sh-note">Шансы (обычный сундук): Редкий 50% · Сверхредкий 30% · Эпический 14% · Мифический 3,6% · Легендарный 2,4%. Большой сундук: Эпический 70% · Мифический 18% · Легендарный 12%.</div>`;
    const d = body.querySelector("#shDaily");
    if (d) d.onclick = async () => { d.disabled = true; await daily(); renderShop(); };
    body.querySelectorAll("[data-open]").forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = "…"; await open(b.dataset.open); renderShop(); });
    const l = body.querySelector("#shLearn"); if (l) l.onclick = () => showPath();
    bindBuy(body);
    clearInterval(dailyTimer);
    dailyTimer = setInterval(() => {
      const el = document.getElementById("shDailyLeft"); if (!el) return clearInterval(dailyTimer);
      const ms = msToMskMidnight(); el.textContent = hm(ms);
      if (ms < 1500) { clearInterval(dailyTimer); setTimeout(() => refresh().then(renderShop), 2500); }
    }, 20000);
  }

  function myHead(size, frame) {
    let svg = "🙂";
    try { if (window.HirbisAvatar && typeof myAvatar === "function") svg = HirbisAvatar.svg(myAvatar(), { view: "head" }); } catch (e) {}
    return `<span class="sk-ava${frame ? " sk-f-" + frame : ""}" style="width:${size}px;height:${size}px">${svg}</span>`;
  }
  function tabSkins(body) {
    const m = me() || { inv: { items: [], equip: {} } }, inv = m.inv || { items: [], equip: {} }, eq = inv.equip || {};
    const items = catalog().items, name = (typeof profile !== "undefined" && profile && profile.name) || "Ты";
    const owned = (id) => inv.items.includes(id);
    const tile = (it) => {
      const on = eq[it.kind] === it.id, have = owned(it.id);
      const prev = it.kind === "frame" ? myHead(54, it.id) : it.kind === "color" ? `<span class="sk-name sk-c-${it.id}">${esc(name)}</span>` : `<span class="sk-bigb">${it.ic || "⭐"}</span>`;
      return `<div class="sk-tile${on ? " on" : ""}${it.rare ? " rare" : ""}">${it.rare ? `<i class="sk-rare">редкий</i>` : ""}
        <div class="sk-prev">${prev}</div><div class="sk-n">${esc(it.name)}</div>
        ${have ? `<button class="sh-buy ${on ? "poor" : "go"}" data-eq="${esc(it.kind)}" data-id="${esc(it.id)}">${on ? "Снять" : "Надеть"}</button>` : buyBtn(it)}</div>`;
    };
    const group = (kind, title) => { const l = items.filter(x => x.kind === kind); return l.length ? `<div class="sh-h">${title}</div><div class="sk-grid">${l.map(tile).join("")}</div>` : ""; };
    const badge = eq.badge && BY_ID[eq.badge] ? BY_ID[eq.badge].ic : "";
    body.innerHTML = `
      <div class="sk-me">${myHead(76, eq.frame)}<div><span class="sk-name${eq.color ? " sk-c-" + esc(eq.color) : ""}">${esc(name)}</span>${badge ? ` <span class="sk-badge">${badge}</span>` : ""}<small>Так тебя видят друзья</small></div></div>
      ${group("frame", "🖼 Рамки")}${group("color", "🎨 Цвет ника")}${group("badge", "🏅 Значок у ника")}
      <div class="sh-note">Скины покупаются за 💎 или выпадают из сундуков.</div>`;
    body.querySelectorAll("[data-eq]").forEach(b => b.onclick = async () => {
      const on = (eq[b.dataset.eq] === b.dataset.id);
      b.disabled = true;
      const r = await equip(b.dataset.eq, on ? null : b.dataset.id);
      if (r.error) showToast(r.error); else vibrate("light");
      renderShop();
    });
    bindBuy(body);
  }

  function tabNicks(body) {
    const m = me() || {}, items = catalog().items, have = m.nick_coupons || 0;
    const it = (id) => items.find(x => x.id === id);
    const c = it("nick_coupon"), s = it("nick_slot");
    body.innerHTML = `
      ${c ? `<div class="sh-item big"><div class="sh-ic">🎟</div><div class="sh-tx"><b>Купон «редкий ник»</b><small>Короткий ник из 3–4 знаков, например @dag${have ? ` · у тебя: ${have}` : ""}</small></div>${buyBtn(c)}</div>` : ""}
      ${s ? `<div class="sh-item big"><div class="sh-ic">➕</div><div class="sh-tx"><b>Ещё одно место под ник</b><small>Можно держать больше ников</small></div>${buyBtn(s)}</div>` : ""}
      <div class="sh-note">Ник добавляется в ⚙️ → «Аккаунт».<br>Скоро: рынок ников между игроками за 💎.</div>`;
    bindBuy(body);
  }

  function tabUseful(body) {
    const items = catalog().items, it = (id) => items.find(x => x.id === id);
    const fr = typeof streakInfo === "function" ? (streakInfo() || {}).freezes : null;
    const hn = window.Hearts ? Hearts.n() : null;
    const f = it("freeze"), h = it("hearts");
    body.innerHTML = `
      ${f ? `<div class="sh-item big"><div class="sh-ic">❄️</div><div class="sh-tx"><b>Заморозка серии</b><small>Пропустишь день — серия не сгорит${fr != null ? ` · есть: ${fr} из ${MAX_FREEZES}` : ""}</small></div>${fr != null && fr >= MAX_FREEZES ? `<span class="sh-buy poor">Максимум</span>` : buyBtn(f)}</div>` : ""}
      ${h ? `<div class="sh-item big"><div class="sh-ic">❤️</div><div class="sh-tx"><b>Полные сердечки</b><small>Сразу ${(window.Hearts && Hearts.MAX) || 10} ❤️${hn != null ? ` · сейчас: ${hn === Infinity ? "∞" : hn}` : ""}</small></div>${hn === Infinity || hn >= ((window.Hearts && Hearts.MAX) || 10) ? `<span class="sh-buy poor">Уже полные</span>` : buyBtn(h)}</div>` : ""}
      <div class="sh-note">🥐 бурекасы дают за уроки: 1 очко = 1 🥐.</div>`;
    bindBuy(body);
  }

  function tabGems(body) {
    const packs = catalog().packs;
    body.innerHTML = `
      <div class="sh-gems">${packs.map((p, i) => `<button class="sh-pack${i === 1 ? " best" : ""}" data-pack="${esc(p.id)}">
          ${i === 1 ? `<i class="sh-hit">выгодно</i>` : ""}<span class="sh-pack-g">💎 ${p.gems}</span><span class="sh-pack-s">${p.stars} ⭐</span></button>`).join("")}</div>
      <div class="sh-note">💎 — для скинов, редких ников и больших сундуков.<br>Оплата звёздами Telegram, разовая.</div>`;
    body.querySelectorAll("[data-pack]").forEach(b => b.onclick = () => payGems(b));
  }
  async function payGems(b) {
    const tgw = window.Telegram && Telegram.WebApp;
    if (!live() || !tgw || typeof tgw.openInvoice !== "function") { showToast("Оплата работает в приложении Hirbis в Telegram"); return; }
    b.disabled = true;
    const r = await call("/gems_invoice", { pack: b.dataset.pack });
    if (r.error || !r.link) { showToast(r.error || "Оплата сейчас недоступна"); b.disabled = false; return; }
    const before = gems();
    tgw.openInvoice(r.link, async (status) => {
      if (status !== "paid") { if (status === "failed") showToast("Оплата не прошла"); b.disabled = false; return; }
      showToast("Зачисляю 💎…");
      for (let i = 0; i < 10 && gems() <= before; i++) { await new Promise(res => setTimeout(res, 1500)); Eco._quiet = true; await refresh(); Eco._quiet = false; }
      if (gems() > before) { toast(`💎 +${gems() - before}!`); vibrate("success"); if (window.HAnim) HAnim.confetti({ size: "big" }); }
      else showToast("Оплата прошла — 💎 придут через минуту 🙏");
      if (!document.getElementById("shop").hidden) renderShop();
    });
  }

  // окно «Нужно ещё N …»
  function needSheet(cur, n) {
    const old = document.getElementById("mgNeed"); if (old) old.remove();
    const s = document.createElement("div");
    s.id = "mgNeed";
    const isGem = cur === "gems";
    s.innerHTML = `<div class="mg-sheet">
        <div class="mg-need-bird" id="mgNeedBird"></div>
        <div class="mg-need-h">Нужно ещё ${n} ${isGem ? "💎" : burWord(n)}</div>
        <div class="mg-need-sub">${isGem ? "💎 есть в сундуках и в магазине" : "Пройди урок — и 🥐 появятся"}</div>
        <button class="btn blue" id="mgNeedGo">${isGem ? "💎 Получить" : "🎯 К урокам"}</button>
        <button class="btn ghost" id="mgNeedNo">Позже</button></div>`;
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add("show"));
    const close = () => { s.classList.remove("show"); setTimeout(() => s.remove(), 250); };
    s.onclick = (e) => { if (e.target === s) close(); };
    s.querySelector("#mgNeedNo").onclick = close;
    s.querySelector("#mgNeedGo").onclick = () => { close(); if (isGem) openShop("gems"); else showPath(); };
    if (window.HAnim) HAnim.mascot(s.querySelector("#mgNeedBird"), "think", { size: 80 });
    vibrate("warning");
  }
  function burWord(n) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? "бурекас" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "бурекаса" : "бурекасов"; }

  // ---------- СКИНЫ У ДРУЗЕЙ (friends.js): только id из нашего каталога ----------
  function skin(x) {
    const ok = (id, kind) => (typeof id === "string" && BY_ID[id] && BY_ID[id].kind === kind) ? id : null;
    const f = ok(x && x.frame, "frame"), c = ok(x && x.color, "color"), b = ok(x && x.badge, "badge");
    return { frame: f ? " sk-f-" + f : "", color: c ? " sk-c-" + c : "", badge: b ? ` <span class="sk-badge">${BY_ID[b].ic}</span>` : "" };
  }

  // ---------- МОК-СЕРВЕР (браузер без Telegram) ----------
  const Mock = (function () {
    const K = "eco_mock", CAP = 1500;
    const mskDay = () => { const d = new Date(Date.now() + 3 * 3600e3); return d.getUTCFullYear() + "-" + (d.getUTCMonth() + 1) + "-" + d.getUTCDate(); };
    const lessonsDone = () => (store.get("done", []) || []).filter(id => /^a1-\d+-\d+$/.test(id));
    const questsDone = () => { const o = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^hirbis_quest_q-/.test(k) && localStorage.getItem(k) === "true") o.push(k.slice(7)); } } catch (e) {} return o; };
    function earned() {
      let s = 0;
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^hirbis_points_\d{4}-\d{1,2}-\d{1,2}$/.test(k)) s += Math.min(CAP, Number(JSON.parse(localStorage.getItem(k))) || 0); } } catch (e) {}
      return s;
    }
    function st() {
      let s = store.get(K, null);
      // как сервер: уже пройденное сундуков не даёт, но есть один приветственный сундук
      if (!s) s = { spent: 0, bonus: 0, gems: 0, coupons: 0, chests: [{ id: 1, kind: "welcome", src: "welcome", at: Date.now() / 1e3 }], next: 2, items: [], equip: {}, daily: "", seenL: lessonsDone(), seenQ: questsDone() };
      // сундуки за новые пройденные уроки и уровни (один раз)
      lessonsDone().forEach(id => { if (!s.seenL.includes(id)) { s.seenL.push(id); s.chests.push({ id: s.next++, kind: "chest", src: "lesson", at: Date.now() / 1e3 }); } });
      questsDone().forEach(id => { if (!s.seenQ.includes(id)) { s.seenQ.push(id); s.chests.push({ id: s.next++, kind: "big", src: "level", at: Date.now() / 1e3 }); } });
      return s;
    }
    const save = (s) => store.set(K, s);
    const legacy = () => Number(store.get("wallet_spent", 0)) || 0;       // старый кошелёк мини-игр
    const burOf = (s) => Math.max(0, earned() - legacy() - s.spent + s.bonus);
    // каталог и наборы — в том же виде, что присылает сервер (проверяем разбор catalog())
    const SRV_CAT = Object.fromEntries(CAT.map(x => [x.id, Object.assign({ name: x.name, icon: x.ic || "", cur: x.price.gems != null ? "gems" : "bur", price: x.price.gems != null ? x.price.gems : x.price.bur },
      ["frame", "color", "badge"].includes(x.kind) ? { slot: x.kind } : { kind: x.kind === "chest" ? "chest" : /nick/.test(x.kind) ? "nick" : "perk" })]));
    const SRV_PACKS = Object.fromEntries(PACKS.map(p => [p.id, { stars: p.stars, gems: p.gems }]));
    const eco = (s) => ({ bur: burOf(s), gems: s.gems, nick_coupons: s.coupons || 0, daily_ready: s.daily !== mskDay(), chests: s.chests,
      inv: { items: s.items, equip: Object.assign({ frame: "", color: "", badge: "" }, s.equip) }, catalog: SRV_CAT, packs: SRV_PACKS, minigame_cost: { wheel: MINIGAME_PRICE } });
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    const pick = (l) => l[Math.floor(Math.random() * l.length)];
    const ORDER = ["rare", "super", "epic", "mythic", "legendary"], UP = { rare: .5, super: .4, epic: .3, mythic: .4 };
    const START = { chest: 0, daily: 0, big: 2, welcome: 2 };
    function reward(s, rar) {
      const skin = (cheap) => {
        const l = CAT.filter(x => ["frame", "color", "badge"].includes(x.kind) && ((x.price.gems || 0) <= 80) === cheap && !s.items.includes(x.id));
        if (!l.length) { const g = cheap ? 40 : 120; s.gems += g; return { type: "gems", amount: g }; }
        const it = pick(l); s.items.push(it.id); return { type: "skin", item: { id: it.id, name: it.name, icon: it.ic || "", slot: it.kind } };
      };
      if (rar === "rare") { const a = rnd(20, 40); s.bonus += a; return { type: "bur", amount: a }; }
      if (rar === "super") { if (Math.random() < .25) return { type: "hearts" }; const a = rnd(60, 100); s.bonus += a; return { type: "bur", amount: a }; }
      if (rar === "epic") { const k = pick(["gems", "bur", "freeze"]); if (k === "gems") { const a = rnd(5, 10); s.gems += a; return { type: "gems", amount: a }; } if (k === "bur") { s.bonus += 200; return { type: "bur", amount: 200 }; } return { type: "freeze" }; }
      if (rar === "mythic") { const k = pick(["gems", "skin", "plus"]); if (k === "gems") { s.gems += 25; return { type: "gems", amount: 25 }; } return k === "skin" ? skin(true) : { type: "plus", amount: 1 }; }
      const k = pick(["gems", "skin", "coupon", "plus"]);
      if (k === "gems") { s.gems += 100; return { type: "gems", amount: 100 }; }
      if (k === "coupon") { s.coupons = (s.coupons || 0) + 1; return { type: "nick_coupon" }; }
      return k === "skin" ? skin(false) : { type: "plus", amount: 3 };
    }
    // ответы — как у сервера: { ok, eco, … } / { error, eco } / { error:"not_enough", need, cur, eco }
    async function call(path, b) {
      await new Promise(r => setTimeout(r, 120));
      const s = st();
      const out = (extra) => { save(s); return Object.assign({ eco: eco(s) }, extra || {}); };
      const short = (cur, price) => out({ error: "not_enough", need: price - (cur === "gems" ? s.gems : burOf(s)), cur });
      switch (path) {
        case "/me": return out();
        case "/daily":
          if (s.daily === mskDay()) return out({ error: "Сегодня сундук уже забран. Новый — завтра 🌙" });
          s.daily = mskDay(); s.chests.push({ id: s.next++, kind: "daily", src: "daily", at: Date.now() / 1e3 });
          return out({ ok: true });
        case "/open": {
          const i = s.chests.findIndex(c => String(c.id) === String(b.id));
          if (i < 0) return out({ error: "Сундук не найден" });
          const c = s.chests.splice(i, 1)[0];
          let k = START[c.kind] || 0; const steps = [ORDER[k]];
          while (k < 4 && Math.random() < UP[ORDER[k]]) { k++; steps.push(ORDER[k]); }
          return out({ ok: true, kind: c.kind, steps, rarity: ORDER[k], reward: reward(s, ORDER[k]) });
        }
        case "/buy": {
          const it = BY_ID[b.item]; if (!it) return out({ error: "Такого товара нет" });
          if (["frame", "color", "badge"].includes(it.kind) && s.items.includes(it.id)) return out({ error: "Это уже твоё 🙂" });
          if (it.price.gems != null) { if (s.gems < it.price.gems) return short("gems", it.price.gems); s.gems -= it.price.gems; }
          else { if (burOf(s) < it.price.bur) return short("bur", it.price.bur); s.spent += it.price.bur; }
          let apply = {};
          if (it.kind === "chest") s.chests.push({ id: s.next++, kind: it.gives, src: "shop", at: Date.now() / 1e3 });
          else if (it.kind === "nick_coupon") s.coupons = (s.coupons || 0) + 1;
          else if (it.kind === "freeze" || it.kind === "hearts") apply = { type: it.kind };
          else if (it.kind !== "nick_slot") s.items.push(it.id);
          return out({ ok: true, item: it.id, apply });
        }
        case "/equip": {
          if (b.item && !s.items.includes(b.item)) return out({ error: "Этого скина у тебя нет" });
          if (b.item) s.equip[b.slot] = b.item; else delete s.equip[b.slot];
          return out({ ok: true });
        }
        case "/spend": if (burOf(s) < MINIGAME_PRICE) return short("bur", MINIGAME_PRICE); s.spent += MINIGAME_PRICE; return out({ ok: true });
        case "/gems_invoice": return { error: "Оплата работает в приложении Hirbis в Telegram" };
        default: return { error: "not found" };
      }
    }
    // в браузере ответ мока проходит тот же путь, что ответ сервера (setMe из r.eco)
    async function wrapped(path, b) { const r = await call(path, b); if (r && r.eco) setMe(r.eco); return r; }
    return { call: wrapped, add(o) { const s = st(); if (o.bur) s.bonus += o.bur; if (o.gems) s.gems += o.gems; save(s); return refresh(); } };
  })();

  // ---------- ПОСЛЕ УРОКА / КВЕСТА: сундук мог появиться ----------
  let rt = null;
  const origSet = store.set.bind(store);
  store.set = (k, v) => {
    origSet(k, v);
    if (k === "done" || /^quest_q-/.test(k) || /^points_/.test(k)) { clearTimeout(rt); rt = setTimeout(refresh, live() ? 5000 : 400); }
  };

  // ---------- ВСЁ ВМЕСТЕ ----------
  const Eco = window.Eco = { me, refresh, spend, buy, open, equip, daily, bur, gems, chipsHTML, paint, openShop, needSheet, burWord, skin, catalog, RAR, KIND, PRICE: MINIGAME_PRICE, _quiet: false, mock: Mock };

  const card = document.getElementById("go-shop");
  if (card) card.onclick = () => openShop("chests");
  const prevToday = window.updateToday;
  window.updateToday = function () { prevToday(); homeBar(); paint(); };
  homeBar(); paint();
  Eco._quiet = true;
  setTimeout(() => refresh().then(() => { Eco._quiet = false; }), live() ? 3000 : 300);
})();
