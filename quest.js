// =====================================================
// КВЕСТЫ И СЦЕНЫ-ДИАЛОГИ.
// Экран делится на две части:
//   сверху — картинка (такси едет / шаурмичная), реплики выскакивают пузырями над героями;
//   снизу — панель с вариантами ответа.
// Картинку рисует scene.js (createStage), здесь — только логика разговора.
// Тексты с {m:...}{f:...} подстраиваются под пол игрока.
// =====================================================
const questView = document.getElementById("quest");
let quest = null, qStep = 0, qMistakes = 0, qBag = [], qHinted = false;
let stage = null;            // текущая картинка-сцена
let qCombo = 0, qPoints = 0; // огоньки и очки в квесте

// Очки за квест: идеальный квест = в 1,5 раза больше, чем идеальный урок (10 заданий, ×2)
const QUEST_RATIO = 1.5;
function perfectRaw(n) { let s = 0; for (let i = 1; i <= n; i++) s += FIRE[fireLevel(i)].points; return s; }
// Сколько «ответов» в квесте: шаги-диалоги + каждый товар из списка покупок
function questSize() { return quest.steps.reduce((n, st) => n + (st.shop ? st.shop.list.length : 1), 0); }
function questFactor() { return QUEST_RATIO * perfectRaw(10) / perfectRaw(questSize()); }
function updateQuestFire(bump) {
  const box = document.getElementById("stFire");
  if (!box) return;
  if (qCombo < 1) { box.innerHTML = ""; box.className = "combo st-fire"; return; }
  box.className = "combo st-fire lvl" + fireLevel(qCombo);
  box.innerHTML = `${flameSVG(fireLevel(qCombo))}<span>${qCombo}</span>`;
  if (bump) { box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
}
let stageToken = 0;          // защита от «старых» таймеров, если ушли со сцены

// Названия того, что собираем, берутся из файла квеста (поле "items")
function itemName(x) { return (quest && quest.items && quest.items[x]) || x; }
// Уровень, к которому относится квест (ищем в course.json по полю "quest")
function questLevel(qid) {
  if (typeof course === "undefined" || !course) return null;
  for (const ch of course.chapters) for (let i = 0; i < ch.levels.length; i++)
    if (ch.levels[i].quest && "q-" + ch.levels[i].quest === qid) return { ch, lvl: ch.levels[i], n: i + 1 };
  return null;
}

// --- Общие помощники ---
function openQuestSection() {
  stopHomeBird();
  closeStage();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "quest");
  if (tg && tg.BackButton) tg.BackButton.show();
}
function closeStage() {
  stageToken++;
  if (stage) { stage.destroy(); stage = null; }
}
// Каркас экрана: картинка сверху, ответы снизу
function renderStageShell(place, title, icon) {
  questView.innerHTML = `
    <div class="st-wrap">
      <div class="st-view" id="stView">
        <div class="st-title"><span>${icon}</span>${title}</div>
        <button class="st-order" id="stOrder" hidden>🧾 Мой заказ</button>
        <div class="combo st-fire" id="stFire"></div>
        <div class="q-tray" id="qTray" hidden></div>
        <div class="st-tap" id="stTap">нажми, чтобы дальше ›</div>
      </div>
      <div class="st-panel">
        <div class="st-hint" id="qHint" hidden></div>
        <div class="q-options" id="qOpts"></div>
      </div>
    </div>`;
  const make = place === "makolet" && window.createStore ? window.createStore : window.createStage;
  stage = make(document.getElementById("stView"), { gender: profile ? profile.gender : "m", profile, place });
  return stageToken;
}
// Пауза: ждём время ИЛИ нажатие на картинку (чтобы читающие быстро не скучали)
function waitOrTap(ms, token) {
  return new Promise(res => {
    const view = document.getElementById("stView");
    const tap = document.getElementById("stTap");
    const t2 = setTimeout(() => tap && tap.classList.add("show"), 2500);
    const done = () => { clearTimeout(t1); clearTimeout(t2); if (tap) tap.classList.remove("show"); if (view) view.onclick = null; if (token === stageToken) res(); };
    const t1 = setTimeout(done, ms);
    if (view) view.onclick = done;
  });
}
const readTime = (text) => 2000 + String(text).replace(/<[^>]+>/g, "").length * 60;
const nameTag = (n) => `<div class="hs-who">${n}</div>`;

// Реплика друга по-русски
function friendSays(text) { stage.say("friend", nameTag(friendName()) + `<div>${text}</div>`); }
// Реплика игрока
function meSays(html) { stage.say("me", nameTag(profile && profile.name ? profile.name : "Я") + html); }

// =====================================================
// СЦЕНА В ТАКСИ (перед уроками первого уровня)
// Сначала (один раз) — кино прилёта из второго чата.
// =====================================================
function showTaxi(onDone) {
  openQuestSection();
  const run = () => fetch(`content/${COURSE_LANG}/scenes/taxi.json`).then(r => r.json()).then(sc => playTaxi(sc, onDone));
  if (window.playArrivalScene && !store.get("arrivalSeen", false)) {
    questView.innerHTML = `<div id="sceneBox"></div>`;
    window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: "arrival" }, () => {
      store.set("arrivalSeen", true); run();
    });
  } else run();
}

async function playTaxi(sc, onDone) {
  const token = renderStageShell("taxi", sc.title, "🚕");
  const opts = document.getElementById("qOpts");
  const alive = () => token === stageToken;
  await waitOrTap(1500, token);
  // Все реплики, кроме последней, — по очереди; последняя (вопрос) остаётся, пока игрок выбирает
  const lines = sc.lines;
  for (let k = 0; k < lines.length - 1; k++) { if (!alive()) return; friendSays(g(lines[k].ru)); await waitOrTap(readTime(g(lines[k].ru)), token); }
  if (!alive()) return;
  friendSays(g(lines[lines.length - 1].ru));
  await waitOrTap(1200, token); if (!alive()) return;
  sc.choice.forEach(ch => {
    const b = document.createElement("button");
    b.className = "option q-opt"; b.textContent = g(ch.ru);
    b.onclick = async () => {
      opts.innerHTML = "";
      playSound("pop");
      meSays(`<div>${g(ch.ru)}</div>`);
      await waitOrTap(2200, token); if (!alive()) return;
      friendSays(g(ch.reply)); await waitOrTap(readTime(g(ch.reply)), token);
      for (const l of sc.after) { if (!alive()) return; friendSays(g(l.ru)); await waitOrTap(readTime(g(l.ru)), token); }
      if (!alive()) return;
      opts.innerHTML = `<button class="btn blue">${sc.button}</button>`;
      opts.firstChild.onclick = () => { store.set("taxiSeen", true); closeStage(); onDone(); };
    };
    opts.appendChild(b);
  });
}

// =====================================================
// КВЕСТ «ПЕРВАЯ ШАУРМА»
// =====================================================
startQuest.preludeShown = {};
function startQuest(id) {
  openQuestSection();
  questView.innerHTML = `<div class="q-loading">Загрузка…</div>`;
  fetch(`content/${COURSE_LANG}/quests/${id}.json`)
    .then(r => r.json())
    .then(d => {
      // Перед первым прохождением — кусочек кино (поле "prelude" в файле квеста)
      const pre = d.prelude;
      if (pre && window.playArrivalScene && !startQuest.preludeShown[id] && !(pre.once && store.get("quest_" + d.id, false))) {
        startQuest.preludeShown[id] = true;
        questView.innerHTML = `<div id="sceneBox"></div>`;
        window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: pre.scene }, () => startQuest(id));
        return;
      }
      quest = d; qStep = 0; qMistakes = 0; qBag = []; qCombo = 0; qPoints = 0;
      const token = renderStageShell(d.place || "counter", d.placeTitle || d.title, d.icon || "⭐");
      // Список заказа — по кнопке, а главное видно на прилавке
      const ob = document.getElementById("stOrder"), tray = document.getElementById("qTray");
      ob.hidden = false;
      ob.onclick = (e) => { e.stopPropagation(); tray.hidden = !tray.hidden; };
      tray.onclick = (e) => { e.stopPropagation(); tray.hidden = true; };
      setTimeout(() => { if (token === stageToken) showQuestStep(); }, (stage && stage.introMs) ? stage.introMs + 300 : 1500);
    })
    .catch(() => { questView.innerHTML = `<p class="task">Не удалось загрузить квест 😕</p>`; });
}

// Реплика продавца: иврит + транскрипция + кнопки «послушать» и «перевод»
function sellerHTML(s) {
  const he = g(s.he), tr = g(s.tr);
  const id = "ru" + Math.floor(Math.random() * 1e6);
  return `${nameTag("Продавец")}<div class="he" dir="rtl">${he}</div>
    <div class="tr">${tr}</div>
    <div class="q-tools">
      <button class="q-tool" onclick="event.stopPropagation();speak(${JSON.stringify(he).replace(/"/g, "&quot;")})">🔊</button>
      <button class="q-tool" onclick="event.stopPropagation();document.getElementById('${id}').hidden=false;this.remove()">Перевод</button>
    </div>
    <div class="ru" id="${id}" hidden>${g(s.ru)}</div>`;
}

function showQuestStep() {
  if (qStep >= quest.steps.length) { finishQuest(); return; }
  const st = quest.steps[qStep];
  qHinted = false;
  if (st.shop) { startShopping(st); return; }
  document.getElementById("qHint").hidden = true;
  if (st.seller) { stage.say("seller", sellerHTML(st.seller)); speak(g(st.seller.he), { audio: st.seller.audio }); }
  else if (st.friend) friendSays(g(st.friend));

  const opts = document.getElementById("qOpts");
  opts.innerHTML = "";
  const token = stageToken;
  setTimeout(() => { if (token === stageToken) addQuestOptions(st, opts); }, 1100);
}
function addQuestOptions(st, opts) {
  shuffle([...st.options]).forEach(o => {
    const b = document.createElement("button");
    b.className = "option q-opt";
    b.innerHTML = `<span class="he" dir="rtl">${g(o.he)}</span><span class="tr">${g(o.tr)}</span>`;
    b.onclick = () => chooseOption(b, o, st);
    opts.appendChild(b);
  });
}

function chooseOption(btn, o, st) {
  const token = stageToken;
  if (o.ok) {
    document.querySelectorAll(".q-opt").forEach(b => b.disabled = true);
    btn.classList.add("right");
    playSound("right"); vibrate("success");
    document.getElementById("qHint").hidden = true;
    // огоньки, как в уроке
    const before = fireLevel(qCombo);
    qCombo++;
    const lvl = fireLevel(qCombo);
    qPoints += FIRE[lvl].points;
    updateQuestFire(true);
    if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
    meSays(`<div class="he" dir="rtl">${g(o.he)}</div><div class="tr2"><span class="tr">${g(o.tr)} — </span>${g(o.ru)}</div>`);
    speak(g(o.he), { audio: o.audio });
    if (o.add) addToTray([].concat(o.add));
    qStep++;
    setTimeout(() => { if (token !== stageToken) return; document.getElementById("qOpts").innerHTML = ""; stage.hide(); }, 2400);
    setTimeout(() => { if (token !== stageToken) return; showQuestStep(); }, 3000);
  } else {
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    btn.disabled = true;
    qMistakes++;
    if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
    qCombo = 0; updateQuestFire(false);
    playSound("wrong"); vibrate("error");
    if (!qHinted) {
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${st.hint}`;
      h.hidden = false; qHinted = true;
    }
  }
}

// =====================================================
// ПОКУПКИ ПО СПИСКУ (маколет): список на иврите, ходишь налево/направо и нажимаешь товары
// =====================================================
const VIEW_NAMES = ["Овощи и фрукты", "Касса и хлеб", "Холодильник"];
function startShopping(st) {
  const token = stageToken, sh = st.shop;
  const need = sh.list.map(x => x.item), got = [];
  friendSays(g(sh.intro));
  const opts = document.getElementById("qOpts");
  opts.innerHTML = `
    <div class="mk-list">${sh.list.map(x => `<button class="mk-chip" data-item="${x.item}"><span class="he" dir="rtl">${g(x.he)}</span><span class="tr">${g(x.tr)}</span></button>`).join("")}</div>
    <div class="mk-where" id="mkWhere">${VIEW_NAMES[stage.current()]}</div>
    <div class="mk-nav"><button class="btn ghost" id="mkL">◀ Налево</button><button class="btn ghost" id="mkR">Направо ▶</button></div>`;
  opts.querySelectorAll(".mk-chip").forEach(c => c.onclick = () => {
    const x = sh.list.find(y => y.item === c.dataset.item);
    speak(g(x.he), { audio: x.audio });
  });
  const go = (d) => {
    stage.look(stage.current() + d);
    const i = stage.current();
    document.getElementById("mkWhere").textContent = VIEW_NAMES[i];
    document.getElementById("mkL").disabled = i === 0;
    document.getElementById("mkR").disabled = i === stage.views - 1;
    stage.hide();
  };
  document.getElementById("mkL").onclick = () => go(-1);
  document.getElementById("mkR").onclick = () => go(1);
  stage.onSwipe = go;
  go(0);
  stage.onPick = (kind, el) => {
    if (token !== stageToken) return;
    const x = sh.list.find(y => y.item === kind);
    if (x && !got.includes(kind)) {
      got.push(kind);
      stage.pick(el);
      const before = fireLevel(qCombo);
      qCombo++;
      const lvl = fireLevel(qCombo);
      qPoints += FIRE[lvl].points;
      updateQuestFire(true);
      if (lvl > before) setTimeout(() => showMilestone(lvl), 400);
      playSound("right"); vibrate("success");
      speak(g(x.he), { audio: x.audio });
      document.getElementById("qHint").hidden = true;
      opts.querySelector(`.mk-chip[data-item="${kind}"]`).classList.add("got");
      addToTray([kind], true);
      if (got.length === need.length) {
        stage.onPick = null; stage.onSwipe = null;
        setTimeout(() => {
          if (token !== stageToken) return;
          friendSays(g(sh.done));
          opts.innerHTML = "";
          setTimeout(() => {
            if (token !== stageToken) return;
            stage.look(1); stage.hide();
            // покупки ложатся на прилавок
            got.forEach((k, i) => setTimeout(() => { if (token === stageToken) stage.food(k); }, 900 + i * 350));
            qStep++;
            setTimeout(() => { if (token === stageToken) showQuestStep(); }, 1300 + got.length * 350);
          }, 1800);
        }, 900);
      }
    } else {
      // не то: уже взяли или этого нет в списке
      if (x) { showToast("Это уже в корзине 🙂"); return; }
      stage.shake(el);
      qMistakes++;
      if (qCombo >= 5) showToast(`Серия из ${qCombo} прервалась — начнём новую!`);
      qCombo = 0; updateQuestFire(false);
      playSound("wrong"); vibrate("error");
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${(sh.wrong && sh.wrong[kind]) ? g(sh.wrong[kind]) : st.hint}`;
      h.hidden = false;
    }
  };
}

// Ингредиенты появляются на подносе (поверх картинки)
function addToTray(items, noStage) {
  const tray = document.getElementById("qTray");
  items.forEach((it, k) => setTimeout(() => {
    if (!tray.isConnected) return;
    qBag.push(it);
    const el = document.createElement("div");
    el.className = "q-ing";
    el.innerHTML = `<img src="assets/ing-${it}.png" alt=""><span>${itemName(it)}</span>`;
    tray.appendChild(el);
    if (stage && stage.food && !noStage) stage.food(it);
    playSound("pop");
  }, k * 250));
}

// --- Финал ---
function finishQuest() {
  const token = stageToken;
  const o = quest.outro;
  stage.say("seller", sellerHTML(o.seller)); speak(g(o.seller.he), { audio: o.seller.audio });
  document.getElementById("qOpts").innerHTML = "";
  const perfect = qMistakes === 0;
  const pts = Math.round(qPoints * questFactor() * (perfect ? 2 : 1));
  store.set(todayKey(), store.get(todayKey(), 0) + pts);
  store.set("quest_" + quest.id, true);
  if (perfect) store.set("questGold_" + quest.id, true);
  // итог уровня
  const where = questLevel(quest.id);
  const lvlInfo = where ? where.lvl : null;
  const goldN = lvlInfo ? lvlInfo.lessons.filter(id => perfectLessons().includes(id)).length : 0;
  const totalN = lvlInfo ? lvlInfo.lessons.length : 7;
  const fin = quest.final || {};
  const rule = (fin.imgIf || []).find(r => qBag.includes(r.has));
  const finalImg = rule ? rule.img : (fin.img || "gift-shawarma");
  const order = qBag.map(itemName).join(", ");
  // продавец заворачивает шаурму и протягивает тебе
  setTimeout(() => { if (token === stageToken && stage) stage.wrap(finalImg); }, 2600);
  setTimeout(() => {
    if (token !== stageToken) return;
    closeStage();
    playSound("finish"); vibrate("success");
    questView.innerHTML = `
      <div class="q-final">
        <img class="q-final-img" src="assets/${finalImg}.png" alt="${fin.alt || quest.title}">
        <h2 class="done${perfect ? " gold" : ""}">${perfect ? "Идеальный квест! 🏆" : "Квест пройден! 🎉"}</h2>
        ${lvlInfo && levelGold(lvlInfo) ? `<div class="lvl-gold">🏅 Уровень золотой! ${where.ch.levels.every(levelGold) ? "Все уровни главы золотые 🥇" : `Ещё ${where.ch.levels.length - where.ch.levels.filter(levelGold).length} — и золотая медаль главы 🥇`}</div>` : ""}
        <div class="lvl-done">
          <div class="lvl-badge">🏁</div>
          <div><b>Уровень ${where ? where.n : 1} «${lvlInfo ? lvlInfo.title : quest.title}» пройден!</b><br>
          <span>Золотых уроков: ★ ${goldN} из ${totalN}${perfect ? " · квест золотой 🏆" : ""}</span></div>
        </div>
        <p class="task">Твой заказ: ${order}</p>
        <div class="points-row" style="animation-delay:.3s">
          <div class="pts-big">+${pts}</div>
          <div class="pts-label">очков за квест${perfect ? " (×2)" : ""}<br>Ошибок: ${qMistakes}</div>
        </div>
        <div class="q-friend-say"><b>${friendName()}:</b> ${g(qMistakes ? o.friend_mistakes : o.friend)}</div>
        <button class="btn blue" onclick="showPath()">К уровню</button>
        <button class="btn ghost" onclick="startQuest('${quest.id.replace("q-", "")}')">Пройти ещё раз</button>
      </div>`;
    window.scrollTo(0, 0);
  }, 6600);
}
