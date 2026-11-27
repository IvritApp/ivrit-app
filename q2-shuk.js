// =====================================================
// КВЕСТ «ШУК» (уровень 7) — своя механика для quest2.js (window.Q2_STEPS).
// Рынок от первого лица: внизу руки с сумкой-тележкой, купленное торчит из сумки.
//   shuk_walk   — идёшь ГОЛОСОМ: «יָשָׁר» — вперёд (камера едет по ряду), потом друг спрашивает «где…?» —
//                 «שְׂמֹאלָה / יָמִינָה / יָשָׁר» поворачивает к нужному прилавку (не туда — ошибка, камера заглядывает и возвращается);
//   shuk_stall  — прилавок (широкая картинка, листается пальцем): назови товар из списка → (цвет) → продавец называет цену →
//                 ТОРГ: «יָקָר מִדַּי!», «אֶפְשָׁר הֲנָחָה?» — цена падает до «последней»; «לֹא, תּוֹדָה» — делаешь вид, что уходишь
//                 (трюк шука: упрямая продавщица зовёт назад и уступает); «זֶה זוֹל!» — ошибка, цена РАСТЁТ;
//                 «אֲנִי לוֹקֵחַ» — купить (только после торга): монеты — продавцу, товар летит в сумку, кошелёк худеет;
//   shuk_wallet — «сколько денег в кошельке?» — сказать остаток числом.
// Данные — content/he/quests2/shuk.json (поле "shuk": кошелёк, список, товары, цвета, направления, фразы, реплики продавцов).
// Без микрофона (или «🙊») все подсказки — кнопки. Все реплики — целиком из JSON (озвучены tts_build.ps1).
// =====================================================
(function () {
  const S = window.Q2_STEPS = window.Q2_STEPS || {};
  const FRIEND = "{m:david}{f:tzila}";
  const ARROW = { left: "⬅", straight: "⬆", right: "➡" };
  const play = (n) => { if (typeof playSound === "function") playSound(n); };
  const buzz = (n) => { if (typeof vibrate === "function") vibrate(n); };

  // общее состояние квеста — в объекте квеста («Пройти ещё раз» грузит JSON заново, значит всё с нуля)
  function state(api) {
    const Q = api.Q;
    if (!Q._shuk) Q._shuk = { money: Q.shuk.wallet, bag: [], got: [], words: {}, turn: "" };
    return Q._shuk;
  }
  function addWord(api, w) {
    const s = state(api), key = w && api.he(w);
    if (!key || s.words[key]) return;
    s.words[key] = 1; api.word(w);
  }

  // ---------- слои сцены (один раз на квест): мир (ряд / прилавок), тележка с руками, подсказка друга ----------
  function layers(api) {
    const sc = api.scene();
    api.root.classList.add("q2shuk-on", "q2-filling");
    if (!sc.querySelector(".q2shuk-world")) {
      const world = document.createElement("div"); world.className = "q2shuk-world"; sc.prepend(world);
      const cart = document.createElement("div"); cart.className = "q2shuk-cart";
      cart.innerHTML = `<div class="q2shuk-bag"></div><img class="q2shuk-hands" src="${api.pic("hands")}" alt="" draggable="false">`;
      sc.appendChild(cart);
      const pal = document.createElement("div"); pal.className = "q2shuk-pal"; pal.hidden = true;
      pal.innerHTML = `<div class="q2shuk-face">${typeof charImgHTML === "function" ? charImgHTML(api.g(FRIEND)) : ""}</div><div class="q2shuk-pal-t"></div>`;
      sc.appendChild(pal);
      drawBag(api);
    }
    return { sc, world: sc.querySelector(".q2shuk-world"), cart: sc.querySelector(".q2shuk-cart") };
  }
  // купленное торчит из сумки
  function drawBag(api) {
    const bag = api.scene() && api.scene().querySelector(".q2shuk-bag");
    if (!bag) return;
    bag.innerHTML = state(api).bag.map((id, n) =>
      `<img src="${api.pic(id)}" alt="" style="left:${[50, 35, 65, 42, 58][n % 5]}%;--r:${[-6, 9, -11, 5, -3][n % 5]}deg">`).join("");
  }
  // друг подсказывает по-русски (маленькое облачко с лицом внизу сцены)
  function pal(api, text, ms) {
    const p = api.scene() && api.scene().querySelector(".q2shuk-pal");
    if (!p) return;
    p.querySelector(".q2shuk-pal-t").textContent = api.g(text);
    p.hidden = false; p.classList.remove("in"); void p.offsetWidth; p.classList.add("in");
    clearTimeout(p._t); p._t = setTimeout(() => { p.hidden = true; }, ms || 5000);
  }
  function palHide(api) { const p = api.scene() && api.scene().querySelector(".q2shuk-pal"); if (p) { clearTimeout(p._t); p.hidden = true; } }
  // продавец у прилавка (#q2Npc движка): свой человек на каждом прилавке, сбоку
  function vendor(api, v) {
    const box = api.scene() && api.scene().querySelector("#q2Npc");
    if (!box) return;
    if (!v) { box.classList.add("q2shuk-off"); return; }
    if (box.dataset.char !== v.id && typeof charImgHTML === "function" && window.HirbisChars && HirbisChars.has(v.id)) { box.innerHTML = charImgHTML(v.id); box.dataset.char = v.id; }
    const left = v.side === "left", x = (v.x == null ? -18 : v.x) + "%";
    box.style.left = left ? x : "auto"; box.style.right = left ? "auto" : x;
    box.style.bottom = (v.bottom == null ? 0 : v.bottom) + "%"; box.style.height = (v.h == null ? 66 : v.h) + "%";
    if (box.classList.contains("q2shuk-off") || !box.classList.contains("q2shuk-in")) {
      box.classList.remove("q2shuk-off", "q2shuk-in"); void box.offsetWidth; box.classList.add("q2shuk-in");
    }
  }

  // ---------- панель: список покупок + кошелёк ----------
  function hudHTML(api) {
    const s = state(api), K = api.Q.shuk;
    return `<div class="q2shuk-hud"><div class="q2shuk-list">${K.list.map(it =>
      `<button type="button" class="q2shuk-li${s.got.includes(it.id) ? " got" : ""}" data-id="${it.id}"><img src="${api.pic(it.pic)}" alt=""><b dir="rtl">${api.esc(api.he(it))}</b></button>`).join("")}</div>
      <div class="q2shuk-wal"><img src="${api.pic("wallet")}" alt=""><b>${s.money}</b>&nbsp;₪</div></div>`;
  }
  // нажатие на строку списка: слово звучит; onPick — у прилавка без микрофона это «назвать товар»
  function bindHud(api, onPick) {
    api.panel.querySelectorAll(".q2shuk-li").forEach(b => b.onclick = () => {
      const it = api.Q.shuk.list.find(x => x.id === b.dataset.id);
      api.speak(it);
      if (onPick && onPick(it)) return;
      api.hint(`«${api.he(it)}» — ${api.tr(it)} (${api.g(it.ru)})`);
    });
  }
  const taskHTML = (api, t) => `<div class="q2-task">${t}</div><div class="q2-hint" id="q2Hint"></div>`;
  const heB = (api, x) => `<bdi dir="rtl">${api.esc(api.he(x))}</bdi>`;
  // кнопка-фраза: иврит + транскрипция · перевод
  const phraseBtn = (api, cls, data, x, extra) =>
    `<button class="q2shuk-p ${cls}" type="button" ${data}>${extra || ""}<b dir="rtl">${api.esc(api.he(x))}</b><span>${api.esc(api.tr(x))} · ${api.esc(api.g(x.ru))}</span></button>`;

  // 23.11 (владелец): игрок ВСЁ говорит сам. С микрофоном готовых фраз на экране нет — только задание, 🎤 и «💡 Подсказка»
  // (как у choice в quest2.js): 1-е нажатие — начало фразы (+ звук), 2-е — фразы целиком (нажал — звучит).
  // s.hintLv — уровень подсказки шага (перерисовка панели его не сбрасывает). o.first() — главная фраза сейчас,
  // o.all() — фразы 2-го уровня, o.lv1 — свой 1-й уровень {text, say} (кошелёк: не выдавать ответ сразу), box — куда класть фразы.
  function hintBtn(api, s, o, box) {
    const showAll = () => {
      const arr = o.all();
      box.innerHTML = arr.map(x => phraseBtn(api, "", "", x)).join("");
      box.hidden = false;
      box.querySelectorAll("button").forEach((b, i) => b.onclick = () => api.speak(arr[i]));
    };
    if ((s.hintLv || 0) >= 2) { showAll(); return null; }
    const hb = document.createElement("button");
    hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = s.hintLv ? "💡 Ещё подсказка" : "💡 Подсказка";
    hb.onclick = () => {
      if (!s.hintLv) {
        const lv1 = o.lv1 && o.lv1();
        if (lv1) { s.hintLv = 1; api.hint(lv1.text); if (lv1.say) api.speak(lv1.say); hb.textContent = "💡 Ещё подсказка"; return; }
        const x = o.first(), w = api.he(x).split(/\s+/), t = api.tr(x).split(/\s+/);
        if (w.length > 1) {
          const n = Math.max(1, Math.ceil(w.length / 3));
          s.hintLv = 1; api.hint(`Начни так: ⁨${w.slice(0, n).join(" ")} …⁩ (${t.slice(0, n).join(" ")} …)`);
          api.speak(w.slice(0, n).join(" ")); hb.textContent = "💡 Ещё подсказка";
          return;
        }
      }
      s.hintLv = 2; showAll(); hb.remove();
      api.hint(api.g("Послушай (нажми на фразу) — и скажи сам{m:}{f:а} 🎤"));
    };
    return hb;
  }
  const hintsBox = `<div class="q2shuk-ph q2shuk-hints" hidden></div>`;

  // ---------- распознавание ----------
  const words = (api, a) => api.heNorm(a).split(" ").filter(Boolean);
  // направление: первая фраза, где оно есть; два разных сразу — "many"
  function dirOf(api, alts) {
    for (const a of alts) {
      const f = new Set();
      words(api, a).forEach(w0 => {
        const w = w0.length > 3 ? w0.replace(/^[ול]/, "") : w0;           // «ושמאלה», «לימין»
        if (/^שמאל/.test(w) || /^סמול/.test(w)) f.add("left");
        else if (/^ימינ/.test(w)) f.add("right");
        else if (w === "ישר" || w === "ישרה" || w === "קדימה") f.add("straight");
      });
      if (f.size > 1) return "many";
      if (f.size) return [...f][0];
    }
    return "";
  }
  // цвет («אדום», «אדומה»…)
  function colorOf(api, alts) {
    const C = api.Q.shuk.colors;
    for (const a of alts) for (const w of words(api, a)) for (const c in C) {
      const f = api.heNorm(api.he(C[c]));
      if (w === f || api.heSim(w, f) >= 0.75) return c;
    }
    return "";
  }
  // что сказал на торге: haggle (дорого / скидка), walk (нет, спасибо), accept (беру), trap (дёшево)
  function classify(api, alts) {
    for (const a of alts) {
      const n = " " + api.heNorm(a) + " ";
      if (/ לא תודה /.test(n)) return { k: "walk" };
      if (/הנחה|יקר|פחות|לא זול|מבצע/.test(n)) return { k: "haggle", n: /הנחה|מבצע/.test(n) ? 1 : 0 };
      if (/לוקח|קונה|בסדר|סבבה|אוקי|מסכימ|עסקה/.test(n)) return { k: "accept" };
      if (/זול/.test(n)) return { k: "trap" };
      if (/^ לא /.test(n)) return { k: "walk" };
    }
    return null;
  }
  // сумма: цифрами («20») или словом («עשרים»)
  function amountOf(api, alts) {
    const A = api.Q.shuk.amounts;
    for (const a of alts) {
      const d = String(a).match(/\d+/);
      if (d) return +d[0];
      for (const w of words(api, a)) for (const n in A) {
        const forms = [words(api, api.he(A[n]))[0]].concat((A[n].also || []).map(x => api.heNorm(x)));
        if (forms.includes(w)) return +n;
      }
    }
    return 0;
  }

  // проверка распознавания в консоли: q2shukTest(Q).classify(["יקר מדי"]) — Q = данные shuk.json
  window.q2shukTest = (Q) => {
    const api = { Q, heNorm, heSim, he: (x) => g(x.he) };
    return { dir: (a) => dirOf(api, a), color: (a) => colorOf(api, a), classify: (a) => classify(api, a), amount: (a) => amountOf(api, a) };
  };

  // =====================================================
  // ХОДЬБА ПО РЯДУ
  // =====================================================
  S.shuk_walk = function (api) {
    const st = api.st, K = api.Q.shuk, L = layers(api), fresh = !st._s;
    const s = st._s || (st._s = { walked: false, asked: false, done: false });
    if (s.done) { api.next(200); return; }
    s.busy = false;
    vendor(api, null); palHide(api);
    const W = L.world;
    if (W._st !== st) {
      W._st = st;
      W.className = "q2shuk-world walk" + (state(api).turn ? " in-back" : "");
      W.onpointerdown = null;
      W.innerHTML = `<div class="q2shuk-mir${st.mirror ? " on" : ""}"><div class="q2shuk-bg" style="background-image:url('${api.pic(st.bg)}');transform-origin:${st.vx || 50}% ${st.vy || 55}%"></div></div>
        <div class="q2shuk-sign q2-focus ${st.target}" hidden><img src="${api.pic(st.sign)}" alt=""><b>${ARROW[st.target]}</b></div>`;
      L.cart.className = "q2shuk-cart";
    }
    W.classList.remove("walking", "peek-left", "peek-right", "peek-straight");
    L.cart.classList.remove("bob");
    const sign = W.querySelector(".q2shuk-sign");
    if (s.walked) { W.classList.add("walked"); sign.hidden = false; }

    const P = api.panel;
    const draw = () => {
      const mic = api.micOK();
      // с микрофоном: стрелки без иврита (слово игрок говорит сам, 💡 — подсказка); без микрофона: стрелки с ивритом = ответ
      P.innerHTML = hudHTML(api) + taskHTML(api, s.walked ? "Куда повернуть? Скажи на иврите" : (mic ? "Иди вперёд — скажи на иврите «прямо»" : `Иди вперёд — нажми ${heB(api, K.dirs.straight)}`)) +
        `<div class="q2shuk-dirs">${["left", "straight", "right"].map(d => mic
          ? `<button class="q2shuk-p q2shuk-dir q2shuk-arr" type="button" data-d="${d}" aria-label="${api.esc(api.g(K.dirs[d].ru))}"><i>${ARROW[d]}</i></button>`
          : phraseBtn(api, "q2shuk-dir", `data-d="${d}"`, K.dirs[d], `<i>${ARROW[d]}</i>`)).join("")}</div>` + (mic ? hintsBox : "");
      bindHud(api);
      P.querySelectorAll(".q2shuk-dir").forEach(b => b.onclick = () => {
        const d = b.dataset.d;
        if (!mic) { api.speak(K.dirs[d]); go(d); } else api.hint("Скажи это на иврите 🎤 Не помнишь слово — 💡", true);
      });
      if (mic) {
        P.appendChild(api.micBtn("Скажи, куда идти", alts => {
          const d = dirOf(api, alts);
          if (d === "many") api.hint("Скажи одно направление 🙂", true);
          else if (d) go(d);
          else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
        }));
        const hb = hintBtn(api, s, { first: () => K.dirs.straight, all: () => s.walked ? ["left", "straight", "right"].map(d => K.dirs[d]) : [K.dirs.straight] }, P.querySelector(".q2shuk-hints"));
        if (hb) P.appendChild(hb);
        api.noSpeakLink();
      }
      api.hint(s.walked ? "Посмотри на знак 👀" : (mic ? "Нажми 🎤 и скажи" : "Нажми на стрелку"));
    };
    const go = (d) => {
      if (s.done || s.busy) return;
      if (!s.walked) {
        if (d !== "straight") { api.hint(api.micOK() ? "Сначала — вперёд ⬆ Скажи «прямо» на иврите" : `Сначала вперёд — нажми «${api.he(K.dirs.straight)}» ⬆`, true); return; }
        s.walked = true; s.busy = true; s.hintLv = 0; api.good(5);
        W.classList.add("walking", "walked"); L.cart.classList.add("bob"); play("pop");
        api.hint("✓ " + api.he(K.dirs.straight) + " — идём…");
        setTimeout(() => {
          if (!api.alive()) return;
          s.busy = false; W.classList.remove("walking"); L.cart.classList.remove("bob");
          sign.hidden = false; play("pop");
          s.asked = true; api.say(st.ask);
          draw();
        }, 1900);
        return;
      }
      if (d === st.target) {                                        // правильно — поворачиваем к прилавку
        s.done = true; state(api).turn = d;
        api.good(5); play("right");
        W.classList.add("turn-" + d); L.cart.classList.add("turn-" + d);
        P.querySelectorAll("button").forEach(b => b.disabled = true);
        api.hint("✓ " + api.he(K.dirs[d]));
        api.next(750);
        return;
      }
      api.mistake(); play("wrong");                                  // не туда: камера заглядывает и возвращается
      W.classList.remove("peek-left", "peek-right", "peek-straight"); void W.offsetWidth; W.classList.add("peek-" + d);
      api.hint(`Не туда 🙂 «${api.he(K.dirs[d])}» — это ${api.g(K.dirs[d].ru)}. Посмотри на знак`, true);
      pal(api, "Смотри на знак 👀");
    };
    draw();
    if (s.walked && !s.asked) { s.asked = true; api.say(st.ask); }
    else if (fresh) api.say(st.intro);
  };

  // =====================================================
  // ПРИЛАВОК И ТОРГ
  // =====================================================
  function pileHTML(api, p) {
    const K = api.Q.shuk, g = K.goods[p.g], col = p.c && K.colors[p.c], f = col ? col.f : "";
    // перец другого цвета — тот же рисунок с фильтром; "stem" — хвостик поверх без фильтра (остаётся зелёным)
    const img = `<span><img src="${api.pic(g.pic)}" alt=""${f ? ` style="filter:${f}"` : ""}>${col && col.stem ? `<img class="q2shuk-stem" src="${api.pic(g.pic)}" alt="">` : ""}</span>`;
    return `<div class="q2shuk-pile" data-g="${p.g}"${p.c ? ` data-c="${p.c}"` : ""}${p.main ? ' data-main="1"' : ""} data-x="${p.x}" data-y="${p.y}" data-w="${p.w}"
      style="left:${p.x}%;bottom:${100 - p.y}%;width:${p.w}%">${img}${img}${img}</div>`;
  }

  S.shuk_stall = function (api) {
    const st = api.st, Q = api.Q, K = Q.shuk, L = layers(api), fresh = !st._s;
    const lad = st.ladder, last = lad.length - 1, at = st.at == null ? 1 : st.at;
    const s = st._s || (st._s = { phase: "name", i: at, walked: false, tip: false, pan: null });
    if (s.phase === "done") { api.next(300); return; }
    s.busy = false;
    Q.seller = st.who;                       // quest2.js: рот у человека на картинке двигается, когда говорит он сам
    vendor(api, st.vendor);
    palHide(api);
    const goods = st.goods.map(id => Object.assign({ id }, K.goods[id]));
    const want = goods.find(x => x.id === st.want);
    const item = K.list.find(x => x.id === st.item);
    const mainDef = st.piles.find(p => p.main) || st.piles.find(p => p.g === st.want);
    const wantAt = st.vendor && st.vendor.side === "left" ? 58 : 42;   // где на экране держать нужный товар (не за продавцом)
    const W = L.world;
    const panEl = () => W.querySelector(".q2shuk-pan");
    // камера по прилавку: картинка шире сцены в 2,25 раза; left — сдвиг в % ширины сцены (−125…0)
    const setPan = (left, smooth) => {
      s.pan = Math.max(-125, Math.min(0, left));
      const p = panEl(); if (!p) return;
      p.classList.toggle("smooth", !!smooth);
      p.style.transform = `translateX(${s.pan / 2.25}%)`;
    };
    const pan = (c, smooth, scr) => setPan((scr == null ? 50 : scr) - 2.25 * c, smooth);

    if (W._st !== st) {
      W._st = st;
      W.className = "q2shuk-world stall in-" + (state(api).turn || "left");
      W.innerHTML = `<div class="q2shuk-pan"><img class="q2shuk-view" src="${api.pic(st.view)}" alt="" draggable="false">${st.piles.map(p => pileHTML(api, p)).join("")}<div class="q2shuk-tag" hidden></div></div>`;
      L.cart.className = "q2shuk-cart low";
      const c = st.center == null ? 50 : st.center;
      pan(c + (state(api).turn === "right" ? 9 : -9), false);       // камера «доворачивается» к прилавку
      setTimeout(() => { if (api.alive()) pan(c, true); }, 60);
    } else if (s.pan != null) setPan(s.pan, false);
    W.classList.remove("away");
    L.cart.classList.remove("away");
    const mainEl = () => W.querySelector(".q2shuk-pile[data-main]");

    // ценник над нужным товаром: старая цена зачёркнута, новая выскакивает
    const tag = (price, old) => {
      const t = W.querySelector(".q2shuk-tag"); if (!t || !mainDef) return;
      t.style.left = mainDef.x + "%"; t.style.top = (mainDef.y + .5) + "%";     // под товаром (над ним — облачко реплики)
      t.hidden = false;
      t.innerHTML = (old && old !== price ? `<s>${old}</s>` : "") + `<b>${price}&nbsp;₪</b>`;
      t.classList.remove("pop", "up", "down"); void t.offsetWidth;
      t.classList.add("pop"); if (old && old !== price) t.classList.add(price < old ? "down" : "up");
    };
    // название над товаром, на который нажали
    const label = (el, x) => {
      const pn = panEl(); if (!pn) return;
      pn.querySelectorAll(".q2shuk-lbl").forEach(l => l.remove());
      const l = document.createElement("div"); l.className = "q2shuk-lbl";
      l.innerHTML = `<span dir="rtl">${api.esc(api.he(x))}</span><small>${api.esc(api.g(x.ru))}</small>`;
      l.style.left = el.dataset.x + "%"; l.style.top = (+el.dataset.y - 1.2 * +el.dataset.w) + "%";
      pn.appendChild(l); setTimeout(() => l.remove(), 1900);
    };
    const showWant = () => {
      const m = mainEl(); if (m) m.classList.add("want");
      if (mainDef) pan(mainDef.x, true, wantAt);
      tag(lad[s.i]);
    };
    if (s.phase === "haggle") showWant();

    // ---------- панель по фазе ----------
    const P = api.panel;
    const draw = (h, bad) => {
      const mic = api.micOK(), floor = s.i >= last;
      let html = hudHTML(api), def = "";
      const ph = K.phrases;
      // с микрофоном вариантов нет: задание + 🎤 + 💡; без микрофона — кнопки (как раньше)
      if (s.phase === "name") {
        html += taskHTML(api, "Скажи продавцу, что ищешь — смотри список 📝") + (mic ? hintsBox : "");
        def = mic ? "Нажми 🎤 и скажи. Прилавок листается пальцем ⇆" : "Нажми на нужное в списке 📝 или на прилавке 👆";
      } else if (s.phase === "color") {
        html += taskHTML(api, mic ? "Какой цвет нужен? Скажи на иврите 📝" : "Какой цвет? Смотри список 📝") + (mic ? hintsBox :
          `<div class="q2shuk-cols">${Object.keys(K.colors).map(c => phraseBtn(api, "q2shuk-col", `data-c="${c}" style="--c:${K.colors[c].css}"`, K.colors[c], "<i></i>")).join("")}</div>`);
        def = mic ? "Нажми 🎤 и скажи цвет" : "Выбери цвет";
      } else {
        html += taskHTML(api, floor ? (mic ? "Это последняя цена — скажи, что берёшь!" : `Это последняя цена — бери! Нажми ${heB(api, ph.accept)}`)
          : (st.firm && !s.walked && s.tip) ? "Не уступает… Попробуй трюк шука 😉" : (mic ? "Торгуйся голосом — и цена упадёт!" : "Торгуйся — и цена упадёт 👇")) +
          (mic ? hintsBox : `<div class="q2shuk-ph">${[["haggle", 0, ph.haggle[0]], ["haggle", 1, ph.haggle[1]], ["walk", 0, ph.walk], ["trap", 0, ph.trap], ["accept", 0, ph.accept]]
            .map(([k, n, x]) => phraseBtn(api, k === "accept" ? "acc" : "", `data-k="${k}" data-n="${n}"`, x)).join("")}</div>`);
        def = mic ? "Нажми 🎤 и скажи" : "Выбери, что сказать";
      }
      P.innerHTML = html;
      bindHud(api, (it) => {                                          // без микрофона: нажал на строку списка — назвал товар
        if (mic || s.phase !== "name" || s.busy) return false;
        if (it.id === st.item) named("");
        else { api.hint(`Это не здесь 🙂 Тут нужно: ${api.he(item)}`, true); }
        return true;
      });
      P.querySelectorAll(".q2shuk-col").forEach(b => b.onclick = () => {
        const x = K.colors[b.dataset.c]; api.speak(x);
        if (!mic) pickColor(b.dataset.c); else api.hint(`«${api.he(x)}» — ${api.g(x.ru)}. Скажи 🎤`);
      });
      P.querySelectorAll(".q2shuk-ph .q2shuk-p").forEach(b => b.onclick = () => {
        const k = b.dataset.k, n = +b.dataset.n, x = k === "haggle" ? K.phrases.haggle[n] : K.phrases[k];
        api.speak(x);
        if (!mic) act(k, n); else api.hint(`«${api.he(x)}» — ${api.g(x.ru)}. Скажи 🎤`);
      });
      if (mic) {
        const micLabel = s.phase === "name" ? "Скажи, что ищешь" : s.phase === "color" ? "Скажи цвет" : "Торгуйся голосом";
        P.appendChild(api.micBtn(micLabel, alts => {
          if (s.busy) return;
          if (s.phase === "name") {
            const hits = api.namedItems(alts, goods), col = colorOf(api, alts);
            if (hits.some(h => h.id === st.want)) named(col);
            else if (hits.length) { api.voiceMiss(); api.hint(`«${api.he(hits[0])}» — нет в списке 📝`, true); pal(api, `Нам нужно: ${api.he(item)}`); }
            else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
          } else if (s.phase === "color") {
            const c = colorOf(api, alts);
            if (c) pickColor(c); else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
          } else if (s.phase === "haggle") {
            const r = classify(api, alts);
            if (r) act(r.k, r.n); else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
          }
        }));
        // 💡 своя для каждой фазы (уровень помнится, пока фаза та же)
        const hs = (s.h || (s.h = {}))[s.phase] || (s.h[s.phase] = {});
        const o = s.phase === "name" ? { first: () => ph.look, all: () => [ph.look, item],
            lv1: () => ({ text: `Начни так: ⁨${api.he(ph.look)} …⁩ (${api.tr(ph.look)} …) — и что в списке`, say: ph.look }) }
          : s.phase === "color" ? { first: () => K.colors[st.color], all: () => Object.keys(K.colors).map(c => K.colors[c]) }
          : { first: () => floor ? ph.accept : (st.firm && !s.walked && s.tip) ? ph.walk : ph.haggle[0],
              all: () => floor ? [ph.accept] : [ph.haggle[0], ph.haggle[1], ph.walk, ph.accept] };     // «זֶה זוֹל» с микрофоном не подсказываем
        const hb = hintBtn(api, hs, o, P.querySelector(".q2shuk-hints"));
        if (hb) P.appendChild(hb);
        api.noSpeakLink();
      }
      api.hint(h || def, bad);
    };

    // ---------- нажатия и перетаскивание прилавка ----------
    const tapPile = (el) => {
      const g = goods.find(x => x.id === el.dataset.g); if (!g || s.phase === "done") return;
      const c = el.dataset.c;
      if (s.phase === "color" && c && g.id === st.want) {             // в выборе цвета перцы — это цвета
        const col = K.colors[c]; api.speak(col); label(el, col);
        if (!api.micOK()) pickColor(c); else api.hint(`«${api.he(col)}» — ${api.g(col.ru)}. Скажи 🎤`);
        return;
      }
      api.speak(g); label(el, g);
      if (s.phase !== "name") return;
      if (api.micOK()) { api.hint(`«${api.he(g)}» — ${api.tr(g)} (${api.g(g.ru)}). Скажи продавцу 🎤`); return; }
      if (g.id === st.want) named("");
      else { api.hint(`«${api.he(g)}» — нет в списке 📝`, true); pal(api, `Нам нужно: ${api.he(item)}`); }
    };
    W.onpointerdown = (e) => {
      if (e.button > 0) return;
      const x0 = e.clientX, left0 = s.pan || 0, w = api.scene().clientWidth || 300;
      let moved = false;
      const mv = (ev) => { const dx = ev.clientX - x0; if (Math.abs(dx) > 8) moved = true; if (moved) setPan(left0 + dx / w * 100, false); };
      const up = (ev) => {
        W.removeEventListener("pointermove", mv); W.removeEventListener("pointerup", up); W.removeEventListener("pointercancel", up);
        if (moved || ev.type === "pointercancel") return;
        const t = document.elementFromPoint(ev.clientX, ev.clientY), pile = t && t.closest ? t.closest(".q2shuk-pile") : null;
        if (pile && W.contains(pile)) tapPile(pile);
      };
      W.addEventListener("pointermove", mv); W.addEventListener("pointerup", up); W.addEventListener("pointercancel", up);
      try { W.setPointerCapture(e.pointerId); } catch (x) {}
    };

    // ---------- шаги разговора ----------
    function openPrice() {
      s.phase = "haggle";
      showWant();
      api.say(st.open);
    }
    function named(col) {
      api.good(5); play("pop");
      if (st.color && col !== st.color) {
        if (col) { api.mistake(); pal(api, `Нужен: ${api.he(item)}`); }
        s.phase = "color";
        pan(st.colorAt == null ? 40 : st.colorAt, true, st.colorScr);   // все три цвета в кадре, не за продавцом
        api.say(K.say.color);
        draw(col ? "Не тот цвет 🙂" : "", !!col);
        return;
      }
      openPrice();
      draw("✓ " + api.he(st.color ? item : want));
    }
    function pickColor(c) {
      if (s.phase !== "color") return;
      if (c === st.color) { api.good(5); play("pop"); openPrice(); draw("✓ " + api.he(K.colors[c])); return; }
      api.mistake(); play("wrong");
      api.hint(`«${api.he(K.colors[c])}» — ${api.g(K.colors[c].ru)}. Не тот цвет 🙂`, true);
      pal(api, `Нужен: ${api.he(item)}`);
    }
    const priceLine = () => (s.i >= last ? K.say.last : K.say.drop)[lad[s.i]];
    // короткие подсказки (с микрофоном — без готовой фразы на иврите)
    const trick = () => api.micOK() ? "Трюк: «нет, спасибо» — и уходи 😉" : `Трюк: скажи «${api.he(K.phrases.walk)}» 😉`;
    const lowest = () => api.micOK() ? "Ниже не будет — скажи, что берёшь" : `Ниже не будет — нажми «${api.he(K.phrases.accept)}»`;
    function act(k, n) {
      if (s.phase !== "haggle" || s.busy) return;
      const old = lad[s.i];
      if (k === "haggle") {
        addWord(api, K.phrases.haggle[n || 0]);
        if (st.firm && !s.walked) {                                   // упрямая продавщица: скидки нет — нужен трюк
          api.say(K.say.firm); play("wrong");
          if (!s.tip) { s.tip = true; setTimeout(() => { if (api.alive()) pal(api, trick(), 7000); }, 1300); }
          draw("Скидки нет…", true);
          return;
        }
        if (s.i >= last) { api.say(K.say.enough); draw(lowest()); return; }
        s.i++; api.good(5); play("pop"); buzz("light");
        tag(lad[s.i], old); api.say(priceLine());
        draw(`✓ ${old} → ${lad[s.i]} ₪`);
        return;
      }
      if (k === "walk") {
        if (s.i >= last) { api.say(K.say.enough); draw(lowest()); return; }      // уходить можно не раз — продавец зовёт назад, пока есть куда уступать
        addWord(api, K.phrases.walk);
        s.walked = true; s.busy = true;
        if (st.firm) s.i = last; else s.i++;                         // состояние — сразу (перерисовка шага его не потеряет)
        W.classList.add("away"); L.cart.classList.add("away");          // разворачиваешься и уходишь…
        draw("Уходишь… 🚶");
        setTimeout(() => {
          if (!api.alive()) return;
          W.classList.remove("away"); L.cart.classList.remove("away");
          if (st.firm && st.back) api.say(st.back);
          else { api.say(K.say.wait); setTimeout(() => { if (api.alive()) api.say(priceLine()); }, 1300); }
          tag(lad[s.i], old); api.good(10); play("combo"); buzz("light");
          s.busy = false;
          draw(`✓ Трюк сработал: ${old} → ${lad[s.i]} ₪`);
        }, 1150);
        return;
      }
      if (k === "trap") {                                             // «это дёшево» — продавец только рад
        api.mistake(); play("wrong");
        if (s.i > 0) s.i--;
        tag(lad[s.i], old); api.say(K.say.up[lad[s.i]]);
        setTimeout(() => { if (api.alive()) api.npcAct("happy", 1600); }, 350);
        pal(api, "Ой, это «дёшево»! Цена выросла 😅", 6000);
        draw(`Цена выросла: ${old} → ${lad[s.i]} ₪`, true);
        return;
      }
      if (k === "accept") {
        if (lad[s.i] >= lad[at]) {                                    // сначала — поторговаться
          if (st.firm) pal(api, trick(), 7000);
          else pal(api, "Стоп! Тут торгуются 😉", 6000);
          draw("Сначала поторгуйся 🙂", true);
          return;
        }
        if (lad[s.i] > state(api).money) { pal(api, "Денег не хватает 👛"); return; }
        buy();
      }
    }
    function buy() {
      const price = lad[s.i], G = state(api);
      s.phase = "done";
      G.money -= price; G.got.push(st.item); G.bag.push(want.pic);
      addWord(api, K.phrases.accept); addWord(api, item);
      api.say(K.say.sold); api.good(10); play("right"); buzz("success");
      // монеты — продавцу, товар — в сумку, кошелёк худеет
      const sc = api.scene(), rs = sc.getBoundingClientRect(), left = st.vendor && st.vendor.side === "left";
      const fly = (src, x0, y0, w0, x1, y1, w1, f, ms) => {
        const el = document.createElement("img"); el.className = "q2shuk-fly"; el.src = src; el.alt = "";
        if (f) el.style.filter = f;
        Object.assign(el.style, { left: x0 + "px", top: y0 + "px", width: w0 + "px" });
        sc.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => Object.assign(el.style, { left: x1 + "px", top: y1 + "px", width: w1 + "px" })));
        setTimeout(() => el.remove(), ms);
      };
      fly(api.pic("coins"), rs.width * .5, rs.height * .92, rs.width * .14, rs.width * (left ? .12 : .88), rs.height * .5, rs.width * .08, "", 850);
      const m = mainEl();
      if (m) {
        const r = m.getBoundingClientRect(), md = st.piles.find(p => p.main) || {};
        const f = md.c && K.colors[md.c] ? K.colors[md.c].f : "";
        m.classList.remove("want"); m.classList.add("taken");
        setTimeout(() => {
          if (!api.alive()) return;
          fly(api.pic(want.pic), r.left - rs.left + r.width / 2, r.top - rs.top + r.height / 2, r.width * .6, rs.width * .5, rs.height * .93, rs.width * .2, f, 900);
          setTimeout(() => { if (api.alive()) { drawBag(api); play("pop"); } }, 820);
        }, 350);
      } else drawBag(api);
      const wal = P.querySelector(".q2shuk-wal");
      if (wal) {
        wal.querySelector("b").textContent = G.money;
        wal.classList.remove("pay"); void wal.offsetWidth; wal.classList.add("pay");
        const d = document.createElement("span"); d.className = "q2shuk-minus"; d.textContent = "−" + price; wal.appendChild(d);
      }
      const li = P.querySelector(`.q2shuk-li[data-id="${st.item}"]`); if (li) li.classList.add("got");
      P.querySelectorAll(".q2shuk-ph button, .q2-mic, .q2-nospeak").forEach(b => b.disabled = true);
      api.hint(api.g(`✓ Купил{m:}{f:а} за ${price} ₪! В кошельке ${G.money} ₪`));
      api.next(2600);
    }

    draw();
    if (fresh) setTimeout(() => { if (api.alive() && s.phase === "name") api.say(K.say.ask); }, 650);
  };

  // =====================================================
  // СКОЛЬКО ОСТАЛОСЬ В КОШЕЛЬКЕ
  // =====================================================
  function cashHTML(m) {
    let r = m, out = "";
    const notes = [[100, "n100"], [50, "n50"], [20, "n20"]];
    notes.forEach(([v, c]) => { while (r >= v) { out += `<span class="q2shuk-note ${c}"><i>₪</i>${v}</span>`; r -= v; } });
    while (r >= 10) { out += `<span class="q2shuk-coin">10</span>`; r -= 10; }
    while (r >= 5) { out += `<span class="q2shuk-coin s">5</span>`; r -= 5; }
    while (r >= 1) { out += `<span class="q2shuk-coin s">1</span>`; r -= 1; }
    return out;
  }
  S.shuk_wallet = function (api) {
    const st = api.st, K = api.Q.shuk, L = layers(api), fresh = !st._s;
    const money = state(api).money;
    const s = st._s || (st._s = { done: false, opts: null });
    if (s.done) { api.next(300); return; }
    vendor(api, null); palHide(api);
    const W = L.world;
    if (W._st !== st) {
      W._st = st;
      W.className = "q2shuk-world walk in-back";
      W.onpointerdown = null;
      W.innerHTML = `<div class="q2shuk-mir"><div class="q2shuk-bg" style="background-image:url('${api.pic(st.bg)}')"></div></div>
        <div class="q2shuk-wcard q2-focus"><img src="${api.pic("wallet")}" alt=""><div class="q2shuk-cash">${cashHTML(money)}</div></div>`;
      L.cart.className = "q2shuk-cart";
    }
    // варианты: настоящий остаток и соседние десятки (только суммы, которые есть в JSON)
    if (!s.opts) {
      const ok = (n) => !!K.amounts[n];
      let o = [money - 10, money, money + 10].filter(ok);
      if (o.length < 3) o = [money, money + 10, money + 20, money - 20].filter(ok).slice(0, 3);
      if (!o.includes(money)) o = [money];                            // на всякий случай (сумма без слова в JSON)
      s.opts = o.sort(() => Math.random() - .5);
    }
    const P = api.panel, mic = api.micOK();
    // с микрофоном сумм на экране нет — скажи сам (💡: сначала «… שְׁקָלִים», потом варианты — нажал, послушал)
    P.innerHTML = hudHTML(api) + taskHTML(api, mic ? "Посчитай деньги и скажи сумму на иврите" : "Посчитай деньги и ответь") +
      (mic ? `<div class="q2shuk-ph q2shuk-am q2shuk-hints" hidden></div>`
        : `<div class="q2shuk-ph q2shuk-am">${s.opts.map(n => K.amounts[n] ? phraseBtn(api, "", `data-n="${n}"`, K.amounts[n]) : "").join("")}</div>`);
    bindHud(api);
    const answer = (n) => {
      if (s.done) return;
      if (n === money) {
        s.done = true; api.good(10); play("right");
        addWord(api, K.amounts[n]);
        P.querySelectorAll("button").forEach(b => b.disabled = true);
        api.hint("✓ " + api.he(K.amounts[n]));
        setTimeout(() => { if (api.alive()) api.say(st.praise); }, 500);
        setTimeout(() => { const c = W.querySelector(".q2shuk-wcard"); if (api.alive() && c) c.classList.add("out"); }, 1900);
        api.next(2900);
        return;
      }
      api.mistake(); play("wrong");
      api.hint(n ? `${n} ₪? Посчитай купюры и монеты ещё раз 🙂` : "Посчитай ещё раз 🙂", true);
    };
    if (!mic) P.querySelectorAll(".q2shuk-am .q2shuk-p").forEach(b => b.onclick = () => { api.speak(K.amounts[b.dataset.n]); answer(+b.dataset.n); });
    else {
      P.appendChild(api.micBtn("Скажи, сколько", alts => {
        const n = amountOf(api, alts);
        if (n) answer(n); else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
      }));
      const sh = { he: "שְׁקָלִים", tr: "шкалим" };
      const hb = hintBtn(api, s, { first: () => K.amounts[money], all: () => s.opts.filter(n => K.amounts[n]).map(n => K.amounts[n]),
        lv1: () => ({ text: `Сложи купюры и монеты — и скажи: «число + ⁨${sh.he}⁩» (${sh.tr})`, say: sh.he }) }, P.querySelector(".q2shuk-hints"));
      if (hb) P.appendChild(hb);
      api.noSpeakLink();
    }
    api.hint(mic ? "Нажми 🎤 и скажи сумму" : "Выбери сумму");
    if (fresh) api.say(st.ask);
  };
})();
