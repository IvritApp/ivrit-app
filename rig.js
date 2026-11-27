// =====================================================
// ЖИВОЙ ПЕРСОНАЖ ИЗ ОДНОГО РИСУНКА (27.11, вторая версия).
// Codex нарисовал героя целиком в «А-позе» (руки отведены) и тот же рисунок без лица (Фото от ChatGPT\flat\rig\rig_<id>_base/blank.png).
// claude-docs/tools/rig_base.ps1 убирает фон, rig_cut.ps1 вырезает из ОДНОГО рисунка голову, тело, плечи, предплечья
// (поэтому всё совпадает без швов), rig_face.ps1 делает «заплатки» кожи (c_eyeL/R, c_mouth) из рисунка без лица.
// Лицо: глаза и улыбка — родные с рисунка; моргание, смех, «ой» и рот при разговоре — заплатка кожи + линии/рот поверх (SVG).
// Суставы (плечо, локоть, шея) — группы с transform-origin; руки ПОД телом (рукава закрывают плечо).
// Корень — <div class="ci rig">: размер, «говорит», прыжок от радости и т. п. работают как у кадров chars.js.
// Состояния — те же классы (ci-happy / act-cheer, ci-oops, talking …) → data-e (глаза), data-m (рот), data-p (поза).
// Холст как у кадров: 360×768, фигура 647 px от y=114, центр x=183.5.
// =====================================================
(function () {
  const V = "20261127s";
  const BOX_W = 360, BOX_H = 768, FIG_TOP = 114, FIG_H = 647, FIG_CX = 183.5;
  // всё — в пикселях рисунка 1024×1536 (claude-docs/tools/rigwork/b_<id>/cut.txt, face.txt)
  const RIGS = {
    david: {
      top: 23, bottom: 1511, cx: 511, headTurn: 1, lips: "#693919", lid: "#392013",
      part: { uarmA: [242, 427, 138, 165], farmA: [135, 523, 184, 290], uarmB: [645, 427, 135, 167], farmB: [703, 525, 185, 288],
        head: [406, 23, 189, 277], body: [136, 288, 750, 1223] },
      joint: { shA: [333.7, 476.7], elA: [283, 560], shB: [690.3, 476.7], elB: [741, 560], neck: [507, 300] },
      eyes: { L: [476, 160, 25, 22], R: [542, 158, 25, 22] }, mouth: [513, 213, 50, 17]
    },
    tzila: {
      top: 27, bottom: 1473, cx: 514, headTurn: .45, lips: "#7a2a22", lid: "#301308",   // длинные волосы: голову почти не поворачиваем (иначе шов в волосах на уровне шеи)
      part: { uarmA: [282, 422, 143, 172], farmA: [180, 525, 171, 294], uarmB: [604, 422, 138, 176], farmB: [672, 528, 171, 291],
        head: [332, 27, 350, 285], body: [181, 300, 633, 1173] },
      joint: { shA: [372.2, 456.3], elA: [312, 559], shB: [655.8, 456.3], elB: [716, 559], neck: [514, 312] },
      eyes: { L: [468, 181, 31, 24], R: [553, 180, 29, 25] }, mouth: [509, 235, 33, 13]
    }
  };
  const has = (id) => !!RIGS[id];

  function build(id) {
    const R = RIGS[id], k = FIG_H / (R.bottom - R.top);
    const X = (u) => ((FIG_CX + (u - R.cx) * k) / BOX_W * 100).toFixed(3);
    const Y = (v) => ((FIG_TOP + (v - R.top) * k) / BOX_H * 100).toFixed(3);
    const Wp = (w) => (w * k / BOX_W * 100).toFixed(3);
    const src = (n) => `assets/rig/${id}/${n}.webp?v=${V}`;
    const img = (n) => { const b = R.part[n]; return `<img class="rg-p rg-${n}i" src="${src(n)}" alt="" draggable="false" decoding="async" style="left:${X(b[0])}%;top:${Y(b[1])}%;width:${Wp(b[2])}%">`; };
    const org = (j) => `transform-origin:${X(j[0])}% ${Y(j[1])}%`;
    const J = R.joint;
    // лицо: SVG точно поверх головы, координаты — пиксели рисунка
    const h = R.part.head, E = R.eyes, M = R.mouth;
    const cover = (n, e) => `<image class="rg-cov rg-cov-${n}" href="${src("c_" + n)}" xlink:href="${src("c_" + n)}" x="${e[0] - e[2] - 2}" y="${e[1] - e[3] - 2}" width="${Math.floor(2 * e[2] + 5)}" height="${Math.floor(2 * e[3] + 5)}"/>`;
    // полуприкрытые глаза: та же заплатка, но во вложенном svg высотой в половину (он всегда обрезает — надёжнее clip-path на старых телефонах)
    const half = (n, e) => { const x = e[0] - e[2] - 2, y = e[1] - e[3] - 2, w = Math.floor(2 * e[2] + 5), hh = Math.floor(2 * e[3] + 5);
      return `<svg x="${x}" y="${y}" width="${w}" height="${Math.round(hh * .48)}" viewBox="0 0 ${w} ${Math.round(hh * .48)}" overflow="hidden"><image href="${src("c_" + n)}" xlink:href="${src("c_" + n)}" x="0" y="0" width="${w}" height="${hh}"/></svg>`; };
    const lids = (cls, dir) => ["L", "R"].map(s => { const e = E[s], x0 = e[0] - e[2] * .78, x1 = e[0] + e[2] * .78, cy = e[1] + e[3] * (dir > 0 ? .1 : .25);
      return `<path class="${cls}" d="M${x0} ${cy} Q${e[0]} ${cy + dir * e[3] * .7} ${x1} ${cy}" fill="none" stroke="${R.lid}" stroke-width="${Math.max(3, e[3] * .2)}" stroke-linecap="round"/>`; }).join("");
    const mx = M[0], my = M[1], mw = M[2] * 1.5;                                    // mw — ширина рта
    const dark = "#4a1a12", tongue = "#e8817a";
    const shape = (n, d, inner) => `<g class="rg-m rg-m-${n}">${d}${inner || ""}</g>`;
    const oval = (w, hh, dy) => `<ellipse cx="${mx}" cy="${my + (dy || 0)}" rx="${w / 2}" ry="${hh / 2}" fill="${dark}"/>`;
    const mouths =
      shape("M", `<path d="M${mx - mw * .36} ${my} Q${mx} ${my + mw * .06} ${mx + mw * .36} ${my}" fill="none" stroke="${R.lips}" stroke-width="${Math.max(3, mw * .07)}" stroke-linecap="round"/>`) +
      shape("E", oval(mw * .62, mw * .2), `<rect x="${mx - mw * .25}" y="${my - mw * .1}" width="${mw * .5}" height="${mw * .07}" rx="${mw * .03}" fill="#fff"/>`) +
      shape("A", oval(mw * .6, mw * .4, mw * .05), `<ellipse cx="${mx}" cy="${my + mw * .17}" rx="${mw * .2}" ry="${mw * .08}" fill="${tongue}"/>`) +
      shape("O", oval(mw * .34, mw * .38, mw * .04), `<ellipse cx="${mx}" cy="${my + mw * .15}" rx="${mw * .1}" ry="${mw * .06}" fill="${tongue}"/>`) +
      shape("laugh", `<path d="M${mx - mw * .38} ${my - mw * .06} Q${mx} ${my - mw * .1} ${mx + mw * .38} ${my - mw * .06} Q${mx + mw * .3} ${my + mw * .42} ${mx} ${my + mw * .42} Q${mx - mw * .3} ${my + mw * .42} ${mx - mw * .38} ${my - mw * .06}Z" fill="${dark}"/>`,
        `<path d="M${mx - mw * .3} ${my - mw * .05} L${mx + mw * .3} ${my - mw * .05} L${mx + mw * .26} ${my + mw * .05} L${mx - mw * .26} ${my + mw * .05}Z" fill="#fff"/><ellipse cx="${mx}" cy="${my + mw * .3}" rx="${mw * .16}" ry="${mw * .08}" fill="${tongue}"/>`) +
      shape("sad", `<path d="M${mx - mw * .3} ${my + mw * .08} Q${mx} ${my - mw * .12} ${mx + mw * .3} ${my + mw * .08}" fill="none" stroke="${R.lips}" stroke-width="${Math.max(3, mw * .07)}" stroke-linecap="round"/>`) +
      shape("surprised", oval(mw * .22, mw * .28, mw * .03));
    const face = `<svg class="rg-face" viewBox="${h[0]} ${h[1]} ${h[2]} ${h[3]}" style="left:${X(h[0])}%;top:${Y(h[1])}%;width:${Wp(h[2])}%" aria-hidden="true">
      <g class="rg-eyec">${cover("eyeL", E.L)}${cover("eyeR", E.R)}</g><g class="rg-eyeh">${half("eyeL", E.L)}${half("eyeR", E.R)}</g>
      <g class="rg-lid rg-lid-closed">${lids("", 1)}</g><g class="rg-lid rg-lid-happy">${lids("", -1)}</g>
      <g class="rg-mouthc">${cover("mouth", M)}</g>${mouths}</svg>`;
    const arm = (s) => `<div class="rg-g rg-arm${s}" style="${org(J["sh" + s])}">${img("uarm" + s)}
      <div class="rg-g rg-farm${s}" style="${org(J["el" + s])}">${img("farm" + s)}</div></div>`;
    return `${arm("A")}${arm("B")}<div class="rg-g rg-torso" style="${org([R.cx, J.neck[1] + 400])}">${img("body")}
      <div class="rg-g rg-head" style="${org(J.neck)};--ht:${R.headTurn}">${img("head")}${face}</div></div>`;
  }

  window.HirbisRig = {
    has,
    html(id, cls) {
      // БОЛЬШИЕ ЖЕСТЫ — целыми рисунками Codex (кадры chars.js того же холста): руки вверх из частей выглядят «сломанными»,
      // поэтому «ура» и «машет» — готовые позы, мягкая смена; всё остальное (дыхание, голова, моргание, рот по звуку) — части
      const V2 = window.HirbisChars ? HirbisChars.V : "";
      const pose = (f) => `<img class="rg-pose rg-pose-${f}" src="assets/chars/${id}_${f}.webp?v=${V2}" alt="" draggable="false" decoding="async">`;
      return `<div class="ci rig ${cls || ""}" data-char="${id}" data-e="open" data-m="smile" data-p="" style="aspect-ratio:${BOX_W}/${BOX_H}"><div class="rg">${build(id)}</div>${pose("happy")}${pose("wave")}</div>`;
    }
  };

  // ---------- «мозг»: что показать сейчас (раз в 70 мс для всех живых на экране) ----------
  const TALK = ["A", "E", "O", "M", "E", "A", "M", "O"];
  function decide(el, now) {
    const c = el.classList, up = el.parentElement, act = (n) => c.contains("ci-" + n) || !!(up && up.closest(".act-" + n));
    let e = "open", m = "smile", p = "";
    const happy = c.contains("ci-happy") || act("cheer") || act("thumb"), oops = c.contains("ci-oops") || act("oops");
    const talking = c.contains("talking") || c.contains("lip-on") || !!(up && up.closest(".talking, .act-talk"));
    if (happy) { e = "happy"; m = "laugh"; p = "cheer"; }
    else if (oops) { e = "half"; m = "sad"; p = "oops"; }
    else if (act("think") || c.contains("ci-listen")) { e = "half"; m = "smile"; p = "think"; }
    else if (c.contains("ci-surprised")) { m = "surprised"; p = "surprised"; }
    else if (act("wave")) p = "wave";
    else if (c.contains("ci-point")) p = "point";
    if (c.contains("ci-blinking") && e !== "happy") e = "closed";
    if (!happy && !oops) {
      if (c.contains("lip-on") && el.dataset.lv !== undefined) {
        const lv = +el.dataset.lv || 0;
        m = lv === 0 ? "M" : lv === 1 ? "E" : lv === 2 ? (el._alt ? "A" : "E") : (el._alt ? "O" : "A");
      } else if (c.contains("lip-on")) m = "M";                          // звук грузится — рот закрыт
      else if (talking) m = TALK[Math.floor(now / 120) % TALK.length];
      if (talking && p === "") p = "talk";
    }
    return { e, m, p };
  }
  function tick() {
    if (document.hidden) return;
    const now = performance.now();
    document.querySelectorAll(".ci.rig").forEach(el => {
      if (el.closest("[hidden]")) return;
      // пока не загрузились ВСЕ части — фигуру не показываем (иначе на медленной сети видны руки без тела)
      if (!el._ready) { if ([...el.querySelectorAll(".rg img")].every(i => i.complete)) { el._ready = true; el.classList.add("rg-ready"); } }
      const lv = el.dataset.lv;
      if (lv !== el._lv) { el._lv = lv; if (lv && lv !== "0") el._alt = !el._alt; }   // новый слог — другая форма рта
      const s = decide(el, now), d = el.dataset;
      if (d.e !== s.e) d.e = s.e;
      if (d.m !== s.m) d.m = s.m;
      if (d.p !== s.p) d.p = s.p;
    });
  }
  setInterval(tick, 70);
  // заранее скачать части Давида и Цили (по 9 маленьких картинок), когда приложение уже открылось
  setTimeout(() => Object.keys(RIGS).forEach(id => Object.keys(RIGS[id].part).concat(["c_eyeL", "c_eyeR", "c_mouth"])
    .forEach(n => { const i = new Image(); i.src = `assets/rig/${id}/${n}.webp?v=${V}`; })), 2500);
})();
