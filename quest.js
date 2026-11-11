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
let stageToken = 0;          // защита от «старых» таймеров, если ушли со сцены

// Названия ингредиентов для итогового заказа
const ING_NAMES = {
  pita: "пита", lafa: "лафа", "meat-turkey": "индейка", "meat-chicken": "курица", "meat-veal": "телятина",
  salad: "салат", hummus: "хумус", tahini: "тхина", spicy: "острое", chips: "картошка фри"
};

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
        <div class="q-tray" id="qTray" hidden></div>
        <div class="st-tap" id="stTap">нажми, чтобы дальше ›</div>
      </div>
      <div class="st-panel">
        <div class="st-hint" id="qHint" hidden></div>
        <div class="q-options" id="qOpts"></div>
      </div>
    </div>`;
  stage = window.createStage(document.getElementById("stView"), { gender: profile ? profile.gender : "m", profile, place });
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
function startQuest(id) {
  // Перед первым квестом — кусочек кино: такси подъезжает к шаурмичной
  if (id === "shawarma" && window.playArrivalScene && !store.get("quest_q-shawarma", false) && !startQuest.kinoShown) {
    startQuest.kinoShown = true;
    openQuestSection();
    questView.innerHTML = `<div id="sceneBox"></div>`;
    window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: "shop" }, () => startQuest(id));
    return;
  }
  openQuestSection();
  questView.innerHTML = `<div class="q-loading">Загрузка…</div>`;
  fetch(`content/${COURSE_LANG}/quests/${id}.json`)
    .then(r => r.json())
    .then(d => {
      quest = d; qStep = 0; qMistakes = 0; qBag = [];
      const token = renderStageShell("shop", "Шаурмичная", "🌯");
      document.getElementById("qTray").hidden = false;
      setTimeout(() => { if (token === stageToken) showQuestStep(); }, 1500);
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
    meSays(`<div class="he" dir="rtl">${g(o.he)}</div><div class="tr">${g(o.tr)} — ${g(o.ru)}</div>`);
    speak(g(o.he), { audio: o.audio });
    if (o.add) addToTray([].concat(o.add));
    qStep++;
    setTimeout(() => { if (token !== stageToken) return; document.getElementById("qOpts").innerHTML = ""; stage.hide(); }, 2400);
    setTimeout(() => { if (token !== stageToken) return; showQuestStep(); }, 3000);
  } else {
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    btn.disabled = true;
    qMistakes++;
    playSound("wrong"); vibrate("error");
    if (!qHinted) {
      const h = document.getElementById("qHint");
      h.innerHTML = `💡 <b>${friendName()}:</b> ${st.hint}`;
      h.hidden = false; qHinted = true;
    }
  }
}

// Ингредиенты появляются на подносе (поверх картинки)
function addToTray(items) {
  const tray = document.getElementById("qTray");
  items.forEach((it, k) => setTimeout(() => {
    if (!tray.isConnected) return;
    qBag.push(it);
    const el = document.createElement("div");
    el.className = "q-ing";
    el.innerHTML = `<img src="assets/ing-${it}.png" alt=""><span>${ING_NAMES[it] || it}</span>`;
    tray.appendChild(el);
    playSound("pop");
  }, k * 250));
}

// --- Финал ---
function finishQuest() {
  const token = stageToken;
  const o = quest.outro;
  stage.say("seller", sellerHTML(o.seller)); speak(g(o.seller.he), { audio: o.seller.audio });
  document.getElementById("qOpts").innerHTML = "";
  const pts = Math.max(20, quest.points - qMistakes * 5);
  store.set(todayKey(), store.get(todayKey(), 0) + pts);
  store.set("quest_" + quest.id, true);
  const finalImg = qBag.includes("lafa") ? "gift-shawarma" : "gift-pita";
  const order = qBag.map(x => ING_NAMES[x]).join(", ");
  setTimeout(() => {
    if (token !== stageToken) return;
    closeStage();
    playSound("finish"); vibrate("success");
    questView.innerHTML = `
      <div class="q-final">
        <img class="q-final-img" src="assets/${finalImg}.png" alt="Шаурма">
        <h2 class="done">Квест пройден! 🎉</h2>
        <p class="task"><b>Уровень 1 «Первая шаурма» завершён</b></p>
        <p class="task">Твой заказ: ${order}</p>
        <div class="points-row" style="animation-delay:.3s">
          <div class="pts-big">+${pts}</div>
          <div class="pts-label">очков за квест<br>Ошибок: ${qMistakes}</div>
        </div>
        <div class="q-friend-say"><b>${friendName()}:</b> ${g(qMistakes ? o.friend_mistakes : o.friend)}</div>
        <button class="btn blue" onclick="showPath()">К уровню</button>
        <button class="btn ghost" onclick="startQuest('${quest.id.replace("q-", "")}')">Пройти ещё раз</button>
      </div>`;
    window.scrollTo(0, 0);
  }, 3600);
}
