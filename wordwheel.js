// =====================================================
// «БУКВЫ ПО КРУГУ» — своя игра Hirbis. 5–6 букв иврита по кругу: ведёшь пальцем по буквам — собираешь слово.
// Найденное слово вписывается в маленький кроссворд над кругом, звучит и показывает перевод.
// Слова ИНДИВИДУАЛЬНЫЕ — только те, что игрок уже учил (словарь игрока, knownWords()):
//   • пройденные уроки (done) — все слова урока;
//   • начатые (store "parts"): 1 часть — первая половина новых слов, 2+ части — все новые слова (как в parts.js).
// Искать в сетке и «⭐ Бонус» — только знакомые слова. Буквы на круге (основа, 5–6 букв) — знакомое слово,
// а если такого нет — слово из уроков курса ДО текущего урока игрока включительно (само оно в сетку не попадает).
// Без огласовок; конечные буквы (ך ם ן ף ץ) = обычные, в конце слова ставятся сами.
// Раунд = основа + ≥3 знакомых слова в кроссворде (жадная раскладка по пересечениям). Нельзя собрать ни одного —
// игра закрыта (замок в списке мини-игр, бурекасы не списываются), wheelStatus() считает, сколько уроков пройти.
// Раунд стоит WHEEL_PRICE 🥐 (minigames.js → Eco). Очков дня игра не даёт.
// Прогресс: store "wheel" = { round: {...текущий раунд}, seen: [основы, свежие первыми] } — основы чередуются.
// =====================================================
(function () {
  const PRICE = 30, MAX_W = 8, MAX_H = 7, MAX_WORDS = 6;
  window.WHEEL_PRICE = PRICE;
  const FINAL = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
  const TO_FINAL = { "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ" };
  const norm = (c) => FINAL[c] || c;
  const shape = (s) => [...s].map((c, i, a) => (i === a.length - 1 ? (TO_FINAL[c] || c) : c)).join("");
  const shuf = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  let COURSE = null, BY = null;   // уроки по порядку курса: [{id, all:[слова], fresh:[новые слова]}]; BY — все слова курса по ключу
  let R = null, box = null, els = [], path = [], drawing = false, ptr = null, busy = false;
  const MIN_WORDS = 3;             // слов в кроссворде (минимум)
  let MIN_BASE = 5;                // букв на круге (минимум; основа — 5–6 букв)
  const cache = new Map();         // готовые раунды для набора знакомых слов

  // ---------- СЛОВА КУРСА ----------
  // одно слово 2–6 букв без огласовок → { key, he, tr, ru, audio } (key — буквы, конечные = обычные)
  function entry(w) {
    if (!w || !w.he || !w.ru || /[{}\/'׳"״]/.test(w.he)) return null;
    const plain = w.he.replace(/־/g, " ").replace(/[֑-ׇ]/g, "").replace(/[?!.,]/g, "").trim();
    if (!/^[א-ת]{2,6}$/.test(plain)) return null;
    return { key: [...plain].map(norm).join(""), he: w.he, tr: w.tr || "", ru: w.ru, audio: w.audio };
  }
  async function loadDict() {
    if (COURSE) return;
    const c = (typeof course !== "undefined" && course) || await fetch(`content/${COURSE_LANG}/course.json`).then(r => r.json());
    const ids = [];
    c.chapters.forEach(ch => (ch.levels || []).forEach(l => (l.lessons || []).forEach(id => ids.push(id))));
    const get = (id) => (window.getLesson ? getLesson(id) : fetch(`content/${COURSE_LANG}/lessons/${id}.json`).then(r => r.json()));
    const lessons = await Promise.all(ids.map(id => get(id).catch(() => null)));
    BY = new Map();
    COURSE = ids.map((id, i) => {
      const L = lessons[i] || { words: [] }, words = L.words || [], n = L.newCount || words.length;
      const conv = (list) => list.map(entry).filter(Boolean).map(e => { if (!BY.has(e.key)) BY.set(e.key, e); return BY.get(e.key); });
      return { id, all: conv(words), fresh: conv(words.slice(0, n)), half: conv(words.slice(0, Math.ceil(n / 2))) };
    });
  }
  // можно ли собрать слово w из букв base (каждую букву — не больше, чем она есть)
  function fits(w, base) {
    const cnt = {};
    for (const ch of base) cnt[ch] = (cnt[ch] || 0) + 1;
    for (const ch of w) { if (!cnt[ch]) return false; cnt[ch]--; }
    return true;
  }

  // ---------- СЛОВАРЬ ИГРОКА ----------
  // prog = { done: Set, parts: {урок: частей} } (по умолчанию — из store). → { known: Map key→слово, last: индекс текущего урока }
  function progress() { return { done: new Set(store.get("done", []) || []), parts: store.get("parts", {}) || {} }; }
  function knownWords(prog) {
    prog = prog || progress();
    const known = new Map(); let last = -1;
    COURSE.forEach((L, i) => {
      const p = +prog.parts[L.id] || 0;
      const list = prog.done.has(L.id) ? L.all : p >= 2 ? L.fresh : p === 1 ? L.half : null;
      if (!list) return;
      last = i;
      list.forEach(e => known.set(e.key, e));
    });
    return { known, last };
  }
  // все возможные раунды для этого словаря: [{ b: основа, sub: знакомые слова из её букв }]
  function rounds(k) {
    const sig = MIN_BASE + ":" + k.last + ":" + [...k.known.keys()].sort().join(",");
    if (cache.has(sig)) return cache.get(sig);
    const pool = new Map();
    k.known.forEach(e => { if (e.key.length >= MIN_BASE) pool.set(e.key, e); });
    for (let i = 0; i <= k.last; i++) COURSE[i].all.forEach(e => { if (e.key.length >= MIN_BASE && !pool.has(e.key)) pool.set(e.key, e); });
    const words = [...k.known.values()], out = [];
    pool.forEach(b => {
      const sub = words.filter(w => fits(w.key, b.key));
      if (sub.length < MIN_WORDS) return;
      for (let t = 0; t < 6; t++) if (layout(order(sub)).length >= MIN_WORDS) { out.push({ b, sub }); return; }
    });
    cache.set(sig, out);
    return out;
  }
  // сначала длинные слова, внутри одной длины — случайно
  const order = (sub) => shuf(sub).sort((a, c) => c.key.length - a.key.length);

  // Можно ли играть: { ok, rounds, need (сколько уроков ещё пройти до первого раунда), doneLessons }
  window.wheelStatus = async function () {
    await loadDict();
    const prog = progress(), k = knownWords(prog), n = rounds(k).length;
    const doneLessons = COURSE.filter(L => prog.done.has(L.id)).length;
    if (n) return { ok: true, rounds: n, need: 0, doneLessons, known: k.known.size };
    // сколько ещё уроков по порядку курса нужно пройти, чтобы появился хотя бы один раунд
    const sim = { done: new Set(prog.done), parts: prog.parts };
    let need = 0;
    for (const L of COURSE) {
      if (sim.done.has(L.id)) continue;
      sim.done.add(L.id); need++;
      if (rounds(knownWords(sim)).length) break;
    }
    return { ok: false, rounds: 0, need, doneLessons, known: k.known.size };
  };
  // можно ли собрать слово w из букв base (каждую букву — не больше, чем она есть)
  function fits(w, base) {
    const cnt = {};
    for (const ch of base) cnt[ch] = (cnt[ch] || 0) + 1;
    for (const ch of w) { if (!cnt[ch]) return false; cnt[ch]--; }
    return true;
  }

  // ---------- КРОССВОРД (жадная раскладка) ----------
  // Координаты «логические»: по горизонтали x растёт по ходу чтения (на экране — справа налево), по вертикали y — вниз.
  function layout(list) {
    const cells = new Map(), placed = [];
    const at = (x, y) => cells.get(x + "," + y);
    const box = () => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; cells.forEach((_, k) => { const [x, y] = k.split(",").map(Number); a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y); }); return { x0: a, x1: b, y0: c, y1: d }; };
    function put(w, x, y, dir) {
      const dx = dir === "h" ? 1 : 0, dy = dir === "h" ? 0 : 1, n = w.key.length;
      for (let k = 0; k < n; k++) {
        const kk = (x + k * dx) + "," + (y + k * dy), c = cells.get(kk) || { ch: w.key[k], fin: false };
        c[dir] = true; if (k === n - 1) c.fin = true;
        cells.set(kk, c);
      }
      placed.push({ key: w.key, x, y, dir });
    }
    function can(key, x, y, dir) {
      const dx = dir === "h" ? 1 : 0, dy = dir === "h" ? 0 : 1, n = key.length;
      if (at(x - dx, y - dy) || at(x + n * dx, y + n * dy)) return -1;     // до и после слова — пусто
      let cross = 0;
      for (let k = 0; k < n; k++) {
        const cx = x + k * dx, cy = y + k * dy, c = at(cx, cy);
        if (c) {
          if (c.ch !== key[k] || c[dir]) return -1;
          // буква, у которой есть конечная форма, должна быть «последней» в обоих словах или ни в одном
          if (TO_FINAL[key[k]] && (k === n - 1) !== c.fin) return -1;
          cross++;
        } else if (at(cx + dy, cy + dx) || at(cx - dy, cy - dx)) return -1; // соседи сбоку — пусто
      }
      if (!cross) return -1;
      const b = box(), x0 = Math.min(b.x0, x), x1 = Math.max(b.x1, x + (n - 1) * dx), y0 = Math.min(b.y0, y), y1 = Math.max(b.y1, y + (n - 1) * dy);
      if (x1 - x0 + 1 > MAX_W || y1 - y0 + 1 > MAX_H) return -1;
      return (x1 - x0 + 1) * (y1 - y0 + 1) - cross * 6;                     // чем компактнее и больше пересечений — тем лучше
    }
    put(list[0], 0, 0, "h");
    for (const w of list.slice(1)) {
      if (placed.length >= MAX_WORDS) break;
      let best = null;
      placed.forEach(p => {
        for (let i = 0; i < p.key.length; i++) for (let j = 0; j < w.key.length; j++) {
          if (p.key[i] !== w.key[j]) continue;
          const dir = p.dir === "h" ? "v" : "h";
          const cx = p.dir === "h" ? p.x + i : p.x, cy = p.dir === "h" ? p.y : p.y + i;
          const x = dir === "h" ? cx - j : cx, y = dir === "h" ? cy : cy - j;
          const sc = can(w.key, x, y, dir);
          if (sc >= 0 && (!best || sc < best.sc || (sc === best.sc && Math.random() < .5))) best = { x, y, dir, sc };
        }
      });
      if (best) put(w, best.x, best.y, best.dir);
    }
    return placed;
  }

  function makeRound() {
    const st = store.get("wheel", {}), seen = st.seen || [];
    const all = rounds(knownWords());
    if (!all.length) return null;
    // новые основы — первыми; все уже были — та, что была давнее всех (основы чередуются)
    let pool = all.filter(x => !seen.includes(x.b.key));
    if (!pool.length) { const far = Math.max(...all.map(x => seen.indexOf(x.b.key))); pool = all.filter(x => seen.indexOf(x.b.key) === far); }
    for (let t = 0; t < 40; t++) {
      const { b, sub } = pool[Math.floor(Math.random() * pool.length)];
      const placed = layout(order(sub));                     // в сетке — только знакомые слова
      if (placed.length < MIN_WORDS) continue;
      let letters = shuf([...b.key]);
      for (let k = 0; k < 5 && letters.join("") === b.key; k++) letters = shuf(letters);
      return { base: b.key, words: placed, letters, found: [], open: [], bonus: [], hintFree: true, done: false };
    }
    return null;
  }
  function save() { const st = store.get("wheel", {}); st.round = R; store.set("wheel", st); }
  window.wheelInProgress = () => { const r = (store.get("wheel", {}) || {}).round; return !!(r && !r.done); };

  // ---------- ВХОД В ИГРУ ----------
  window.openWheel = async function (el) {
    box = el;
    if (window.mgSetView) mgSetView("wheel");
    if (!COURSE) {
      if (window.showLoading) showLoading(box, "Раскладываем буквы"); else box.textContent = "Загрузка…";
      try { await loadDict(); } catch (e) { box.innerHTML = `<p class="task">Не удалось загрузить слова 😕</p>`; return; }
    }
    const saved = (store.get("wheel", {}) || {}).round;
    if (saved && !saved.done && saved.words.every(w => BY.has(w.key))) { R = saved; render(); return; }
    newRound();
  };

  let paying = false;
  async function newRound() {
    if (!window.Wallet || paying) return;
    const r = makeRound();
    // знакомых слов пока мало — игра закрыта, бурекасы НЕ списываем
    if (!r) { showToast("🔒 Выучи ещё слова — и игра откроется"); if (window.openMinigames) openMinigames(); return; }
    paying = true;
    const ok = await Wallet.spend(PRICE);                     // 🥐 списывает сервер (eco.js); не хватило — окно «Нужно ещё…»
    paying = false;
    if (!ok) { if (!document.getElementById("wwBoard") && window.openMinigames) openMinigames(); return; }
    R = r;
    const st = store.get("wheel", {});
    st.seen = [r.base, ...(st.seen || []).filter(k => k !== r.base)].slice(0, 300);
    st.round = R; store.set("wheel", st);
    showToast(`−${PRICE} 🥐 · удачи!`);
    render();
  }

  // ---------- ЭКРАН ----------
  function render() {
    box.innerHTML = `
      <div class="mg-top"><button class="mg-back" id="wwBack" aria-label="Назад">‹</button><div class="mg-title">Буквы по кругу</div>${Wallet.chip()}</div>
      <div class="ww-board" id="wwBoard"></div>
      <div class="ww-info" id="wwInfo">${R.found.length ? "" : `<span class="ww-tip">👆 Веди пальцем по буквам</span>`}</div>
      <div class="ww-play" id="wwPlay">
        <div class="ww-word" id="wwWord" dir="rtl"></div>
        <div class="ww-wheel" id="wwWheel"><svg class="ww-lines" id="wwLines"></svg></div>
        <button class="ww-tool ww-shuf" id="wwShuf" aria-label="Перемешать">🔀</button>
        <button class="ww-tool ww-hint" id="wwHint" aria-label="Подсказка">💡<i id="wwHintP"></i></button>
      </div>`;
    document.getElementById("wwBack").onclick = () => openMinigames();
    drawBoard();
    buildWheel();
    hintBadge();
    document.getElementById("wwShuf").onclick = shuffle;
    document.getElementById("wwHint").onclick = hint;
    if (R.done) showWin(false);
  }

  // клетки кроссворда
  function cellMap() {
    const m = new Map();
    R.words.forEach(w => {
      const n = w.key.length;
      for (let k = 0; k < n; k++) {
        const x = w.x + (w.dir === "h" ? k : 0), y = w.y + (w.dir === "h" ? 0 : k), id = x + "," + y;
        const c = m.get(id) || { x, y, ch: w.key[k], fin: false, words: [] };
        if (k === n - 1) c.fin = true;
        c.words.push(w.key); m.set(id, c);
      }
    });
    return m;
  }
  function drawBoard() {
    const m = cellMap(), all = [...m.values()];
    const x0 = Math.min(...all.map(c => c.x)), x1 = Math.max(...all.map(c => c.x)), y0 = Math.min(...all.map(c => c.y)), y1 = Math.max(...all.map(c => c.y));
    const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
    const b = document.getElementById("wwBoard");
    const size = Math.max(30, Math.min(46, Math.floor((Math.min(window.innerWidth, 460) - 40) / cols) - 4, Math.floor(260 / rows) - 4));
    b.style.setProperty("--ww-c", size + "px");
    b.style.gridTemplateColumns = `repeat(${cols}, var(--ww-c))`;
    b.style.gridTemplateRows = `repeat(${rows}, var(--ww-c))`;
    b.innerHTML = all.map(c => {
      const shown = c.fin && TO_FINAL[c.ch] ? TO_FINAL[c.ch] : c.ch;
      const found = c.words.some(k => R.found.includes(k)), open = R.open.includes(c.x + "," + c.y);
      // справа налево: x = 0 — крайний правый столбец
      return `<div class="ww-cell${found ? " on" : open ? " peek" : ""}" data-id="${c.x},${c.y}" style="grid-column:${x1 - c.x + 1};grid-row:${c.y - y0 + 1}">${found || open ? shown : ""}</div>`;
    }).join("");
    b.querySelectorAll(".ww-cell").forEach(el => el.onclick = () => {
      const c = m.get(el.dataset.id), k = c && c.words.find(k => R.found.includes(k));
      if (k) { info(BY.get(k)); say(BY.get(k)); }
    });
  }
  function reveal(key) {
    const w = R.words.find(w => w.key === key); if (!w) return;
    const m = cellMap();
    for (let k = 0; k < key.length; k++) {
      const x = w.x + (w.dir === "h" ? k : 0), y = w.y + (w.dir === "h" ? 0 : k);
      const el = document.querySelector(`.ww-cell[data-id="${x},${y}"]`), c = m.get(x + "," + y);
      if (!el) continue;
      setTimeout(() => {
        el.textContent = c.fin && TO_FINAL[c.ch] ? TO_FINAL[c.ch] : c.ch;
        el.classList.remove("peek"); el.classList.add("on", "ww-pop");
      }, k * 90);
    }
  }

  // круг с буквами
  function geom() {
    const wh = document.getElementById("wwWheel"), D = wh.clientWidth || 250, n = R.letters.length;
    const rad = D / 2 - (n > 5 ? 38 : 40);
    return { D, pos: R.letters.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return { x: D / 2 + rad * Math.cos(a), y: D / 2 + rad * Math.sin(a) }; }) };
  }
  function buildWheel() {
    const wh = document.getElementById("wwWheel");
    els.forEach(e => e.remove()); els = [];
    R.letters.forEach(ch => { const e = document.createElement("div"); e.className = "ww-l"; e.setAttribute("dir", "rtl"); e.textContent = ch; wh.appendChild(e); els.push(e); });
    place();
    wh.onpointerdown = down; wh.onpointermove = move; wh.onpointerup = up; wh.onpointercancel = up;
    window.addEventListener("resize", place);
  }
  function place() {
    if (!document.getElementById("wwWheel")) return;
    const { pos } = geom();
    els.forEach((e, i) => { e.style.left = pos[i].x + "px"; e.style.top = pos[i].y + "px"; });
    lines();
  }
  function local(e) { const r = document.getElementById("wwWheel").getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function hit(p) {
    const { pos } = geom(), r = (els[0] ? els[0].offsetWidth : 60) / 2 + 4;
    let best = -1, bd = 1e9;
    pos.forEach((q, i) => { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < r && d < bd) { bd = d; best = i; } });
    return best;
  }
  function down(e) {
    if (busy || R.done) return;
    const p = local(e), i = hit(p);
    if (i < 0) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {}
    drawing = true; path = [i]; ptr = p;
    vibrate("light"); playSound("pop");
    paint();
  }
  function move(e) {
    if (!drawing) return;
    ptr = local(e);
    const i = hit(ptr);
    if (i >= 0) {
      if (path.length > 1 && path[path.length - 2] === i) { path.pop(); vibrate("light"); }        // вернулся назад — убрать букву
      else if (!path.includes(i)) { path.push(i); vibrate("light"); playSound("pop"); }
    }
    paint();
  }
  function up() {
    if (!drawing) return;
    drawing = false; ptr = null;
    const word = path.map(i => R.letters[i]).join("");
    path = [];
    paint(word);
    if (word.length >= 2) check(word);
  }
  function paint(keepWord) {
    els.forEach((e, i) => e.classList.toggle("sel", path.includes(i)));
    const w = document.getElementById("wwWord");
    const s = keepWord != null ? keepWord : path.map(i => R.letters[i]).join("");
    w.textContent = shape(s);
    w.classList.toggle("show", !!s);
    lines();
  }
  function lines() {
    const svg = document.getElementById("wwLines"); if (!svg) return;
    const { D, pos } = geom();
    svg.setAttribute("viewBox", `0 0 ${D} ${D}`);
    const pts = path.map(i => pos[i]);
    if (drawing && ptr && pts.length) pts.push(ptr);
    svg.innerHTML = pts.length > 1 ? `<polyline points="${pts.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ")}"/>` : "";
  }

  // ---------- ПРОВЕРКА СЛОВА ----------
  function check(word) {
    const w = document.getElementById("wwWord");
    const inGrid = R.words.some(x => x.key === word);
    if (inGrid && !R.found.includes(word)) {
      R.found.push(word); save();
      reveal(word);
      const e = BY.get(word);
      info(e); say(e);
      playSound("right"); vibrate("success");
      w.classList.add("ok");
      setTimeout(() => { w.classList.remove("ok", "show"); w.textContent = ""; }, 700);
      if (R.found.length === R.words.length) win();
      return;
    }
    if (inGrid || R.bonus.includes(word)) { bad(g("Это слово уже есть 👍"), false); return; }
    if (knownWords().known.has(word)) {                       // знакомое слово, которого нет в кроссворде, — бонус (без очков)
      R.bonus.push(word); save();
      const e = BY.get(word);
      info(e, "⭐ Бонус"); say(e);
      playSound("right"); vibrate("success");
      w.classList.add("ok");
      setTimeout(() => { w.classList.remove("ok", "show"); w.textContent = ""; }, 700);
      return;
    }
    bad("Такого слова нет в уроках", true);
  }
  function bad(text, wrong) {
    const w = document.getElementById("wwWord");
    w.classList.remove("ww-shake"); void w.offsetWidth; w.classList.add("ww-shake", "no");
    if (wrong) { playSound("wrong"); vibrate("error"); } else vibrate("warning");
    document.getElementById("wwInfo").innerHTML = `<span class="ww-tip">${text}</span>`;
    setTimeout(() => { w.classList.remove("no", "show", "ww-shake"); w.textContent = ""; }, 650);
  }
  function info(e, tag) {
    const el = document.getElementById("wwInfo"); if (!el || !e) return;
    el.innerHTML = `<div class="ww-found${tag ? " bonus" : ""}">${tag ? `<small>${tag}</small>` : ""}<span class="ww-he" dir="rtl">${e.he}</span>
      <span class="ww-ru"><span class="tr">${e.tr}</span> — <b>${g(e.ru)}</b></span><button class="listen small" id="wwSay" aria-label="Послушать">🔊</button></div>`;
    document.getElementById("wwSay").onclick = () => say(e);
  }
  const say = (e) => { if (e && typeof speak === "function") speak(e.he, { audio: e.audio }); };

  // ---------- КНОПКИ ----------
  function shuffle() {
    if (drawing || R.done) return;
    const n = R.letters.length;
    let perm = shuf([...Array(n).keys()]);
    for (let k = 0; k < 5 && perm.every((p, i) => p === i); k++) perm = shuf(perm);
    const L = [], E = [];
    perm.forEach((to, from) => { L[to] = R.letters[from]; E[to] = els[from]; });
    R.letters = L; els = E; save();
    place(); vibrate("light");
  }
  function hintBadge() {
    const p = document.getElementById("wwHintP"); if (!p) return;
    p.textContent = R.hintFree ? "1" : "0";
    p.classList.toggle("paid", !R.hintFree);
    const b = document.getElementById("wwHint"); if (b) b.classList.toggle("used", !R.hintFree);
  }
  // 💡 открыть одну букву: одна бесплатная подсказка за раунд
  function hint() {
    if (R.done || busy) return;
    if (!R.hintFree) { showToast("Подсказка уже использована — ещё будет в новом раунде"); vibrate("warning"); return; }
    const m = cellMap();
    const closed = [...m.values()].filter(c => !R.open.includes(c.x + "," + c.y) && !c.words.some(k => R.found.includes(k)));
    if (!closed.length) return;
    R.hintFree = false;
    const c = closed[Math.floor(Math.random() * closed.length)], id = c.x + "," + c.y;
    R.open.push(id);
    const el = document.querySelector(`.ww-cell[data-id="${id}"]`);
    if (el) { el.textContent = c.fin && TO_FINAL[c.ch] ? TO_FINAL[c.ch] : c.ch; el.classList.add("peek", "ww-pop"); }
    vibrate("light"); hintBadge();
    // если подсказки открыли слово целиком — оно найдено
    R.words.forEach(w => {
      if (R.found.includes(w.key)) return;
      let all = true;
      for (let k = 0; k < w.key.length; k++) { const x = w.x + (w.dir === "h" ? k : 0), y = w.y + (w.dir === "h" ? 0 : k); if (!R.open.includes(x + "," + y)) all = false; }
      if (all) { R.found.push(w.key); reveal(w.key); info(BY.get(w.key)); say(BY.get(w.key)); }
    });
    save();
    if (R.found.length === R.words.length) win();
  }

  // ---------- ПОБЕДА ----------
  function win() {
    R.done = true; save();
    busy = true;
    setTimeout(() => { busy = false; playSound("finish"); vibrate("success"); if (window.HAnim) HAnim.confetti({ size: "big" }); showWin(true); }, 900);
  }
  function showWin(fresh) {
    const play = document.getElementById("wwPlay");
    document.getElementById("wwInfo").innerHTML = "";
    play.innerHTML = `<div class="ww-win${fresh ? " fresh" : ""}">
        <div class="ww-bird" id="wwBird"></div>
        <div class="ww-win-h">Все слова найдены! 🎉</div>
        <div class="ww-chips">${R.words.concat((R.bonus || []).map(k => ({ key: k, bonus: true }))).map(w => { const e = BY.get(w.key); return e ? `<button class="ww-chip${w.bonus ? " bonus" : ""}" data-k="${w.key}"><span dir="rtl">${e.he}</span><small>${g(e.ru)}</small></button>` : ""; }).join("")}</div>
        <button class="btn blue" id="wwMore">Ещё раунд — ${PRICE} 🥐</button>
        <button class="btn ghost" id="wwMenu">К мини-играм</button></div>`;
    play.querySelectorAll(".ww-chip").forEach(b => b.onclick = () => say(BY.get(b.dataset.k)));
    document.getElementById("wwMore").onclick = () => newRound();
    document.getElementById("wwMenu").onclick = () => openMinigames();
    if (window.HAnim) HAnim.mascot(document.getElementById("wwBird"), fresh ? "cheer" : "happy", { size: 100 });
  }

  // для автотестов: wwTest.known() — словарь игрока, wwTest.rounds() — возможные раунды, wwTest.status() = wheelStatus(),
  // wwTest.ladder() — сколько раундов после 1, 2, … уроков по порядку курса (для порога в osnova.md)
  window.wwTest = {
    round: () => R, check: (k) => check(k), course: () => COURSE,
    known: () => [...knownWords().known.keys()], rounds: () => rounds(knownWords()).map(x => x.b.key), status: () => wheelStatus(),
    async ladder(minBase) {
      await loadDict();
      const keep = MIN_BASE; if (minBase) MIN_BASE = minBase;
      const out = [], done = new Set();
      COURSE.forEach((L, i) => { done.add(L.id); const k = knownWords({ done, parts: {} }); out.push({ lessons: i + 1, id: L.id, words: k.known.size, rounds: rounds(k).length }); });
      MIN_BASE = keep;
      return out;
    }
  };
})();
