// =====================================================
// СЕРИЯ ДНЕЙ (винстрик) и ЗАМОРОЗКИ
//  • День засчитан, если пройден хотя бы один урок или квест (streakDone()).
//  • Пропустил день — тратится заморозка ❄️ (сама), серия не сгорает.
//    Нет заморозок — серия начинается заново.
//  • Заморозки: 1 на старте, +1 за каждые 7 дней серии, максимум 2.
//  Хранилище: hirbis_streak = { count, best, last, freezes, frozen: [даты], days: [даты] }
//  Пока на телефоне; с сервером станет общей для всех устройств.
// =====================================================
(function () {
  const MAX_FREEZES = 2, FREEZE_EVERY = 7;
  const dayStr = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const today = () => dayStr(new Date());
  const addDays = (s, n) => { const [y, m, d] = s.split("-").map(Number); return dayStr(new Date(y, m - 1, d + n)); };
  const diffDays = (a, b) => { const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
    return Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000); };

  function get() { return Object.assign({ count: 0, best: 0, last: null, freezes: 1, frozen: [], days: [] }, store.get("streak", {})); }
  function put(s) {
    s.days = s.days.slice(-60); s.frozen = s.frozen.slice(-60);
    store.set("streak", s);
  }

  // При открытии приложения: были пропуски? тратим заморозки или обнуляем серию
  function check() {
    const s = get(); let msg = null;
    if (!s.last || s.count === 0) return null;
    const gap = diffDays(s.last, today());          // 1 = вчера играл, всё хорошо
    if (gap <= 1) return null;
    const missed = gap - 1;
    if (s.freezes >= missed) {
      for (let i = 1; i <= missed; i++) s.frozen.push(addDays(s.last, i));
      s.freezes -= missed;
      s.last = addDays(s.last, missed);             // серия «дожила» до вчера
      msg = `❄️ Заморозка спасла твою серию! Пропущено дней: ${missed}. Осталось заморозок: ${s.freezes}`;
    } else {
      msg = `Серия из ${s.count} ${daysWord(s.count)} прервалась 😢 Начнём новую — пройди урок сегодня!`;
      s.count = 0;
    }
    put(s);
    return msg;
  }

  // Урок или квест пройден
  function done() {
    check();
    const s = get(), t = today();
    if (s.last === t) return;                       // сегодня уже засчитано
    s.count = (s.last && diffDays(s.last, t) === 1) ? s.count + 1 : 1;
    s.last = t; s.days.push(t);
    s.best = Math.max(s.best, s.count);
    let extra = "";
    if (s.count % FREEZE_EVERY === 0 && s.freezes < MAX_FREEZES) { s.freezes++; extra = " · +1 заморозка ❄️"; }
    put(s);
    setTimeout(() => {
      if (typeof showToast === "function") showToast(`🔥 Серия: ${s.count} ${daysWord(s.count)}!${extra}`);
      if (typeof playSound === "function") playSound("combo");
    }, 1200);
    if (typeof updateToday === "function") updateToday();
  }

  function daysWord(n) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return "день";
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return "дня";
    return "дней";
  }

  // Активна ли серия (сегодня или вчера был урок)
  function info() {
    const s = get(), t = today();
    const alive = s.last && diffDays(s.last, t) <= 1 ? s.count : 0;
    return { count: alive, best: s.best, freezes: s.freezes, todayDone: s.last === t && s.days.includes(t), s };
  }

  // Окошко с подробностями
  function open() {
    const { count, best, freezes, todayDone, s } = info();
    let box = document.getElementById("streakSheet");
    if (!box) { box = document.createElement("div"); box.id = "streakSheet"; document.body.appendChild(box); }
    const WD = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
    const t = today();
    const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)).map(d => {
      const [y, m, dd] = d.split("-").map(Number), wd = WD[new Date(y, m - 1, dd).getDay()];
      const st = s.days.includes(d) ? "on" : s.frozen.includes(d) ? "ice" : d === t ? "now" : "off";
      const ic = st === "on" ? "🔥" : st === "ice" ? "❄️" : st === "now" ? "⏳" : "·";
      return `<div class="sk-day ${st}"><b>${ic}</b><span>${wd}</span></div>`;
    }).join("");
    box.innerHTML = `<div class="set-sheet">
      <div class="set-head"><b>🔥 Серия дней</b><button class="set-x" id="skClose">✕</button></div>
      <div class="sk-big">${count}<small>${daysWord(count)} подряд</small></div>
      <div class="sk-week">${week}</div>
      <p class="sk-note">${todayDone ? "Сегодня уже засчитано ✓ Возвращайся завтра!" : "Пройди сегодня один урок или квест — и серия продолжится."}</p>
      <div class="sk-row"><span>❄️ Заморозки</span><b>${"❄️".repeat(freezes) || "нет"} <small>(${freezes} из ${Math.max(MAX_FREEZES, freezes)})</small></b></div>
      <p class="sk-note">Пропустил день — заморозка потратится сама, и серия не сгорит. Новая заморозка — за каждые ${FREEZE_EVERY} дней серии.</p>
      <div class="sk-row"><span>🏆 Лучшая серия</span><b>${best} ${daysWord(best)}</b></div>
    </div>`;
    box.className = "show";
    box.onclick = (e) => { if (e.target === box) box.className = ""; };
    document.getElementById("skClose").onclick = () => { box.className = ""; };
  }

  window.streakCheck = check;
  window.streakDone = done;
  window.streakInfo = info;
  window.openStreak = open;
  window.daysWord = daysWord;
})();
