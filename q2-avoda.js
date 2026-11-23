// =====================================================
// КВЕСТ «РАБОТА» (avoda) — своя механика для quest2.js (23.11).
// Данные — content/he/quests2/avoda.json, картинки — assets/quests/avoda/.
// 1) avoda_jobs:   на столе у друга 5 карточек-вакансий (они нарисованы на фоне bg_options) — игрок говорит, где хочет работать
//                  (или нажимает на карточку) → фон меняется на это место, входит тот, кто проводит собеседование.
// 2) собеседование: на сцене лежит РЕЗЮМЕ, оно заполняется тем, что игрок сказал: имя (как его услышал микрофон — ивритом),
//                  откуда, возраст, что умеет (значки), что показал (вложения); в конце — печать ✓ «принят» и подарок места.
//    avoda_say (hello, from, why) · avoda_name · avoda_age · avoda_skills · avoda_show (найди в сумке, что просят) · avoda_hired.
// Всё, что зависит от работы, — в JSON (jobs[], jobSkill, jobItem, gift) — поэтому звук для всех реплик собирает tts_build.ps1.
// =====================================================
(function () {
  window.Q2_STEPS = window.Q2_STEPS || {};
  let S = null;                                                // состояние одного прохождения (новый Q — новое прохождение)
  const fresh = (Q) => ({ Q, job: null, cvOn: false, name: "", from: null, age: 0, skills: [], att: [], hired: false, flash: "" });
  const state = (api) => { if (!S || S.Q !== api.Q) S = fresh(api.Q); if (!S.job) S.job = (api.Q.jobs || [])[0] || null; return S; };
  const sound = (n) => { if (typeof playSound === "function") playSound(n); };
  const buzz = (n) => { if (typeof vibrate === "function") vibrate(n); };
  const later = (api, ms, fn) => setTimeout(() => { if (api.alive()) fn(); }, ms);
  const lineMs = (api, line) => line ? 700 + api.he(line).length * 55 : 0;   // сколько ждать, пока реплика прозвучит

  // ---------- сцена: фон, человек, реплика ----------
  function setBg(api, name, anim) {
    const sc = api.scene(); if (!sc) return;
    const u = api.pic(name);
    if (sc.dataset.bg === u) return;
    sc.dataset.bg = u; sc.style.backgroundImage = `url('${u}')`;
    if (anim) { sc.classList.remove("swap"); void sc.offsetWidth; sc.classList.add("swap"); }
  }
  // кто проводит собеседование — свой человек у каждой работы (chars.js), стоит справа
  function setNpc(api, job, enter) {
    const box = document.getElementById("q2Npc");
    if (!box || !job) return;
    if (box.dataset.av !== job.boss && window.charImgHTML && window.HirbisChars && HirbisChars.has(job.boss)) { box.innerHTML = charImgHTML(job.boss); box.dataset.av = job.boss; }
    const n = job.npc || {};
    box.style.right = (n.right ?? 3) + "%"; box.style.bottom = (n.bottom ?? 6) + "%"; box.style.height = (n.h ?? 54) + "%";
    box.style.display = "";
    if (enter) { box.classList.remove("q2avoda-enter"); void box.offsetWidth; box.classList.add("q2avoda-enter"); }
  }
  // реплика: говорящий — друг (выбор работы) или человек с работы
  function say(api, line, who) {
    if (!line) return;
    api.Q.seller = who || (S && S.job ? S.job.who : api.Q.seller);
    api.say(line);
  }
  // шаг собеседования: место, человек, резюме — всё на месте (и после перерисовки шага)
  function interview(api) {
    const s = state(api);
    setBg(api, s.job.bg, false);
    setNpc(api, s.job, false);
    api.Q.seller = s.job.who;
    renderCv(api);
    return s;
  }
  // значение, зависящее от работы: {cafe: …, office: …} → своё
  const pj = (v) => (v && typeof v === "object" && !Array.isArray(v) && !v.he && S && S.job && v[S.job.id] !== undefined) ? v[S.job.id] : v;

  // ---------- РЕЗЮМЕ на сцене ----------
  function renderCv(api) {
    if (!S || !S.cvOn) return;
    const sc = api.scene(); if (!sc) return;
    let cv = sc.querySelector(".q2avoda-cv");
    if (!cv) { cv = document.createElement("div"); cv.className = "q2avoda-cv"; sc.appendChild(cv); }
    const r = S.job.cv || [3, 42, 49, 5];
    cv.style.left = r[0] + "%"; cv.style.top = r[1] + "%"; cv.style.right = r[2] + "%"; cv.style.bottom = r[3] + "%";
    const e = api.esc, f = S.flash;
    const row = (ic, key, val) => `<div class="q2avoda-cv-r${f === key ? " new" : ""}"><i>${ic}</i><b dir="auto">${val ? e(val) : `<span class="q2avoda-dots"></span>`}</b></div>`;
    const icons = (arr, key) => arr.map((p, i) => `<img src="${api.pic(p)}" alt=""${f === key && i === arr.length - 1 ? ` class="new"` : ""}>`).join("");
    cv.innerHTML = `<div class="q2avoda-cv-h" dir="rtl">${e(api.he(api.Q.cvTitle || { he: "קוֹרוֹת חַיִּים" }))}</div>
      <div class="q2avoda-cv-top"><div class="q2avoda-ph"></div><div class="q2avoda-cv-rows">
        ${row("👤", "name", S.name)}${row("🌍", "from", S.from ? api.he(S.from.cv || S.from) : "")}${row("🎂", "age", S.age ? String(S.age) : "")}</div></div>
      <div class="q2avoda-cv-ic" data-k="sk"><i>💪</i>${icons(S.skills, "sk")}</div>
      <div class="q2avoda-cv-ic" data-k="att"><i>📎</i>${icons(S.att, "att")}</div>
      ${S.hired ? `<img class="q2avoda-stars${f === "stamp" ? " new" : ""}" src="${api.pic("stars")}" alt=""><img class="q2avoda-stamp${f === "stamp" ? " new" : ""}" src="${api.pic("check")}" alt="">` : ""}`;
    S.flash = "";
    // шрифт резюме — от его ширины (сцена бывает меньше на шагах со списком)
    // (меняем шрифт только при новой ширине и вне колбэка ResizeObserver — иначе «ResizeObserver loop» попадает в ошибки)
    const fit = () => { if (cv.isConnected && cv.clientWidth && cv._w !== cv.clientWidth) { cv._w = cv.clientWidth; cv.style.fontSize = Math.max(7, cv.clientWidth / 12.5) + "px"; } };
    fit(); requestAnimationFrame(fit);
    if (!cv._ro && window.ResizeObserver) { cv._ro = new ResizeObserver(() => requestAnimationFrame(fit)); cv._ro.observe(cv); }
  }
  function cvAdd(api, key, val) {
    if (key === "sk") S.skills.push(val); else if (key === "att") S.att.push(val); else S[key] = val;
    S.flash = key; renderCv(api);
    sound("pop"); buzz("light");
  }
  // картинка летит от кнопки к резюме, потом появляется в нём
  function fly(api, fromEl, key, picId, done) {
    const sc = api.scene(), to = sc && sc.querySelector(`.q2avoda-cv [data-k="${key}"]`);
    const a = fromEl && fromEl.getBoundingClientRect(), b = to && to.getBoundingClientRect();
    if (!a || !b || !a.width || !b.width) { done(); return; }
    const im = document.createElement("img");
    im.src = api.pic(picId); im.className = "q2avoda-fly"; im.alt = "";
    const s0 = Math.min(a.width, a.height) * 0.8;
    im.style.cssText = `left:${a.left + a.width / 2 - s0 / 2}px;top:${a.top + a.height / 2 - s0 / 2}px;width:${s0}px;height:${s0}px`;
    document.body.appendChild(im);
    const tx = b.left + Math.min(b.width - 10, 24 + (key === "sk" ? S.skills.length : S.att.length) * b.height * 0.9) - (a.left + a.width / 2), ty = b.top + b.height / 2 - (a.top + a.height / 2);
    requestAnimationFrame(() => requestAnimationFrame(() => { im.style.transform = `translate(${tx}px, ${ty}px) scale(.45) rotate(-12deg)`; im.style.opacity = ".4"; }));
    setTimeout(() => { im.remove(); if (api.alive()) done(); }, 620);
  }
  // картинка «шлёп» посреди сцены (рукопожатие) или подарок с лучами
  function popPic(api, id, cls, ms) {
    const sc = api.scene(); if (!sc) return null;
    const d = document.createElement("div");
    d.className = cls; d.innerHTML = `<img src="${api.pic(id)}" alt="">`;
    sc.appendChild(d);
    if (ms) setTimeout(() => d.remove(), ms);
    return d;
  }

  // ---------- панель ----------
  // 23.11 (владелец: «человек ВСЁ говорит сам»): с микрофоном начало фразы не показываем — оно в «💡 Подсказке»
  function head(api, task, frame) {
    const p = api.panel;
    p.innerHTML = `<div class="q2-task">${api.esc(api.g(task || ""))}</div>
      ${frame && !api.micOK() ? `<button class="q2avoda-frame" type="button"><b dir="rtl">${api.esc(api.he(frame))} …</b><span>${api.esc(api.tr(frame))} … · ${api.esc(api.g(frame.ru))}</span></button>` : ""}
      <div class="q2-hint" id="q2Hint"></div>`;
    const fb = p.querySelector(".q2avoda-frame");
    if (fb) fb.onclick = () => api.speak(frame);
  }
  function micRow(api, label, onAlts) {
    if (!api.micOK()) return;
    api.panel.appendChild(api.micBtn(label || "Нажми и скажи", onAlts));
    api.noSpeakLink();
  }
  // «💡 Подсказка» (как в quest2.js): 1-е нажатие — начало фразы (звучит), 2-е — reveal(): варианты целиком / слова под картинками
  function hintBtn(api, frame, reveal) {
    if (!api.micOK()) return;
    let level = 0;
    const hb = document.createElement("button");
    hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = "💡 Подсказка";
    hb.onclick = () => {
      level++;
      if (level === 1 && frame) {
        const show = frame.show ? api.g(frame.show) : api.he(frame) + " …", trs = frame.trShow ? api.g(frame.trShow) : api.tr(frame) + " …";
        api.hint(`Начни так: ⁨${show}⁩ (${trs})`);
        api.speak(frame);
        hb.textContent = "💡 Ещё подсказка";
      } else { reveal(); hb.remove(); api.hint("Послушай (нажми) — и скажи сам" + api.g("{m:}{f:а}") + " 🎤"); }
    };
    api.panel.appendChild(hb);
  }
  function tiles(api, items, opts) {
    const box = document.createElement("div");
    box.className = "q2avoda-tiles" + (api.micOK() ? " quiet" : ""); box.style.setProperty("--n", items.length);   // с микрофоном иврит под картинками скрыт
    box.innerHTML = items.map(it => `<button class="q2avoda-tile" type="button" data-id="${api.esc(it.id)}"><img src="${api.pic(it.pic || it.icon)}" alt=""><b dir="rtl">${api.esc(api.he(it))}</b>${opts && opts.ru ? `<span>${api.esc(api.g(it.ru))}</span>` : ""}</button>`).join("");
    api.panel.appendChild(box);
    return box;
  }
  const tileOf = (box, id) => box.querySelector(`[data-id="${id}"]`);
  function openTile(box, el) { box.querySelectorAll(".q2avoda-tile").forEach(x => x.classList.toggle("open", x === el)); }
  function shake(el) { if (!el) return; el.classList.remove("bad"); void el.offsetWidth; el.classList.add("bad"); }
  // ответы-фразы: без микрофона — нажал = ответил; с микрофоном — нажал = послушал
  // с микрофоном фраз на экране НЕТ (только 🎤 и «💡 Подсказка»), шуточные варианты не показываются вовсе — сказал сам, тогда сработают
  function answers(api, list, onOk, frame) {
    const mic = api.micOK();
    const box = document.createElement("div"); box.className = "q2-chips";
    if (!mic && list.length > 2) api.root.classList.add("q2-filling");     // много фраз — сцена меньше, чтобы 🎤 не закрывал ответы
    let locked = false;
    const pick = (ans) => {
      if (locked || !api.alive()) return;
      if (ans.ok === false) {
        if (ans.soft) { api.npcAct("happy", 900); api.hint(api.g(ans.why || "Попробуй другой ответ 🙂"), true); }   // смешной ответ — не ошибка
        else { api.mistake(); api.hint(api.g(ans.why || "Не совсем — подумай ещё 🙂"), true); }
        return;
      }
      locked = true;
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      api.hint("✓ " + api.he(ans));
      onOk(ans);
    };
    list.filter(a => !mic || a.ok !== false).forEach(ans => {
      const c = document.createElement("button");
      c.className = "q2-chip"; c.type = "button";
      c.innerHTML = `<b dir="rtl">${api.esc(api.he(ans))}</b><span>${api.esc(api.tr(ans))} · ${api.esc(api.g(ans.ru))}</span>`;
      c.onclick = () => { api.speak(ans); if (!api.micOK()) pick(ans); };
      box.appendChild(c);
    });
    api.panel.appendChild(box);
    if (mic) { box.hidden = true; hintBtn(api, frame, () => { box.hidden = false; if (box.children.length > 2) api.root.classList.add("q2-filling"); }); }
    micRow(api, "Нажми и скажи", alts => {
      const hits = list.filter(a => api.matches(alts, a));
      const good = hits.filter(a => a.ok !== false);
      // похожие фразы («אני מרוסיה» ~ «אני מבלארוס»): берём ту, что совпала лучше всех, если она заметно впереди
      const score = (a) => Math.max(...alts.map(x => {
        const A = api.heNorm(x);
        return Math.max(...[api.he(a)].concat((a.also || []).map(api.g)).map(f => { const F = api.heNorm(f); return F.length >= 3 && A.includes(F) ? 1 : api.heSim(A, F); }));
      }));
      if (hits.length > 1) { hits.sort((x, y) => score(y) - score(x)); if (score(hits[0]) - score(hits[1]) >= 0.08) hits.length = 1; }
      if (hits.length === 1) pick(hits[0]);
      else if (good.length === 1 && hits.length > 1 && hits.every(a => a === good[0] || a.soft)) pick(good[0]);   // «כן…» и смешной вариант сразу — берём верный
      else if (hits.length > 1) api.hint("Скажи только один вариант 🙂", true);
      else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». ${box.hidden ? "Нажми «💡 Подсказка»" : "Нажми на фразу — послушай"} — и скажи ещё раз`, true); }
    });
  }

  // ---------- распознавание ----------
  // какая работа названа: «אני רוצה לעבוד בבית קפה» / «במלון» / просто «משלוחים»
  function bestJob(api, alts, jobs) {
    let best = null, bs = 0, second = 0;
    jobs.forEach(j => {
      const forms = [api.he(j)].concat((j.also || []).map(api.g)).map(x => api.heNorm(x)).filter(Boolean);
      let s = 0;
      alts.forEach(a => {
        const A = api.heNorm(a), W = A.split(" ");
        forms.forEach(F => {
          if (F.length >= 3 && A.includes(F)) s = Math.max(s, 1);
          const n = F.split(" ").length;
          for (let i = 0; i + n <= W.length; i++) {
            const w = W.slice(i, i + n).join(" ");
            s = Math.max(s, api.heSim(w, F), api.heSim(w.replace(/^[ובהל]/, ""), F));
          }
        });
      });
      if (s > bs) { second = bs; bs = s; best = j; } else if (s > second) second = s;
    });
    if (bs < 0.75) return null;
    return bs - second >= 0.1 ? best : "both";
  }
  // назван ли предмет (в «покажи»): форма целиком или похожее слово
  function mentions(api, alts, it) {
    const forms = [api.he(it)].concat((it.also || []).map(api.g)).map(x => api.heNorm(x)).filter(Boolean);
    return alts.some(a => {
      const A = api.heNorm(a), W = A.split(" ");
      return forms.some(F => {
        if (F.length >= 2 && (" " + A + " ").includes(" " + F + " ")) return true;
        if (F.length >= 4 && A.includes(F)) return true;
        const n = F.split(" ").length;
        for (let i = 0; i + n <= W.length; i++) if (api.heSim(W.slice(i, i + n).join(" ").replace(/^[ובהל]/, ""), F) >= 0.75 && F.length >= 3) return true;
        return false;
      });
    });
  }
  // число из фразы: «אני בן 25» или «אני בת עשרים וחמש», «שמונה עשרה»
  const UNITS = { "אחת": 1, "אחד": 1, "שתיים": 2, "שתים": 2, "שניים": 2, "שתי": 2, "שלוש": 3, "שלושה": 3, "ארבע": 4, "ארבעה": 4,
    "חמש": 5, "חמישה": 5, "חמשה": 5, "שש": 6, "שישה": 6, "ששה": 6, "שבע": 7, "שבעה": 7, "שמונה": 8, "תשע": 9, "תשעה": 9 };
  const TENS = { "עשרים": 20, "שלושים": 30, "ארבעים": 40, "חמישים": 50, "שישים": 60, "שבעים": 70, "שמונים": 80, "תשעים": 90 };
  function parseAge(api, alt) {
    const d = String(alt).match(/\d{1,3}/);
    if (d) return +d[0];
    const norm = (o) => { const m = {}; Object.keys(o).forEach(k => { m[api.heNorm(k)] = o[k]; }); return m; };
    const U = norm(UNITS), T = norm(TENS), TEN = [api.heNorm("עשר"), api.heNorm("עשרה")];
    const W = api.heNorm(alt).replace(/־/g, " ").split(" ").map(w => w.replace(/^ו(?=.)/, ""));
    let n = 0;
    for (let i = 0; i < W.length; i++) {
      const w = W[i];
      if (T[w]) n += T[w];
      else if (U[w] && TEN.includes(W[i + 1])) { n += 10 + U[w]; i++; }
      else if (U[w]) n += U[w];
      else if (TEN.includes(w)) n += 10;
    }
    return n;
  }
  // имя после «קוראים לי / שמי / אני»; сказал только имя (одно-два слова) — это и есть имя
  function parseName(alt) {
    const t = String(alt).replace(/[֑-ׇ]/g, "").replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
    const m = t.match(/(?:קוראים לי|קורים לי|קוראין לי|השם שלי|שמי|אני)\s+(.+)$/);
    let nm = "";
    if (m) nm = m[1].replace(/^(זה|הוא|היא)\s+/, "").split(" ").slice(0, 2).join(" ").trim();
    else if (t && t.split(" ").length <= 2 && !/^(קוראים|קורים|שמי|השם|אני|שלום|כן|לא)( |$)/.test(t)) nm = t;
    return /[א-תA-Za-zА-Яа-яЁё]/.test(nm) ? nm : "";
  }

  // ===================== ШАГИ =====================

  // 1) ДОСКА ВАКАНСИЙ: друг показывает 5 карточек, игрок говорит, где хочет работать
  Q2_STEPS.avoda_jobs = function (api) {
    S = fresh(api.Q);                                            // новое прохождение (и после перерисовки — работа ещё не выбрана)
    const st = api.st, Q = api.Q, jobs = Q.jobs || [];
    const sc = api.scene();
    sc.querySelectorAll(".q2avoda-cv, .q2avoda-cards, .q2avoda-pop, .q2avoda-gift").forEach(x => x.remove());
    const box0 = document.getElementById("q2Npc"); if (box0) box0.style.display = "none";
    say(api, st.line, Q.friend);
    // прозрачные кнопки поверх карточек, нарисованных на фоне
    const cards = document.createElement("div"); cards.className = "q2avoda-cards";
    cards.innerHTML = jobs.map((j, i) => `<button class="q2avoda-card" type="button" data-id="${j.id}" aria-label="${api.esc(j.ru)}"
      style="left:${j.card[0]}%;top:${j.card[1]}%;--r:${j.card[2] || 0}deg;--d:${i * 0.35}s"></button>`).join("");
    sc.appendChild(cards);
    api.root.classList.add("q2-filling");                        // сцена меньше — плитки и 🎤 помещаются на экран
    head(api, api.micOK() ? "Где хочешь работать? Скажи 🎤" : "Где хочешь работать? Нажми", st.frame);
    const tb = tiles(api, jobs);
    let locked = false;
    const mark = (j) => {
      openTile(tb, tileOf(tb, j.id));
      cards.querySelectorAll(".q2avoda-card").forEach(c => c.classList.toggle("on", c.dataset.id === j.id));
    };
    const choose = (j) => {
      if (locked || !api.alive()) return;
      locked = true; S.job = j;
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      mark(j); tileOf(tb, j.id).classList.add("used");
      const c = cards.querySelector(`[data-id="${j.id}"]`); if (c) { c.classList.remove("on"); c.classList.add("pick"); }
      api.good(10); sound("right"); buzz("success");
      api.hint("✓ " + api.he(j.say));
      api.word({ he: j.he, tr: j.tr, ru: j.ru });
      if (st.word) api.word(st.word);
      later(api, 700, () => say(api, st.after, Q.friend));
      // едем на собеседование: фон — выбранное место, входит человек оттуда
      later(api, 700 + lineMs(api, st.after), () => {
        cards.remove();
        setBg(api, j.bg, true);
        setNpc(api, j, true);
        Q.seller = j.who;
        const sb = document.getElementById("q2Say"); if (sb) sb.hidden = true;
        api.next(900);
      });
    };
    const tap = (j) => {
      if (locked) return;
      api.speak(j.say); mark(j);
      if (api.micOK()) api.hint(`${api.tr(j.say)} — скажи 🎤`);
      else choose(j);
    };
    tb.querySelectorAll(".q2avoda-tile").forEach(b => b.onclick = () => tap(jobs.find(j => j.id === b.dataset.id)));
    cards.querySelectorAll(".q2avoda-card").forEach(b => b.onclick = () => tap(jobs.find(j => j.id === b.dataset.id)));
    hintBtn(api, st.frame, () => tb.classList.remove("quiet"));
    micRow(api, "Нажми и скажи", alts => {
      const j = bestJob(api, alts, jobs);
      if (j === "both") api.hint("Выбери что-то одно 🙂", true);
      else if (j) choose(j);
      else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Нажми на карточку — послушай — и скажи`, true); }
    });
  };

  // 2) ОБЫЧНЫЙ ВОПРОС-ОТВЕТ на собеседовании (поздороваться, откуда ты, почему тебя взять)
  Q2_STEPS.avoda_say = function (api) {
    const st = api.st;
    interview(api);
    say(api, pj(st.line));
    head(api, st.task);
    answers(api, pj(st.answers), (ans) => {
      api.good(10);
      if (st.id === "hello") {                                  // рукопожатие — и на столе появляется пустое резюме
        popPic(api, "handshake", "q2avoda-pop", 1500);
        sound("pop"); buzz("light");
        later(api, 900, () => { S.cvOn = true; renderCv(api); });
      } else if (st.id === "from") cvAdd(api, "from", ans);
      else if (st.id === "why" && ans.pic) cvAdd(api, "sk", ans.pic);
      later(api, 1000, () => say(api, st.reply));
      api.next(1000 + lineMs(api, st.reply));
    }, st.frame);
  };

  // 3) ИМЯ: «קוֹרְאִים לִי …» — в резюме пишется то, что услышал микрофон (ивритом!)
  Q2_STEPS.avoda_name = function (api) {
    const st = api.st;
    interview(api);
    say(api, st.line);
    head(api, st.task, st.frame);
    const pname = (typeof profile !== "undefined" && profile && profile.name) ? String(profile.name).trim() : "";
    let locked = false;
    const ok = (name) => {
      if (locked || !api.alive()) return;
      locked = true;
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      api.good(10);
      cvAdd(api, "name", name);
      api.hint(`✓ ${api.he(st.frame)} ${name}`);
      later(api, 700, () => say(api, st.reply));
      api.next(700 + lineMs(api, st.reply) + 300);
    };
    const chips = document.createElement("div"); chips.className = "q2-chips";
    const c = document.createElement("button"); c.className = "q2-chip"; c.type = "button";
    c.innerHTML = `<b dir="rtl">${api.esc(api.he(st.frame))} ${api.esc(pname || "…")}</b><span>${api.esc(api.tr(st.frame))} ${api.esc(pname || "…")} · ${api.esc(api.g(st.frame.ru)).replace(/…$/, "")} ${api.esc(pname || "…")}</span>`;
    c.onclick = () => { api.speak(st.frame); if (!api.micOK()) ok(pname || "—"); };
    chips.appendChild(c); api.panel.appendChild(chips);
    if (api.micOK()) { chips.hidden = true; hintBtn(api, st.frame, () => { chips.hidden = false; }); }
    micRow(api, "Нажми и скажи", alts => {
      const nm = alts.map(parseName).find(Boolean);
      if (nm) ok(nm);
      else if (alts.some(a => /קוראים לי|שמי/.test(a))) api.hint("А имя? 🙂 Скажи целиком: " + api.he(st.frame) + " …", true);
      else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи целиком: «${api.he(st.frame)} …» и своё имя`, true); }
    });
  };

  // 4) ВОЗРАСТ: любое число голосом (цифрами или словами), без микрофона — кнопки-возрасты
  Q2_STEPS.avoda_age = function (api) {
    const st = api.st;
    interview(api);
    if (!api.micOK()) api.root.classList.add("q2-filling");      // кнопки-возрасты на экране — сцена меньше
    say(api, st.line);
    head(api, st.task, st.frame);
    let locked = false;
    const ok = (n) => {
      if (locked || !api.alive()) return;
      locked = true;
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      api.good(10);
      cvAdd(api, "age", n);
      api.hint("✓ " + n);
      later(api, 700, () => say(api, st.reply));
      api.next(700 + lineMs(api, st.reply) + 300);
    };
    const box = document.createElement("div"); box.className = "q2avoda-ages";
    box.innerHTML = st.ages.map((a, i) => `<button class="q2avoda-age" type="button" data-i="${i}"><b>${a.n}</b><span dir="rtl">${api.esc(api.he(a).split(" ").slice(2).join(" ").replace(/\.$/, ""))}</span></button>`).join("");
    api.panel.appendChild(box);
    box.querySelectorAll(".q2avoda-age").forEach(b => b.onclick = () => {
      const a = st.ages[+b.dataset.i];
      api.speak(a);
      box.querySelectorAll(".q2avoda-age").forEach(x => x.classList.toggle("open", x === b));
      if (api.micOK()) api.hint(`«${api.he(a)}» — ${api.tr(a)}. Скажи свой возраст 🎤`);
      else ok(a.n);
    });
    if (api.micOK()) { box.hidden = true; hintBtn(api, st.frame, () => { box.hidden = false; api.root.classList.add("q2-filling"); }); }
    micRow(api, "Нажми и скажи", alts => {
      const n =alts.map(a => parseAge(api, a)).find(x => x > 0);
      if (n >= 10 && n <= 99) ok(n);
      else if (n) api.hint(`${n}? 😄 Скажи свой настоящий возраст`, true);
      else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи: ${api.he(st.frame)} + число`, true); }
    });
  };

  // 5) ЧТО УМЕЕШЬ: называешь сколько хочешь (минимум 2), значки летят в резюме; потом «זֶה הַכּוֹל»
  Q2_STEPS.avoda_skills = function (api) {
    const st = api.st;
    const s = interview(api);
    api.root.classList.add("q2-filling");
    say(api, st.line);
    const items = [pj(st.jobSkill)].filter(Boolean).concat(st.items);
    head(api, st.task, st.frame);
    const tb = tiles(api, items, { ru: true });
    const got = new Set(items.filter(it => s.skills.includes(it.pic)).map(it => it.id));   // перерисовка шага — сказанное не пропадает
    got.forEach(id => tileOf(tb, id).classList.add("used"));
    let locked = false;
    let showDone = null;
    const finishSkills = () => {
      if (locked) return true;
      if (got.size < (st.min || 1)) { api.hint(`Назови хотя бы ${st.min || 1} — что ты умеешь`, true); return false; }
      locked = true;
      api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
      api.hint("✓ " + api.he(st.done));
      later(api, 500, () => say(api, st.reply));
      api.next(500 + lineMs(api, st.reply) + 300);
      return true;
    };
    const add = (it) => {
      if (got.has(it.id) || locked) return false;
      got.add(it.id);
      if (got.size >= (st.min || 1) && typeof showDone === "function") showDone();
      const t = tileOf(tb, it.id); t.classList.add("used");
      api.good(5); api.word(it);
      fly(api, t, "sk", it.pic, () => { cvAdd(api, "sk", it.pic); if (got.size === items.length) later(api, 400, finishSkills); });
      return true;
    };
    tb.querySelectorAll(".q2avoda-tile").forEach(b => b.onclick = () => {
      const it = items.find(x => x.id === b.dataset.id);
      api.speak(it); openTile(tb, b);
      if (api.micOK()) api.hint(`«${api.he(st.frame)} ${api.he(it)}» — скажи 🎤`);
      else if (add(it)) api.hint(`✓ ${api.he(it)} — ${api.g(it.ru)}`);
    });
    const row = document.createElement("div"); row.className = "q2-row";
    const dc = document.createElement("button"); dc.className = "q2-chip q2-done"; dc.type = "button";
    dc.innerHTML = `<b dir="rtl">${api.esc(api.he(st.done))}</b><span>${api.esc(api.tr(st.done))} · ${api.esc(api.g(st.done.ru))}</span>`;
    dc.onclick = () => { api.speak(st.done); if (!api.micOK()) finishSkills(); };
    row.appendChild(dc); api.panel.appendChild(row);
    // с микрофоном «זֶה הַכּוֹל» появляется, только когда названо достаточно (как подсказка, чем закончить)
    showDone = () => { row.hidden = false; };
    if (api.micOK() && got.size < (st.min || 1)) row.hidden = true;
    hintBtn(api, st.frame, () => tb.classList.remove("quiet"));
    micRow(api, "Нажми и скажи", alts => {
      const named = api.namedItems(alts, items).filter(add);
      if (api.matches(alts, st.done)) { if (finishSkills()) return; if (!named.length) return; }
      if (named.length) api.hint("✓ " + named.map(api.he).join(", ") + ` — ещё? Или: ${api.he(st.done)}`);
      else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Нажми на картинку — послушай — и скажи`, true); }
    });
  };

  // 6) ПОКАЖИ: человек просит вещь (резюме, фото, права…) — найди в сумке и скажи «כֵּן, יֵשׁ לִי …»; вещь ложится в резюме
  Q2_STEPS.avoda_show = function (api) {
    const st = api.st;
    const s = interview(api);
    api.root.classList.add("q2-filling");
    const byId = (id) => st.items.find(it => it.id === id);
    const jobItem = pj(st.jobItem) || "portfolio";
    if (!st._req) {
      // резюме уже лежит на столе — просят вещь своей работы, потом ручку (подписать договор)
      st._req = [jobItem, "pen"];
      const others = ["diploma", "portfolio", "photos"].filter(x => x !== jobItem).slice(0, 2);
      const bag = [jobItem, "pen"].concat(others);
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      st._bag = bag; st._i = 0;
    }
    if (st._i >= st._req.length) { api.next(300); return; }   // всё уже отдано (шаг перерисован)
    const bagItems = st._bag.map(byId);
    const cur = () => byId(st._req[st._i]);
    say(api, cur().ask);
    head(api, st.task, st.frame);
    const tb = tiles(api, bagItems);
    st._req.slice(0, st._i).forEach(id => tileOf(tb, id).classList.add("gone"));   // уже отданное (после перерисовки)
    let busy = false;
    const give = (it) => {
      if (busy || !api.alive()) return;
      busy = true;
      const t = tileOf(tb, it.id);
      api.good(10); api.word(it);
      api.hint("✓ " + api.he(it.say));
      fly(api, t, "att", it.pic, () => {
        cvAdd(api, "att", it.pic);
        st._i++;
        if (st._i < st._req.length) {
          say(api, st.reply);
          later(api, lineMs(api, st.reply), () => { busy = false; tb.querySelectorAll(".q2avoda-tile").forEach(x => x.classList.remove("open", "bad")); say(api, cur().ask); api.hint(""); });
        } else {
          api.panel.querySelectorAll("button").forEach(b => b.disabled = true);
          say(api, st.replyEnd);
          api.next(lineMs(api, st.replyEnd) + 300);
        }
      });
      t.classList.add("gone");
    };
    const wrong = (it) => {
      api.mistake(); shake(tileOf(tb, it.id));
      api.hint(`Это ${api.he(it)} (${api.g(it.ru)}). Послушай вопрос ещё раз — нажми на него сверху 👆`, true);
    };
    tb.querySelectorAll(".q2avoda-tile").forEach(b => b.onclick = () => {
      if (busy || b.classList.contains("gone")) return;
      const it = byId(b.dataset.id);
      tb.querySelectorAll(".q2avoda-tile").forEach(x => x.classList.remove("bad"));
      if (api.micOK()) { api.speak(it); openTile(tb, b); api.hint(`«${api.he(it)}» — ${api.tr(it)}. Это то, что просят? Тогда скажи 🎤`); }
      else if (it.id === cur().id) give(it);
      else wrong(it);
    });
    hintBtn(api, st.frame, () => tb.classList.remove("quiet"));
    micRow(api, "Нажми и скажи", alts => {
      if (busy) return;
      const want = cur();
      const hits = bagItems.filter(it => !tileOf(tb, it.id).classList.contains("gone") && mentions(api, alts, it));
      if (hits.includes(want)) give(want);
      else if (hits.length) wrong(hits[0]);
      else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Нажми на вещь — послушай — и скажи`, true); }
    });
  };

  // 7) РЕШЕНИЕ: человек думает… печать ✓ на резюме — «ты принят(а)! начнёшь завтра?» → подарок места (фартук, шлем…)
  Q2_STEPS.avoda_hired = function (api) {
    const st = api.st;
    interview(api);
    const ask = () => {
      say(api, st.line);
      head(api, st.task);
      answers(api, st.answers, () => {
        api.good(10);
        if (st.word) api.word(st.word);
        const gift = pj(st.gift);
        if (!gift || !gift.line) { api.next(1200); return; }
        later(api, 700, () => {
          say(api, gift.line);
          popPic(api, gift.pic, "q2avoda-gift");
          sound("right"); buzz("success");
          if (gift.word) api.word(gift.word);
        });
        api.next(700 + lineMs(api, gift.line) + 900);
      }, st.frame);
    };
    if (st._stamped) { ask(); return; }                          // перерисовка шага — уже решено
    const sb = document.getElementById("q2Say"); if (sb) sb.hidden = true;
    api.panel.innerHTML = `<div class="q2-wait">Думает… 🤔</div>`;
    const box = document.getElementById("q2Npc");
    let cloud = null;
    if (box) { cloud = document.createElement("img"); cloud.className = "q2avoda-think"; cloud.src = api.pic("thinking"); cloud.alt = ""; box.appendChild(cloud); }
    later(api, 1900, () => {
      if (cloud) cloud.remove();
      st._stamped = true;
      S.hired = true; S.flash = "stamp"; renderCv(api);
      sound("right"); buzz("success");
      api.npcAct("happy", 1600);
      later(api, 500, ask);
    });
    setTimeout(() => { if (cloud && cloud.isConnected && !api.alive()) cloud.remove(); }, 2000);
  };

  // проверка распознавания в консоли: q2avodaTest.job(["אני רוצה לעבוד במלון"], jobs), .age("אני בת עשרים ושתיים"), .name("קוראים לי מישה")
  const tapi = () => ({ he: (x) => g(x.he), g: (x) => g(x), heNorm: (x) => heNorm(x), heSim: (a, b) => heSim(a, b) });
  window.q2avodaTest = { age: (a) => parseAge(tapi(), a), name: parseName, job: (alts, jobs) => { const j = bestJob(tapi(), alts, jobs); return j && j.id || j; }, mentions: (alts, it) => mentions(tapi(), alts, it) };
})();
