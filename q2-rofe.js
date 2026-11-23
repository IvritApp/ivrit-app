// =====================================================
// КВЕСТ «ТРАВМПУНКТ» (rofe) — свои механики для quest2.js (Q2_STEPS), данные — content/he/quests2/rofe.json.
// Игрок упал на баскетболе. Травма у каждого своя (случайно на весь квест): голова, рука, палец, спина, колено, нога, лодыжка.
//   rofe_queue — зал ожидания: в руке талон с номером, динамик вызывает номера; услышал СВОЙ — скажи «זֶה אֲנִי!»
//   rofe_pain  — манекен, больное место пульсирует; игрок САМ говорит врачу, что болит (без вариантов); назвал — место загорается, рядом карточка части тела
//   rofe_here  — врач нажимает в разных местах: «כּוֹאֵב פֹּה?» — да / нет
//   rofe_xray  — снимок проявляется на «экране»; есть трещина? — «כֵּן, שָׁבוּר» / «לֹא, לֹא שָׁבוּר» (у головы и спины снимка нет — шаг пропускается)
//   rofe_fix   — врач говорит, что нужно (гипс, бинт, лёд…); игрок называет — это появляется на теле
//   rofe_pills — таблетница: врач говорит, сколько раз в день; игрок говорит «утром / днём / вечером» — таблетки падают в ячейки
// Тест в консоли: window.q2rofeForce = "knee" (до начала квеста) — выбрать травму.
// =====================================================
(function () {
  window.Q2_STEPS = window.Q2_STEPS || {};
  const NPC = { clerk: { right: 10, bottom: 30, h: 46 }, doctor: { right: 0, bottom: 6, h: 60 } };
  // места, куда врач «нажимает» мимо травмы (x, y в % от манекена)
  const SPOTS = [[20.7, 44.1], [42.4, 70.9], [29.7, 23.5], [50.9, 47], [70.5, 23.5], [42.4, 81], [8, 57], [50.1, 8], [59.4, 70.9], [80.6, 43.7], [50.9, 31], [61, 91]];
  let S = null;                                                   // состояние одного прохождения (новый Q — новая травма)

  function state(api) {
    if (!S || S.Q !== api.Q) {
      const R = api.Q.rofe || {}, list = R.injuries || [];
      const forced = list.find(x => x.id === window.q2rofeForce);
      S = { Q: api.Q, R, inj: forced || list[Math.floor(Math.random() * list.length)] };
    }
    return S;
  }
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sfx = (n) => { if (typeof playSound === "function") playSound(n); };
  const buzz = (n) => { if (typeof vibrate === "function") vibrate(n); };

  // кто сейчас в кадре: регистратор / врач / никого (зал ожидания); имя — подпись облачка
  function setNpc(api, id, name) {
    if (name) api.Q.seller = name;
    const box = document.getElementById("q2Npc");
    if (!box) return;
    if (!id) { box.style.display = "none"; return; }
    box.style.display = "";
    if (box.dataset.rofe !== id && window.HirbisChars && HirbisChars.has(id)) { box.innerHTML = charImgHTML(id); box.dataset.rofe = id; }
    const p = NPC[id];
    if (p) { box.style.right = p.right + "%"; box.style.bottom = p.bottom + "%"; box.style.height = p.h + "%"; }
  }
  const doc = (api, s) => setNpc(api, "doctor", s.R.doctor || "Врач");

  // сказал ли игрок одну из форм (слово целиком, можно с ה/ו/ב/ל/ש спереди; длинные слова — похоже на 75 %)
  const bare = (w) => w.replace(/^ו(?=..)/, "").replace(/^(ה|ב|ל|ש)(?=..)/, "");
  function said(api, alts, forms) {
    const F = forms.map(f => api.heNorm(f)).filter(Boolean);
    return (alts || []).some(a => {
      const A = api.heNorm(a), T = A.split(" ").filter(Boolean);
      return F.some(f => f.includes(" ") ? A.includes(f) :
        T.some(t => t === f || bare(t) === f || (f.length >= 4 && (api.heSim(t, f) >= 0.75 || api.heSim(bare(t), f) >= 0.75))));
    });
  }
  // да / нет по первому варианту распознавания, где оно есть («לא פה» — это «нет», хотя в нём есть «פה»)
  function yesNo(api, alts, yesForms) {
    const Y = ["כן"].concat(yesForms).map(f => api.heNorm(f));          // heNorm меняет конечные буквы: «כן» → «כנ»
    for (const a of alts || []) {
      const T = api.heNorm(a).split(" ").map(t => t.replace(/^ו(?=.)/, ""));
      if (T.includes("לא")) return false;
      if (T.some(t => Y.includes(t))) return true;
    }
    return null;
  }
  function addWord(api, w) {
    if (!w) return;
    const L = api.Q._words || [];
    if (!L.some(x => api.he(x) === api.he(w))) api.word(w);
  }
  const micOn = (api) => !!api.panel.querySelector(".q2-mic.on");

  // фраза-кнопка (как в движке): иврит + транскрипция · перевод
  function chip(api, x, cls) {
    const c = document.createElement("button");
    c.className = "q2-chip " + (cls || ""); c.type = "button";
    c.innerHTML = `<b dir="rtl">${api.esc(api.he(x))}</b><span>${api.esc(api.tr(x))} · ${api.esc(api.g(x.ru))}</span>`;
    return c;
  }
  function panelHTML(api, task, hint) {
    api.panel.innerHTML = `<div class="q2-task">${api.esc(api.g(task || ""))}</div><div class="q2-hint" id="q2Hint">${api.esc(hint || "")}</div><div class="q2rofe-chips" id="q2rofeChips"></div><div class="q2-row" id="q2rofeRow"></div>`;
    return { chips: api.panel.querySelector("#q2rofeChips"), row: api.panel.querySelector("#q2rofeRow") };
  }
  function clearLayers(api) { const b = api.board(); if (b) b.querySelectorAll(".q2rofe-l").forEach(x => x.remove()); return b; }

  // 23.11 (владелец): игрок ГОВОРИТ САМ. С микрофоном готовых фраз на экране нет — только задание, 🎤 и «💡 Подсказка»
  // (как в quest2.js у choice). levels — функции по нажатиям; последняя обычно показывает верную фразу-кнопку.
  function hintBtn(api, where, levels) {
    let level = 0;
    const hb = document.createElement("button");
    hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = "💡 Подсказка";
    hb.onclick = () => {
      if (!api.alive()) return;
      const f = levels[level++];
      if (f) f();
      if (level >= levels.length) hb.remove(); else hb.textContent = "💡 Ещё подсказка";
    };
    where.appendChild(hb);
    return hb;
  }
  // 1-я подсказка: начало верной фразы (первая треть слов + транскрипция), звучит
  function startOf(api, x) {
    const w = api.he(x).split(/\s+/), t = api.tr(x).split(/\s+/), n = Math.max(1, Math.ceil(w.length / 3));
    const more = w.length > n ? " …" : "";
    api.hint(`Начни так: ⁨${w.slice(0, n).join(" ")}${more}⁩ (${t.slice(0, n).join(" ")}${more})`);
    api.speak(w.slice(0, n).join(" "));
  }
  // 2-я подсказка: вся верная фраза — кнопкой (нажал — слушаешь), отвечать всё равно голосом
  function showPhrase(api, chips, x) {
    chips.innerHTML = ""; chips.classList.remove("two");
    const c = chip(api, x);
    c.onclick = () => api.speak(x);
    chips.appendChild(c); chips.hidden = false;
    api.speak(x);
    api.hint("Послушай (нажми на фразу) — и скажи сам" + api.g("{m:}{f:а}") + " 🎤");
  }

  // ---------- манекен ----------
  // карточка части тела; у спины (манекен стоит лицом к нам) она видна сразу — «вид сзади», нажатие = нажатие на место
  const partCard = (api, s, anim, back) => `<div class="q2rofe-card${anim ? " in" : ""}${back ? " back" : ""}"><img src="${api.pic(s.inj.part)}" alt="" draggable="false">${back ? "<em>вид сзади</em>" : ""}</div>`;
  function bodyLayer(api, s, mode) {
    const b = clearLayers(api);
    if (!b) return null;
    const z = s.inj.zone;
    const el = document.createElement("div");
    el.className = "q2rofe-l q2rofe-body" + (s.bodyShown ? "" : " in");   // появляется плавно только в первый раз
    s.bodyShown = true;
    el.innerHTML = `<img class="q2rofe-man" src="${api.pic("body")}" alt="" draggable="false">
      <button type="button" class="q2rofe-spot ${mode}${s.inj.behind ? " behind" : ""}" style="left:${z[0]}%;top:${z[1]}%;width:${z[2]}%;aspect-ratio:${z[3] || 1}" aria-label="Что болит"></button>
      ${s.inj.behind ? `<div class="q2rofe-back" style="left:${z[0]}%;top:${z[1]}%">↩ сзади</div>` : ""}
      ${s.painDone || s.inj.behind ? partCard(api, s, false, s.inj.behind) : ""}`;
    b.appendChild(el);
    (s.fixGot || []).forEach((id, i) => sticker(api, s, el, id, i, false));
    return el;
  }
  // подпись слова у больного места (подсказка по нажатию)
  function tag(api, s, el) {
    const z = s.inj.zone, w = s.inj.word;
    let t = el.querySelector(".q2rofe-tag");
    if (!t) { t = document.createElement("div"); t.className = "q2rofe-tag"; el.appendChild(t); }
    t.innerHTML = `<b dir="rtl">${api.esc(api.he(w))}</b><span>${api.esc(api.tr(w))} · ${api.esc(api.g(w.ru))}</span>`;
    t.style.left = Math.min(78, Math.max(22, z[0])) + "%";
    const below = z[1] < 24;
    t.style.top = (below ? z[1] + z[2] * 0.75 : z[1] - z[2] * 0.6) + "%";
    t.classList.toggle("below", below);
    t.classList.remove("in"); void t.offsetWidth; t.classList.add("in");
  }
  // предмет лечения у больного места (наклейка в белом круге)
  function sticker(api, s, el, id, i, anim) {
    const it = s.R.items[id], z = s.inj.zone;
    if (!it) return;
    const d = document.createElement("div");
    d.className = "q2rofe-stick" + (anim ? " in" : "");
    // первая наклейка — с той стороны, где больше места, вторая — с другой; левый верх занят карточкой части тела
    const side = (z[0] >= 66 ? -1 : 1) * (i ? -1 : 1);
    const x = Math.min(84, Math.max(16, z[0] + side * 26));
    let y = Math.min(90, Math.max(10, z[1] + (i ? 6 : -2)));
    if (x < 48 && y < 24) y = 28;
    d.style.left = x + "%"; d.style.top = y + "%";
    d.innerHTML = `<img src="${api.pic(it.img)}" alt="" draggable="false">`;
    el.appendChild(d);
  }

  // ========== 1. ЗАЛ ОЖИДАНИЯ: жди свой номер ==========
  Q2_STEPS.rofe_queue = function (api) {
    const s = state(api), st = api.st, desk = s.R.desk || "Регистратура";
    setNpc(api, null, desk);
    if (!s.q) {
      const mine = 5 + Math.floor(Math.random() * 5);              // 5…9
      const before = 1 + Math.floor(Math.random() * 2);            // перед тобой вызовут 1–2 других номера
      const lower = shuffle([3, 4, 5, 6, 7, 8].filter(n => n < mine)).slice(0, before).sort((a, b) => a - b);
      s.q = { mine, seq: lower.concat(mine), i: 0, cur: null, done: false, started: false };
    }
    const q = s.q, callOf = (n) => st.calls.find(c => c.n === n);
    const b = clearLayers(api);
    const tk = document.createElement("button");
    tk.type = "button"; tk.className = "q2rofe-l q2rofe-ticket";
    tk.innerHTML = `<small dir="rtl">מִסְפָּר</small><b>${q.mine}</b><i>твой номер</i>`;
    if (b) b.appendChild(tk);
    const { chips, row } = panelHTML(api, st.task, api.micOK() ? "Услышишь свой номер — скажи «Это я!» 🎤" : "Услышишь свой номер — нажми «זֶה אֲנִי!»");
    tk.onclick = () => { api.speak(callOf(q.mine)); api.hint(`Так звучит твой номер: ${api.he(callOf(q.mine))}`); };
    let T = 0;
    const me = () => {
      if (q.done || !api.alive()) return;
      if (q.cur === q.mine) {
        q.done = true; clearTimeout(T);
        api.panel.querySelectorAll("button").forEach(x => x.disabled = true);
        tk.classList.add("ok"); sfx("right");
        api.good(10); api.hint("✓ " + api.he(st.me));
        api.next(1500);
      } else if (q.cur == null) {
        api.hint("Подожди — сейчас вызывают номера. Жди свой 🙂", true);   // ещё никого не вызвали — не ошибка
      } else {
        api.mistake(); buzz("error");
        api.hint(`Это не твой номер! У тебя — ${q.mine}. Жди 🙂`, true);
      }
    };
    const c = chip(api, st.me);
    c.onclick = () => { api.speak(st.me); if (!api.micOK()) me(); };
    chips.appendChild(c);
    if (api.micOK()) {
      chips.hidden = true;                                          // с микрофоном фразу не показываем — говоришь сам
      row.appendChild(api.micBtn("Нажми и скажи", alts => {
        if (said(api, alts, [api.he(st.me)].concat(st.me.also || []))) me();
        else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Когда вызовут твой номер, скажи, что это ты — или возьми подсказку 💡`, true); }
      }));
      hintBtn(api, row, [() => startOf(api, st.me), () => showPhrase(api, chips, st.me)]);
      api.noSpeakLink();
    }
    // вызовы по очереди; пока 🎤 слушает — не переключаем номер
    const call = (i) => {
      if (!api.alive() || q.done) return;
      if (micOn(api)) { T = setTimeout(() => call(i), 900); return; }
      const n = q.seq[i]; if (n == null) return;
      q.i = i; q.cur = n;
      api.Q.seller = s.R.call || "📢";
      api.say(callOf(n));
      if (n !== q.mine) T = setTimeout(() => { q.cur = null; call(i + 1); }, 4800);
      else T = setTimeout(() => call(i), 8000);                   // свой номер — повторяют, пока не ответишь
    };
    if (!q.started) { q.started = true; api.Q.seller = desk; api.say(st.line); T = setTimeout(() => call(0), 3600); }
    else T = setTimeout(() => call(q.i), 900);
  };

  // ========== 2. ЧТО БОЛИТ: игрок говорит сам ==========
  Q2_STEPS.rofe_pain = function (api) {
    const s = state(api), st = api.st, inj = s.inj;
    doc(api, s);
    const el = bodyLayer(api, s, s.painDone ? "lit" : "hot");
    if (!el) return;
    if (s.painDone) { api.next(300); return; }                   // перерисовка после ответа — просто дальше
    api.say(st.line);
    const { chips, row } = panelHTML(api, st.task, "Не знаешь слово — нажми на красное место 👆");
    // рамка фразы: «болит (он) / болит (она)» — нажал — звучит
    const fr = document.createElement("div");
    fr.className = "q2rofe-frame";
    fr.innerHTML = (st.frame || []).map((x, i) => `<button type="button" data-i="${i}"><b dir="rtl">${api.esc(api.he(x))} …</b><small>${api.esc(api.g(x.ru))}</small></button>`).join("");
    fr.querySelectorAll("button").forEach(x => x.onclick = () => api.speak(st.frame[+x.dataset.i]));
    chips.appendChild(fr);
    const spot = el.querySelector(".q2rofe-spot");
    const others = (s.R.otherParts || []).filter(f => !inj.forms.includes(f) && !(inj.near || []).includes(f));
    const ok = (alts) => {
      if (s.painDone || !api.alive()) return;
      s.painDone = true;
      spot.classList.remove("hot"); spot.classList.add("lit", "burst");
      const bc = el.querySelector(".q2rofe-card.back");             // спина: карточка уже была — только «загорается»
      if (bc) bc.classList.add("lit", "in"); else el.insertAdjacentHTML("beforeend", partCard(api, s, true));
      api.panel.querySelectorAll("button").forEach(x => x.disabled = true);
      sfx("right"); buzz("success");
      // род глагола: «יָד — она» → כּוֹאֶבֶת; без глагола тоже верно, но покажем полную фразу
      let msg = "✓ " + api.he(inj.say), pts = 15;
      if (alts) {
        const T = alts.slice(0, 2).map(a => api.heNorm(a).split(" "));
        const m = T.some(t => t.includes("כואב")), f = T.some(t => t.includes("כואבת"));
        if (inj.fem && m && !f) msg = `✓ Почти! «${api.he(inj.word)}» — она, поэтому: ${api.he(inj.say)}`;
        else if (!inj.fem && f && !m) msg = `✓ Почти! «${api.he(inj.word)}» — он, поэтому: ${api.he(inj.say)}`;
        else if (m || f) { msg = "✓ Отлично! " + api.he(inj.say); pts = 20; }
      }
      api.hint(msg); api.good(pts);
      addWord(api, inj.word);
      setTimeout(() => { if (api.alive()) api.say(inj.echo); }, 1100);
      api.next(3900);
    };
    const bcard = el.querySelector(".q2rofe-card.back");
    if (bcard) bcard.onclick = () => spot.click();
    spot.onclick = () => {
      if (s.painDone) return;
      api.speak(inj.word); tag(api, s, el);
      if (api.micOK()) { api.hint(`Это «${api.he(inj.word)}». Теперь скажи врачу, что болит 🎤`); return; }
      if (!chips.querySelector(".q2rofe-say")) {                   // без микрофона — одна фраза-кнопка (не варианты)
        const c = chip(api, inj.say, "q2rofe-say");
        c.onclick = () => { api.speak(inj.say); ok(null); };
        chips.appendChild(c);
      }
      api.hint("Нажми на фразу — так говорят врачу 👇");
    };
    if (api.micOK()) {
      row.appendChild(api.micBtn("Скажи, что болит", alts => {
        if (said(api, alts, inj.forms)) return ok(alts);
        if ((inj.near || []).length && said(api, alts, inj.near)) { api.voiceMiss(); api.hint(`Точнее! Болит ${api.g(inj.word.ru)} — нажми на красное место 👆`, true); return; }
        if (said(api, alts, others)) {
          api.mistake(); buzz("error");
          spot.classList.remove("shake"); void spot.offsetWidth; spot.classList.add("shake");
          api.hint("Болит не там 🙂 Посмотри на красное место", true); return;
        }
        api.voiceMiss();
        api.hint(`Я услышал «${alts[0] || "…"}». Нажми на красное место — послушай — и скажи`, true);
      }));
      hintBtn(api, row, [() => startOf(api, inj.say), () => showPhrase(api, chips, inj.say)]);
      api.noSpeakLink();
    } else api.hint("Нажми на красное место 👆");
  };

  // ========== 3. «ЗДЕСЬ БОЛИТ?»: да / нет ==========
  Q2_STEPS.rofe_here = function (api) {
    const s = state(api), st = api.st, inj = s.inj, z = inj.zone;
    doc(api, s);
    if (!s.here) {
      const far = SPOTS.filter(p => Math.hypot((p[0] - z[0]) * 5.89, (p[1] - z[1]) * 12.13) > 170);   // в пикселях манекена 589×1213
      const list = shuffle(far).slice(0, 1 + Math.floor(Math.random() * 2)).map(p => ({ x: p[0], y: p[1], hurt: false }));
      list.splice(Math.floor(Math.random() * (list.length + 1)), 0, { x: z[0], y: z[1], hurt: true });
      s.here = { list, i: 0 };
    }
    const H = s.here, p = H.list[H.i];
    const el = bodyLayer(api, s, "lit");
    if (!el || !p) { api.next(300); return; }
    const mk = document.createElement("div");
    mk.className = "q2rofe-probe"; mk.style.left = p.x + "%"; mk.style.top = p.y + "%";
    el.appendChild(mk);
    api.say(H.i === 0 ? st.line : st.again);
    const { chips, row } = panelHTML(api, st.task, `Нажатие ${H.i + 1} из ${H.list.length}`);
    let locked = false;
    const answer = (yes) => {
      if (locked || !api.alive()) return;
      if (yes !== p.hurt) {
        api.mistake(); buzz("error");
        api.hint(p.hurt ? "Болит же! 😣 Это то самое место — скажи «כֵּן»" : "Здесь не болит 🙂 Скажи «לֹא»", true);
        return;
      }
      locked = true;
      api.panel.querySelectorAll("button").forEach(x => x.disabled = true);
      api.good(5);
      if (p.hurt) {
        const o = document.createElement("div"); o.className = "q2rofe-ouch"; o.textContent = "אַי!";
        o.style.left = p.x + "%"; o.style.top = p.y + "%"; el.appendChild(o);
        buzz("medium");
        api.hint("✓ " + api.he(st.yes));
        setTimeout(() => { if (api.alive()) api.say(st.found); }, 600);
      } else { api.hint("✓ " + api.he(st.no)); sfx("right"); }
      H.i++;
      const wait = p.hurt ? 2700 : 1300;
      if (H.i >= H.list.length) api.next(wait);
      else setTimeout(() => { if (api.alive()) api.redraw(); }, wait);
    };
    const cy = chip(api, st.yes), cn = chip(api, st.no);
    cy.onclick = () => { api.speak(st.yes); if (!api.micOK()) answer(true); };
    cn.onclick = () => { api.speak(st.no); if (!api.micOK()) answer(false); };
    chips.classList.add("two"); chips.append(cy, cn);
    if (api.micOK()) {
      chips.hidden = true;                                          // с микрофоном «да/нет» говоришь сам, без кнопок
      const right = p.hurt ? st.yes : st.no;
      row.appendChild(api.micBtn("Нажми и скажи", alts => {
        const r = yesNo(api, alts, ["פה", "כאן"]);
        if (r === null) { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи «да» или «нет» на иврите — или возьми подсказку 💡`, true); }
        else answer(r);
      }));
      hintBtn(api, row, [() => startOf(api, right), () => showPhrase(api, chips, right)]);
      api.noSpeakLink();
    }
  };

  // ========== 4. РЕНТГЕН: сломано или нет? ==========
  Q2_STEPS.rofe_xray = function (api) {
    const s = state(api), st = api.st, inj = s.inj;
    if (!inj.xray) { api.next(0); return; }                      // голова и спина — без снимка
    doc(api, s);
    const b = clearLayers(api);
    const el = document.createElement("div");
    el.className = "q2rofe-l q2rofe-xray" + (s.xrayShown ? "" : " dev");
    const c = inj.crack;
    el.innerHTML = `<div class="q2rofe-film"><img src="${api.pic(inj.xray)}" alt="" draggable="false">
      ${inj.broken && c ? `<svg class="q2rofe-crack" viewBox="0 0 60 20" style="left:${c[0]}%;top:${c[1]}%;transform:translate(-50%,-50%) rotate(${c[2]}deg)"><path d="M2 10 L14 4 L22 15 L32 5 L40 14 L50 6 L58 11"/></svg>` : ""}
      <i class="q2rofe-scan"></i></div>`;
    if (b) b.appendChild(el);
    const { chips, row } = panelHTML(api, st.task, "");
    if (!s.xrayShown) {
      s.xrayShown = true;
      api.say(st.intro);
      setTimeout(() => { if (api.alive()) api.say(st.line); }, 2600);
    } else api.say(st.line);
    let locked = false;
    const answer = (broken) => {
      if (locked || !api.alive()) return;
      if (broken !== !!inj.broken) {
        api.mistake(); buzz("error");
        el.classList.remove("look"); void el.offsetWidth; el.classList.add("look");
        api.hint(inj.broken ? "Посмотри: красная трещина ⚡ — значит, сломано" : "Трещины нет — кость целая 🙂", true);
        return;
      }
      locked = true;
      api.panel.querySelectorAll("button").forEach(x => x.disabled = true);
      api.good(10); sfx("right");
      api.hint("✓ " + api.he(broken ? st.yes : st.no));
      (st.words || []).forEach(w => addWord(api, w));
      setTimeout(() => { if (api.alive()) api.say(st.right); }, 500);
      api.next(2300);
    };
    const cy = chip(api, st.yes), cn = chip(api, st.no);
    cy.onclick = () => { api.speak(st.yes); if (!api.micOK()) answer(true); };
    cn.onclick = () => { api.speak(st.no); if (!api.micOK()) answer(false); };
    chips.classList.add("two"); chips.append(cy, cn);
    if (api.micOK()) {
      chips.hidden = true;
      const right = inj.broken ? st.yes : st.no;
      row.appendChild(api.micBtn("Нажми и скажи", alts => {
        const r = yesNo(api, alts, ["שבור"]);
        if (r === null) { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи врачу: сломано или нет — или возьми подсказку 💡`, true); }
        else answer(r);
      }));
      hintBtn(api, row, [() => startOf(api, right), () => showPhrase(api, chips, right)]);
      api.noSpeakLink();
    }
  };

  // ========== 5. ЛЕЧЕНИЕ: назови, что сказала врач, — оно появляется на теле ==========
  Q2_STEPS.rofe_fix = function (api) {
    const s = state(api), st = api.st, inj = s.inj, R = s.R;
    doc(api, s);
    if (!s.fixGot) s.fixGot = [];
    if (!s.trays) {
      const needHe = inj.fix.map(id => R.items[id].he);
      const decoys = shuffle(Object.keys(R.items).filter(id => !inj.fix.includes(id) && !needHe.includes(R.items[id].he)));
      // одинаковые слова (гипс руки / ноги) в лотках один раз
      const pick = []; decoys.forEach(id => { if (pick.length < 4 - inj.fix.length && !pick.some(x => R.items[x].he === R.items[id].he)) pick.push(id); });
      s.trays = shuffle(inj.fix.concat(pick));
    }
    const el = bodyLayer(api, s, "lit");
    if (!el) return;
    const all = () => inj.fix.every(id => s.fixGot.includes(id));
    if (all()) { api.next(300); return; }
    api.say(inj.fixLine);
    const { chips, row } = panelHTML(api, st.task, api.micOK() ? "Не помнишь слово — нажми на картинку 👇" : "Нажми, что сказала врач 👇");
    chips.className = "q2rofe-trays";
    chips.innerHTML = s.trays.map(id => { const it = R.items[id];
      return `<button class="q2-tray${s.fixGot.includes(id) ? " used" : ""}" type="button" data-id="${id}"><img src="${api.pic(it.img)}" alt=""><span class="q2-tray-he" dir="rtl">${api.esc(api.he(it))}</span></button>`; }).join("");
    const trayOf = (id) => chips.querySelector(`[data-id="${id}"]`);
    const apply = (id) => {
      if (!api.alive() || s.fixGot.includes(id) || all()) return false;
      const tb = trayOf(id);
      if (!inj.fix.includes(id)) {
        api.mistake(); buzz("error");
        if (tb) { tb.classList.remove("q2rofe-no"); void tb.offsetWidth; tb.classList.add("q2rofe-no"); }
        api.hint("Врач этого не говорила 🙂 Нажми на её фразу — послушай ещё раз", true);
        return false;
      }
      s.fixGot.push(id);
      sticker(api, s, el, id, s.fixGot.length - 1, true);
      if (tb) tb.classList.add("used");
      sfx("pop"); buzz("light"); api.good(5);
      addWord(api, R.items[id]);
      if (all()) {
        api.panel.querySelectorAll("button").forEach(x => x.disabled = true);
        api.hint("✓ " + inj.fix.map(x => api.he(R.items[x])).join(", "));
        setTimeout(() => { if (api.alive()) api.say(st.done); }, 700);
        api.next(2400);
      } else api.hint(`✓ ${api.he(R.items[id])} — что ещё?`);
      return true;
    };
    chips.querySelectorAll(".q2-tray").forEach(tb => tb.onclick = () => {
      const it = R.items[tb.dataset.id];
      api.speak(it);
      chips.querySelectorAll(".q2-tray").forEach(x => x.classList.toggle("open", x === tb));
      if (api.micOK()) api.hint(`«${api.he(it)}» — ${api.tr(it)} (${api.g(it.ru)}). Скажи это 🎤`);
      else apply(tb.dataset.id);
    });
    if (api.micOK()) {
      row.appendChild(api.micBtn("Скажи, что нужно", alts => {
        const hit = s.trays.filter(id => !s.fixGot.includes(id) && said(api, alts, [api.he(R.items[id])].concat(R.items[id].also || [])));
        const good = hit.filter(id => inj.fix.includes(id)), bad = hit.filter(id => !inj.fix.includes(id));
        if (good.length) { good.forEach(apply); if (bad.length && !all()) api.hint(`✓ ${good.map(x => api.he(R.items[x])).join(", ")} — а «${api.he(R.items[bad[0]])}» врач не говорила 🙂`); return; }
        if (bad.length) { apply(bad[0]); return; }
        // назвал лечение, которого нет даже в лотках (гипс при ушибе) — тоже «врач этого не говорила»
        if (Object.keys(R.items).some(id => !inj.fix.some(f => R.items[f].he === R.items[id].he) && said(api, alts, [api.he(R.items[id])].concat(R.items[id].also || [])))) {
          api.mistake(); buzz("error"); api.hint("Врач этого не говорила 🙂 Нажми на её фразу — послушай ещё раз", true); return;
        }
        api.voiceMiss();
        api.hint(`Я услышал «${alts[0] || "…"}». Нажми на картинку — послушай — и скажи`, true);
      }));
      // 💡: 1-е — какая картинка нужна (подсвечивается), 2-е — её слово на иврите (видно и звучит)
      const left = () => inj.fix.filter(id => !s.fixGot.includes(id)).map(trayOf).filter(Boolean);
      hintBtn(api, row, [
        () => { const tb = left()[0]; if (!tb) return; tb.classList.remove("q2rofe-tip"); void tb.offsetWidth; tb.classList.add("q2rofe-tip"); api.hint("Врач говорила вот про это 👆 Как это на иврите?"); },
        () => { const L = left(); L.forEach(tb => tb.classList.add("open")); const it = L[0] && R.items[L[0].dataset.id]; if (it) { api.speak(it); api.hint(`«${api.he(it)}» — ${api.tr(it)}. Скажи это 🎤`); } }
      ]);
      api.noSpeakLink();
    }
  };

  // ========== 6. ТАБЛЕТНИЦА: утром / днём / вечером ==========
  Q2_STEPS.rofe_pills = function (api) {
    const s = state(api), st = api.st;
    doc(api, s);
    if (!s.rx) { s.rx = st.rx[Math.floor(Math.random() * st.rx.length)]; s.pills = []; }
    const rx = s.rx, P = s.pills, full = () => rx.need.every(id => P.includes(id));
    const b = clearLayers(api);
    const el = document.createElement("div");
    // с микрофоном иврит на ячейках спрятан (видно только «утром / днём / вечером»), нажал — слово видно и звучит
    el.className = "q2rofe-l q2rofe-box" + (api.micOK() ? " hide-he" : "");
    el.innerHTML = st.slots.map(sl => `<button type="button" class="q2rofe-cell" data-id="${sl.id}"><span class="q2rofe-ic">${sl.icon}</span>
      <span class="q2rofe-lab"><b dir="rtl">${api.esc(api.he(sl))}</b><small>${api.esc(api.g(sl.ru))}</small></span><span class="q2rofe-pit">${P.includes(sl.id) ? '<i class="q2rofe-pill"></i>' : ""}</span></button>`).join("");
    if (b) b.appendChild(el);
    if (full()) { api.next(300); return; }
    api.say(rx);
    const { row } = panelHTML(api, st.task, api.micOK() ? "Слушай врача и скажи, когда пить 🎤" : "Нажимай на ячейки, как сказала врач 👆");
    const cellOf = (id) => el.querySelector(`[data-id="${id}"]`);
    const slotOf = (id) => st.slots.find(x => x.id === id);
    const place = (id) => {
      if (!api.alive() || P.includes(id) || full()) return;
      const cell = cellOf(id);
      if (!rx.need.includes(id)) {
        api.mistake(); buzz("error");
        if (cell) { cell.classList.remove("q2rofe-no"); void cell.offsetWidth; cell.classList.add("q2rofe-no"); }
        api.hint(`Врач не говорила «${api.he(slotOf(id))}» 🙂 Нажми на её фразу — послушай ещё раз`, true);
        return;
      }
      P.push(id);
      if (cell) cell.querySelector(".q2rofe-pit").innerHTML = '<i class="q2rofe-pill in"></i>';
      sfx("pop"); buzz("light"); api.good(5);
      if (full()) {
        api.panel.querySelectorAll("button").forEach(x => x.disabled = true);
        el.classList.add("done");
        api.hint("✓ " + api.he(rx.word) + " — " + api.g(rx.word.ru));
        addWord(api, rx.word);
        api.next(2000);
      } else api.hint(`✓ ${api.he(slotOf(id))} — а ещё когда?`);
    };
    el.querySelectorAll(".q2rofe-cell").forEach(cb => cb.onclick = () => {
      const sl = slotOf(cb.dataset.id);
      api.speak(sl); cb.classList.add("open");
      if (api.micOK()) api.hint(`«${api.he(sl)}» — ${api.tr(sl)} (${api.g(sl.ru)}). Скажи 🎤`);
      else place(sl.id);
    });
    if (api.micOK()) {
      row.appendChild(api.micBtn("Скажи, когда пить", alts => {
        const hit = st.slots.filter(sl => !P.includes(sl.id) && said(api, alts, [api.he(sl)].concat(sl.also || [])));
        const good = hit.filter(sl => rx.need.includes(sl.id)), bad = hit.filter(sl => !rx.need.includes(sl.id));
        if (good.length) {
          good.forEach(sl => place(sl.id));
          if (bad.length && !full()) api.hint(`✓ ${good.map(sl => api.he(sl)).join(", ")} — а «${api.he(bad[0])}» врач не говорила 🙂`);
          return;
        }
        if (bad.length) { place(bad[0].id); return; }               // назвал только лишнее время — ошибка
        api.voiceMiss();
        api.hint(`Я услышал «${alts[0] || "…"}». Нажми на ячейку — послушай — и скажи`, true);
      }));
      // 💡: 1-е — какая ячейка нужна (подсвечивается), 2-е — все нужные слова видны, первое звучит
      const left = () => rx.need.filter(id => !P.includes(id)).map(cellOf).filter(Boolean);
      hintBtn(api, row, [
        () => { const c = left()[0]; if (!c) return; c.classList.remove("q2rofe-tip"); void c.offsetWidth; c.classList.add("q2rofe-tip"); api.hint("Врач говорила про это время 👆 Как это на иврите?"); },
        () => { const L = left(); L.forEach(c => c.classList.add("open")); const sl = L[0] && slotOf(L[0].dataset.id); if (sl) { api.speak(sl); api.hint(`«${api.he(sl)}» — ${api.tr(sl)}. Скажи 🎤`); } }
      ]);
      api.noSpeakLink();
    }
  };

  window.q2rofeTest = { said: (alts, forms) => said({ heNorm, heSim }, alts, forms), state: () => S };
})();
