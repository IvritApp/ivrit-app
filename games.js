// =====================================================
// МИНИ-ИГРЫ КВЕСТОВ: у каждого квеста свой экран и своё управление
// Шаг квеста: { "game": { "type": "wrap" | "plan" | "shelf" | "notepad" | "haggle" | "body" | "pills" | "desktop" | "form", ... } }
// Диалог по телефону / в мессенджере: у обычного шага "ui": "call" | "chat" (+ "who", "avatar")
// =====================================================
(function () {
  const ICON = (k, s) => (window.placeItemIcon ? window.placeItemIcon(k, s || 56) : "") || "";
  const esc = (t) => String(t == null ? "" : t);
  const heTxt = (x) => `<span class="he" dir="rtl">${g(x.he)}</span>${x.tr ? `<span class="tr">${g(x.tr)}</span>` : ""}`;

  // ---------- общее: оверлей, очки, ошибки, конец игры ----------
  function open(cls, title) {
    const wrap = document.querySelector(".st-wrap");
    const el = document.createElement("div");
    el.className = "gm " + cls;
    el.innerHTML = `<div class="gm-top"><span class="gm-title">${title || ""}</span><span class="gm-fire" id="gmFire"></span></div><div class="gm-body"></div><div class="gm-tip" hidden></div>`;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add("in"));
    fire();
    return el;
  }
  function fire() { const f = document.getElementById("gmFire"); if (f) f.textContent = qCombo ? `🔥 ${qCombo}` : ""; }
  function right(el, txt) {
    const before = fireLevel(qCombo); qCombo++; const lvl = fireLevel(qCombo);
    qPoints += FIRE[lvl].points; updateQuestFire(true);
    if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
    playSound("right"); vibrate("success"); fire();
    tip(el, txt || "", true);
  }
  function wrong(el, hint, target) {
    qMistakes++;
    if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
    qCombo = 0; updateQuestFire(false); fire();
    playSound("wrong"); vibrate("error");
    if (target) { target.classList.remove("gm-no"); void target.offsetWidth; target.classList.add("gm-no"); }
    tip(el, "💡 " + (hint || "Не то. Попробуй ещё!"));
  }
  function tip(el, html, good) {
    const t = el.querySelector(".gm-tip");
    if (!html) { t.hidden = true; return; }
    t.innerHTML = html; t.hidden = false; t.classList.toggle("good", !!good);
    clearTimeout(t._h); t._h = setTimeout(() => { t.hidden = true; }, good ? 1600 : 4200);
  }
  function finish(el, token, text) {
    setTimeout(() => {
      if (token !== stageToken) return;
      el.classList.add("out");
      setTimeout(() => el.remove(), 450);
      stage.hide();
      if (text) friendSays(g(text));
      document.getElementById("qOpts").innerHTML = "";
      qStep++;
      setTimeout(() => { if (token === stageToken) { stage.hide(); showQuestStep(); } }, text ? 2400 : 500);
    }, 900);
  }
  // произнести и показать фразу (кнопка 🔊 и «перевод»)
  // hideRu = true — в играх «пойми иврит» (план, врач, рецепт, начальник): перевод только по кнопке, иначе ответ виден сразу
  function line(who, x, cls, hideRu) {
    const id = "gl" + Math.floor(Math.random() * 1e6);
    const he = g(x.he);
    const say = `<button class="gm-tool" onclick="event.stopPropagation();speak(${JSON.stringify(he).replace(/"/g, "&quot;")})">${SPK} Ещё раз</button>`;
    const ruBtn = x.ru && hideRu ? `<button class="gm-tool" onclick="event.stopPropagation();document.getElementById('${id}').hidden=false;this.remove()">Перевод</button>` : "";
    // 21.11: в диалогах перевод виден сразу (для новичка)
    return `<div class="gm-line ${cls || ""}">${who ? `<b class="gm-who">${who}</b>` : ""}<div class="he" dir="rtl">${he}</div>${x.tr ? `<div class="tr">${g(x.tr)}</div>` : ""}
      ${x.ru ? `<div class="ru q-ru-line" id="${id}"${hideRu ? " hidden" : ""}>${g(x.ru)}</div>` : ""}
      <div class="gm-tools">${say}${ruBtn}</div></div>`;
  }
  // «21 шекель», «22 шекеля», «25 шекелей»
  function shekels(n) { const a = n % 10, b = n % 100; return n + (a === 1 && b !== 11 ? " шекель" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? " шекеля" : " шекелей"); }
  // ---------- перетаскивание пальцем (и запасной способ: нажал предмет → нажал место) ----------
  function dragKit(root, onDrop) {
    let sel = null, ghost = null, start = null, moved = false;
    root.addEventListener("pointerdown", (e) => {
      const it = e.target.closest("[data-drag]");
      if (!it || it.classList.contains("used")) return;
      e.preventDefault();
      start = { x: e.clientX, y: e.clientY, it }; moved = false;
      try { root.setPointerCapture(e.pointerId); } catch (er) {}
    });
    root.addEventListener("pointermove", (e) => {
      if (!start) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
      if (!moved) {
        moved = true;
        ghost = start.it.cloneNode(true); ghost.classList.add("gm-ghost");
        const r = start.it.getBoundingClientRect(); ghost.style.width = r.width + "px"; ghost.style.height = r.height + "px";
        document.body.appendChild(ghost); start.it.classList.add("lift");
      }
      ghost.style.left = e.clientX + "px"; ghost.style.top = e.clientY + "px";
      root.querySelectorAll(".gm-hover").forEach(x => x.classList.remove("gm-hover"));
      const t = dropAt(e.clientX, e.clientY); if (t) t.classList.add("gm-hover");
    });
    const end = (e) => {
      if (!start) return;
      const it = start.it; start.it.classList.remove("lift");
      root.querySelectorAll(".gm-hover").forEach(x => x.classList.remove("gm-hover"));
      if (moved) {
        if (ghost) ghost.remove(); ghost = null;
        const t = dropAt(e.clientX, e.clientY);
        if (t) onDrop(it, t);
      }
      start = null;
    };
    root.addEventListener("pointerup", end); root.addEventListener("pointercancel", (e) => { if (ghost) ghost.remove(); ghost = null; start = null; });
    root.addEventListener("click", (e) => {
      const it = e.target.closest("[data-drag]");
      if (it && !it.classList.contains("used")) {   // нажал на предмет — выбрали (потом нажми, куда положить)
        root.querySelectorAll("[data-drag].sel").forEach(x => x.classList.remove("sel"));
        sel = it; it.classList.add("sel"); root.classList.add("has-sel");
        return;
      }
      const t = e.target.closest("[data-drop]");
      if (t && sel) { const it = sel; sel.classList.remove("sel"); sel = null; root.classList.remove("has-sel"); onDrop(it, t); }
    });
    function dropAt(x, y) {
      if (ghost) ghost.style.display = "none";
      const el = document.elementFromPoint(x, y);
      if (ghost) ghost.style.display = "";
      return el && el.closest("[data-drop]") && root.contains(el.closest("[data-drop]")) ? el.closest("[data-drop]") : null;
    }
  }

  const GAMES = {};

  // =====================================================
  // 1. ШАУРМА: продавец отошёл — собери сам по чеку на иврите. Вид сверху: лаваш и миски.
  // =====================================================
  GAMES.wrap = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    let k = 0;
    B.innerHTML = `<div class="wr-ticket"><div class="wr-ticket-h">🧾 הַזְמָנָה · заказ</div>${c.order.map((o, i) => `<div class="wr-row" data-i="${i}">${heTxt(o)}</div>`).join("")}</div>
      <div class="wr-board"><div class="wr-wrap" data-drop="wrap"><div class="wr-base"></div><div class="wr-fill"></div></div></div>
      <div class="wr-bowls">${c.bowls.map(b => `<div class="wr-bowl" data-drag="${b.id}"><span class="wr-e">${b.e}</span></div>`).join("")}</div>
      <div class="gm-how">Тащи пальцем из мисок в лаваш — по порядку из чека</div>`;
    const mark = () => B.querySelectorAll(".wr-row").forEach((r, i) => { r.classList.toggle("now", i === k); r.classList.toggle("done", i < k); });
    mark();
    tip(el, "Продавец: «Сделай сам, я занят!» 😅 Читай чек на иврите", true);
    dragKit(B, (it, t) => {
      if (token !== stageToken) return;
      const need = c.order[k];
      if (it.dataset.drag === need.id) {
        const b = c.bowls.find(x => x.id === need.id);
        if (need.id === "lafa" || need.id === "pita") B.querySelector(".wr-base").className = "wr-base " + need.id;
        else B.querySelector(".wr-fill").insertAdjacentHTML("beforeend", Array.from({ length: 5 }, () => `<i style="left:${18 + Math.random() * 60}%;top:${18 + Math.random() * 60}%;transform:rotate(${Math.random() * 360}deg)">${b.e}</i>`).join(""));
        speak(g(need.he));
        right(el, `✓ ${g(need.he)}`);
        addToTray([need.id], true);
        k++; mark();
        if (k >= c.order.length) { B.querySelector(".wr-wrap").classList.add("rolled"); finish(el, token, c.done); }
      } else wrong(el, `Сейчас нужно: <b dir="rtl">${g(need.he)}</b> — найди эту миску`, it);
    });
  };

  // =====================================================
  // 2. КВАРТИРА: план сверху, расставь мебель по комнатам — как говорит Давид
  // =====================================================
  GAMES.plan = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    let k = 0;
    B.innerHTML = `<div class="pl2-say"></div>
      <div class="pl2-plan">${c.rooms.map(r => `<div class="pl2-room r-${r.id}" data-drop="${r.id}"><span class="pl2-name">${heTxt(r)}</span><div class="pl2-in"></div></div>`).join("")}</div>
      <div class="pl2-tray">${c.items.map(x => `<div class="pl2-item" data-drag="${x.id}">${ICON(x.id, 46)}</div>`).join("")}</div>
      <div class="gm-how">Тащи мебель в нужную комнату</div>`;
    const ask = () => { const s = c.steps[k]; B.querySelector(".pl2-say").innerHTML = line(friendName(), s, "", true); speak(g(s.he)); };
    ask();
    dragKit(B, (it, t) => {
      if (token !== stageToken) return;
      const s = c.steps[k];
      if (it.dataset.drag === s.item && t.dataset.drop === s.room) {
        it.classList.add("used");
        t.querySelector(".pl2-in").insertAdjacentHTML("beforeend", `<span class="pl2-put">${ICON(s.item, 40)}</span>`);
        right(el, "✓ Отлично!");
        addToTray([s.item], true);
        k++;
        if (k >= c.steps.length) finish(el, token, c.done); else setTimeout(() => { if (token === stageToken) ask(); }, 900);
      } else if (it.dataset.drag !== s.item) wrong(el, `Это не то. Послушай ещё: <b dir="rtl">${g(s.he)}</b>`, it);
      else wrong(el, "Предмет верный, а комната — нет. Посмотри на подписи комнат!", t);
    });
  };

  // =====================================================
  // 3. МАКОЛЕТ: полка — на коробках только иврит; список по-русски; калькулятор считает
  // =====================================================
  GAMES.shelf = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    const got = []; let sum = 0;
    B.innerHTML = `<div class="sh-list">📝 ${c.list.map(x => `<span class="sh-need" data-id="${x.id}">${x.e} ${x.ru}</span>`).join("")}</div>
      <div class="sh-shelf">${shuffle([...c.products]).map(p => `<button class="sh-box" data-id="${p.id}"><span class="sh-lbl" dir="rtl">${g(p.he)}</span><span class="sh-price">${p.price} ₪</span></button>`).join("")}</div>
      <div class="sh-calc"><span>🧮</span><b id="shSum">0 ₪</b><small id="shN">0 из ${c.list.length}</small></div>
      <div class="gm-how">На коробках только иврит — читай! Список у Давида по-русски</div>`;
    B.querySelectorAll(".sh-box").forEach(b => b.onclick = () => {
      if (token !== stageToken || b.disabled) return;
      const p = c.products.find(x => x.id === b.dataset.id), need = c.list.find(x => x.id === p.id);
      if (need && !got.includes(p.id)) {
        got.push(p.id); b.disabled = true; b.classList.add("in-cart");
        sum += p.price;
        B.querySelector("#shSum").textContent = sum + " ₪";
        B.querySelector("#shN").textContent = `${got.length} из ${c.list.length}`;
        B.querySelector(`.sh-need[data-id="${p.id}"]`).classList.add("got");
        speak(g(p.he)); right(el, `✓ ${g(p.he)} — ${need.ru}`);
        addToTray([p.id], true);
        if (got.length === c.list.length) finish(el, token, g(c.done).replace("{sum}", sum));
      } else wrong(el, `На коробке написано <b dir="rtl">${g(p.he)}</b>${p.ru ? ` — это «${p.ru}»` : ""}. Этого нет в списке.`, b);
    });
  };

  // =====================================================
  // 4. КАФЕ: блокнот официантки — она читает вслух, зачеркни пальцем, что она перепутала
  // =====================================================
  GAMES.notepad = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    B.innerHTML = `${c.mine ? `<div class="np-mine"><span>Мы заказали:</span>${c.mine.map(k => `<i>${ICON(k, 40)}</i>`).join("")}</div>` : ""}
      <div class="np-pad"><div class="np-rings">${"<b></b>".repeat(9)}</div><div class="np-h">${g(c.head || "הַזְמָנָה")}</div>
      ${c.lines.map((x, i) => `<div class="np-line" data-i="${i}"><span dir="rtl">${g(x.he)}</span>${x.price != null ? `<em>${x.price} ₪</em>` : ""}</div>`).join("")}</div>
      <div class="np-bar"><button class="gm-btn ghost" id="npAgain">${SPK} Послушать ещё</button></div>
      <div class="gm-how">${g(c.task || "Зачеркни пальцем строчку с ошибкой")}</div>`;
    const read = () => speak(g(c.say));
    setTimeout(() => { if (token === stageToken) { read(); tip(el, `🗣️ ${stage.hostName || "Официантка"} читает заказ… Слушай!`, true); } }, 600);
    B.querySelector("#npAgain").onclick = read;
    let done = false, sx = null;
    const tryLine = (ln) => {
      if (done || token !== stageToken) return;
      const x = c.lines[+ln.dataset.i];
      if (x.bad) { done = true; ln.classList.add("struck"); right(el, g("✓ Поймал{m:}{f:а}!")); finish(el, token, c.done); }
      else wrong(el, x.hint || c.hint || "Эта строчка правильная. Послушай ещё!", ln);
    };
    B.querySelectorAll(".np-line").forEach(ln => {
      ln.addEventListener("pointerdown", (e) => { sx = e.clientX; });
      ln.addEventListener("pointerup", (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 30) tryLine(ln); sx = null; });
      ln.addEventListener("click", () => tryLine(ln));
    });
  };

  // =====================================================
  // 5. ШУК: прилавки листаются, торгуешься ползунком, платишь из кошелька
  // =====================================================
  const NUM = { 5: ["חֲמִישָּׁה", "хамиша"], 8: ["שְׁמוֹנָה", "шмона"], 10: ["עֲשָׂרָה", "асара"], 12: ["שְׁנֵים עָשָׂר", "шнейм асар"], 15: ["חֲמִישָּׁה עָשָׂר", "хамиша асар"], 18: ["שְׁמוֹנָה עָשָׂר", "шмона асар"], 20: ["עֶשְׂרִים", "эсрим"], 25: ["עֶשְׂרִים וַחֲמִישָּׁה", "эсрим ва-хамиша"], 30: ["שְׁלוֹשִׁים", "шлошим"] };   // шекель — мужской род
  GAMES.haggle = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    let wallet = c.wallet, i = 0; const got = [];
    B.innerHTML = `<div class="hg-head"><div class="hg-list">${c.need.map(x => `<span class="hg-need" data-id="${x.id}" dir="rtl">${g(x.he)}</span>`).join("")}</div>
      <div class="hg-wallet">👛 <b id="hgW">${wallet}</b> ₪</div></div>
      <div class="hg-stage"><button class="hg-nav l" id="hgL">‹</button><div class="hg-card" id="hgCard"></div><button class="hg-nav r" id="hgR">›</button></div>
      <div class="hg-deal" id="hgDeal"></div>
      <div class="gm-how">Листай прилавки ‹ › · у нужного — торгуйся! Денег на всё по полной цене не хватит</div>`;
    const card = B.querySelector("#hgCard"), deal = B.querySelector("#hgDeal");
    const show = () => {
      const s = c.stalls[i];
      const bought = got.includes(s.id);
      card.className = "hg-card c" + (i % 4);
      card.innerHTML = `<div class="hg-awn"></div><div class="hg-fruit">${ICON(s.id, 110)}</div><div class="hg-name">${heTxt(s)}</div>
        <div class="hg-sign">${s.price} ₪</div>${bought ? `<div class="hg-sold">✓ куплено</div>` : ""}`;
      const need = c.need.find(x => x.id === s.id);
      if (!need || bought) { deal.innerHTML = need ? "" : `<div class="hg-skip">Этого нет в списке — листай дальше</div>`; return; }
      const steps = Object.keys(NUM).map(Number).filter(n => n <= s.price && n >= Math.floor(s.price / 3));
      deal.innerHTML = `<div class="hg-seller">${line("Продавец", { he: `${NUM[s.price] ? NUM[s.price][0] : s.price} שְׁקָלִים!`, tr: `${NUM[s.price] ? NUM[s.price][1] : s.price} шкалим!`, ru: `${shekels(s.price)}!` })}</div>
        <div class="hg-offer"><input type="range" id="hgR2" min="0" max="${steps.length - 1}" value="${steps.length - 1}" step="1"><div class="hg-val" id="hgV"></div></div>
        <button class="gm-btn" id="hgGo">🤝 Предложить</button>`;
      const r = deal.querySelector("#hgR2"), v = deal.querySelector("#hgV");
      const upd = () => { const n = steps[+r.value]; v.innerHTML = `<b dir="rtl">${NUM[n][0]}</b> <span class="tr">${NUM[n][1]}</span> = ${n} ₪`; };
      r.oninput = upd; upd();
      deal.querySelector("#hgGo").onclick = () => {
        const n = steps[+r.value];
        speak(NUM[n][0]);
        if (n < s.min) { wrong(el, "Продавец: «לֹא, לֹא! זֶה מְעַט מִדַּי!» — слишком мало. Предложи чуть больше", card); return; }
        if (n > wallet) { wrong(el, `В кошельке только ${wallet} ₪ — поторгуйся ещё!`, deal.querySelector("#hgGo")); return; }
        wallet -= n; got.push(s.id);
        B.querySelector("#hgW").textContent = wallet;
        B.querySelector(`.hg-need[data-id="${s.id}"]`).classList.add("got");
        const saved = s.price - n;
        right(el, saved > 0 ? g(`«יַאלְלָה, בְּסֵדֶר!» — сэкономил{m:}{f:а} ${saved} ₪ 💪`) : "«בְּבַקָּשָׁה!» Куплено");
        addToTray([s.id], true);
        // если оставшегося не хватит на остальное даже со скидкой — честно скажем и вернём деньги
        const left = c.need.filter(x => !got.includes(x.id));
        const minLeft = left.reduce((a, x) => a + c.stalls.find(y => y.id === x.id).min, 0);
        if (minLeft > wallet) {
          setTimeout(() => { tip(el, "😬 Денег на остальное не хватит. Вернули покупки — торгуйся смелее!"); }, 900);
          wallet = c.wallet; got.length = 0;
          B.querySelector("#hgW").textContent = wallet;
          B.querySelectorAll(".hg-need").forEach(x => x.classList.remove("got"));
        }
        show();
        if (got.length === c.need.length) { deal.innerHTML = ""; finish(el, token, g(c.done).replace("{left}", wallet)); }
      };
    };
    B.querySelector("#hgL").onclick = () => { i = (i + c.stalls.length - 1) % c.stalls.length; show(); };
    B.querySelector("#hgR").onclick = () => { i = (i + 1) % c.stalls.length; show(); };
    let sx = null;
    card.addEventListener("pointerdown", e => { sx = e.clientX; });
    card.addEventListener("pointerup", e => { if (sx !== null && Math.abs(e.clientX - sx) > 50) (e.clientX < sx ? B.querySelector("#hgR") : B.querySelector("#hgL")).click(); sx = null; });
    show();
  };

  // =====================================================
  // 6. ВРАЧ: твой аватар крупно — покажи, где болит
  // =====================================================
  GAMES.body = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    let k = 0, sv = "";
    try { const p = profile || {}; const gd = p.gender === "f" ? "f" : "m"; sv = HirbisAvatar.svg(HirbisAvatar.sanitize(Object.assign(HirbisAvatar.defaults(gd), p.avatar || {}, { gender: gd })), { pose: "stand" }); } catch (e) {}
    // зоны в процентах от фигуры
    const Z = { head: [30, 1, 40, 14], ear: [64, 10, 12, 8], eye: [36, 9, 28, 6], throat: [40, 22, 20, 7], belly: [32, 40, 36, 14], hand: [6, 44, 18, 12], leg: [30, 66, 40, 30], back: [26, 28, 48, 12], nose: [44, 13, 12, 5] };
    B.innerHTML = `<div class="bd-say"></div><div class="bd-fig">${sv}${c.parts.map(p => { const z = Z[p.id] || [0, 0, 0, 0]; return `<div class="bd-zone" data-id="${p.id}" style="left:${z[0]}%;top:${z[1]}%;width:${z[2]}%;height:${z[3]}%"></div>`; }).join("")}</div>
      <div class="gm-how">Нажми на себе, где болит</div>`;
    const ask = () => { const s = c.parts[k]; B.querySelector(".bd-say").innerHTML = line(stage.hostName || "Врач", s, "", true); speak(g(s.he)); };
    ask();
    B.querySelectorAll(".bd-zone").forEach(z => z.onclick = () => {
      if (token !== stageToken) return;
      const s = c.parts[k];
      if (z.dataset.id === s.id) {
        z.classList.add("hit"); setTimeout(() => z.classList.remove("hit"), 900);
        right(el, `✓ ${g(s.word || s.he)}`);
        addToTray([s.id], true);
        k++;
        if (k >= c.parts.length) finish(el, token, c.done); else setTimeout(() => { if (token === stageToken) ask(); }, 1000);
      } else wrong(el, `Послушай: <b dir="rtl">${g(s.word || s.he)}</b> — ${s.hint || "другое место"}`, z);
    });
  };

  // =====================================================
  // 7. ВРАЧ: таблетница — разложи таблетки по рецепту (утро / день / вечер)
  // =====================================================
  GAMES.pills = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    const slots = [{ id: "m", he: "בֹּקֶר", tr: "бокер", e: "🌅" }, { id: "d", he: "צָהֳרַיִם", tr: "цохораим", e: "☀️" }, { id: "e", he: "עֶרֶב", tr: "эрев", e: "🌙" }];
    const put = { m: 0, d: 0, e: 0 };
    B.innerHTML = `<div class="pi-rx"><div class="pi-rx-h">℞ מִרְשָׁם · рецепт</div>${line("", c.rx, "", true)}</div>
      <div class="pi-box">${slots.map(s => `<div class="pi-slot" data-drop="${s.id}"><span class="pi-e">${s.e}</span>${heTxt(s)}<div class="pi-in"></div></div>`).join("")}</div>
      <div class="pi-tray">${Array.from({ length: 4 }, (_, i) => `<div class="pi-pill" data-drag="p${i}">💊</div>`).join("")}</div>
      <div class="pi-bar"><button class="gm-btn ghost" id="piReset">↺ Заново</button><button class="gm-btn" id="piOk">Готово ✓</button></div>`;
    setTimeout(() => speak(g(c.rx.he)), 500);
    dragKit(B, (it, t) => {
      it.classList.add("used");
      put[t.dataset.drop]++;
      t.querySelector(".pi-in").insertAdjacentHTML("beforeend", "<i>💊</i>");
      playSound("pop");
    });
    B.querySelector("#piReset").onclick = () => { Object.keys(put).forEach(k => put[k] = 0); B.querySelectorAll(".pi-in").forEach(x => x.innerHTML = ""); B.querySelectorAll(".pi-pill").forEach(x => x.classList.remove("used")); };
    B.querySelector("#piOk").onclick = () => {
      if (token !== stageToken) return;
      const ok = ["m", "d", "e"].every(k => put[k] === (c.need[k] || 0));
      if (ok) { B.querySelector(".pi-box").classList.add("ok"); right(el, "✓ Точно по рецепту!"); addToTray(["prescription"], true); finish(el, token, c.done); }
      else { wrong(el, c.hint || "Не совпадает с рецептом. Прочитай ещё раз!", B.querySelector(".pi-box")); B.querySelector("#piReset").click(); }
    };
  };

  // =====================================================
  // 8. РАБОТА: экран компьютера — начальник пишет в чат, успей нажать нужное за время
  // =====================================================
  GAMES.desktop = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    let k = 0, timer = 0, t0 = 0;
    B.innerHTML = `<div class="dk-screen"><div class="dk-bar"><span>🖥️ ${g(c.os || "מַחְשֵׁב")}</span><span id="dkClock">09:58</span></div>
      <div class="dk-icons">${c.apps.map(a => `<button class="dk-app" data-id="${a.id}"><span class="dk-ic">${a.e}</span><span class="dk-lbl" dir="rtl">${g(a.he)}</span></button>`).join("")}</div>
      <div class="dk-chat"><div class="dk-chat-h">💬 ${stage.hostName || "Начальник"}</div><div class="dk-msgs" id="dkMsgs"></div><div class="dk-time"><i id="dkT"></i></div></div></div>
      <div class="gm-how">Начальник пишет — нажми нужную программу, пока не кончилось время!</div>`;
    const msgs = B.querySelector("#dkMsgs"), bar = B.querySelector("#dkT");
    const say = () => {
      const s = c.tasks[k];
      msgs.insertAdjacentHTML("beforeend", `<div class="dk-msg">${line("", s, "", true)}</div>`);
      msgs.scrollTop = 1e6;
      speak(g(s.he));
      t0 = Date.now();
      cancelAnimationFrame(timer);
      const tick = () => {
        if (token !== stageToken || !el.isConnected) return;
        const p = 1 - (Date.now() - t0) / (c.sec * 1000);
        bar.style.width = Math.max(0, p * 100) + "%"; bar.classList.toggle("hot", p < .3);
        if (p <= 0) { wrong(el, g(`⏰ Не успел{m:}{f:а}! Нужно было: ${g(s.he)}`), msgs.lastElementChild); t0 = Date.now(); }
        timer = requestAnimationFrame(tick);
      };
      timer = requestAnimationFrame(tick);
    };
    setTimeout(() => { if (token === stageToken) say(); }, 700);
    B.querySelectorAll(".dk-app").forEach(b => b.onclick = () => {
      if (token !== stageToken || k >= c.tasks.length) return;
      const s = c.tasks[k];
      if (b.dataset.id === s.app) {
        b.classList.add("open"); setTimeout(() => b.classList.remove("open"), 700);
        msgs.insertAdjacentHTML("beforeend", `<div class="dk-msg me">✅ ${b.querySelector(".dk-lbl").textContent}</div>`);
        right(el, "✓ Быстро!");
        k++;
        B.querySelector("#dkClock").textContent = `${String(10 + Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "15" : "00"}`;
        if (k >= c.tasks.length) { cancelAnimationFrame(timer); bar.style.width = "0"; finish(el, token, c.done); } else setTimeout(() => { if (token === stageToken) say(); }, 800);
      } else wrong(el, `Это «${g(c.apps.find(a => a.id === b.dataset.id).ru)}». Перечитай сообщение начальника`, b);
    });
  };

  // =====================================================
  // 9. БАНК: бумажный бланк — перетащи данные в нужные поля и распишись пальцем
  // =====================================================
  GAMES.form = (c, el, token) => {
    const B = el.querySelector(".gm-body");
    const nm = (profile && profile.name) || "Миша";
    const val = (v) => g(v).replace("{name}", nm);
    let filled = 0;
    B.innerHTML = `<div class="fm-paper"><div class="fm-h"><b>🏦 ${g(c.bank || "בַּנְק")}</b><span dir="rtl">${g(c.formTitle || "טוֹפֶס פְּתִיחַת חֶשְׁבּוֹן")}</span></div>
      ${c.fields.map(f => `<div class="fm-row"><span class="fm-lbl" dir="rtl">${g(f.he)}</span><div class="fm-field" data-drop="${f.id}"></div></div>`).join("")}
      <div class="fm-row sign"><span class="fm-lbl" dir="rtl">חֲתִימָה</span><canvas class="fm-sign" width="300" height="80"></canvas></div></div>
      <div class="fm-cards">${shuffle([...c.fields]).map(f => `<div class="fm-card" data-drag="${f.id}">${val(f.value)}</div>`).join("")}</div>
      <div class="gm-how" id="fmHow">Перетащи каждую карточку в своё поле бланка</div>`;
    dragKit(B, (it, t) => {
      if (token !== stageToken) return;
      if (it.dataset.drag === t.dataset.drop && !t.textContent) {
        t.textContent = it.textContent; t.classList.add("ok"); it.classList.add("used");
        const f = c.fields.find(x => x.id === t.dataset.drop);
        speak(g(f.he)); right(el, `✓ ${g(f.he)} — ${f.ru}`);
        filled++;
        if (filled === c.fields.length) { B.querySelector("#fmHow").textContent = "✍️ Теперь распишись пальцем в поле חֲתִימָה"; B.querySelector(".fm-row.sign").classList.add("now"); }
      } else {
        const f = c.fields.find(x => x.id === t.dataset.drop);
        wrong(el, f ? `Поле <b dir="rtl">${g(f.he)}</b> — это «${f.ru}»` : "Не туда", t);
      }
    });
    const cv = B.querySelector(".fm-sign"), cx = cv.getContext("2d");
    let draw = false, len = 0, last = null, signed = false;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    cv.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); if (filled < c.fields.length) { tip(el, "💡 Сначала заполни все поля"); return; } draw = true; last = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (er) {} });
    cv.addEventListener("pointermove", e => {
      if (!draw) return; const p = pt(e);
      cx.strokeStyle = "#1d3f8a"; cx.lineWidth = 3; cx.lineCap = "round";
      cx.beginPath(); cx.moveTo(last[0], last[1]); cx.lineTo(p[0], p[1]); cx.stroke();
      len += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p;
    });
    const up = () => { if (!draw) return; draw = false; if (len > 120 && !signed && token === stageToken) { signed = true; right(el, "✓ Подписано!"); addToTray(["form"], true); finish(el, token, c.done); } };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    el._sign = () => { len = 999; draw = true; up(); };   // для автотестов
  };

  // ---------- запуск ----------
  window.startGame = function (st) {
    const token = stageToken, c = st.game;
    stage.hide();
    document.getElementById("qHint").hidden = true;
    document.getElementById("qOpts").innerHTML = "";
    if (c.intro) friendSays(g(c.intro));
    const el = open("gmt-" + c.type, g(c.title || ""));
    setTimeout(() => { if (token === stageToken && GAMES[c.type]) GAMES[c.type](c, el, token); }, 50);
  };

  // =====================================================
  // ДИАЛОГ ПО ТЕЛЕФОНУ И В МЕССЕНДЖЕРЕ
  // шаг: { "ui": "call"|"chat", "who": "Рина", "seller"/"npc": {...}, "options": [...] }
  // =====================================================
  let phone = null;
  window.phoneStep = function (st) {
    const who = g(st.who || "");
    const x = st.seller || st.npc || null;
    if (!phone || phone.dataset.ui !== st.ui || phone.dataset.who !== who) {
      closePhone(true);
      phone = document.createElement("div");
      phone.className = "gm gm-phone ui-" + st.ui;
      phone.dataset.ui = st.ui; phone.dataset.who = who;
      let A = st.avatar; if (A && (A.m || A.f)) A = A[profile && profile.gender === "f" ? "f" : "m"];
      const av = A ? (() => { try { return HirbisAvatar.svg(HirbisAvatar.sanitize(Object.assign(HirbisAvatar.defaults(A.gender || "f"), A)), { pose: "stand" }); } catch (e) { return ""; } })() : "";
      phone.innerHTML = st.ui === "call"
        ? `<div class="ph-call"><div class="ph-status">📞 ${g(st.status || "Входящий звонок")}</div><div class="ph-ava">${av || "👤"}</div><div class="ph-name">${who}</div><div class="ph-timer" id="phT">00:00</div>
            <div class="ph-feed" id="phFeed"></div><div class="ph-opts" id="phOpts"></div></div>`
        : `<div class="ph-chat"><div class="ph-chat-h"><span class="ph-mini">${av || "👤"}</span><div><b>${who}</b><small>в сети</small></div></div>
            <div class="ph-feed" id="phFeed"></div><div class="ph-opts" id="phOpts"></div></div>`;
      document.querySelector(".st-wrap").appendChild(phone);
      requestAnimationFrame(() => phone && phone.classList.add("in"));
      if (st.ui === "call") { const t0 = Date.now(); phone._t = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const e = phone && phone.querySelector("#phT"); if (e) e.textContent = `00:${String(s).padStart(2, "0")}`; }, 1000); }
      if (st.ui === "call") playSound("pop");
    }
    const feed = phone.querySelector("#phFeed");
    if (x) {
      feed.insertAdjacentHTML("beforeend", `<div class="ph-msg them">${line("", x)}</div>`);
      speak(g(x.he), { audio: x.audio });
    } else if (st.friend) feed.insertAdjacentHTML("beforeend", `<div class="ph-msg note">💡 ${g(st.friend)}</div>`);
    feed.scrollTop = 1e6;
    const opts = phone.querySelector("#phOpts");
    opts.innerHTML = "";
    const token = stageToken;
    setTimeout(() => { if (token === stageToken && phone) addQuestOptions(st, opts); }, 900);
  };
  window.phoneMe = function (o) {
    if (!phone) return false;
    const feed = phone.querySelector("#phFeed");
    feed.insertAdjacentHTML("beforeend", `<div class="ph-msg me"><div class="he" dir="rtl">${g(o.he)}</div><div class="tr">${g(o.tr)}</div></div>`);
    feed.scrollTop = 1e6;
    return true;
  };
  function closePhone(now) {
    if (!phone) return;
    const p = phone; phone = null; clearInterval(p._t);
    p.classList.add("out"); setTimeout(() => p.remove(), now ? 0 : 450);
  }
  window.closePhone = closePhone;
  window.phoneOpen = () => !!phone;
})();
