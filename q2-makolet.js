// =====================================================
// КВЕСТ «МАГАЗИН» (makolet) — своя механика для quest2.js (23.11).
// Игрок катит тележку от первого лица (видны руки) и ГОЛОСОМ управляет:
//   שְׂמֹאלָה / יָמִינָה — посмотреть на полки слева / справа, יָשָׁר — идти дальше по магазину;
//   на полке называет товар («חָלָב», «אֲנִי רוֹצֶה גְּבִינָה וּבֵיצִים») — товар летит в тележку и копится там;
//   мамин список на бумажке отмечается ✓; 2 вещи можно взять себе (⭐); в одном ряду надо спросить хозяина «אֵיפֹה…?»
//   и понять ответ (куда повернуть). На кассе всё из тележки выезжает на ленту.
// Без микрофона / «🙊» — стрелки, товары и фразы становятся кнопками.
// Типы шагов: mk_aisle (ряд магазина), mk_belt (лента на кассе). Данные — content/he/quests2/makolet.json
//   (list — мамин список, goods — все товары {he,tr,ru,also}, dirs — слова-направления, extraMax — сколько вещей себе).
// =====================================================
(function () {
  window.Q2_STEPS = window.Q2_STEPS || {};
  const P = "q2makolet-";

  // общее состояние квеста (тележка) — живёт в объекте квеста: «Пройти ещё раз» загружает JSON заново → всё с нуля
  const state = (Q) => Q._mk || (Q._mk = { cart: [], extras: 0, words: {}, miss: 0 });
  const own = (sc, cls) => [...sc.children].filter(el => el.classList.contains(P + cls));
  const H = (s) => "\u2068" + s + "\u2069";                         // иврит внутри русской подсказки — отдельным островком (иначе порядок слов скачет)
  const snd = (n) => { if (typeof playSound === "function") playSound(n); };

  // ---------- распознавание: слова фразы → товары / направления ----------
  // приставки «ו» и «ה» отрезаем («וְהַחָלָב» → «חלב»); «בלי / לא + слово» — это НЕ брать
  const strip = (w) => (w.length > 3 ? w.replace(/^(וה|ו|ה)(?=...)/, "") : w);
  function words(api, a) {
    const t = (" " + api.heNorm(a) + " ").replace(/ (בלי|לא|ובלי|ולא) [^ ]+/g, " ");
    return t.trim().split(" ").filter(Boolean).map(strip);
  }
  const formsOf = (api, x) => [api.he(x)].concat((x.also || []).map(api.g))
    .map(f => api.heNorm(f).split(" ").filter(Boolean).map(strip).join(" ")).filter(Boolean);

  // какие товары (из ids) названы; берём первый вариант распознавания, в котором что-то нашлось
  function findGoods(api, alts, ids) {
    const G = api.Q.goods, forms = [];
    ids.forEach(id => G[id] && formsOf(api, G[id]).forEach(f => forms.push({ id, f })));
    forms.sort((x, y) => y.f.length - x.f.length);                 // длинные первыми: «תפוחי אדמה» раньше «תפוחים»
    for (const a of alts) {
      const out = [];
      let s = " " + words(api, a).join(" ") + " ";
      forms.forEach(({ id, f }) => {
        if (s.includes(" " + f + " ")) { if (!out.includes(id)) out.push(id); s = s.split(" " + f + " ").join(" # "); }
      });
      s.trim().split(" ").forEach(w => {                              // остальные слова — «похоже на» (распознаватель ошибается в буквах)
        if (w === "#" || w.length < 3) return;
        let best = null, bs = 0;
        forms.forEach(({ id, f }) => { if (f.includes(" ")) return; const v = api.heSim(w, f); if (v > bs) { bs = v; best = id; } });
        if (best && bs >= 0.75 && !out.includes(best)) out.push(best);
      });
      if (out.length) return out;
    }
    return [];
  }
  // направление: самое похожее слово; если два почти одинаково похожи — не угадываем
  function findDir(api, alts) {
    const D = api.Q.dirs;
    for (const a of alts) {
      const ws = words(api, a), line = " " + ws.join(" ") + " ";
      const sc = Object.keys(D).map(k => ({ k, v: Math.max(0, ...formsOf(api, D[k]).map(f =>
        f.includes(" ") ? (line.includes(" " + f + " ") ? 1 : 0) : Math.max(0, ...ws.map(w => api.heSim(w, f))))) }))
        .sort((x, y) => y.v - x.v);
      if (sc[0].v >= 0.6 && sc[0].v - sc[1].v > 0.05) return sc[0].k;
    }
    return null;
  }
  // не расслышали — не ошибка; после 3 промахов подряд подсказываем, что можно кнопками
  function miss(api, M, alts, what) {
    api.voiceMiss(); M.miss++;
    api.hint(`Я услышал «${alts[0] || "…"}». ${what}` + (M.miss >= 3 ? " Не выходит? Ниже есть «🙊 Не могу сейчас говорить»" : ""), true);
  }
  function word(api, M, w) { const key = api.he(w); if (M.words[key]) return; M.words[key] = 1; api.word(w); }
  // начало слова для подсказки: первые n букв (с огласовками) + «…»
  const heStart = (s, n) => { let c = 0, out = ""; for (const ch of s) { if (/[א-ת]/.test(ch) && ++c > n) break; out += ch; } return out + "…"; };

  // ---------- ФРАЗА ГОЛОСОМ (владелец 23.11: игрок ВСЁ говорит сам, а не выбирает) ----------
  // С микрофоном: задание по-русски + 🎤 + «💡 Подсказка» (1-е нажатие — начало верной фразы, 2-е — вся фраза, нажал — звучит);
  // неверные варианты (ok:false) с микрофоном не показываем. Без микрофона — фразы-кнопки, как раньше.
  // Если голосом подошли два ответа — берём самый похожий (а не «скажи один вариант»).
  function bestAnswer(api, alts, answers) {
    for (const x of alts) {                                        // варианты распознавания — по порядку (первый самый вероятный)
      const hits = answers.filter(a => api.matches([x], a));
      if (!hits.length) continue;
      const score = (a) => Math.max(...[api.he(a)].concat((a.also || []).map(api.g)).map(f => {
        const A = api.heNorm(x), F = api.heNorm(f);
        return F.length >= 3 && (" " + A + " ").includes(" " + F + " ") ? Math.max(api.heSim(x, f), 0.9) : api.heSim(x, f);
      }));
      return hits.sort((p, q) => score(q) - score(p) || (p.ok === false) - (q.ok === false))[0];
    }
    return null;
  }
  function sayPanel(api, M, o) {                       // o: {task, answers, onDone(ans), onWrong(ans), match(alts)→ans, onOther(alts)→true, label}
    const p = api.panel, mic = api.micOK();
    p.innerHTML = `<div class="q2-task">${api.esc(api.g(o.task || "Ответь"))}</div><div class="q2-hint" id="q2Hint"></div><div class="q2-chips" id="mkChips"></div>`;
    const chips = p.querySelector("#mkChips");
    const shown = o.answers.filter(a => !mic || a.ok !== false);
    const pick = (a) => { if (a.ok === false) (o.onWrong || (() => {}))(a); else o.onDone(a); };
    shown.forEach(a => {
      const c = document.createElement("button");
      c.className = "q2-chip"; c.type = "button";
      c.innerHTML = `<b dir="rtl">${api.esc(api.he(a))}</b><span>${api.esc(api.tr(a))} · ${api.esc(api.g(a.ru))}</span>`;
      c.onclick = () => { api.speak(a); if (!mic) pick(a); };            // без микрофона — подсказка = ответ
      chips.appendChild(c);
    });
    if (!mic) { api.hint(o.tapHint || "Нажми на фразу"); return; }
    chips.hidden = true;
    api.hint(api.g(o.micHint || "Скажи на иврите 🎤 Не знаешь как — возьми подсказку 💡"));
    p.appendChild(api.micBtn(o.label || "Нажми и скажи", alts => {
      const a = o.match ? o.match(alts) : bestAnswer(api, alts, o.answers);
      if (a) { M.miss = 0; pick(a); return; }
      if (o.onOther && o.onOther(alts)) return;
      miss(api, M, alts, "Скажи ещё раз — или возьми подсказку 💡");
    }));
    const ok = shown.find(a => a.ok !== false), w = ok ? api.he(ok).split(/\s+/) : [], tw = ok ? api.tr(ok).split(/\s+/) : [];
    let level = 0;
    const hb = document.createElement("button");
    hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = "💡 Подсказка";
    hb.onclick = () => {
      if (!ok) return;
      level++;
      if (level === 1 && w.length > 1) {
        const n = Math.max(1, Math.ceil(w.length / 3));
        api.hint(`Начни так: ${H(w.slice(0, n).join(" ") + " …")} (${tw.slice(0, n).join(" ")} …)`);
        api.speak(w.slice(0, n).join(" "));
        hb.textContent = "💡 Ещё подсказка";
      } else { chips.hidden = false; hb.remove(); api.hint(api.g("Послушай (нажми на фразу) — и скажи сам{m:}{f:а} 🎤")); }
    };
    p.appendChild(hb);
    api.noSpeakLink();
  }
  const lockPanel = (api) => api.panel.querySelectorAll("button").forEach(b => b.disabled = true);

  // ---------- РЕПЛИКА: ответить голосом (приветствие у входа) ----------
  Q2_STEPS.mk_say = function (api) {
    const { st } = api, M = state(api.Q);
    if (st._done) return api.next(300);
    sayPanel(api, M, {
      task: st.hint, answers: st.answers || [],
      onDone: (a) => {
        if (!api.alive() || st._done) return;
        st._done = true; api.good(10); lockPanel(api);
        if (a.put) api.put(a.put, false, st.upright);
        api.hint("✓ " + H(api.he(a)));
        api.next(1300);
      },
      onWrong: (a) => { api.mistake(); api.hint(api.g(a.why || "Не совсем — подумай ещё 🙂"), true); }
    });
  };

  // человек в сцене (хозяин магазина): показать в нужном месте или спрятать
  function npcShow(on, pos) {
    const n = document.getElementById("q2Npc");
    if (!n) return;
    n.style.display = on ? "" : "none";
    if (on && pos) { n.style.right = pos.right + "%"; n.style.bottom = pos.bottom + "%"; n.style.height = pos.h + "%"; }
  }
  const clearAisle = (sc) => ["view", "cart", "list"].forEach(c => own(sc, c).forEach(el => el.remove()));
  const clearBelt = (sc) => ["front", "belt"].forEach(c => own(sc, c).forEach(el => el.remove()));
  const anim = (el) => typeof el.animate === "function";

  // ---------- РЯД МАГАЗИНА ----------
  Q2_STEPS.mk_aisle = function (api) {
    const { st, Q } = api, M = state(Q), G = Q.goods, sc = api.scene();
    if (!sc) return;
    const sides = { left: st.left, right: st.right };
    const first = !st._init;
    if (first) { st._init = true; st._v = "c"; st._asked = !st.ask; st._found = !st.ask; st._turned = false; }
    clearBelt(sc);
    const board = api.board(); if (board) board.style.display = "none";    // доска не нужна и не должна перехватывать нажатия
    const say = document.getElementById("q2Say");
    let busy = false;
    let voice = api.micOK();                                          // режим панели (голос / кнопки) — как её нарисовали, так и работают нажатия

    // вид: коридор ("c") или полки слева / справа (на полках — товары-кнопки)
    const bgOf = (key) => api.pic(key === "c" ? st.bg : sides[key].bg);
    function makeView(key) {
      const v = document.createElement("div");
      v.className = P + "view"; v.dataset.key = key;
      v.style.backgroundImage = `url('${bgOf(key)}')`;
      if (key !== "c") sides[key].items.forEach(it => {
        const g = G[it.id]; if (!g) return;
        const b = document.createElement("button");
        b.type = "button"; b.className = P + "item" + (M.cart.includes(it.id) ? " taken" : ""); b.dataset.id = it.id;
        b.style.left = it.x + "%"; b.style.top = it.y + "%"; b.style.width = (it.w || 16) + "%";
        b.innerHTML = `<img src="${api.pic(it.id)}" alt="" draggable="false"><span class="${P}tag" dir="rtl">${api.esc(api.he(g))}</span>`;
        b.onclick = () => tapItem(it.id, b);
        v.appendChild(b);
      });
      return v;
    }
    function setView(key, how) {                                       // how: "l" / "r" — поворот, "f" — шаг вперёд, нет — сразу
      const old = own(sc, "view"), v = makeView(key), last = old[old.length - 1];
      sc.insertBefore(v, last ? last.nextSibling : sc.firstChild);      // под человеком, тележкой и облачком
      if (how === "l" || how === "r") { v.classList.add("in-" + how); old.forEach(o => o.classList.add(how === "l" ? "out-r" : "out-l")); }
      else if (how === "f") v.classList.add("fwd");
      if (how) setTimeout(() => old.forEach(o => o.remove()), 520); else old.forEach(o => o.remove());
    }
    const curView = () => { const a = own(sc, "view"); return a[a.length - 1]; };

    // тележка с руками (одна на весь магазин) и горка покупок в ней
    let cart = own(sc, "cart")[0];
    if (!cart) {
      cart = document.createElement("div");
      cart.className = P + "cart enter";
      cart.innerHTML = `<img class="${P}hands" src="${api.pic("hands_cart")}" alt="" draggable="false"><div class="${P}pile"></div>`;
      sc.appendChild(cart);
      setTimeout(() => cart.classList.remove("enter"), 700);
    }
    const pile = cart.querySelector("." + P + "pile");
    function pileItem(i, id) {
      const row = Math.floor(i / 4), col = i % 4;
      const sp = document.createElement("span");
      sp.className = P + "pi" + (Q.list.includes(id) ? "" : " star");
      sp.style.left = Math.min(74, 1 + col * 24 + (row % 2) * 10) + "%"; sp.style.bottom = row * 26 + "%";
      sp.style.zIndex = 10 - row;                                      // ближний ряд — поверх дальнего
      sp.style.setProperty("--rot", ((i * 37) % 29 - 14) + "deg");
      sp.innerHTML = `<img src="${api.pic(id)}" alt="" draggable="false">`;
      pile.appendChild(sp);
      return sp;
    }
    if (pile.children.length !== M.cart.length) { pile.innerHTML = ""; M.cart.forEach((id, i) => pileItem(i, id)); }
    const cartLow = (on) => cart.classList.toggle("low", on);           // смотришь на полки — тележка уходит вниз, видна горка

    // мамин список на бумажке
    let list = own(sc, "list")[0];
    if (!list) {
      list = document.createElement("div"); list.className = P + "list in";
      say && say.parentNode === sc ? sc.insertBefore(list, say) : sc.appendChild(list);
      setTimeout(() => list.classList.remove("in"), 600);
    }
    const listMini = (on) => list.classList.toggle("mini", on);         // у полок список уменьшается — не закрывает товары
    function drawList() {
      list.innerHTML = `<div class="${P}lh">📝 Мамин список</div><div class="${P}rows">${Q.list.map(id =>
        `<button type="button" class="${P}row${M.cart.includes(id) ? " done" : ""}" data-id="${id}"><i></i><span dir="rtl">${api.esc(api.he(G[id]))}</span></button>`).join("")}</div>`;
      list.querySelectorAll("." + P + "row").forEach(r => r.onclick = () => {
        const g = G[r.dataset.id]; api.speak(g);
        api.hint(`«${H(api.he(g))}» — ${api.tr(g)} · ${api.g(g.ru)}`);
      });
      list.classList.toggle("all", Q.list.every(id => M.cart.includes(id)));
    }

    // что из списка лежит в этом ряду и ещё не взято
    const need = () => Q.list.filter(id => [...sides.left.items, ...sides.right.items].some(it => it.id === id) && !M.cart.includes(id));
    // с микрофоном слова-направления в подсказках НЕ пишем (игрок вспоминает сам, есть 💡); без микрофона — пишем
    const dirWord = (d) => voice ? ({ left: "«налево»", right: "«направо»", fwd: "«прямо»" })[d] : `«${H(api.he(Q.dirs[d]))}»`;
    const fwdHint = () => `✓ Тут всё по списку! Скажи ${dirWord("fwd")}${voice ? " на иврите" : ""} — ${st.last ? "и на кассу 🧾" : "идём дальше ⬆"}`;
    function defaultHint() {
      if (!need().length && st._found) return fwdHint();
      if (st._v === "c") {
        if (voice) return st._turned ? "Скажи на иврите: налево, направо — или прямо, если всё нашёл{m:}{f:а} 🎤" : "Куда смотреть? Скажи на иврите: налево или направо 🎤";
        return st._turned ? `Налево, направо — или ${dirWord("fwd")}, если всё нашёл{m:}{f:а}` : `Скажи ${dirWord("left")} — налево или ${dirWord("right")} — направо 👀`;
      }
      return voice ? "Назови товар из списка — он поедет в тележку. Не знаешь слово — нажми на товар 👆" : "Нажми на товар — он поедет в тележку 👆";
    }
    const turnHint = () => voice ? "Куда повернуть? Послушай хозяина и скажи на иврите 🎤" : `Хозяин говорит: «${H(api.he(st.ask.a))}». Куда повернуть? 🤔`;

    // ---------- панель ----------
    function panel(hintText) {
      const p = api.panel;
      voice = api.micOK();
      if (!st._asked) return askPanel();
      p.innerHTML = `<div class="q2-task">${api.esc(api.g(st._v === "c" ? (st.task || "Куда смотреть? Налево или направо?") : "Что взять? 🛒"))}</div>
        <div class="q2-hint" id="q2Hint"></div><div class="${P}dirs" id="mkDirs"></div>`;
      drawDirs();
      if (voice) { p.appendChild(api.micBtn("Скажи", onAlts)); p.appendChild(aisleHintBtn()); api.noSpeakLink(); }
      api.hint(api.g(hintText || defaultHint()));
    }
    // стрелки: без микрофона — кнопки со словом; с микрофоном — только ⬅⬆➡ (слово — по 💡: сначала начало, потом целиком)
    function drawDirs() {
      const box = api.panel.querySelector("#mkDirs"); if (!box) return;
      const v = st._v, opts = v === "c" ? ["left", "fwd", "right"] : v === "left" ? ["fwd", "right"] : ["left", "fwd"];
      const AR = { left: "⬅", fwd: "⬆", right: "➡" };
      box.classList.toggle("mute", voice);
      box.innerHTML = opts.map(d => { const x = Q.dirs[d], h = api.he(x), t = api.tr(x);
        return `<button type="button" class="${P}dir" data-d="${d}"><span class="${P}ar">${AR[d]}</span><b class="f" dir="rtl">${api.esc(h)}</b><small class="f">${api.esc(t)}</small><b class="p" dir="rtl">${api.esc(heStart(h, 2))}</b><small class="p">${api.esc(t.slice(0, 3))}…</small></button>`; }).join("");
      box.querySelectorAll("button").forEach(b => b.onclick = () => {
        const d = b.dataset.d;
        if (!voice) { api.speak(Q.dirs[d]); return go(d, false); }    // без микрофона — стрелка и есть ответ
        if (box.classList.contains("h2")) { api.speak(Q.dirs[d]); api.hint(api.g("Послушал{m:}{f:а}? Теперь скажи сам{m:}{f:а} 🎤")); }
        else api.hint("Скажи это на иврите 🎤 Не помнишь слово — нажми 💡");
      });
    }
    // «💡 Подсказка» в ряду: 1-е — первые буквы на стрелках (+ товары из списка на этой полке мигают), 2-е — слова целиком
    function aisleHintBtn() {
      let level = 0;
      const hb = document.createElement("button");
      hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = "💡 Подсказка";
      hb.onclick = () => {
        const box = api.panel.querySelector("#mkDirs"), view = curView(), side = st._v !== "c";
        const mine = view ? [...view.querySelectorAll("." + P + "item")].filter(b => Q.list.includes(b.dataset.id) && !M.cart.includes(b.dataset.id)) : [];
        level++;
        if (level === 1) {
          if (box) box.classList.add("h1");
          mine.forEach(b => b.classList.add("glow"));
          api.hint(side && mine.length ? "Товары из списка мигают ✨ Назови их на иврите. На стрелках — первые буквы" : "На стрелках — первые буквы слов 👆 Скажи слово целиком 🎤");
          hb.textContent = "💡 Ещё подсказка";
        } else {
          if (box) { box.classList.remove("h1"); box.classList.add("h2"); }
          mine.forEach(b => b.classList.add("show"));
          api.hint(api.g("Нажми — послушай — и скажи сам{m:}{f:а} 🎤"));
          hb.remove();
        }
      };
      return hb;
    }

    // ---------- спросить хозяина, где товар ----------
    function askPanel() {
      const A = st.ask, p = api.panel;
      npcShow(true, A.npc);
      const it = G[A.item], key = it ? api.heNorm(api.he(it)) : "";
      sayPanel(api, M, {
        task: A.task || "Спроси хозяина", answers: [A.q], label: "Спроси",
        micHint: `Спроси на иврите, где ${it ? api.g(it.ru) : "это"} 🎤 Не знаешь как — возьми подсказку 💡`,
        // «אֵיפֹה … קָפֶה» в любом порядке — тоже вопрос
        match: (alts) => api.matches(alts, A.q) || alts.some(a => { const w = words(api, a); return w.some(x => api.heSim(x, "איפה") >= 0.75) && w.some(x => key && api.heSim(x, key) >= 0.75); }) ? A.q : null,
        onOther: (alts) => { if (!findDir(api, alts)) return false; api.hint("Сначала спроси хозяина 🙋"); return true; },
        onDone: () => asked(voice)
      });
    }
    function asked(byVoice) {
      if (st._asked) return;
      st._asked = true; api.good(5);
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      setTimeout(() => {
        if (!api.alive()) return;
        api.say(st.ask.a);                                              // хозяин отвечает: куда идти
        panel(turnHint());
      }, byVoice ? 300 : 900 + api.he(st.ask.q).length * 60);           // кнопкой — сначала прозвучит сам вопрос
    }

    // ---------- движение ----------
    function go(d, byVoice) {
      if (busy || !st._asked) return;
      if (d === "fwd") return forward();
      const v = st._v;
      if (!st._found && v === "c" && d !== st.ask.dir) {                 // хозяин сказал «налево», а игрок — направо: не понял ответ
        const reveal = `Хозяин сказал «${H(api.he(Q.dirs[st.ask.dir]))}» — это ${api.g(Q.dirs[st.ask.dir].ru)} 🙂`;
        if (!byVoice) { api.mistake(); api.hint(reveal, true); return; }  // ошибка — только нажатая не та стрелка
        // голосом: распознаватель мог перепутать слово — переспрашиваем (не ошибка)
        api.voiceMiss(); M.wrongDir = (M.wrongDir || 0) + 1;
        if (M.wrongDir === 1) { api.say(st.ask.a); api.hint("Точно? Послушай хозяина ещё раз 🙂", true); }
        else api.hint(reveal, true);
        return;
      }
      const to = v === "c" ? d : v === d ? null : "c";
      if (!to) { api.hint(`${d === "left" ? "Левее" : "Правее"} — только стена 🙂 ` + (voice ? "Повернись в другую сторону" : `Скажи «${H(api.he(Q.dirs[d === "left" ? "right" : "left"]))}»`)); return; }
      word(api, M, Q.dirs[d]);
      busy = true; st._v = to; st._turned = true;
      if (to === (st.ask && st.ask.dir)) st._found = true;
      npcShow(false); if (say) say.hidden = true;                       // хозяин остался в проходе, облачко убираем
      setView(to, d === "left" ? "l" : "r");
      cartLow(to !== "c"); listMini(to !== "c");
      cart.classList.remove("roll"); void cart.offsetWidth; cart.classList.add("roll");
      setTimeout(() => { busy = false; if (api.alive()) panel(); }, 470);
    }
    function forward() {
      const left = need();
      if (left.length || !st._found) {
        api.hint(`В списке ещё: ${left.map(id => H(api.he(G[id]))).join(", ")} — поищи здесь 👀`);
        return;
      }
      word(api, M, Q.dirs.fwd);
      busy = true;
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      npcShow(false); if (say) say.hidden = true;
      cartLow(false); listMini(false);
      const v = curView(); if (v) v.classList.add("go");                // шаг вперёд: картинка «наезжает»
      cart.classList.remove("roll"); void cart.offsetWidth; cart.classList.add("roll");
      api.next(650);
    }

    // ---------- товары ----------
    function tapItem(id, b) {
      if (busy) return;
      const g = G[id];
      api.speak(g);
      if (M.cart.includes(id)) { api.hint(`✓ ${H(api.he(g))} — уже в тележке`); return; }
      if (!voice) return take([id]);
      own(sc, "view").forEach(v => v.querySelectorAll("." + P + "item.open").forEach(x => x !== b && x.classList.remove("open")));
      b.classList.add("open");
      api.hint(`«${H(api.he(g))}» — ${api.tr(g)} · ${api.g(g.ru)}. Скажи это 🎤`);
    }
    function take(ids) {
      const msgs = [], max = Q.extraMax || 2;
      ids.forEach(id => {
        const g = G[id];
        if (M.cart.includes(id)) { msgs.push(`✓ ${H(api.he(g))} — уже в тележке`); return; }
        const onList = Q.list.includes(id);
        if (!onList && M.extras >= max) { msgs.push(`Мама разрешила взять себе только ${max} вещи 🙂 «${H(api.he(g))}» — в другой раз`); return; }
        if (!onList) M.extras++;
        M.cart.push(id); word(api, M, g);
        api.good(onList ? 5 : 3);
        fly(id);
        msgs.push(onList ? `✓ ${H(api.he(g))} — ${api.g(g.ru)}` : `⭐ ${H(api.he(g))} — это тебе!` + (M.extras < max ? " Можно ещё одну вещь" : ""));
      });
      drawList();
      if (Q.list.every(id => M.cart.includes(id)) && !M.allDone) { M.allDone = true; snd("right"); }
      // ряд закончен — коротко: что было «себе» + куда дальше
      api.hint(!need().length && st._found ? msgs.filter(m => !m.startsWith("✓")).map(m => m.replace(/ Можно ещё одну вещь$/, "")).concat([`Всё по списку ✓ ${st.last ? "На кассу" : "Дальше"} — скажи ${dirWord("fwd")}${voice ? " на иврите" : ""} ⬆`]).join(" · ") : msgs.join(" · "));
    }
    // товар летит с полки в тележку (по дуге), там ложится в горку
    function fly(id) {
      const b = curView() && curView().querySelector(`.${P}item[data-id="${id}"]`);
      const el = pileItem(M.cart.length - 1, id);
      const land = () => { el.classList.remove("wait"); el.classList.add("pop"); snd("pop"); if (typeof vibrate === "function") vibrate("light"); };
      if (!b || !anim(b)) { if (b) b.classList.add("taken"); land(); return; }
      el.classList.add("wait");
      const a = b.getBoundingClientRect(), t = el.getBoundingClientRect();
      b.classList.add("taken");
      const f = document.createElement("img");
      f.src = api.pic(id); f.className = P + "fly"; f.alt = "";
      Object.assign(f.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.width + "px" });
      document.body.appendChild(f);
      const dx = t.left + t.width / 2 - (a.left + a.width / 2), dy = t.top + t.height / 2 - (a.top + a.width / 2), s = t.width / a.width;
      let landed = false;
      const end = () => { if (landed) return; landed = true; f.remove(); land(); };
      try {
        f.animate([{ transform: "translate(0,0) scale(1)" },
          { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 70}px) scale(1.15)`, offset: 0.45 },
          { transform: `translate(${dx}px, ${dy}px) scale(${s})` }], { duration: 640, easing: "cubic-bezier(.45,0,.35,1)" }).onfinish = end;
      } catch (e) { end(); }
      setTimeout(end, 1000);                                            // вкладка свёрнута — анимация может не закончиться
    }

    // ---------- голос ----------
    function onAlts(alts) {
      if (busy) return;
      const v = st._v;
      if (v !== "c") {
        const got = findGoods(api, alts, sides[v].items.map(it => it.id));
        if (got.length) { M.miss = 0; take(got); return; }
      }
      const d = findDir(api, alts);
      if (d) { M.miss = 0; go(d, true); return; }
      const other = findGoods(api, alts, Object.keys(G));
      if (other.length) {
        M.miss = 0;
        api.hint(v === "c" ? "Сначала посмотри на полки — налево или направо (на иврите) 👀" : `«${H(api.he(G[other[0]]))}» тут нет — поищи в другом месте 👀`);
        return;
      }
      miss(api, M, alts, v === "c" ? "Скажи ещё раз — или возьми подсказку 💡" : "Назови товар ещё раз. Не знаешь слово — нажми на товар или 💡");
    }

    // ---------- сборка шага ----------
    if (!st._asked || (!st._found && st._v === "c")) npcShow(true, st.ask && st.ask.npc); else npcShow(false);
    setView(st._v, first ? "f" : "");
    cartLow(st._v !== "c"); listMini(st._v !== "c");
    drawList();
    panel(st._asked && !st._found && st._v === "c" ? turnHint() : "");
  };

  // ---------- КАССА: всё из тележки выезжает на ленту ----------
  Q2_STEPS.mk_belt = function (api) {
    const { st, Q } = api, M = state(Q), sc = api.scene(), p = api.panel;
    if (!sc) return;
    clearAisle(sc);
    const board = api.board(); if (board) board.style.display = "";
    npcShow(true, st.npc);
    // передняя часть прилавка — та же картинка, только ниже края прилавка: кассир стоит ЗА прилавком
    let front = own(sc, "front")[0];
    if (!front) {
      front = document.createElement("div"); front.className = P + "front";
      const n = document.getElementById("q2Npc");
      n && n.parentNode === sc ? sc.insertBefore(front, n.nextSibling) : sc.insertBefore(front, sc.firstChild);
    }
    front.style.backgroundImage = `url('${api.pic(st.bg)}')`;
    front.style.clipPath = front.style.webkitClipPath = `inset(${st.front || 58}% 0 0 0)`;
    let belt = own(sc, "belt")[0];
    if (!belt) { belt = document.createElement("div"); belt.className = P + "belt"; sc.appendChild(belt); }
    const items = M.cart.length ? M.cart : Q.list;
    const fill = (withAnim) => {
      belt.innerHTML = "";
      items.forEach((id, i) => {
        const img = document.createElement("img");
        img.src = api.pic(id); img.alt = ""; img.draggable = false;
        const back = i < 5;
        img.style.left = (back ? 12 + i * 19 : 21 + (i - 5) * 19) + "%"; img.style.top = (back ? 69 : 77) + "%";
        if (withAnim) img.style.animationDelay = (i * 0.28) + "s"; else img.style.animation = "none";
        belt.appendChild(img);
      });
    };
    function ask() {
      if (!api.alive()) return;
      belt.classList.add("run");
      api.say(st.ask);
      sayPanel(api, M, {
        task: st.hint, answers: st.answers || [],
        onDone: (a) => {
          if (!api.alive() || st._done) return;
          st._done = true; api.good(10); lockPanel(api);
          api.hint("✓ " + H(api.he(a)));
          api.next(1300);
        },
        onWrong: (a) => { api.mistake(); api.hint(api.g(a.why || "Не совсем — подумай ещё 🙂"), true); }
      });
    }
    if (st._done) return api.next(300);
    if (!st._belt) {
      st._belt = true;
      fill(true);
      const sb = document.getElementById("q2Say"); if (sb) sb.hidden = true;
      p.innerHTML = `<div class="q2-wait">Выкладываешь покупки на ленту… 🛒</div>`;
      items.forEach((_, i) => setTimeout(() => { if (api.alive()) snd("pop"); }, 280 * i + 200));
      setTimeout(ask, 280 * items.length + 600);
    } else { fill(false); ask(); }
  };
})();
