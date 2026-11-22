// =====================================================
// МИНИ-ИГРЫ: раздел с играми (#minigames).
// Платят 🥐 БУРЕКАСАМИ (eco.js, window.Eco; валюта живёт на сервере). Трата НЕ уменьшает очки дня и рейтинг.
// window.Wallet — обёртка над Eco (старое имя, чтобы ничего не сломалось): balance(), spend(n) → Promise<bool>, need(n).
// Игры: «Вордл · слово дня» (wordle.js, бесплатно раз в день, даёт очки) и «Буквы по кругу» (wordwheel.js, 30 🥐).
// =====================================================
(function () {
  const view = () => document.getElementById("minigames");
  let mgView = null;            // что сейчас открыто в разделе: "menu" | "wheel" | null
  let wdFromMenu = false;       // Вордл открыт из мини-игр (кнопка «Назад» вернёт сюда)
  // 22.11: иконка Вордла — маленькое поле 3×3 (серые/жёлтые/зелёные плитки с буквами, нижний ряд угадан), плоский стиль с одной тенью
  const WORDLE_IC = (() => {
    const C = { g: ["#58cc02", "#46a302"], y: ["#ffc800", "#e5a400"], n: ["#c5ced8", "#a8b3bf"] };
    const rows = [["n", "y", "n"], ["y", "g", "n"], ["g", "g", "g"]], letters = [["ת", "ל", "ב"], ["ש", "ו", "ר"], ["ם", "ו", "ל"]];
    let s = "";
    rows.forEach((r, j) => r.forEach((k, i) => {
      const x = 4 + i * 16, y = 4 + j * 16;
      s += `<rect x="${x}" y="${y + 1.5}" width="14" height="14" rx="3" fill="${C[k][1]}"/><rect x="${x}" y="${y}" width="14" height="13" rx="3" fill="${C[k][0]}"/>` +
        `<text x="${x + 7}" y="${y + 10}" text-anchor="middle" font-size="9" font-weight="800" fill="#fff" font-family="Arial, sans-serif">${letters[j][i]}</text>`;
    }));
    return `<svg viewBox="0 0 56 56" width="44" height="44" aria-hidden="true">${s}</svg>`;
  })();

  // ---------- КОШЕЛЁК = 🥐 бурекасы из eco.js ----------
  const balance = () => (window.Eco ? Eco.bur() : 0);
  // списать за раунд мини-игры (сервер списывает фиксированную цену Eco.PRICE)
  async function spend() {
    if (!window.Eco) return false;
    const r = await Eco.spend("minigame", "wheel");
    if (r.need) { need(Eco.PRICE, r.need); return false; }
    if (r.error) { showToast(r.error); return false; }
    return true;
  }
  function refreshChips() { if (window.Eco) Eco.paint(); }
  const chip = () => `<span class="mg-chip" aria-label="Бурекасы">🥐 <b data-bur>${balance()}</b></span>`;
  // Не хватает → окошко «Нужно ещё N бурекасов» + кнопка к урокам
  function need(price, short) {
    if (window.Eco) Eco.needSheet("bur", short != null ? short : Math.max(1, price - balance()));
  }
  window.Wallet = { balance, spend, need, chip, refresh: refreshChips };

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
        <button class="mg-wl" data-eco="bur"><span class="mg-coin">🥐</span><span class="mg-wallet-t"><b data-bur>${balance()}</b><span>бурекасов</span></span></button>
        <button class="mg-wl gem" data-eco="gems"><span class="mg-coin">💎</span><span class="mg-wallet-t"><b data-gems>${window.Eco ? Eco.gems() : 0}</b><span>хибриллиантов</span></span></button>
      </div>
      <div class="mg-note">🥐 — за уроки. Игры их тратят, а рейтинг не трогают.</div>
      <button class="mg-game" id="mgWordle">
        <span class="mg-ic mg-ic-wd">${WORDLE_IC}</span>
        <span class="mg-tx"><b>Вордл · слово дня</b><small>Угадай слово за 6 попыток</small></span>
        <span class="mg-price ${wdDone ? "ok" : "free"}">${wdDone ? "✓ сегодня" : "бесплатно"}</span>
      </button>
      <button class="mg-game" id="mgWheel">
        <span class="mg-ic mg-ic-ww" dir="rtl"><i>ש</i><i>ל</i><i>ו</i><i>ם</i></span>
        <span class="mg-tx"><b>Буквы по кругу</b><small>Веди пальцем по буквам — собери слова</small></span>
        <span class="mg-price">${going ? "продолжить" : price + " 🥐"}</span>
      </button>`;
    document.getElementById("mgBack").onclick = () => { mgView = null; showHome(); };
    if (window.Eco) Eco.refresh();                       // свежий баланс с сервера
    document.getElementById("mgWordle").onclick = () => { wdFromMenu = true; mgView = null; openWordle(); };
    document.getElementById("mgWheel").onclick = () => { if (window.openWheel) { mgView = "wheel"; openWheel(view()); } };
    // «Буквы по кругу» — только из знакомых слов: мало слов → замок и прогресс (бурекасы не трогаем)
    if (!going && window.wheelStatus) wheelStatus().then(st => {
      const b = document.getElementById("mgWheel"); if (!b || st.ok) return;
      const total = st.doneLessons + st.need, pct = total ? Math.round(st.doneLessons / total * 100) : 0;
      b.classList.add("locked");
      b.querySelector(".mg-price").textContent = "🔒";
      b.querySelector(".mg-tx small").textContent = "Откроется, когда выучишь больше слов";
      b.insertAdjacentHTML("afterend", `<div class="mg-lock" id="mgLock">
          <div class="mg-lock-bar"><i style="width:${pct}%"></i></div>
          <div class="mg-lock-t">Пройди ещё <b>${st.need} ${lessonsWord(st.need)}</b></div>
          <button class="btn blue" id="mgLockGo">🎯 К урокам</button></div>`);
      b.onclick = () => { vibrate("warning"); const l = document.getElementById("mgLock"); if (l && window.HAnim) HAnim.shake(l); };
      document.getElementById("mgLockGo").onclick = () => { mgView = null; showPath(); };
    }).catch(() => {});
  };
  function lessonsWord(n) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? "урок" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "урока" : "уроков"; }
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
  // подпись карточки («🥐 N · Вордл…») обновляет eco.js (Eco.paint)
})();
