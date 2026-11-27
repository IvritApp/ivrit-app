// =====================================================
// НОВЫЕ КВЕСТЫ (22.11): «ЧТО СКАЗАЛ — ТО ПОЯВИЛОСЬ».
// Картинки — Codex (плоский стиль), данные — content/he/quests2/<id>.json, первый квест — шаурма.
// Игрок отвечает ГОЛОСОМ (🎤, распознавание he-IL из quest.js: listenHe/heSim/canSpeakNow).
// Не знает слово — нажимает на лоток/подсказку: слово звучит и видно на иврите, потом говорит сам.
// Микрофон не работает / «🙊 Не могу говорить» — те же подсказки становятся кнопками.
// Типы шагов: choice (продавец спрашивает → один из ответов, ответ может положить картинку на доску: "put"),
//             fill (игрок сам называет начинку, сколько хочет, потом «זֶה הַכּוֹל»), wrap (шаурма заворачивается),
//             pay (продавец называет цену → «вот, спасибо» + нажать на купюру).
// 23.11 (владелец): открыт ВСЕМ — у уровней из Q2_READY кнопка «Квест» на дорожке запускает новый квест; старый — только тестировщику («🗂 Старый квест»).
// 23.11: шаги могут менять фон ("bg"), говорящего ("who"), место доски ("board"), чистить доску ("clear");
//        новые типы: ask (спроси хозяина — чек-лист ✓/✗, квартира), "receipt" у choice (счёт с лишней строкой, кафе), "ok": false у неверного ответа.
// =====================================================
(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let Q = null, k = 0, token = 0, root = null, placed = [], points = 0, mistakes = 0, curWho = "";
  let voiceMiss = 0;                    // промахи распознавания голоса — НЕ ошибки (золото квеста не снимают), но много — значит, нужно повторение
  // сцена шага: фон ("bg": имя файла без .webp), кто говорит ("who"), где доска ("board": [left, top, right, bottom] в %)
  function setScene(st) {
    const sc = document.getElementById("q2Scene"), b = document.getElementById("q2Board");
    if (!sc || !b) return;
    if (st.bg) { const u = st.bg.includes("/") ? st.bg : pic(st.bg); if (sc.dataset.bg !== u) { sc.dataset.bg = u; if (root) root.dataset.bg = u; sc.style.backgroundImage = `url('${u}')`; sc.classList.remove("swap"); void sc.offsetWidth; sc.classList.add("swap"); } }
    if (st.who) curWho = st.who;
    // где стоит человек: у шага может быть своё место ("npc": {right, bottom, h} — например, у дома он ниже и меньше, чем в комнате)
    const nb = document.getElementById("q2Npc");
    if (nb && Q.npc) placeNpc(nb, npcFor(st, sc.dataset.bg));
    const z = st.board || Q.board;
    if (z) { b.style.left = z[0] + "%"; b.style.top = z[1] + "%"; b.style.right = z[2] + "%"; b.style.bottom = z[3] + "%"; }
    if (st.clear && !st._cleared) { b.innerHTML = ""; st._cleared = true; if (st.base) put(st.base, true); }   // только при первом показе шага (перерисовка не стирает разложенное); "base" — подложка (тарелка)
  }
  // человек в сцене: right / bottom / h — в % от сцены; "cut" — линия прилавка (в % сверху): ниже неё человека не видно (стоит ЗА прилавком)
  // место человека на шаге: общее "npc" квеста ← "npcAt" по фону (у стола, у двери…; "hide": true — на этом фоне его нет) ← "npc" шага
  function npcFor(st, bgUrl) {
    const key = String(bgUrl || "").split("/").pop().replace(/\.webp$/, "");
    return Object.assign({}, Q.npc, (Q.npcAt || {})[key] || {}, (st && st.npc) || {});
  }
  function placeNpc(box, n) {
    if (Q.npcAt || n.hide !== undefined) box.style.display = n.hide ? "none" : "";   // прятать/показывать — только у квестов, где это задано (магазин прячет сам)
    const b = n.bottom ?? 24, h = n.h ?? 52;
    box.style.right = (n.right ?? 6) + "%"; box.style.bottom = b + "%"; box.style.height = h + "%";
    const clip = n.cut ? `inset(0 0 ${Math.max(0, (100 - b - n.cut) / h * 100).toFixed(1)}% 0)` : "";
    box.style.clipPath = clip; box.style.webkitClipPath = clip; box.dataset.cut = n.cut || "";
  }
  // жив ли ещё этот шаг: не начат новый шаг, экран квеста не закрыт («✕», «Назад» Telegram, «Дальше»)
  const alive = (t) => t === token && root && root.isConnected && !document.getElementById("quest").hidden;
  // остановить микрофон и голос (при выходе и перед тем, как слушать игрока — иначе микрофон слышит продавца)
  function hush() {
    try { if (typeof qRec !== "undefined" && qRec) qRec.abort(); } catch (e) {}
    if (typeof ttsReq !== "undefined") ttsReq++;
    try { if (typeof ttsPlayer !== "undefined" && ttsPlayer) ttsPlayer.pause(); } catch (e) {}
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
  }
  const leave = () => { hush(); token++; if (ro) ro.disconnect(); if (mo) mo.disconnect(); showPath(); };
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
  // 27.11 (владелец): КВЕСТ НА ВЕСЬ ЭКРАН. Сцена 2:3 накрывает весь экран (как cover), а шапка, облачко и панель ответа — плашки ПОВЕРХ.
  // «Камера» (fit) подбирает размер и сдвиг сцены так, чтобы главное — человек и доска (или "focus" шага/квеста:
  // [left, top, right, bottom] — отступы в % от сцены, как у "board") — было видно между облачком сверху и панелью снизу.
  // Что держать в кадре (доли сцены 0…1): must — доска (если на шаге на неё кладут или на ней что-то есть) и всё с классом
  // q2-focus (кошелёк шука, резюме, человек на остановке, карта маршрута); npc — человек целиком; head — только его голова.
  const union = (a, b) => !a ? b : !b ? a : { l: Math.min(a.l, b.l), t: Math.min(a.t, b.t), r: Math.max(a.r, b.r), b: Math.max(a.b, b.b) };
  function focusParts(sc) {
    const st = Q && Q.steps[k], f = (st && st.focus) || (Q && Q.focus);
    if (f) return { must: { l: f[0] / 100, t: f[1] / 100, r: 1 - f[2] / 100, b: 1 - f[3] / 100 }, npc: null, head: null };
    const S = sc.getBoundingClientRect();
    if (!S.width || !S.height) return { must: null, npc: null, head: null };
    const rel = (el) => {                                              // место элемента в долях сцены (или null, если его не видно)
      if (!el || !sc.contains(el) || !el.offsetWidth || !el.offsetHeight) return null;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return null;   // прозрачность не смотрим: человек «входит» из opacity 0 — камера должна ждать его на месте
      const r = el.getBoundingClientRect();
      return { l: Math.max(0, (r.left - S.left) / S.width), t: Math.max(0, (r.top - S.top) / S.height), r: Math.min(1, (r.right - S.left) / S.width), b: Math.min(1, (r.bottom - S.top) / S.height) };
    };
    const bd = document.getElementById("q2Board");
    const boardMatters = bd && (bd.children.length || (st && (st.type === "fill" || st.type === "ask" || st.type === "pay" || st.receipt || (st.answers || []).some(a => a.put))));
    let must = boardMatters ? rel(bd) : null;
    sc.querySelectorAll(".q2-focus").forEach(el => { must = union(must, rel(el)); });
    const nEl = document.getElementById("q2Npc"), full = rel(nEl);
    if (!full) return { must, npc: null, head: null };
    const head = { l: full.l, r: full.r, t: full.t, b: full.t + (full.b - full.t) * 0.3 };   // голова — верхние ~30% картинки человека
    const npc = Object.assign({}, full);
    if (nEl.dataset.cut) npc.b = Math.max(head.b, Math.min(npc.b, +nEl.dataset.cut / 100));  // человек за прилавком — ноги не в счёт
    return { must, npc, head };
  }
  const PANEL_FADE = 12;                                              // верх панели — прозрачный градиент, сцену под ним видно
  let lastCam = "";
  function fit() {
    const sc = document.getElementById("q2Scene");
    if (!root || !root.isConnected || !sc) return;
    const cw = root.clientWidth, ch = root.clientHeight;
    if (!cw || !ch) return;
    // 1) свободное место между верхними плашками (шапка, облачко, табло/список) и панелью ответа
    const top = document.getElementById("q2Top"), head = document.getElementById("q2Head"), panel = document.getElementById("q2Panel");
    let yTop = top ? top.offsetTop + top.offsetHeight : 0;
    if (head && head.offsetHeight > 0) yTop = head.offsetTop + head.offsetHeight;
    yTop += 6;
    const yBot = panel && panel.offsetHeight ? ch - panel.offsetHeight + PANEL_FADE : ch;
    const free = Math.max(60, yBot - yTop);
    // 2) размер сцены: «cover» (накрывает весь экран); меньше — только если главное не влезает,
    //    но по ширине всегда весь экран и низ картинки доходит до панели (без тёмной полосы)
    const W0 = Math.max(cw, ch * 2 / 3);
    const sizeFor = (f) => {
      const want = Math.min(free / (1.5 * Math.max(0.05, f.b - f.t)), cw / Math.max(0.05, f.r - f.l));
      return Math.min(W0, Math.max(cw, yBot / 1.5, want));
    };
    // 3) что держим в кадре: доска + человек целиком → доска + голова человека → только доска
    const P = focusParts(sc);
    const tries = [union(P.must, P.npc), union(P.must, P.head), P.must || P.head].filter(Boolean);
    let f = null, W = W0, fits = false;
    for (const c of tries) { f = c; W = sizeFor(c); fits = (c.b - c.t) * W * 1.5 <= free + 1; if (fits) break; }
    const H = W * 1.5;
    let x, y;
    if (f) {
      x = cw / 2 - (f.l + f.r) / 2 * W;
      y = fits ? (yTop + yBot) / 2 - (f.t + f.b) / 2 * H              // влезает — по центру свободного места
        : yTop - f.t * H;                                             // не влезает — видно верх главного, низ уходит под панель
    } else { x = (cw - W) / 2; y = Math.min(0, (yTop + yBot) / 2 - H / 2); }   // главного нет — середина картинки посередине свободного места (без тёмной полосы сверху)
    // 4) по бокам пустоты нет, низ картинки не выше панели; сверху картинка может чуть опуститься (до облачка):
    //    тёмная полоса тогда за шапкой и облачком, зато лицо / чек / знак не прячутся под облачко
    x = Math.min(0, Math.max(cw - W, x));
    y = Math.min(Math.max(0, yTop - 50), Math.max(Math.min(0, yBot - H), y));
    const cam = [W, H, x, y].map(v => Math.round(v * 10) / 10).join();
    if (cam === lastCam && sc.style.width) return;                     // ничего не поменялось — не трогаем (иначе лишние перерисовки)
    lastCam = cam;
    sc.style.width = W + "px"; sc.style.height = H + "px"; sc.style.left = x + "px"; sc.style.top = y + "px";
    if (!sc.classList.contains("q2-cam")) requestAnimationFrame(() => sc.classList.add("q2-cam"));   // первый раз — сразу, дальше камера едет плавно
  }
  let fitRaf = 0, fitLate = 0;
  const refit = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); };
  // человек появился / спрятался / переехал (у них плавный переход) — пересчитать сразу и ещё раз чуть позже
  const refitSoon = () => { refit(); clearTimeout(fitLate); fitLate = setTimeout(refit, 450); };
  let fitHooked = false, ro = null, mo = null;

  function shell() {
    openQuestSection();
    document.getElementById("quest").classList.add("q2-host");         // секция без отступов и без «въезда» (иначе плашки прыгают)
    questView.innerHTML = `<div class="q2" id="q2">
      <div class="q2-scene" id="q2Scene" style="background-image:url('${Q.bg}')">
        <div class="q2-npc" id="q2Npc"></div>
        <div class="q2-board" id="q2Board"></div>
      </div>
      <div class="q2-top" id="q2Top"><button class="q2-x" id="q2X" aria-label="Выйти">✕</button><div class="q2-bar"><i id="q2Bar"></i></div></div>
      <div class="q2-head" id="q2Head"><div class="q2-say" id="q2Say" hidden></div></div>
      <div class="q2-panel" id="q2Panel"></div>
    </div>`;
    root = document.getElementById("q2");
    document.getElementById("q2Scene").dataset.bg = Q.bg;              // первый фон уже стоит — не мигать
    root.dataset.bg = Q.bg;
    lastCam = "";
    // панель и облачко меняют высоту → камера подстраивается
    if (ro) ro.disconnect();
    if (mo) mo.disconnect();
    if (window.ResizeObserver) { ro = new ResizeObserver(refit); ["q2Panel", "q2Head"].forEach(id => ro.observe(document.getElementById(id))); ro.observe(root); }
    // механики квестов добавляют/убирают людей и предметы в сцене, двигают человека → камера сама подстраивается
    const sc0 = document.getElementById("q2Scene");
    mo = new MutationObserver(list => {
      if (list.some(m => m.type === "childList" ? !(m.target.closest && m.target.closest(".ci")) : m.target.matches && m.target.matches("#q2Npc, #q2Board, .q2-focus"))) refitSoon();
    });
    mo.observe(sc0, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] });
    if (!fitHooked) { fitHooked = true; window.addEventListener("resize", refit); }
    // человек в сцене (картинка Codex из chars.js): "npc": {id, right, bottom, h} в % от сцены
    const n = Q.npc, box = document.getElementById("q2Npc"), nid = n ? g(n.id) : "";   // id может зависеть от пола: "{m:rina}{f:irit}"
    if (n && window.HirbisChars && HirbisChars.has(nid)) {
      box.innerHTML = charImgHTML(nid);
      placeNpc(box, npcFor(Q.steps[0], Q.bg));                        // на карточке цели человек уже там, где будет на 1-м шаге
    } else box.remove();
    window.scrollTo(0, 0);
    fit();
    document.getElementById("q2X").onclick = () => { if (window.track && !(quest && quest._ended)) track("quest_exit", quest ? quest.id : Q.id); leave(); };
  }
  function progress() { const b = document.getElementById("q2Bar"); if (b) b.style.width = Math.round(k / Q.steps.length * 100) + "%"; }

  // реплика продавца сверху (иврит + транскрипция, перевод по нажатию) и звук
  function sellerSays(line) {
    const box = document.getElementById("q2Say");
    if (!box || !line) return;
    box.hidden = false;
    box.innerHTML = `<div class="q2-who">${esc(g(curWho || Q.seller))}</div><div class="q2-he" dir="rtl">${esc(he(line))}</div>
      <div class="q2-tr">${esc(tr(line))}</div><button class="q2-ru" type="button">перевод</button>`;
    box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
    const ru = box.querySelector(".q2-ru");
    ru.onclick = () => { ru.textContent = g(line.ru); ru.classList.add("open"); };
    box.querySelector(".q2-he").onclick = () => speak(he(line));
    speak(he(line));
    const npc = document.querySelector("#q2Npc .ci");                 // человек «говорит» (рот двигается)
    // рот двигается, только если говорит сам человек на картинке (а не папа за кадром — "who" другого)
    if (npc && (!curWho || g(curWho) === g(Q.seller))) { npc.classList.add("talking"); clearTimeout(npc._tt); npc._tt = setTimeout(() => npc.classList.remove("talking"), 900 + he(line).length * 60); }
  }

  // человек в сцене реагирует: happy — прыгает от радости, oops — огорчился (avatar.css: ci-happy / ci-oops + движение тела)
  function npcAct(name, ms) {
    const ci = document.querySelector("#q2Npc .ci");
    if (!ci) return;
    ci.classList.remove("ci-happy", "ci-oops", "ci-hop"); void ci.offsetWidth;
    ci.classList.add("ci-" + name); if (name === "happy") ci.classList.add("ci-hop");
    clearTimeout(ci._a); ci._a = setTimeout(() => ci.classList.remove("ci-happy", "ci-oops", "ci-hop"), ms || 1500);
  }

  // положить картинку на доску: хлеб — большой в центре, остальное — горкой поверх, со «шлепком»
  function put(id, big, upright) {
    const b = document.getElementById("q2Board");
    if (!b) return;
    const el = document.createElement("img");
    el.src = pic(id); el.alt = ""; el.draggable = false;
    if (big) { el.className = "q2-bread"; b.innerHTML = ""; }
    else {
      const n = placed.length, ang = n * 2.4, r = 6 + (n % 4) * 5;
      el.className = "q2-piece";
      el.style.left = (50 + Math.cos(ang) * r * 1.6) + "%"; el.style.top = (52 + Math.sin(ang) * r) + "%";
      el.style.setProperty("--rot", upright ? "0deg" : (Math.round(Math.random() * 50) - 25) + "deg");   // свечи, бокал — ровно
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
    panel.scrollTop = 0;
    // камера — когда шаг нарисован (и ещё раз, когда человек появился/спрятался: у них плавный переход)
    setTimeout(() => { if (alive(t)) fit(); }, 0); setTimeout(() => { if (alive(t)) fit(); }, 450);
    if (!st) { finish(t); return; }
    setScene(st);
    // 23.11: СВОИ МЕХАНИКИ квестов — отдельные файлы q2-<квест>.js регистрируют тип шага: Q2_STEPS[type] = function (api) {…}
    if (window.Q2_STEPS && typeof Q2_STEPS[st.type] === "function") {
      if (st.seller) sellerSays(st.seller); else if (st.seller === null) { const sb = document.getElementById("q2Say"); if (sb) sb.hidden = true; }
      return Q2_STEPS[st.type](stepApi(st, panel, t));
    }
    if (st.type === "ask") return renderAsk(st, panel, t);
    if (st.receipt) { showReceipt(st); st.answers = receiptAnswers(st); }
    else if (st.fixReceipt && receiptLines) showReceipt(Q.steps.find(s => s.receipt), true);
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
    else if (st.seller === null) { const sb = document.getElementById("q2Say"); if (sb) sb.hidden = true; }   // реплики нет — старое облачко убрать
    if (st.type === "fill") return renderFill(st, panel, t);
    // choice / pay
    panel.innerHTML = `<div class="q2-task">${esc(g(st.hint || (st.type === "pay" ? "Заплати и поблагодари" : micOK() ? "Ответь вслух на иврите 🎤" : "Ответь")))}</div><div class="q2-hint" id="q2Hint"></div><div class="q2-chips" id="q2Chips"></div>`;
    const chips = panel.querySelector("#q2Chips");
    const payId = st.payWith || "bill50";                              // чем платить: купюра (шаурма) или карта (кафе)
    let paid = st.type !== "pay" || placed.includes(payId);          // уже платил (шаг перерисован) — второй купюры не будет
    const done = (ans) => {
      if (!alive(t)) return;
      if (ans.ok === false) { mistakes++; npcAct("oops", 1300); hint(g(ans.why || "Не совсем — подумай ещё 🙂"), true); return; }
      if (!paid) { hint(payId === "bill50" ? "Сначала заплати — нажми на купюру 💵" : payId === "card" ? "Сначала заплати — нажми на карту 💳" : "Сначала нажми на картинку над фразой 👆", true); return; }
      points += 10;
      setTimeout(() => npcAct("happy", 1400), 250);
      if (ans.put) put(ans.put, ans.put === "lafa" || ans.put === "pita", st.upright);
      panel.querySelectorAll("button").forEach(b => b.disabled = true);
      hint("✓ " + he(ans));
      setTimeout(() => { if (alive(t)) { k++; render(); } }, 1300);
    };
    if (st.type === "pay") {
      const bill = document.createElement("button");
      bill.className = "q2-bill"; bill.type = "button";
      bill.innerHTML = `<img src="${pic(payId)}" alt="оплата">`;
      if (paid) bill.classList.add("gone");
      bill.onclick = () => {
        if (paid) return; paid = true; bill.classList.add("gone");
        const b = document.getElementById("q2Board"); const el = document.createElement("img");
        el.src = pic(payId); el.className = "q2-piece q2-money"; b.appendChild(el); placed.push(payId);
        if (typeof playSound === "function") playSound("right");
        if (st.silent) {                                                  // шаг без слов (омовение рук: до халы молчат)
          points += 10; hint(g(st.silentHint || "✓"));
          setTimeout(() => { if (alive(t)) { k++; render(); } }, 2200);
          return;
        }
        hint(micOK() ? "Теперь скажи фразу 🎤" : "Теперь нажми на фразу");
      };
      chips.before(bill);
      if (st.silent) {                                                    // ни фраз, ни микрофона
        if (paid) setTimeout(() => { if (alive(t)) { k++; render(); } }, 600);   // шаг перерисован после нажатия — не застрять
        return;
      }
    }
    // 23.11 (владелец): игрок ГОВОРИТ САМ, а не выбирает. С микрофоном вариантов на экране НЕТ — только задание и 🎤;
    // «💡 Подсказка»: 1-е нажатие — начало фразы, 2-е — вся верная фраза (нажал — слушаешь). Кнопки-варианты — только без микрофона.
    const mic = micOK();
    const shown = (st.answers || []).map(fillAns).filter(a => !mic || a.ok !== false);
    shown.forEach(ans => {
      const c = document.createElement("button");
      c.className = "q2-chip"; c.type = "button";
      c.innerHTML = `<b dir="rtl">${esc(he(ans))}</b><span>${esc(tr(ans))} · ${esc(g(ans.ru))}</span>`;
      c.onclick = () => { speak(he(ans)); if (!mic) done(ans); };          // без микрофона — подсказка = ответ
      chips.appendChild(c);
    });
    if (mic) {
      chips.hidden = true;
      const ok = shown[0], words = ok ? he(ok).split(/\s+/) : [], trw = ok ? tr(ok).split(/\s+/) : [];
      let level = 0;
      const hb = document.createElement("button");
      hb.className = "q2-hintbtn"; hb.type = "button"; hb.textContent = "💡 Подсказка";
      hb.onclick = () => {
        if (!ok) return;
        level++;
        if (level === 1 && words.length > 1) {
          const n = Math.max(1, Math.ceil(words.length / 3));
          hint(`Начни так: ⁨${words.slice(0, n).join(" ")} …⁩ (${trw.slice(0, n).join(" ")} …)`);
          speak(words.slice(0, n).join(" "));
          hb.textContent = "💡 Ещё подсказка";
        } else { chips.hidden = false; hb.remove(); hint("Послушай (нажми на фразу) — и скажи сам" + g("{m:}{f:а}") + " 🎤"); }
      };
      panel.appendChild(micBtn("Нажми и скажи", alts => {
        const hits = st.answers.map(fillAns).filter(a => matches(alts, a));
        if (hits.length === 1) done(hits[0]);
        else if (hits.length > 1) hint("Скажи только один вариант 🙂", true);
        else { voiceMiss++; hint(`Я услышал «${alts[0] || "…"}». Скажи ещё раз — или возьми подсказку 💡`, true); }
      }));
      panel.appendChild(hb);
      noSpeakLink(panel);
    }
  }

  // API для своих механик (Q2_STEPS): всё, что нужно шагу, без доступа к внутренностям движка
  function stepApi(st, panel, t) {
    return {
      st, panel, Q, root,
      alive: () => alive(t),                                     // шаг ещё на экране? (проверять после каждого setTimeout / ответа)
      next: (delay) => setTimeout(() => { if (alive(t)) { root.classList.remove("q2-filling", "q2-asking"); k++; render(); } }, delay == null ? 1200 : delay),
      redraw: () => render(),
      mistake: () => { mistakes++; npcAct("oops", 1300); },      // настоящая ошибка (снимает «идеально»)
      voiceMiss: () => { voiceMiss++; },                         // не расслышал — не ошибка
      good: (pts) => { points += pts == null ? 10 : pts; npcAct("happy", 1400); },
      put: (id, big, upright) => put(id, big, upright), placed: () => placed.slice(),
      board: () => document.getElementById("q2Board"), scene: () => document.getElementById("q2Scene"),
      fit: () => refitSoon(),                                    // человек/доска появились или спрятались — камера подстроится (обычно сама)
      hint, say: (line) => sellerSays(line), speak: (x) => speak(typeof x === "string" ? x : he(x)), hush,
      micOK, micBtn: (label, onAlts) => micBtn(label, onAlts), noSpeakLink: () => noSpeakLink(panel),
      matches, namedItems, heSim: (a, b) => heSim(a, b), heNorm: (a) => heNorm(a),
      he, tr, g, esc, pic, npcAct,
      word: (w) => { (Q._words || (Q._words = [])).push(w); }      // слово попадёт в итог квеста (чипы со звуком)
    };
  }

  // свободный выбор начинки: лотки внизу, называешь сколько хочешь, потом «זֶה הַכּוֹל»
  function renderFill(st, panel, t) {
    const chosen = new Set(st.items.filter(it => placed.includes(it.id)).map(it => it.id));   // шаг перерисован — то, что уже лежит, не пропадает
    panel.innerHTML = `<div class="q2-task">${esc(g(st.task || "Скажи, что положить. Можно несколько сразу!"))} Потом скажи <bdi dir="rtl">${esc(he(st.done))}</bdi> (${esc(g(st.done.ru)).toLowerCase()})</div>
      <div class="q2-hint" id="q2Hint">${esc(st.trayHint || "Не знаешь слово — нажми на лоток 👇")}</div>
      <div class="q2-trays${micOK() ? " quiet" : ""}" id="q2Trays">${st.items.map(it => `<button class="q2-tray" type="button" data-id="${it.id}"><img src="${pic(it.id)}" alt=""><span class="q2-tray-he" dir="rtl">${esc(he(it))}</span></button>`).join("")}</div>
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
      row.appendChild(micBtn(st.micLabel || "Скажи начинку", alts => {
        // сначала кладём всё названное («בצל וחסה, זה הכל» — и лук, и латук), потом смотрим, сказал ли «это всё»
        const got = namedItems(alts, st.items).filter(add);
        if (matches(alts, st.done)) { if (finishFill()) return; if (!got.length) return; }
        if (got.length) hint("✓ " + got.map(he).join(", ") + " — ещё что-то? Или: " + he(st.done));
        else { voiceMiss++; hint(`Я услышал «${alts[0] || "…"}». Нажми на лоток — послушай — и скажи`, true); }
      }));
      noSpeakLink(panel);
    }
  }

  // ---------- «СПРОСИ И УЗНАЙ» (квартира): игрок задаёт вопросы, хозяин отвечает, в чек-листе ✓ или ✗ ----------
  // st.items: [{id, q:{he,tr,ru}, a:{he,tr,ru}, yes: true|false, put: "картинка", word: {he,tr,ru}}], st.min — сколько спросить
  let asked = new Set();
  function renderAsk(st, panel, t) {
    if (st.seller) sellerSays(st.seller);
    // 23.11 (владелец: «говорит сам»): с микрофоном вопрос на иврите скрыт — видна тема по-русски; нажал — подсказка (иврит + звук)
    const mic = micOK(), revealed = st._rev || (st._rev = new Set());
    const list = () => st.items.map(it => {
      const on = asked.has(it.id), quiet = mic && !on && !revealed.has(it.id);
      return `<button class="q2-ask${on ? " done " + (it.yes ? "yes" : "no") : ""}" type="button" data-id="${it.id}">
        <span class="q2-ask-mark">${on ? (it.yes ? "✓" : "✗") : "?"}</span>
        <span class="q2-ask-t">${quiet ? `<b>${esc(g(it.q.ru))}</b><small>💡 нажми — подсказка</small>`
          : `<b dir="rtl">${esc(he(it.q))}</b><small>${esc(tr(it.q))} · ${esc(g(it.q.ru))}</small>`}${on ? `<em><bdi dir="rtl">${esc(he(it.a))}</bdi> — ${esc(g(it.a.ru))}</em>` : ""}</span></button>`;
    }).join("");
    const need = Math.min(st.min || st.items.length, st.items.length);
    const left = () => Math.max(0, need - st.items.filter(it => asked.has(it.id)).length);
    panel.innerHTML = `<div class="q2-task">${esc(g(st.task || "Спроси хозяина"))}</div><div class="q2-hint" id="q2Hint">${left() ? `Задай ещё ${left()} ${left() === 1 ? "вопрос" : left() < 5 ? "вопроса" : "вопросов"}` : ""}</div>
      <div class="q2-asks" id="q2Asks">${list()}</div><div class="q2-row" id="q2Row"></div>`;
    const box = panel.querySelector("#q2Asks"), row = panel.querySelector("#q2Row");
    root.classList.add("q2-filling", "q2-asking");
    const nextBtn = () => {
      if (left() || row.querySelector(".q2-next")) return;
      const b = document.createElement("button"); b.className = "btn blue q2-next"; b.type = "button"; b.textContent = "Дальше";
      b.onclick = () => { if (!alive(t)) return; root.classList.remove("q2-filling", "q2-asking"); k++; render(); };
      row.prepend(b);
      b.scrollIntoView && b.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    const ask = (it, byVoice) => {
      if (!it || asked.has(it.id)) return;
      asked.add(it.id); points += 5;
      // голосом — ответ сразу; кнопкой — сначала прозвучит сам вопрос, потом ответ хозяина
      setTimeout(() => { if (!alive(t)) return;
        sellerSays(it.a);
        if (it.put) put(it.put, false);
        box.innerHTML = list(); bind();
        const l = left(); hint(l ? `Ещё ${l}` : "Можно спросить ещё или нажать «Дальше»");
        nextBtn();
      }, byVoice ? 350 : 700 + he(it.q).length * 70);
    };
    const bind = () => box.querySelectorAll(".q2-ask").forEach(b => b.onclick = () => {
      const it = st.items.find(x => x.id === b.dataset.id);
      if (asked.has(it.id)) { speak(he(it.a)); return; }
      speak(he(it.q));
      if (!micOK()) ask(it);
      else { revealed.add(it.id); box.innerHTML = list(); bind(); hint(`Скажи: ⁨${he(it.q)}⁩ 🎤`); }
    });
    bind(); nextBtn();
    const b0 = document.getElementById("q2Board");
    st.items.forEach(it => { if (asked.has(it.id) && it.put && b0 && !b0.querySelector(`img[src$="/${it.put}.webp"]`)) put(it.put, false); });
    if (micOK()) {
      row.appendChild(micBtn(st.micLabel || "Спроси", alts => {
        // самый похожий из ещё не заданных вопросов (короткие «יש X?» похожи друг на друга)
        const score = (it) => Math.max(...alts.map(a => heSim(a, he(it.q))), ...alts.map(a => heNorm(a).includes(heNorm(he(it.q))) ? 1 : 0));
        const hit = st.items.filter(it => !asked.has(it.id) && matches(alts, it.q)).sort((x, y) => score(y) - score(x));
        if (hit.length > 1 && score(hit[0]) === score(hit[1])) hint("Спроси что-то одно 🙂", true);
        else if (hit.length) ask(hit[0], true);
        else { voiceMiss++; hint(`Я услышал «${alts[0] || "…"}». Нажми на вопрос — послушай — и спроси`, true); }
      }));
      noSpeakLink(panel);
    }
  }

  // ---------- ЧЕК (кафе): на доске бумажный счёт; в нём лишняя строка — то, что игрок НЕ заказывал ----------
  // st.receipt: { from: [id шага fill…], extra: [{id, he, tr, ru, price}], prices: {id: цена} }
  let receiptExtra = null, receiptLines = null;
  function showReceipt(st, fixed) {
    const R = st.receipt, b = document.getElementById("q2Board");
    if (!receiptLines) {                                                // строки и место лишней — один раз (перерисовка шага их не меняет)
      const ordered = Q.steps.filter(s => s.type === "fill").flatMap(s => s.items).filter(it => placed.includes(it.id));
      const pool = (R.extra || []).filter(x => !placed.includes(x.id)); receiptExtra = pool[Math.floor(Math.random() * pool.length)] || null;
      receiptLines = ordered.map(it => ({ it, p: (R.prices || {})[it.id] || 20 }));
      if (receiptExtra) receiptLines.splice(Math.floor(Math.random() * (receiptLines.length + 1)), 0, { it: receiptExtra, p: receiptExtra.price || 30, extra: true });
    }
    const lines = fixed ? receiptLines.filter(l => !l.extra) : receiptLines;   // fixed — официантка исправила счёт
    const sum = lines.reduce((s, l) => s + l.p, 0);
    b.innerHTML = `<div class="q2-receipt"><div class="q2-rc-h" dir="rtl">חֶשְׁבּוֹן</div>${lines.map(l =>
      `<div class="q2-rc-l"><b dir="rtl">${esc(he(l.it))}</b><span>${l.p} ₪</span></div>`).join("")}<div class="q2-rc-s"><b dir="rtl">סַךְ הַכּוֹל</b><span>${sum} ₪</span></div></div>`;
  }
  // ответы к чеку: «לא הזמנתי + строка» на КАЖДУЮ строку (верно — только лишняя) + ответы из файла без {X}
  function receiptAnswers(st) {
    const tpl = (st._origAnswers || st.answers).find(a => /\{X\}/.test(a.he || "")) || { he: "לֹא הִזְמַנְתִּי {X}.", tr: "ло хизманти {X}.", ru: "Я не заказывал(а): {X}" };
    const rest = (st._origAnswers || (st._origAnswers = st.answers)).filter(a => !/\{X\}/.test(a.he || ""));
    const per = receiptLines.map(l => Object.assign({}, tpl, { he: tpl.he.replace("{X}", l.it.he), tr: (tpl.tr || "").replace("{X}", l.it.tr || ""), ru: (tpl.ru || "").replace("{X}", l.it.ru || ""),
      also: undefined, ok: l.extra ? undefined : false, why: l.extra ? undefined : "Это ты заказывал{m:}{f:а}! Посмотри на другую строку 🙂" }));
    return per.concat(rest);
  }
  // ответ с подстановкой: "{X}" — лишнее блюдо из чека
  function fillAns(a) {
    if (!receiptExtra || !/\{X\}/.test(a.he || "")) return a;
    return Object.assign({}, a, { he: a.he.replace("{X}", receiptExtra.he), tr: (a.tr || "").replace("{X}", receiptExtra.tr || ""), ru: (a.ru || "").replace("{X}", receiptExtra.ru || "") });
  }

  function finish(t) {
    sellerSays(Q.outro);
    const perfect = mistakes === 0;
    // очки как у старого квеста: квест : идеальный урок = 1,5 : 1 (QUEST_RATIO, perfectRaw — quest.js), ×2 без ошибок
    const base = typeof perfectRaw === "function" && typeof QUEST_RATIO !== "undefined" ? QUEST_RATIO * perfectRaw(10) : points;
    const pts = Math.round(base * (perfect ? 2 : 1));
    store.set(todayKey(), store.get(todayKey(), 0) + pts);
    window.streakHold = !!window.HAnim;                                // экран серии — после праздника, а не поверх него
    if (typeof streakDone === "function") streakDone();
    const qid = qFile ? "q-" + qFile : Q.id;                          // в статистике — тот же id, что у старого квеста
    if (window.track) track("quest_end", qid);
    if (typeof quest !== "undefined" && quest) quest._ended = true;
    store.set("quest2_" + Q.id, true);
    // 23.11: новый квест — это и есть квест уровня: засчитываем так же, как старый (открывает следующий уровень, золото уровня, большой сундук)
    if (qFile) { store.set("quest_q-" + qFile, true); if (perfect) store.set("questGold_q-" + qFile, true); }
    // итог уровня и повторение (как в quest.js): много ошибок или промахов голосом → 4 урока повторения на дорожке
    const where = typeof questLevel === "function" && qFile ? questLevel("q-" + qFile) : null;
    const lvl = where ? where.lvl : null;
    const weak = mistakes >= 4 || voiceMiss >= 4;
    if (weak && lvl) store.set("review_" + lvl.id, true);
    const gold = lvl && typeof levelGold === "function" && levelGold(lvl);
    const panel = document.getElementById("q2Panel");
    const words = Q.steps.flatMap(s => s.type === "fill" ? s.items.filter(it => placed.includes(it.id)) : s.type === "ask" ? s.items.filter(it => asked.has(it.id) && it.word).map(it => it.word) : []).concat(Q._words || []);
    panel.innerHTML = `<div class="q2-end">
      <h2>${perfect ? "Без единой ошибки! ⭐" : esc(Q.finishTitle || "Шаурма твоя! 🌯")}</h2>
      ${where ? `<div class="q2-lvl">${gold ? `🏅 Уровень ${where.n} золотой!` : `✓ Уровень ${where.n} пройден`}</div>` : ""}
      <div class="q2-pts">+${pts} ${pts % 10 === 1 && pts % 100 !== 11 ? "очко" : [2, 3, 4].includes(pts % 10) && ![12, 13, 14].includes(pts % 100) ? "очка" : "очков"}</div>
      ${words.length ? `<div class="q2-words">${words.map(w => `<button class="q2-word" type="button" data-he="${esc(he(w))}"><b dir="rtl">${esc(he(w))}</b><span>${esc(g(w.ru))}</span></button>`).join("")}</div>` : ""}
      ${weak && lvl ? `<div class="q2-weak">Было трудно — это нормально! Я собрал${g("")} для тебя уроки повторения 🔁</div><button class="btn orange" id="q2Rev">🔁 Начать повторение</button>` : ""}
      <button class="btn blue" id="q2Fin">Дальше</button>
      <button class="btn ghost" id="q2Again">Пройти ещё раз</button></div>`;
    panel.querySelectorAll(".q2-word").forEach(b => b.onclick = () => speak(b.dataset.he));
    document.getElementById("q2Fin").onclick = leave;
    document.getElementById("q2Again").onclick = () => { hush(); token++; loadQuest2(qFile || Q.id); };
    const rv = document.getElementById("q2Rev");
    if (rv) rv.onclick = () => { hush(); token++; startReview(lvl.id); };
    if (typeof vibrate === "function") vibrate("success");
    if (window.HAnim) HAnim.play("lessonEnd", { cards: false, title: Q.finishTitle || "Шаурма твоя!" })
      .then(() => { window.streakHold = false; return window.streakShow ? streakShow() : null; })
      .catch(() => { window.streakHold = false; });
    if (typeof playSound === "function") setTimeout(() => playSound("finish"), 300);
  }

  window.q2Hush = hush;                                            // «Назад» Telegram (app.js): заглушить голос и микрофон квеста
  window.Q2_READY = ["shawarma", "dira", "makolet", "bus", "shabbat", "cafe", "shuk", "rofe", "avoda"];                // какие уровни уже имеют новый квест (content/he/quests2/<id>.json)
  window.q2Test = { matches, namedItems, go: (n) => { k = n; render(); }, steps: () => Q ? Q.steps.length : 0 };   // проверка распознавания и прыжок к шагу (снимки экранов)
  let qFile = "";                                                  // имя квеста уровня (course.json "quest"), напр. "shabbat"
  // 23.11: перед квестом — кат-сцена (cutscene.js), один раз; потом сам квест
  window.startQuest2 = function (id) {
    if (window.playCutscene) playCutscene(id, () => loadQuest2(id)); else loadQuest2(id);
  };
  function loadQuest2(id) {
    fetch(`content/${COURSE_LANG}/quests2/${id}.json`).then(r => r.json()).then(d => {
      qFile = id; Q = d; k = 0; placed = []; points = 0; mistakes = 0; voiceMiss = 0; curWho = ""; asked = new Set(); receiptExtra = null; receiptLines = null;
      quest = { id: "q-" + id, _ended: false };                       // общая переменная из quest.js — для «Назад» и статистики (app.js)
      shell();
      if (window.track) track("quest_start", "q-" + id);
      // карточка цели, как в старых квестах
      const panel = document.getElementById("q2Panel");
      panel.innerHTML = `<div class="q-goal"><div class="q-goal-k">🎯 Твоя цель</div><div class="q-goal-t">${esc(g(d.goal))}</div>
        <div class="q-goal-s">${micOK() ? "Отвечай голосом 🎤 — не знаешь слово, нажми на подсказку" : "Нажимай на фразы на иврите"}</div>
        <button class="btn blue q-goal-go" id="q2Go">Начать</button></div>`;
      document.getElementById("q2Go").onclick = () => { if (typeof playSound === "function") playSound("pop"); render(); };
    }).catch(() => showToast("Не получилось загрузить квест 😕"));
  }
})();
