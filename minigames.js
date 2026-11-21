// =====================================================
// МИНИ-ИГРЫ: раздел с играми (#minigames) и КОШЕЛЁК очков.
// Кошелёк отдельный (решение владельца): очки за учёбу копятся, трата НЕ уменьшает очки дня и рейтинг.
//   баланс = сумма всех store "points_Г-М-Д" (очки дней) − store "wallet_spent" (сколько потрачено всего).
// Игры: «Вордл · слово дня» (wordle.js, бесплатно раз в день, даёт очки) и «Буквы по кругу» (wordwheel.js, стоит очки).
// =====================================================
(function () {
  const view = () => document.getElementById("minigames");
  let mgView = null;            // что сейчас открыто в разделе: "menu" | "wheel" | null
  let wdFromMenu = false;       // Вордл открыт из мини-игр (кнопка «Назад» вернёт сюда)

  // ---------- КОШЕЛЁК ----------
  function earned() {
    let s = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^hirbis_points_\d{4}-\d{1,2}-\d{1,2}$/.test(k)) s += Number(JSON.parse(localStorage.getItem(k))) || 0;
      }
    } catch (e) {}
    return s;
  }
  const spent = () => Number(store.get("wallet_spent", 0)) || 0;
  const balance = () => Math.max(0, Math.round(earned() - spent()));
  function spend(n) {
    if (balance() < n) return false;
    store.set("wallet_spent", spent() + n);
    refreshChips();
    return true;
  }
  // все значки кошелька на экране обновляются сами
  function refreshChips() { document.querySelectorAll("[data-wallet]").forEach(el => { el.textContent = balance(); }); }
  const chip = () => `<span class="mg-chip" aria-label="Очков в кошельке">🪙 <b data-wallet>${balance()}</b></span>`;

  // Не хватает очков → окошко снизу «Нужно ещё N очков» + кнопка к урокам
  function need(price) {
    const old = document.getElementById("mgNeed"); if (old) old.remove();
    const s = document.createElement("div");
    s.id = "mgNeed";
    const n = price - balance();
    s.innerHTML = `<div class="mg-sheet">
        <div class="mg-need-bird" id="mgNeedBird"></div>
        <div class="mg-need-h">Нужно ещё ${n} ${pointsWord(n)}</div>
        <div class="mg-need-sub">Пройди урок — и очки появятся 🪙</div>
        <button class="btn blue" id="mgNeedGo">🎯 К урокам</button>
        <button class="btn ghost" id="mgNeedNo">Позже</button></div>`;
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add("show"));
    const close = () => { s.classList.remove("show"); setTimeout(() => s.remove(), 250); };
    s.onclick = (e) => { if (e.target === s) close(); };
    document.getElementById("mgNeedNo").onclick = close;
    document.getElementById("mgNeedGo").onclick = () => { close(); mgView = null; showPath(); };
    if (window.HAnim) HAnim.mascot(document.getElementById("mgNeedBird"), "think", { size: 80 });
    vibrate("warning");
  }
  function pointsWord(n) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return "очко";
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "очка";
    return "очков";
  }
  window.Wallet = { balance, earned, spend, need, chip, refresh: refreshChips, pointsWord };

  // ---------- ЭКРАН «МИНИ-ИГРЫ» ----------
  function show() {
    if (typeof stopHomeBird === "function") stopHomeBird();
    document.querySelectorAll("body > section").forEach(s => s.hidden = s.id !== "minigames");
    if (tg && tg.BackButton) tg.BackButton.show();
  }
  window.openMinigames = function () {
    show();
    mgView = "menu";
    const wdDone = typeof window.wordleTodayDone === "function" && wordleTodayDone();
    const price = window.WHEEL_PRICE || 30;
    const going = window.wheelInProgress && wheelInProgress();
    view().innerHTML = `
      <div class="mg-top"><button class="mg-back" id="mgBack" aria-label="Назад">‹</button><div class="mg-title">Мини-игры</div><span></span></div>
      <div class="mg-wallet">
        <div class="mg-coin">🪙</div>
        <div class="mg-wallet-t"><b data-wallet>${balance()}</b><span>очков в кошельке</span></div>
      </div>
      <div class="mg-note">Очки — за уроки. Игры их тратят, а рейтинг не трогают.</div>
      <button class="mg-game" id="mgWordle">
        <span class="mg-ic mg-ic-wd">🟩</span>
        <span class="mg-tx"><b>Вордл · слово дня</b><small>Угадай слово за 6 попыток</small></span>
        <span class="mg-price ${wdDone ? "ok" : "free"}">${wdDone ? "✓ сегодня" : "бесплатно"}</span>
      </button>
      <button class="mg-game" id="mgWheel">
        <span class="mg-ic mg-ic-ww" dir="rtl"><i>ש</i><i>ל</i><i>ו</i><i>ם</i></span>
        <span class="mg-tx"><b>Буквы по кругу</b><small>Веди пальцем по буквам — собери слова</small></span>
        <span class="mg-price">${going ? "продолжить" : price + " 🪙"}</span>
      </button>`;
    document.getElementById("mgBack").onclick = () => { mgView = null; showHome(); };
    document.getElementById("mgWordle").onclick = () => { wdFromMenu = true; mgView = null; openWordle(); };
    document.getElementById("mgWheel").onclick = () => { if (window.openWheel) { mgView = "wheel"; openWheel(view()); } };
  };
  // wordwheel.js сообщает, что игра открыта/закрыта (для кнопки «Назад»)
  window.mgSetView = (v) => { mgView = v; };

  // Кнопка «Назад» Telegram: app.js уже вернул на главную — если были в игре внутри раздела, возвращаемся в список игр.
  // (обработчик app.js срабатывает раньше: он зарегистрирован первым)
  if (tg && tg.BackButton) tg.BackButton.onClick(() => {
    if (mgView === "wheel" || wdFromMenu) { wdFromMenu = false; openMinigames(); }
    else mgView = null;
  });
  // ушли из раздела любым путём — забываем, где были
  const watch = (id, fn) => { const el = document.getElementById(id); if (el) new MutationObserver(() => { if (el.hidden) fn(); }).observe(el, { attributes: true, attributeFilter: ["hidden"] }); };
  watch("minigames", () => { mgView = null; });
  watch("wordle", () => { setTimeout(() => { wdFromMenu = false; }, 0); });

  // ---------- КАРТОЧКА НА ГЛАВНОЙ ----------
  const card = document.getElementById("go-games");
  if (card) card.onclick = () => openMinigames();
  const prevToday = window.updateToday;
  window.updateToday = function () {
    prevToday();
    const d = document.getElementById("goGamesDesc");
    if (d) d.innerHTML = `🪙 ${balance()} · Вордл и «Буквы по кругу»`;
  };
  const d0 = document.getElementById("goGamesDesc");
  if (d0) d0.innerHTML = `🪙 ${balance()} · Вордл и «Буквы по кругу»`;
})();
