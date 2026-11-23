// =====================================================
// Quest "Bus" (level 4) — own mechanics for quest2.js (content/he/quests2/bus.json).
// bus_talk — a dialog with a person standing in the scene (the woman from the bus stop), or with the driver (engine npc).
//            The answer is said aloud; the most similar answer wins (near-identical wrong answers like
//            «...לַמֶּרְכָּז?» / «...לַיָּם?» are told apart), digits from speech recognition become words ("5" → חמש).
//            "person": {id, x, bottom, h} — x = centre of the figure, all in % of the scene (on THIS step's background).
// bus_ride — the ride: the LED board says «next stop: …» (sound only, the name is hidden), the player SAYS the stop name —
//            it lights up on the board and is written on the route map; then decides: 🔔 (stop here) or «go on».
//            The player must get off at the stop with "target": true (the centre). Route — Q.route, shared by all
//            bus_ride steps (state survives between them); a step rides stops "from" … "to".
// =====================================================
(function () {
  window.Q2_STEPS = window.Q2_STEPS || {};
  const NUM = { 0: "אפס", 1: "אחת", 2: "שתיים", 3: "שלוש", 4: "ארבע", 5: "חמש", 6: "שש", 7: "שבע", 8: "שמונה", 9: "תשע", 10: "עשר" };
  const digits = (s) => String(s || "").replace(/\d+/g, d => " " + (NUM[d] || "") + " ");
  const later = (api, ms, fn) => setTimeout(() => { if (api.alive()) fn(); }, ms);
  const sfx = (n) => { if (typeof playSound === "function") playSound(n); };
  const buzz = (n) => { if (typeof vibrate === "function") vibrate(n); };

  // ---------- speech matching ----------
  // words without the article / prefixes: «הים» → «ים», «למרכז» → «מרכז» (only when something is left)
  const strip = (api, s) => api.heNorm(s).split(" ").map(w => w.length > 2 ? w.replace(/^[הלבו]/, "") : w).join(" ");
  // how close the spoken variants are to a phrase (0…1): whole phrase, phrase inside a longer sentence, word windows
  function score(api, alts, x) {
    const forms = [api.he(x)].concat((x.also || []).map(api.g)).filter(Boolean);
    let best = 0;
    alts.forEach(a0 => {
      const a = digits(a0), A = api.heNorm(a), As = strip(api, a);
      if (!A) return;
      forms.forEach(f => {
        const F = api.heNorm(f), Fs = strip(api, f);
        if (!F) return;
        best = Math.max(best, api.heSim(A, F), api.heSim(As, Fs));
        if (F.length >= 3 && (" " + A + " ").includes(" " + F + " ")) best = Math.max(best, 0.95);
        // short answer inside a sentence: «התחנה הבאה הים» → window of words of the same length
        const aw = As.split(" "), n = Fs.split(" ").length;
        for (let i = 0; i + n <= aw.length; i++) best = Math.max(best, api.heSim(aw.slice(i, i + n).join(" "), Fs));
      });
    });
    return best;
  }
  // the best of the options (or null): {it, s}
  // the same score for a right and a wrong answer (said only the common part, «תודה רבה») → {tie: true}: ask for the whole phrase
  function bestOf(api, alts, items) {
    const all = items.map(it => ({ it, s: score(api, alts, it) })).sort((a, b) => b.s - a.s);
    const top = all[0];
    if (!top || top.s < 0.62) return null;
    if (all[1] && all[1].s >= 0.62 && top.s - all[1].s < 0.1 && (top.it.ok === false) !== (all[1].it.ok === false)) return { tie: true };
    return top;
  }

  // ---------- a person in the scene (not the engine npc) ----------
  function person(api, P) {
    const sc = api.scene();
    if (!sc) return null;
    let el = sc.querySelector(".q2bus-p");
    const id = P ? api.g(P.id) : "";
    if (!P || !window.HirbisChars || !HirbisChars.has(id) || typeof charImgHTML !== "function") { if (el) el.remove(); return null; }
    if (!el || el.dataset.id !== id) {
      if (el) el.remove();
      el = document.createElement("div");
      el.className = "q2bus-p"; el.dataset.id = id;
      el.innerHTML = charImgHTML(id);
      sc.appendChild(el);
    }
    const pos = [P.x, P.bottom, P.h].join(",");
    if (el.dataset.pos !== pos) {                                   // new place (other background) — step in again
      el.dataset.pos = pos;
      el.style.left = (P.x ?? 50) + "%"; el.style.bottom = (P.bottom ?? 10) + "%"; el.style.height = (P.h ?? 40) + "%";
      el.classList.remove("in"); void el.offsetWidth; el.classList.add("in");
    }
    return el;
  }
  function talk(el, text) {
    if (!el) return;
    el.classList.add("talking");
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("talking"), 900 + String(text || "").length * 60);
  }
  function act(el, name) {
    const ci = el && el.querySelector(".ci");
    if (!ci) return;
    ci.classList.remove("ci-happy", "ci-oops", "ci-hop"); void ci.offsetWidth;
    ci.classList.add("ci-" + name); if (name === "happy") ci.classList.add("ci-hop");
    clearTimeout(ci._a); ci._a = setTimeout(() => ci.classList.remove("ci-happy", "ci-oops", "ci-hop"), 1500);
  }
  // final-screen words of the step — once
  function words(api, st) {
    if (st._w) return;
    st._w = true;
    (st.words || []).forEach(w => api.word(w));
  }
  // ride overlays off (LED board, route map, speed streaks)
  function rideOff(api) {
    const sc = api.scene();
    if (!sc) return;
    sc.querySelectorAll(".q2bus-led, .q2bus-map, .q2bus-speed, .q2bus-ding").forEach(x => x.remove());
    sc.classList.remove("q2bus-moving");
  }

  // =====================================================
  // bus_talk: like "choice", but with a person in the scene and the best-match voice check
  // =====================================================
  Q2_STEPS.bus_talk = function (api) {
    const st = api.st, panel = api.panel;
    rideOff(api);
    const p = person(api, st.person);
    if (st.seller) talk(p, api.he(st.seller));
    panel.innerHTML = `<div class="q2-task">${api.esc(api.g(st.hint || "Ответь"))}</div><div class="q2-hint" id="q2Hint"></div><div class="q2-chips" id="q2Chips"></div>`;
    const chips = panel.querySelector("#q2Chips");
    const answers = st.answers || [];
    if (st._done) {                                                   // the step was redrawn after the answer — just go on
      api.hint("✓ " + api.he(st._done));
      api.next(500);
      return;
    }
    const done = (ans) => {
      if (st._done || !api.alive()) return;
      if (ans.ok === false) { api.mistake(); act(p, "oops"); sfx("wrong"); api.hint(api.g(ans.why || "Не совсем — подумай ещё 🙂"), true); return; }
      st._done = ans;
      api.good(10); setTimeout(() => act(p, "happy"), 250);
      if (ans.put) api.put(ans.put, false, st.upright);
      words(api, st);
      panel.querySelectorAll("button").forEach(b => b.disabled = true);
      api.hint("✓ " + api.he(ans));
      api.next(1300);
    };
    // the player SAYS the answer: with a microphone no ready phrases on the screen (wrong ones — never), only 🎤 and «💡 Подсказка»
    const mic = api.micOK();
    const shown = answers.filter(a => !mic || a.ok !== false);
    shown.forEach(ans => chips.appendChild(chip(api, ans, () => { api.speak(ans); if (!mic) done(ans); })));   // no microphone — the hint is the answer
    if (mic) {
      chips.hidden = true;
      panel.appendChild(api.micBtn(st.micLabel || "Нажми и скажи", alts => {
        const top = bestOf(api, alts, answers);
        if (top && top.tie) api.hint("Скажи фразу целиком 🙂", true);
        else if (top && (top.it.ok !== false || top.s >= 0.8)) done(top.it);   // a wrong answer — only when clearly said, not a recogniser slip
        else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
      }));
      panel.appendChild(hintBtn(api, chips, shown[0]));
      api.noSpeakLink();
    }
  };

  // a phrase button: Hebrew + transcription · translation
  function chip(api, it, onclick) {
    const c = document.createElement("button");
    c.className = "q2-chip"; c.type = "button";
    c.innerHTML = `<b dir="rtl">${api.esc(api.he(it))}</b><span>${api.esc(api.tr(it))} · ${api.esc(api.g(it.ru))}</span>`;
    c.onclick = onclick;
    return c;
  }
  // «💡 Подсказка» (as in quest2.js): 1st press — the beginning of the right phrase (a third of the words + transcription, sounds),
  // 2nd — the whole right phrase appears as a button (press — listen), then the player says it
  function hintBtn(api, chips, ok, again) {
    const hb = document.createElement("button");
    hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = "💡 Подсказка";
    let level = 0;
    hb.onclick = () => {
      if (!ok || !api.alive()) return;
      level++;
      const words = api.he(ok).split(/\s+/), trw = api.tr(ok).split(/\s+/);
      if (level === 1) {
        if (words.length > 1) {
          const n = Math.max(1, Math.ceil(words.length / 3));
          api.hint(`Начни так: ⁨${words.slice(0, n).join(" ")} …⁩ (${trw.slice(0, n).join(" ")} …)`);
          api.speak(words.slice(0, n).join(" "));
        } else {                                                        // one word (a stop): the start of the transcription + listen again
          const t = api.tr(ok);
          api.hint(`Начинается так: ${t.slice(0, Math.max(2, Math.ceil(t.length / 2)))}…`);
          if (again) again(); else api.speak(ok);
        }
        hb.textContent = "💡 Ещё подсказка";
      } else { chips.hidden = false; hb.remove(); api.hint("Послушай (нажми на фразу) — и скажи сам" + api.g("{m:}{f:а}") + " 🎤"); }
    };
    return hb;
  }

  // =====================================================
  // bus_ride: LED board + route map that fills in stop by stop + the stop bell
  // =====================================================
  function setBg(api, st, name) {
    const sc = api.scene(), u = api.pic(name);
    st.bg = name;                                                     // a redraw (render → setScene) keeps this background
    if (!sc || sc.dataset.bg === u) return;
    sc.dataset.bg = u; sc.style.backgroundImage = `url('${u}')`;
    sc.classList.remove("swap"); void sc.offsetWidth; sc.classList.add("swap");
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  Q2_STEPS.bus_ride = function (api) {
    const st = api.st, Q = api.Q, R = Q.route || [], panel = api.panel, sc = api.scene();
    if (!sc || R.length < 2) { api.next(0); return; }
    const S = Q._bus || (Q._bus = { named: {}, passed: { 0: true }, opts: {} });
    if (S.step !== st) { S.step = st; S.i = st.from || 1; S.phase = "name"; S.fresh = true; }
    if (S.phase === "done" || S.phase === "stop") { rideOff(api); panel.innerHTML = `<div class="q2-hint" id="q2Hint">✓</div>`; api.next(400); return; }   // redrawn after the end
    const to = Math.min(st.to || R.length - 1, R.length - 1);
    const target = R.find(r => r.target) || R[R.length - 1];
    const stop = R[S.i];
    person(api, null);
    words(api, st);
    setBg(api, st, stop.bg || st.bg);
    api.root.classList.add("q2-filling");                               // smaller scene: options and 🎤 fit on the screen
    const redo = () => { if (api.alive()) Q2_STEPS.bus_ride(api); };    // next stop / next phase: rebuild from the state

    // ---- overlays: speed streaks, LED board, route map (rebuilt from the state on every call)
    if (!sc.querySelector(".q2bus-speed")) { const s = document.createElement("div"); s.className = "q2bus-speed"; sc.appendChild(s); }
    let led = sc.querySelector(".q2bus-led"), map = sc.querySelector(".q2bus-map");
    if (!led) { led = document.createElement("button"); led.type = "button"; led.className = "q2bus-led"; led.setAttribute("aria-label", "Послушать табло"); sc.appendChild(led); }
    if (!map) { map = document.createElement("div"); map.className = "q2bus-map"; sc.appendChild(map); }
    const N = R.length + 1;                                             // + one more circle after the centre: the bus goes on
    const pos = (k) => 90 - k * (80 / (N - 1));                         // right → left: the map reads like Hebrew
    const mid = pos(S.i - 1) + (pos(S.i) - pos(S.i - 1)) * 0.55;
    map.innerHTML = `<div class="q2bus-line"></div>` + Array.from({ length: N }, (_, k) => {
      const lb = k === 0 ? "🏠" : k >= R.length ? "" : S.named[k] ? api.he(R[k]) : "?";
      const cls = k >= R.length ? " end" : S.passed[k] ? " on" : k === S.i ? " next" : "";
      return `<i class="q2bus-st${cls}" style="left:${pos(k)}%"></i><span class="q2bus-lb${S.named[k] ? " named" : ""}" dir="rtl" style="left:${pos(k)}%">${api.esc(lb)}</span>`;
    }).join("") + `<img class="q2bus-bus" src="${api.pic("bus_icon")}" alt="" style="left:${S.phase === "name" && !S.named[S.i] ? pos(S.i - 1) : mid}%">`;
    const bus = map.querySelector(".q2bus-bus");
    if (S.phase === "name") later(api, 60, () => { bus.style.left = mid + "%"; });   // the bus leaves the last stop

    const ledShow = (mode) => {
      const name = mode === "stop" ? "עוֹצֵר" : S.named[S.i] ? api.he(stop) : "• • •";
      led.className = "q2bus-led" + (mode === "stop" ? " stop" : "");
      led.innerHTML = `<small dir="rtl">${mode === "stop" ? "🔔" : "הַתַּחֲנָה הַבָּאָה"}</small><b dir="rtl" class="${S.named[S.i] || mode === "stop" ? "" : "hid"}">${name}</b><span class="q2bus-spk">${window.SPK || "🔊"}</span>`;
    };
    const announce = () => { if (!document.querySelector(".q2-mic.on")) api.speak(stop.ann || stop); };
    led.onclick = () => { if (S.phase !== "stop") { api.hush(); api.speak(stop.ann || stop); } };

    // ---- the bus reaches stop i (passing by or stopping): bus at the circle, circle green
    const arrive = (then) => {
      S.passed[S.i] = true;
      bus.style.left = pos(S.i) + "%";
      const c = map.querySelectorAll(".q2bus-st")[S.i];
      if (c) { c.classList.remove("next"); c.classList.add("on"); }
      later(api, 1300, () => { sc.classList.remove("q2bus-moving"); sfx("pop"); then(); });
    };

    // ---- phase 1: listen to the board and SAY the stop name
    function phaseName() {
      sc.classList.add("q2bus-moving");
      ledShow();
      if (!S.opts[S.i]) {                                               // 3 options: the right one + 2 others (stable on redraw)
        const pool = R.slice(1).concat(Q.places || []).filter(r => r.he && api.heNorm(api.he(r)) !== api.heNorm(api.he(stop)));
        S.opts[S.i] = shuffle([stop].concat(shuffle(pool.slice()).slice(0, 2)));
      }
      const opts = S.opts[S.i];
      panel.innerHTML = `<div class="q2-task">${api.esc(api.g(st.task || (api.micOK() ? "Слушай табло 🔊 и скажи вслух: какая следующая остановка?" : "Слушай табло 🔊 Какая следующая остановка?")))}</div>
        <div class="q2-hint" id="q2Hint">${S.fresh ? api.esc(api.g(st.start || "Поехали! 🚌")) : ""}</div><div class="q2-chips" id="q2Chips"></div>`;
      const chips = panel.querySelector("#q2Chips");
      let over = false;
      const said = (it) => {
        if (over || !api.alive()) return;
        if (it !== stop) {                                              // heard it wrong — listen again
          api.mistake(); sfx("wrong");
          api.hint(api.g(st.wrongName || "Нет, табло сказало другое. Послушай ещё раз 🔊"), true);
          later(api, 900, announce);
          return;
        }
        over = true;
        S.named[S.i] = true; S.phase = "decide";
        api.good(5); sfx("right"); buzz("light");
        api.word({ he: stop.he, tr: stop.tr, ru: stop.ru });
        ledShow();                                                      // the name lights up on the board…
        const lb = map.querySelectorAll(".q2bus-lb")[S.i];             // …and is written on the map
        if (lb) { lb.textContent = api.he(stop); lb.classList.add("named", "new"); }
        panel.querySelectorAll("button").forEach(b => b.disabled = true);
        api.hint("✓ " + api.he(stop) + " — " + api.g(stop.ru));
        later(api, 1200, phaseDecide);
      };
      const mic = api.micOK();
      if (!mic) opts.forEach(it => chips.appendChild(chip(api, it, () => { api.speak(it); said(it); })));   // no microphone — pick what you heard
      else {
        // with a microphone: no list — the player hears the name and SAYS it; «💡» → start of the name, then the name itself
        chips.appendChild(chip(api, stop, () => api.speak(stop)));
        chips.hidden = true;
        const all = R.slice(1).concat(Q.places || []);
        panel.appendChild(api.micBtn(st.micLabel || "Скажи остановку", alts => {
          const top = bestOf(api, alts, all);
          if (top && top.it === stop) said(stop);
          else if (top && top.s >= 0.8) said(top.it);                  // clearly another stop — a real mistake
          else { api.voiceMiss(); api.hint(`Я услышал «${alts[0] || "…"}». Нажми 🔊 на табло, послушай — и скажи ещё раз`, true); }
        }));
        panel.appendChild(hintBtn(api, chips, stop, () => { api.hush(); api.speak(stop.ann || stop); }));
        api.noSpeakLink();
      }
      later(api, S.fresh ? 1500 : 900, announce);
      S.fresh = false;
    }

    // ---- phase 2: 🔔 stop here — or go on
    function phaseDecide() {
      if (!api.alive()) return;
      sc.classList.add("q2bus-moving");
      ledShow();
      panel.innerHTML = `<div class="q2-task">Тебе выходить на <bdi dir="rtl">${api.esc(api.he(stop))}</bdi>?</div>
        <div class="q2bus-need">Тебе нужно: <bdi dir="rtl">${api.esc(api.he(target))}</bdi> — ${api.esc(api.g(target.ru))}</div>
        <div class="q2-hint" id="q2Hint"></div>
        <div class="q2bus-go"><button class="q2bus-bell" type="button"><img src="${api.pic("bell")}" alt=""><span>Нажать 🔔 «Стоп»</span></button>
        <button class="q2bus-on" type="button"><span class="q2bus-arrow">➜</span><span>Еду дальше</span></button></div>`;
      const bell = panel.querySelector(".q2bus-bell"), on = panel.querySelector(".q2bus-on");
      let over = false;
      bell.onclick = () => {
        if (over || !api.alive()) return;
        if (!stop.target) {                                             // too early — not the centre yet
          api.mistake(); sfx("wrong");
          bell.classList.remove("shake"); void bell.offsetWidth; bell.classList.add("shake");
          api.hint(api.g(Q.notYet || "Это ещё не твоя остановка!"), true);
          return;
        }
        over = true; S.phase = "stop";
        panel.querySelectorAll("button").forEach(b => b.disabled = true);
        ledShow("stop"); sfx("pop"); buzz("success");
        const d = document.createElement("img"); d.className = "q2bus-ding"; d.src = api.pic("bell"); d.alt = ""; sc.appendChild(d);
        api.good(10);
        api.hint("🔔 Табло: «оцер» — автобус остановится");
        arrive(() => { api.hint(api.g(st.doneHint || "✓ Приехали!")); sfx("right"); api.next(1400); });
      };
      on.onclick = () => {
        if (over || !api.alive()) return;
        if (stop.target) {                                              // would ride past the stop
          api.mistake(); sfx("wrong");
          api.hint(api.g(Q.missStop || "Стой! Это же твоя остановка — жми 🔔"), true);
          return;
        }
        over = true;
        panel.querySelectorAll("button").forEach(b => b.disabled = true);
        api.hint("➜ Едем дальше");
        arrive(() => {
          if (S.i >= to) { S.phase = "done"; api.next(400); return; }  // the end of this part of the ride
          S.i++; S.phase = "name";
          redo();
        });
      };
    }

    if (S.phase === "decide") phaseDecide(); else phaseName();
  };

  window.q2BusTest = { score, bestOf, strip };                          // check speech matching in the console
})();
