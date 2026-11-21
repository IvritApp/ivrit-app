// =====================================================
// HIRBIS PLUS (21.11) — подписка: бесконечные сердечки ❤️ на 30 дней за 50 ⭐ (Telegram Stars), разовая оплата.
//  • Срок подписки знает только сервер (players_api.py, таблица plus): приходит в каждом ответе (plus_until) → store "plus" (NOSYNC).
//  • Купить: /hapi/plus/invoice → ссылка на счёт → Telegram.WebApp.openInvoice. Деньги принимает бот (bot_start.py).
//  • Промокод: /hapi/plus/promo — «дни» включают Plus сразу, «скидка» уменьшает цену счёта.
//  • Окно открывается: нажатие на ❤️ в уроке, «Сердечки кончились», ⚙️ Настройки (карточка сверху).
// =====================================================
(function () {
  const PRICE = 50, DAYS = 30;
  const tg = window.Telegram && Telegram.WebApp;
  const canPay = () => !!(tg && tg.initData && typeof tg.openInvoice === "function" && window.hirbisSync && hirbisSync.active);
  const until = () => { const p = store.get("plus", null); return p && p.until ? p.until : 0; };
  const active = () => until() * 1000 > Date.now();
  const dateText = t => new Date(t * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let promo = null;                       // { code, price, discount } — скидка, применённая в этом окне

  function setUntil(t) {
    const old = until();
    store.set("plus", { until: t || 0 });
    if (window.Hearts) Hearts.render();
    return t > old;
  }

  async function call(path, body) {
    try { return await hirbisSync.api(path, body || {}); }
    catch (e) { return { error: e.server ? e.message : "Нет связи с сервером" }; }
  }

  // ---------- окно ----------
  function open(from, onClose) {
    const old = document.getElementById("plusSheet"); if (old) old.remove();
    promo = null;
    const w = document.createElement("div");
    w.id = "plusSheet";
    document.body.appendChild(w);
    const close = () => { w.classList.remove("show"); setTimeout(() => w.remove(), 250); if (onClose) onClose(); };
    w.onclick = (e) => { if (e.target === w) close(); };
    render(w, close);
    requestAnimationFrame(() => w.classList.add("show"));
    // свежий срок с сервера (вдруг оплатил с другого телефона)
    if (canPay()) call("/plus/status").then(r => { if (r && !r.error) { hirbisSync.gotMe(r); if (document.body.contains(w)) render(w, close); } });
  }

  function render(w, close) {
    const on = active(), price = promo ? promo.price : PRICE;
    w.innerHTML = `<div class="pl-card">
        <button class="pl-x" aria-label="Закрыть">✕</button>
        <div class="pl-top"><div class="pl-bird" id="plBird"></div>
          <div class="pl-name">Hirbis <b>Plus</b></div></div>
        <div class="pl-big">❤️ <span>∞</span></div>
        <div class="pl-sub">${on ? `Включён до <b>${dateText(until())}</b>` : "Бесконечные сердечки — учись без остановок"}</div>
        <ul class="pl-list"><li>❤️ Ошибки не отнимают сердечки</li><li>🚀 Уроки без ожидания</li><li>💜 Ты помогаешь Hirbis расти</li></ul>
        <button class="btn pl-buy" id="plBuy">${on ? "Продлить на 30 дней" : "Оформить на 30 дней"} · ${promo && promo.price < PRICE ? `<s>${PRICE}</s> ` : ""}${price} ⭐</button>
        ${promo ? `<div class="pl-promo-ok">🎟 Промокод ${esc(promo.code)}: скидка ${promo.discount}%</div>`
          : `<button class="pl-link" id="plHave">Есть промокод?</button><div class="pl-promo" id="plPromo" hidden>
              <input id="plCode" maxlength="32" placeholder="ПРОМОКОД" autocomplete="off" autocapitalize="characters">
              <button class="btn blue" id="plApply">Применить</button></div>`}
        <div class="pl-note">Оплата звёздами Telegram. Разовая, без автосписаний.</div>
      </div>`;
    if (window.HAnim) HAnim.mascot(w.querySelector("#plBird"), on ? "cheer" : "happy", { size: 74 });
    w.querySelector(".pl-x").onclick = close;
    const have = w.querySelector("#plHave");
    if (have) have.onclick = () => { have.hidden = true; const p = w.querySelector("#plPromo"); p.hidden = false; p.querySelector("input").focus(); };
    const ap = w.querySelector("#plApply");
    if (ap) ap.onclick = () => applyCode(w, close);
    const code = w.querySelector("#plCode");
    if (code) code.onkeydown = (e) => { if (e.key === "Enter") applyCode(w, close); };
    w.querySelector("#plBuy").onclick = () => buy(w, close);
  }

  async function applyCode(w, close) {
    const code = (w.querySelector("#plCode").value || "").trim().toUpperCase();
    if (!code) return;
    if (!canPay()) { showToast("Промокоды работают в приложении в Telegram"); return; }
    const r = await call("/plus/promo", { code });
    if (r.error) { showToast(r.error); if (typeof vibrate === "function") vibrate("error"); return; }
    hirbisSync.gotMe(r);
    if (r.granted) { celebrate(`Hirbis Plus включён на ${r.granted} ${daysWord(r.granted)} 🎉`); render(w, close); return; }
    promo = { code: r.code, price: r.price, discount: r.discount };
    showToast(`Скидка ${r.discount}% 🎟`);
    render(w, close);
  }

  async function buy(w, close) {
    if (!canPay()) { showToast("Оплата работает в приложении Hirbis в Telegram"); return; }
    const btn = w.querySelector("#plBuy");
    btn.disabled = true; btn.textContent = "Готовлю оплату…";
    const r = await call("/plus/invoice", promo ? { code: promo.code } : {});
    if (r.error || !r.link) { showToast(r.error || "Оплата сейчас недоступна"); render(w, close); return; }
    const before = until();
    tg.openInvoice(r.link, (status) => {
      if (status === "paid") waitPaid(before, w, close);
      else { if (status === "failed") showToast("Оплата не прошла"); render(w, close); }
    });
  }

  // бот засчитывает оплату за пару секунд — спрашиваем сервер, пока срок не продлится
  async function waitPaid(before, w, close) {
    const btn = w.querySelector("#plBuy"); if (btn) { btn.disabled = true; btn.textContent = "Включаю Plus…"; }
    for (let i = 0; i < 10; i++) {
      await new Promise(res => setTimeout(res, 1500));
      const r = await call("/plus/status");
      if (r && !r.error) { hirbisSync.gotMe(r); if (until() > before) break; }
    }
    if (until() > before) celebrate("Hirbis Plus включён! ❤️ ∞");
    else showToast("Оплата прошла — Plus включится через минуту 🙏");
    promo = null;
    if (document.body.contains(w)) render(w, close);
  }

  function celebrate(text) {
    if (typeof vibrate === "function") vibrate("success");
    if (window.HAnim) HAnim.play("toast", { text }); else showToast(text);
  }
  function daysWord(n) { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? "день" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "дня" : "дней"; }

  // карточка в ⚙️ Настройках
  function settingsHTML() {
    const on = active();
    return `<button class="pl-set ${on ? "on" : ""}" id="plusOpen"><span class="pl-set-i">${on ? "✨" : "❤️"}</span>
      <span><b>Hirbis Plus</b><i>${on ? "до " + dateText(until()) + " · ∞ сердечек" : "Бесконечные сердечки · " + PRICE + " ⭐"}</i></span><span class="pl-set-a">›</span></button>`;
  }
  document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("#plusOpen")) open("settings"); });

  window.Plus = { active, until, setUntil, open, settingsHTML, PRICE, DAYS };
})();
