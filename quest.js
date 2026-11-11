// =====================================================
// КВЕСТЫ: сюжетная сцена + диалог, в котором игрок выбирает реплики на иврите.
// Первый квест — «Первая шаурма» (content/he/quests/shawarma.json).
// Тексты с {m:...}{f:...} подстраиваются под пол игрока.
// =====================================================
const questView = document.getElementById("quest");
let quest = null, qStep = 0, qMistakes = 0, qBag = [], qHinted = false;


// Названия ингредиентов для итогового заказа
const ING_NAMES = {
  pita: "пита", lafa: "лафа", "meat-turkey": "индейка", "meat-chicken": "курица", "meat-veal": "телятина",
  salad: "салат", hummus: "хумус", tahini: "тхина", spicy: "острое", chips: "картошка фри"
};

function startQuest(id) {
  // Перед первым квестом — кусочек кино: такси подъезжает к шаурмичной
  if (id === "shawarma" && window.playArrivalScene && !store.get("quest_q-shawarma", false) && !startQuest.kinoShown) {
    startQuest.kinoShown = true;
    stopHomeBird();
    document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "quest");
    questView.innerHTML = `<div id="sceneBox"></div>`;
    window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: "shop" }, () => startQuest(id));
    return;
  }
  stopHomeBird();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "quest");
  if (tg && tg.BackButton) tg.BackButton.show();
  questView.innerHTML = `<div class="q-loading">Загрузка…</div>`;
  fetch(`content/${COURSE_LANG}/quests/${id}.json`)
    .then(r => r.json())
    .then(d => {
      quest = d; qStep = 0; qMistakes = 0; qBag = [];
      renderQuestShell();
      setBanner("🌯", "Шаурмичная");
      document.getElementById("qTray").hidden = false;
      setTimeout(showQuestStep, 400);
    })
    .catch(() => { questView.innerHTML = `<p class="task">Не удалось загрузить квест 😕</p>`; });
}

function renderQuestShell() {
  questView.innerHTML = `
    <div class="q-banner" id="qBanner"><span class="q-scene-icon">🚕</span><span>Такси из аэропорта</span></div>
    <div class="q-tray" id="qTray" hidden></div>
    <div class="q-chat" id="qChat"></div>
    <div class="q-options" id="qOpts"></div>`;
}
function setBanner(icon, text) {
  const b = document.getElementById("qBanner");
  b.innerHTML = `<span class="q-scene-icon">${icon}</span><span>${text}</span>`;
  b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
}

// --- Сообщения в чате ---
function avatar(who) {
  if (who === "friend") return `<div class="q-ava friend">${friendName()[0]}</div>`;
  if (who === "seller") return `<div class="q-ava seller">🧑‍🍳</div>`;
  return "";
}
function addMsg(who, html) {
  const chat = document.getElementById("qChat");
  const row = document.createElement("div");
  row.className = "q-row " + who;
  const name = who === "friend" ? friendName() : who === "seller" ? "Продавец" : "";
  row.innerHTML = `${avatar(who)}<div class="q-bubble">${name ? `<div class="q-name">${name}</div>` : ""}${html}</div>`;
  chat.appendChild(row);
  requestAnimationFrame(() => row.classList.add("in"));
  row.scrollIntoView({ behavior: "smooth", block: "end" });
  return row;
}
function sellerHTML(s) {
  const he = g(s.he), tr = g(s.tr);
  const id = "ru" + Math.floor(Math.random() * 1e6);
  return `<div class="he" dir="rtl">${he}</div>
    <div class="tr">${tr}</div>
    <div class="q-tools">
      <button class="q-tool" onclick="speak(${JSON.stringify(he).replace(/"/g, "&quot;")})">🔊</button>
      <button class="q-tool" onclick="document.getElementById('${id}').hidden=false;this.remove()">Перевод</button>
    </div>
    <div class="ru" id="${id}" hidden>${g(s.ru)}</div>`;
}

// --- Сцена в такси (перед уроками первого уровня) ---
// Сюда же потом встанет «кино» из второго чата: если есть playArrivalScene — сначала оно.
function showTaxi(onDone) {
  stopHomeBird();
  document.querySelectorAll("body > section").forEach(sec => sec.hidden = sec.id !== "quest");
  if (tg && tg.BackButton) tg.BackButton.show();
  const run = () => fetch(`content/${COURSE_LANG}/scenes/taxi.json`).then(r => r.json()).then(sc => playTaxi(sc, onDone));
  if (window.playArrivalScene && !store.get("arrivalSeen", false)) {
    questView.innerHTML = `<div id="sceneBox"></div>`;
    window.playArrivalScene(document.getElementById("sceneBox"), { gender: profile ? profile.gender : "m", profile, part: "arrival" }, () => {
      store.set("arrivalSeen", true); run();
    });
  } else run();
}
function playTaxi(sc, onDone) {
  renderQuestShell();
  setBanner("🚕", sc.title);
  const opts = document.getElementById("qOpts");
  const lines = (arr, k, then) => {
    if (k >= arr.length) { then(); return; }
    addMsg("friend", `<div class="ru-text">${g(arr[k].ru)}</div>`);
    setTimeout(() => lines(arr, k + 1, then), 1100);
  };
  lines(sc.lines, 0, () => {
    opts.innerHTML = "";
    sc.choice.forEach(ch => {
      const b = document.createElement("button");
      b.className = "option q-opt"; b.textContent = g(ch.ru);
      b.onclick = () => {
        opts.innerHTML = "";
        playSound("pop");
        addMsg("me", `<div class="ru-text">${g(ch.ru)}</div>`);
        setTimeout(() => {
          addMsg("friend", `<div class="ru-text">${g(ch.reply)}</div>`);
          setTimeout(() => lines(sc.after, 0, () => {
            opts.innerHTML = `<button class="btn blue">${sc.button}</button>`;
            opts.firstChild.onclick = () => { store.set("taxiSeen", true); onDone(); };
          }), 1100);
        }, 700);
      };
      opts.appendChild(b);
    });
  });
}

// --- Шаги диалога ---
function showQuestStep() {
  if (qStep >= quest.steps.length) { finishQuest(); return; }
  const st = quest.steps[qStep];
  qHinted = false;
  if (st.seller) { addMsg("seller", sellerHTML(st.seller)); speak(g(st.seller.he), { audio: st.seller.audio }); }
  if (st.friend) addMsg("friend", `<div class="ru-text">${g(st.friend)}</div>`);

  const opts = document.getElementById("qOpts");
  opts.innerHTML = "";
  shuffle([...st.options]).forEach(o => {
    const b = document.createElement("button");
    b.className = "option q-opt";
    b.innerHTML = `<span class="he" dir="rtl">${g(o.he)}</span><span class="tr">${g(o.tr)}</span>`;
    b.onclick = () => chooseOption(b, o, st);
    opts.appendChild(b);
  });
}

function chooseOption(btn, o, st) {
  if (o.ok) {
    document.querySelectorAll(".q-opt").forEach(b => b.disabled = true);
    btn.classList.add("right");
    playSound("right"); vibrate("success");
    addMsg("me", `<div class="he" dir="rtl">${g(o.he)}</div><div class="tr">${g(o.tr)} — ${g(o.ru)}</div>`);
    speak(g(o.he), { audio: o.audio });
    if (o.add) addToTray([].concat(o.add));
    qStep++;
    setTimeout(() => { document.getElementById("qOpts").innerHTML = ""; showQuestStep(); }, 1300);
  } else {
    btn.classList.remove("wrong"); void btn.offsetWidth; btn.classList.add("wrong");
    btn.disabled = true;
    qMistakes++;
    playSound("wrong"); vibrate("error");
    if (!qHinted) { addMsg("friend", `<div class="ru-text">Подсказка: ${st.hint}</div>`); qHinted = true; }
  }
}

// Ингредиенты появляются на подносе
function addToTray(items) {
  const tray = document.getElementById("qTray");
  items.forEach((it, k) => setTimeout(() => {
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
  const o = quest.outro;
  addMsg("seller", sellerHTML(o.seller)); speak(g(o.seller.he), { audio: o.seller.audio });
  const pts = Math.max(20, quest.points - qMistakes * 5);
  store.set(todayKey(), store.get(todayKey(), 0) + pts);
  store.set("quest_" + quest.id, true);
  const finalImg = qBag.includes("lafa") ? "gift-shawarma" : "gift-pita";
  const order = qBag.map(x => ING_NAMES[x]).join(", ");
  setTimeout(() => {
    playSound("finish"); vibrate("success");
    document.getElementById("qOpts").innerHTML = "";
    questView.insertAdjacentHTML("beforeend", `
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
      </div>`);
    questView.querySelector(".q-final").scrollIntoView({ behavior: "smooth", block: "start" });
  }, 1400);
}
