// =====================================================
// КАТ-СЦЕНЫ (23.11): короткая сценка-комикс перед квестом — связывает историю между уровнями.
// Тексты — content/he/scenes/scenes.json: { scenes: { <квест>: { frames: [ { bg, chars: [id…], who, line: {he,tr,ru}, say } ] } } }
//   bg — фон (картинка квеста), chars — люди-картинки (chars.js), who — кто говорит (рот двигается, может быть {m:}{f:}),
//   line — реплика на иврите (звучит, транскрипция, перевод), say — подпись рассказчика по-русски.
// Камера плавно наезжает на фон; нажатие — дальше; «Пропустить» — сразу к квесту. Показывается один раз (store "scenesSeen").
// Когда Codex перерисует кадры кат-сцен — их можно ставить в bg (кадры 1024×1536).
// =====================================================
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let DATA = null;
  const NAMES = { david: "Давид", tzila: "Циля" };

  // есть ли сценка у квеста и не видел ли её игрок → then(есть/нет)
  function load() {
    return DATA ? Promise.resolve(DATA) : fetch(`content/${COURSE_LANG}/scenes/scenes.json`).then(r => r.json()).then(j => (DATA = j.scenes || {}));
  }

  // playCutscene(id, done, force) — force: показать, даже если уже видел
  window.playCutscene = function (id, done, force) {
    const seen = store.get("scenesSeen", []);
    if (!force && seen.includes(id)) { done(); return; }
    load().then(S => {
      const sc = S[id];
      if (!sc || !sc.frames || !sc.frames.length) { done(); return; }
      run(id, sc, () => { if (!seen.includes(id)) store.set("scenesSeen", seen.concat(id)); done(); });
    }).catch(() => done());
  };

  function run(id, sc, done) {
    const old = document.getElementById("csPlay"); if (old) old.remove();
    const w = document.createElement("div");
    w.id = "csPlay"; w.className = "cs-wrap";
    // сцена = фон 2:3 + люди В ПРОЦЕНТАХ ОТ ФОНА (пропорции не плывут на разных экранах); камера (.cs-cam) наезжает на фон вместе с людьми
    w.innerHTML = `<div class="cs-stage"><div class="cs-cam" id="csCam"><div class="cs-bg" id="csBg"></div><div class="cs-chars" id="csChars"></div></div></div>
      <div class="cs-top"><div class="cs-dots" id="csDots"></div><button class="cs-skip" id="csSkip" type="button">Пропустить ›</button></div>
      <div class="cs-head"><div class="cs-bubble" id="csBubble" hidden></div><div class="cs-say" id="csSay" hidden></div></div>
      <div class="cs-tap">нажми, чтобы продолжить</div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add("show"));
    let i = -1, finished = false, lastBg = "";
    const hushIt = () => {                                         // заглушить реплику (голос из файла или голос устройства)
      try { if (typeof ttsReq !== "undefined") ttsReq++; if (typeof ttsPlayer !== "undefined" && ttsPlayer) ttsPlayer.pause(); } catch (e) {}
      try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
    };
    const end = () => {
      if (finished) return; finished = true; hushIt();
      w.classList.remove("show"); setTimeout(() => { w.remove(); done(); }, 260);
    };
    w._end = end;
    w._stop = () => { finished = true; hushIt(); };                 // «Назад» Telegram: закрыть без квеста
    const show = () => {
      const f = sc.frames[i];
      document.getElementById("csDots").innerHTML = sc.frames.map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("");
      // фон и камера: "cam": [x %, y %, приближение] — куда наезжает камера; при смене фона/камеры — заново плавный наезд
      const bg = document.getElementById("csBg"), cam = document.getElementById("csCam");
      // камера не должна показывать края фона: точку центра держим так, чтобы экран оставался внутри картинки
      const st = w.querySelector(".cs-stage"), s = Math.max(1, (f.cam || [])[2] || 1);
      const fx = Math.min(1, w.clientWidth / (st.clientWidth || 1)), fy = Math.min(1, w.clientHeight / (st.clientHeight || 1));
      const clampC = (v, fr) => Math.max(50 * fr / s, Math.min(100 - 50 * fr / s, v));
      // по высоте: если в кадре люди — камера держит их ступни на 90 % высоты экрана (на любом экране ноги не уходят вниз)
      const feet = Math.max(0, ...(f.chars && f.chars.length ? (f.pos || []).map(p => p[1]) : []));
      const cy = feet ? feet - 40 * fy / s : ((f.cam || [])[1] || 50);
      const c3 = f.cam || feet ? [clampC((f.cam || [])[0] || 50, fx), clampC(cy, fy), s] : [50, 50, 1], camKey = (f.bg || lastBg) + c3.join();
      if (f.bg) bg.style.backgroundImage = `url('${f.bg}')`;
      if (camKey !== lastBg) {
        lastBg = camKey;
        cam.style.setProperty("--cx", c3[0] + "%"); cam.style.setProperty("--cy", c3[1] + "%"); cam.style.setProperty("--cs", c3[2]);
        cam.classList.remove("zoom"); void cam.offsetWidth; cam.classList.add("zoom");
      }
      // люди: "pos": [[x центра %, низ ступней %, рост %], …] — в процентах от фона, по перспективе этого фона
      const who = f.who ? g(f.who) : "";
      const ids = (f.chars || []).filter(c => window.HirbisChars && HirbisChars.has(c));
      const box = document.getElementById("csChars");
      // при смене фона люди входят в кадр (слева — слева, справа — справа); на том же фоне — остаются на месте
      const entering = box.dataset.bg !== (f.bg || "");
      box.dataset.bg = f.bg || "";
      box.innerHTML = ids.map((c, k) => {
        const p = (f.pos || [])[k] || [ids.length === 1 ? 50 : 26 + k * 48, 98, 45];
        return `<div class="cs-ch${c === who ? " speak" : ""}${entering ? (p[0] < 50 ? " in-l" : " in-r") : ""}" style="left:${p[0]}%;bottom:${100 - p[1]}%;height:${p[2]}%">${charImgHTML(c)}</div>`;
      }).join("");
      // жесты: "acts": [жест для каждого] — wave, point, happy, think, listen, surprised, oops. Говорящий сначала говорит (кивает), потом жест.
      const ACT_OK = /^(wave|point|happy|think|listen|surprised|oops)$/;
      [...box.querySelectorAll(".cs-ch")].forEach((el, k) => {
        const ci = el.querySelector(".ci"); if (!ci) return;
        const act = (f.acts || [])[k], has = (a) => a && ACT_OK.test(a) && (HirbisChars.CHARS[ids[k]] || []).includes(a);
        const doAct = () => { if (!has(act) || !ci.isConnected) return; ci.classList.add("ci-" + act); setTimeout(() => ci.classList.remove("ci-" + act), 2400); };
        if (ids[k] === who) { ci.classList.add("talking"); setTimeout(() => { ci.classList.remove("talking"); doAct(); }, 1500); }
        else setTimeout(doAct, entering ? 700 : 250 + k * 300);
      });
      // реплика
      const bub = document.getElementById("csBubble");
      if (f.line) {
        bub.hidden = false;
        bub.innerHTML = `<button class="cs-spk" type="button" aria-label="Послушать">${window.SPK || "🔊"}</button><div class="cs-who">${esc(NAMES[who] || "")}</div><div class="cs-he" dir="rtl">${esc(g(f.line.he))}</div><div class="cs-tr tr">${esc(g(f.line.tr || ""))}</div><div class="cs-ru">${esc(g(f.line.ru || ""))}</div>`;
        bub.classList.remove("in"); void bub.offsetWidth; bub.classList.add("in");
        speak(g(f.line.he));
      } else bub.hidden = true;
      // подпись рассказчика
      const say = document.getElementById("csSay");
      if (f.say) { say.hidden = false; say.textContent = g(f.say); say.classList.remove("in"); void say.offsetWidth; say.classList.add("in"); }
      else say.hidden = true;
    };
    const next = () => { if (finished) return; i++; if (i >= sc.frames.length) { end(); return; } if (typeof playSound === "function" && i > 0) playSound("pop"); show(); };
    // нажатие где угодно — дальше; 🔊 в облачке — послушать ещё раз
    w.onclick = (e) => { if (e.target.closest("#csSkip")) return; if (e.target.closest(".cs-spk") && sc.frames[i] && sc.frames[i].line) { speak(g(sc.frames[i].line.he)); return; } next(); };
    document.getElementById("csSkip").onclick = (e) => { e.stopPropagation(); end(); };
    next();
  }
})();
