// =====================================================
// АВТОПИЛОТ ДЛЯ ТЕСТИРОВЩИКА: квест проходит сам — смотришь анимации, движки, сцены.
// Включается в ⚙️ → Режим тестировщика → 🤖 Автопилот. В квесте: ⏩ — сделать текущий шаг, ▶️ — пройти всё.
// =====================================================
(function () {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  let running = false, busy = false;
  const click = (el) => { if (el) el.dispatchEvent(new MouseEvent("click", { bubbles: true })); };
  async function waitFor(fn, ms) { const t = Date.now(); while (Date.now() - t < (ms || 15000)) { const v = fn(); if (v) return v; await sleep(150); } return null; }
  const P = () => window.PLACES && quest && PLACES[quest.place];
  const gk = () => (profile && profile.gender === "f" ? "f" : "m");
  // плавно провести героя джойстиком до x
  async function walkTo(x) {
    const me = $(".pl-me"); if (!me || !stage._walkTo) return;
    let cur = parseFloat(me.style.left) + 60;
    me.classList.add("walking"); me.classList.toggle("left", x < cur);
    while (Math.abs(cur - x) > 6) { cur += Math.sign(x - cur) * Math.min(14, Math.abs(x - cur)); stage._walkTo(cur); await sleep(16); }
    stage._walkTo(x); me.classList.remove("walking"); await sleep(250);
  }
  async function goView(v) {
    for (let i = 0; i < 4 && stage.current && stage.current() !== v; i++) { click(stage.current() > v ? $("#mkL") : $("#mkR")); await sleep(500); }
  }

  // один шаг квеста — правильно и с паузами, чтобы было видно анимации
  async function doStep() {
    if (!quest || busy) return;
    busy = true;
    try {
      const st = quest.steps[qStep];
      if (!st) return;
      if (st.options) {
        const good = st.options.find(o => o.ok);
        const btn = await waitFor(() => [...document.querySelectorAll(".q-opt:not([disabled])")].find(b => { const h = b.querySelector(".he"); return h && h.textContent === g(good.he); }));
        await sleep(400); if (btn) btn.click();
      } else if (st.shop) {
        await waitFor(() => $(".mk-chip"));
        const p = P();
        for (const x of st.shop.list) {
          const sp = p && p.spots.find(s => s.kind === x.item);
          if (sp) await goView(sp.view);
          click([...document.querySelectorAll(`.mk-spot[data-kind="${x.item}"]`)].find(e => !e.classList.contains("pl-got") && !e.classList.contains("got")));
          await sleep(700);
        }
      } else if (st.ride) {
        await waitFor(() => $(".pl-ride-spot")); await sleep(1500);
        for (const x of st.ride.list) { click($(`.pl-ride-spot[data-kind="${x.item}"]`)); await sleep(900); }
      } else if (st.walk) {
        await waitFor(() => $(".pl-joy")); await sleep(600);
        const p = P(), T = p.walk.table;
        for (const x of st.walk.list) {
          const sp = p.spots.find(s => s.kind === x.item); if (!sp) continue;
          await walkTo(sp.x + sp.w / 2); click($(".pl-act")); await sleep(500);
          await walkTo((T.x1 + T.x2) / 2); await sleep(600);
        }
      } else if (st.go) {
        await waitFor(() => $(".pl-joy")); await sleep(600);
        const d = P().walk.goto.door; await walkTo(d[0] + d[2] / 2); await sleep(300); click($(".pl-act"));
      } else if (st.family) {
        const quiz = st.family.quiz[gk()];
        for (const q of quiz) { await waitFor(() => $(".q-fam-ask"), 40000); await sleep(700); click($(`.pl-fam-m[data-id="${q.id}"]`)); await sleep(1500); }
      } else if (st.catch) {
        await waitFor(() => $(".q-catch")); await sleep(2600); click($(`.q-catch[data-id="${st.catch.right}"]`));
      } else if (st.game) {
        await waitFor(() => $(".gm-body > *")); await sleep(900);
        await playGame(st.game);
      }
    } finally { busy = false; }
  }
  // мини-игры: нажал предмет → нажал место (как пальцем, только само)
  const put = async (a, b, ms) => { click($(a)); await sleep(250); click($(b)); await sleep(ms || 600); };
  async function playGame(c) {
    const t = c.type;
    if (t === "wrap") for (const o of c.order) await put(`.wr-bowl[data-drag="${o.id}"]`, ".wr-wrap", 700);
    if (t === "plan") for (const x of c.steps) await put(`.pl2-item[data-drag="${x.item}"]`, `.pl2-room[data-drop="${x.room}"]`, 1200);
    if (t === "shelf") for (const x of c.list) { click($(`.sh-box[data-id="${x.id}"]`)); await sleep(700); }
    if (t === "notepad") { await sleep(1200); click($(`.np-line[data-i="${c.lines.findIndex(x => x.bad)}"]`)); }
    if (t === "body") for (const x of c.parts) { click($(`.bd-zone[data-id="${x.id}"]`)); await sleep(1300); }
    if (t === "pills") { const map = { m: c.need.m || 0, d: c.need.d || 0, e: c.need.e || 0 }; let i = 0;
      for (const k of ["m", "d", "e"]) for (let n = 0; n < map[k]; n++) await put(`.pi-pill[data-drag="p${i++}"]`, `.pi-slot[data-drop="${k}"]`, 500);
      await sleep(400); click($("#piOk")); }
    if (t === "desktop") { await sleep(800); for (const x of c.tasks) { click($(`.dk-app[data-id="${x.app}"]`)); await sleep(1300); } }
    if (t === "form") { for (const f of c.fields) await put(`.fm-card[data-drag="${f.id}"]`, `.fm-field[data-drop="${f.id}"]`, 500);
      await sleep(500); const gm = $(".gm"); if (gm && gm._sign) gm._sign(); }
    if (t === "haggle") {
      const NUMS = [5, 8, 10, 12, 15, 18, 20, 25, 30];
      for (const n of c.need) {
        const st = c.stalls.find(x => x.id === n.id);
        for (let k = 0; k < c.stalls.length; k++) {
          const nm = $("#hgCard .hg-name .he"); if (nm && nm.textContent === g(st.he) && $("#hgGo")) break;
          click($("#hgR")); await sleep(450);
        }
        const r = $("#hgR2"); if (!r) continue;
        const steps = NUMS.filter(x => x <= st.price && x >= Math.floor(st.price / 3));
        r.value = String(steps.indexOf(steps.find(x => x >= st.min))); r.dispatchEvent(new Event("input"));
        await sleep(600); click($("#hgGo")); await sleep(1200);
      }
    }
  }
  async function runAll() {
    running = true; ui();
    let guard = 0;
    while (running && quest && $(".st-wrap") && guard++ < 200) {
      const before = qStep;
      if (qStep >= quest.steps.length) break;
      await doStep();
      await waitFor(() => !running || qStep !== before || !$(".st-wrap"), 20000);
      await sleep(400);
    }
    running = false; ui();
  }
  // кнопки ⏩ / ▶️ поверх квеста
  function ui() {
    const wrap = $(".st-wrap");
    let box = $("#autoBox");
    if (!wrap || !(window.autoMode && autoMode())) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement("div"); box.id = "autoBox"; box.className = "auto-box";
      box.innerHTML = `<button id="autoStep" title="Сделать шаг">⏩</button><button id="autoRun" title="Пройти всё"></button>`;
      wrap.appendChild(box);
      box.querySelector("#autoStep").onclick = (e) => { e.stopPropagation(); doStep(); };
      box.querySelector("#autoRun").onclick = (e) => { e.stopPropagation(); if (running) { running = false; ui(); } else runAll(); };
    }
    box.querySelector("#autoRun").textContent = running ? "⏸" : "▶️";
  }
  window.autoUI = ui;
})();
