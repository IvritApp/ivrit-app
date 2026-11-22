// =====================================================
// НОВЫЕ КВЕСТЫ (22.11): «ЧТО СКАЗАЛ — ТО ПОЯВИЛОСЬ».
// Картинки — Codex (плоский стиль), данные — content/he/quests2/<id>.json, первый квест — шаурма.
// Игрок отвечает ГОЛОСОМ (🎤, распознавание he-IL из quest.js: listenHe/heSim/canSpeakNow).
// Не знает слово — нажимает на лоток/подсказку: слово звучит и видно на иврите, потом говорит сам.
// Микрофон не работает / «🙊 Не могу говорить» — те же подсказки становятся кнопками.
// Типы шагов: choice (продавец спрашивает → один из ответов, ответ может положить картинку на доску: "put"),
//             fill (игрок сам называет начинку, сколько хочет, потом «זֶה הַכּוֹל»), wrap (шаурма заворачивается),
//             pay (продавец называет цену → «вот, спасибо» + нажать на купюру).
// Пока виден только тестировщику (кнопка «🧪 Новая шаурма» на дорожке) — до одобрения владельца.
// =====================================================
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let Q = null, k = 0, token = 0, root = null, placed = [], points = 0, mistakes = 0;
  // жив ли ещё этот шаг: не начат новый шаг, экран квеста не закрыт («✕», «Назад» Telegram, «Дальше»)
  const alive = (t) => t === token && root && root.isConnected && !document.getElementById("quest").hidden;
  // остановить микрофон и голос (при выходе и перед тем, как слушать игрока — иначе микрофон слышит продавца)
  function hush() {
    try { if (typeof qRec !== "undefined" && qRec) qRec.abort(); } catch (e) {}
    if (typeof ttsReq !== "undefined") ttsReq++;
    try { if (typeof ttsPlayer !== "undefined" && ttsPlayer) ttsPlayer.pause(); } catch (e) {}
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
  }
  const leave = () => { hush(); token++; showPath(); };
  const he = (x) => g(x.he), tr = (x) => g(x.tr || "");
  const pic = (id) => `${Q.img}${id}.webp`;
  const micOK = () => typeof canSpeakNow === "function" && canSpeakNow();

  // похож ли сказанный текст на ответ (несколько вариантов распознавания + запасные формы "also")
  function matches(alts, ans) {
    const forms = [he(ans)].concat((ans.also || []).map(g));
    return alts.some(a => forms.some(f => {
      if (typeof heSim !== "function") return false;
      if (heSim(a, f) >= 0.6) return true;
      const A = heNorm(a), F = heNorm(f);
      return F.length >= 3 && A.includes(F);                       // сказал длиннее («אני רוצה בלאפה בבקשה») — тоже верно
    }));
  }
  // какие начинки названы в одной фразе («עגבנייה ומלפפון»)
  function namedItems(alts, items) {
    const out = [];
    // «בלי בצל», «לא חסה» — это НЕ класть: убираем слово (и «אדום» после «כרוב») после «без / не»
    const clean = (a) => (" " + heNorm(a) + " ").replace(/ (בלי|לא|בלעדי|ובלי|ולא) [^ ]+( אדומ)?/g, " ").trim();
    items.forEach(it => {
      const f = heNorm(he(it));
      const syn = (it.also || []).map(x => heNorm(g(x)));
      const hit = alts.some(a0 => {
        const A = clean(a0);
        if (!A) return false;
        if (syn.some(s => s && A.includes(s))) return true;
        if (A.includes(f)) return true;
        return A.split(" ").some(w => w.replace(/^ו/, "") && heSim(w.replace(/^ו/, ""), f) >= 0.7) || heSim(A, f) >= 0.7;
      });
      if (hit) out.push(it);
    });
    return out;
  }

  // ---------- экран ----------
  function shell() {
    openQuestSection();
    questView.innerHTML = `<div class="q2" id="q2">
      <div class="q2-top"><button class="q2-x" id="q2X" aria-label="Выйти">✕</button><div class="q2-bar"><i id="q2Bar"></i></div></div>
      <div class="q2-scene" id="q2Scene" style="background-image:url('${Q.bg}')">
        <div class="q2-say" id="q2Say" hidden></div>
        <div class="q2-board" id="q2Board"></div>
      </div>
      <div class="q2-panel" id="q2Panel"></div>
    </div>`;
    root = document.getElementById("q2");
    window.scrollTo(0, 0);
    document.getElementById("q2X").onclick = () => { if (window.track && !(quest && quest._ended)) track("quest_exit", Q.id); leave(); };
  }
  function progress() { const b = document.getElementById("q2Bar"); if (b) b.style.width = Math.round(k / Q.steps.length * 100) + "%"; }

  // реплика продавца сверху (иврит + транскрипция, перевод по нажатию) и звук
  function sellerSays(line) {
    const box = document.getElementById("q2Say");
    if (!box || !line) return;
    box.hidden = false;
    box.innerHTML = `<div class="q2-who">${esc(Q.seller)}</div><div class="q2-he" dir="rtl">${esc(he(line))}</div>
      <div class="q2-tr">${esc(tr(line))}</div><button class="q2-ru" type="button">перевод</button>`;
    box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
    const ru = box.querySelector(".q2-ru");
    ru.onclick = () => { ru.textContent = g(line.ru); ru.classList.add("open"); };
    box.querySelector(".q2-he").onclick = () => speak(he(line));
    speak(he(line));
  }

  // положить картинку на доску: хлеб — большой в центре, остальное — горкой поверх, со «шлепком»
  function put(id, big) {
    const b = document.getElementById("q2Board");
    if (!b) return;
    const el = document.createElement("img");
    el.src = pic(id); el.alt = ""; el.draggable = false;
    if (big) { el.className = "q2-bread"; b.innerHTML = ""; }
    else {
      const n = placed.length, ang = n * 2.4, r = 6 + (n % 4) * 5;
      el.className = "q2-piece";
      el.style.left = (50 + Math.cos(ang) * r * 1.6) + "%"; el.style.top = (52 + Math.sin(ang) * r) + "%";
      el.style.setProperty("--rot", (Math.round(Math.random() * 50) - 25) + "deg");
    }
    b.appendChild(el);
    placed.push(id);
    if (typeof playSound === "function") playSound("pop");
    if (typeof vibrate === "function") vibrate("light");
  }

  // кнопка микрофона: слушает и отдаёт варианты распознавания
  function micBtn(label, onAlts) {
    const btn = document.createElement("button");
    btn.className = "q2-mic"; btn.type = "button";
    btn.innerHTML = `<span class="q2-mic-ic">🎤</span><span>${esc(label)}</span>`;
    btn.onclick = () => {
      if (btn.classList.contains("on")) return;
      hush();
      btn.classList.add("on");
      const t = token;
      listenHe(alts => { btn.classList.remove("on"); if (alive(t)) onAlts(alts); },
        err => { btn.classList.remove("on"); if (!alive(t)) return;
          if (err === "no-speech" || err === "aborted") { hint("Не расслышал — нажми 🎤 и скажи ещё раз"); return; }
          // микрофон не дали / не работает в этом Telegram — сутки отвечаем кнопками (как в старых квестах)
          store.set("nospeak_until", Date.now() + 86400000);
          if (typeof showToast === "function") showToast(err === "not-allowed" || err === "service-not-allowed" ? "Микрофон не разрешён — пока отвечай кнопками" : "Голос тут не работает — пока отвечай кнопками");
          render(); });
    };
    return btn;
  }
  function hint(text, bad) {
    const h = document.getElementById("q2Hint");
    if (!h) return;
    h.textContent = text; h.className = "q2-hint" + (bad ? " bad" : "");
  }
  function noSpeakLink(panel) {
    if (!micOK()) return;
    const a = document.createElement("button");
    a.className = "q2-nospeak"; a.type = "button"; a.textContent = "🙊 Не могу сейчас говорить";
    a.onclick = () => { store.set("nospeak_until", Date.now() + 15 * 60000); render(); };
    panel.appendChild(a);
  }

  // ---------- шаги ----------
  function render() {
    const t = ++token;
    const st = Q.steps[k];
    progress();
    const panel = document.getElementById("q2Panel");
    if (!panel) return;
    panel.innerHTML = "";
    if (!st) { finish(t); return; }
    if (st.type === "wrap") {
      sellerSays(st.seller);
      setTimeout(() => {
        if (!alive(t)) return;
        const b = document.getElementById("q2Board");
        b.classList.add("rolling");
        setTimeout(() => { if (!alive(t)) return; b.classList.remove("rolling"); b.innerHTML = `<img class="q2-bread done" src="${pic(placed[0] === "pita" ? "pita_done" : "wrap_done")}" alt="">`; if (typeof playSound === "function") playSound("right"); }, 900);
        setTimeout(() => { if (alive(t)) { k++; render(); } }, 2600);
      }, 1200);
      panel.innerHTML = `<div class="q2-wait">Продавец заворачивает… 🌯</div>`;
      return;
    }
    if (st.seller) sellerSays(st.seller);
    if (st.type === "fill") return renderFill(st, panel, t);
    // choice / pay
    panel.innerHTML = `<div class="q2-task">${esc(st.hint || (st.type === "pay" ? "Заплати и скажи «вот, спасибо»" : "Ответь продавцу"))}</div><div class="q2-hint" id="q2Hint"></div><div class="q2-chips" id="q2Chips"></div>`;
    const chips = panel.querySelector("#q2Chips");
    let paid = st.type !== "pay" || placed.includes("bill50");          // уже платил (шаг перерисован) — второй купюры не будет
    const done = (ans) => {
      if (!alive(t)) return;
      if (!paid) { hint("Ещё дай деньги — нажми на купюру 💵", true); return; }
      points += 10;
      if (ans.put) put(ans.put, ans.put === "lafa" || ans.put === "pita");
      panel.querySelectorAll("button").forEach(b => b.disabled = true);
      hint("✓ " + he(ans));
      setTimeout(() => { if (alive(t)) { k++; render(); } }, 1300);
    };
    if (st.type === "pay") {
      const bill = document.createElement("button");
      bill.className = "q2-bill"; bill.type = "button";
      bill.innerHTML = `<img src="${pic("bill50")}" alt="50 шекелей">`;
      if (paid) bill.classList.add("gone");
      bill.onclick = () => {
        if (paid) return; paid = true; bill.classList.add("gone");
        const b = document.getElementById("q2Board"); const el = document.createElement("img");
        el.src = pic("bill50"); el.className = "q2-piece q2-money"; b.appendChild(el); placed.push("bill50");
        if (typeof playSound === "function") playSound("right");
        hint(micOK() ? "Теперь скажи: «вот, спасибо» 🎤" : "Теперь скажи «вот, спасибо» — нажми фразу");
      };
      chips.before(bill);
    }
    st.answers.forEach(ans => {
      const c = document.createElement("button");
      c.className = "q2-chip"; c.type = "button";
      c.innerHTML = `<b dir="rtl">${esc(he(ans))}</b><span>${esc(tr(ans))} · ${esc(g(ans.ru))}</span>`;
      c.onclick = () => { speak(he(ans)); if (!micOK()) done(ans); };     // без микрофона — подсказка = ответ
      chips.appendChild(c);
    });
    if (micOK()) {
      panel.appendChild(micBtn("Нажми и скажи", alts => {
        const hits = st.answers.filter(a => matches(alts, a));
        if (hits.length === 1) done(hits[0]);
        else if (hits.length > 1) hint("Скажи только один вариант 🙂", true);
        else { mistakes++; hint(`Я услышал «${alts[0] || "…"}». Нажми на фразу — послушай — и скажи ещё раз`, true); }
      }));
      noSpeakLink(panel);
    }
  }

  // свободный выбор начинки: лотки внизу, называешь сколько хочешь, потом «זֶה הַכּוֹל»
  function renderFill(st, panel, t) {
    const chosen = new Set(st.items.filter(it => placed.includes(it.id)).map(it => it.id));   // шаг перерисован — то, что уже лежит, не пропадает
    panel.innerHTML = `<div class="q2-task">Скажи, что положить. Можно несколько сразу! Потом скажи <bdi dir="rtl">${esc(he(st.done))}</bdi> (это всё)</div>
      <div class="q2-hint" id="q2Hint">Не знаешь слово — нажми на лоток 👇</div>
      <div class="q2-trays" id="q2Trays">${st.items.map(it => `<button class="q2-tray" type="button" data-id="${it.id}"><img src="${pic(it.id)}" alt=""><span class="q2-tray-he" dir="rtl">${esc(he(it))}</span></button>`).join("")}</div>
      <div class="q2-row" id="q2Row"></div>`;
    const trays = panel.querySelector("#q2Trays"), row = panel.querySelector("#q2Row");
    root.classList.add("q2-filling");                                    // сцена ниже — чтобы лотки и 🎤 влезли на экран
    chosen.forEach(id => { const tb = trays.querySelector(`[data-id="${id}"]`); if (tb) tb.classList.add("used"); });
    const add = (it) => {
      if (chosen.has(it.id)) return false;
      chosen.add(it.id); points += 5;
      put(it.id, false);
      const tb = trays.querySelector(`[data-id="${it.id}"]`); if (tb) tb.classList.add("used");
      return true;
    };
    const finishFill = () => {
      if (chosen.size < (st.min || 1)) { hint(`Положи хотя бы ${st.min || 1} — назови, что хочешь`, true); return false; }
      panel.querySelectorAll("button").forEach(b => b.disabled = true);
      hint("✓ " + he(st.done));
      setTimeout(() => { if (alive(t)) { root.classList.remove("q2-filling"); k++; render(); } }, 1200);
      return true;
    };
    trays.querySelectorAll(".q2-tray").forEach(b => b.onclick = () => {
      const it = st.items.find(x => x.id === b.dataset.id);
      speak(he(it));
      trays.querySelectorAll(".q2-tray").forEach(x => x.classList.toggle("open", x === b));
      if (micOK()) hint(`«${he(it)}» — ${tr(it)} (${g(it.ru)}). Теперь скажи это 🎤`);
      else if (add(it)) hint(`✓ ${he(it)} — ${g(it.ru)}`);
    });
    const doneChip = document.createElement("button");
    doneChip.className = "q2-chip q2-done"; doneChip.type = "button";
    doneChip.innerHTML = `<b dir="rtl">${esc(he(st.done))}</b><span>${esc(tr(st.done))} · ${esc(g(st.done.ru))}</span>`;
    doneChip.onclick = () => { speak(he(st.done)); if (!micOK()) finishFill(); };
    row.appendChild(doneChip);
    if (micOK()) {
      row.appendChild(micBtn("Скажи начинку", alts => {
        // сначала кладём всё названное («בצל וחסה, זה הכל» — и лук, и латук), потом смотрим, сказал ли «это всё»
        const got = namedItems(alts, st.items).filter(add);
        if (matches(alts, st.done)) { if (finishFill()) return; if (!got.length) return; }
        if (got.length) hint("✓ " + got.map(he).join(", ") + " — ещё что-то? Или: " + he(st.done));
        else { mistakes++; hint(`Я услышал «${alts[0] || "…"}». Нажми на лоток — послушай — и скажи`, true); }
      }));
      noSpeakLink(panel);
    }
  }

  function finish(t) {
    sellerSays(Q.outro);
    const perfect = mistakes === 0, pts = Math.round(points * (perfect ? 2 : 1));
    store.set(todayKey(), store.get(todayKey(), 0) + pts);
    window.streakHold = !!window.HAnim;                                // экран серии — после праздника, а не поверх него
    if (typeof streakDone === "function") streakDone();
    if (window.track) track("quest_end", Q.id);
    if (typeof quest !== "undefined" && quest) quest._ended = true;
    store.set("quest2_" + Q.id, true);
    const panel = document.getElementById("q2Panel");
    const words = Q.steps.flatMap(s => s.type === "fill" ? s.items.filter(it => placed.includes(it.id)) : []);
    panel.innerHTML = `<div class="q2-end">
      <h2>${perfect ? "Без единой ошибки! ⭐" : "Шаурма твоя! 🌯"}</h2>
      <div class="q2-pts">+${pts} очков</div>
      ${words.length ? `<div class="q2-words">${words.map(w => `<button class="q2-word" type="button" data-he="${esc(he(w))}"><b dir="rtl">${esc(he(w))}</b><span>${esc(g(w.ru))}</span></button>`).join("")}</div>` : ""}
      <button class="btn blue" id="q2Fin">Дальше</button></div>`;
    panel.querySelectorAll(".q2-word").forEach(b => b.onclick = () => speak(b.dataset.he));
    document.getElementById("q2Fin").onclick = leave;
    if (window.HAnim) HAnim.play("lessonEnd", { cards: false, title: "Шаурма твоя!" })
      .then(() => { window.streakHold = false; return window.streakShow ? streakShow() : null; })
      .catch(() => { window.streakHold = false; });
    if (typeof playSound === "function") setTimeout(() => playSound("finish"), 300);
  }

  window.q2Test = { matches, namedItems };                       // для проверки распознавания в консоли
  window.startQuest2 = function (id) {
    fetch(`content/${COURSE_LANG}/quests2/${id}.json`).then(r => r.json()).then(d => {
      Q = d; k = 0; placed = []; points = 0; mistakes = 0;
      quest = { id: d.id, _ended: false };                       // общая переменная из quest.js — для «Назад» и статистики (app.js)
      shell();
      if (window.track) track("quest_start", d.id);
      // карточка цели, как в старых квестах
      const panel = document.getElementById("q2Panel");
      panel.innerHTML = `<div class="q-goal"><div class="q-goal-k">🎯 Твоя цель</div><div class="q-goal-t">${esc(g(d.goal))}</div>
        <div class="q-goal-s">${micOK() ? "Отвечай голосом 🎤 — не знаешь слово, нажми на подсказку" : "Нажимай на фразы на иврите"}</div>
        <button class="btn blue q-goal-go" id="q2Go">Начать</button></div>`;
      document.getElementById("q2Go").onclick = () => { if (typeof playSound === "function") playSound("pop"); render(); };
    }).catch(() => showToast("Не получилось загрузить квест 😕"));
  };
})();
