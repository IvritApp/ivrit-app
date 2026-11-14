// =====================================================
// store.js — МАКОЛЕТ: магазин, по которому ходишь.
// Три вида: налево (овощи и фрукты) · прямо (касса и хлеб) · направо (холодильник).
//
//   const st = createStore(viewEl, { gender, profile })
//   st.look(0 | 1 | 2)          → повернуться (налево / касса / направо)
//   st.onPick = (kind, el) => …  → нажали на товар
//   st.pick(el) / st.shake(el)   → взяли (летит в корзину) / не то (трясётся)
//   st.say(who, html), st.hide(), st.food(kind), st.wrap(img, cb), st.destroy()
// =====================================================
(function () {
  const VW = 360, VH = 440, NV = 3;
  const FOCUS = [180, 550, 900];     // куда смотрим в каждом виде (центр кадра по x)
  const BLUE = "#3a8ad6";

  // ---------- Товары (рисунок в коробке 40×30, с объёмом: блики и тени) ----------
  const HL = (x, y, rx, ry, o) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o || .45}"/>`;
  const SH = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000" opacity=".14"/>`;
  const ball = (x, y, r, c, d) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><path d="M${x - r * .7},${y + r * .55} A${r},${r} 0 0 0 ${x + r * .95},${y - r * .1} A${r * 1.1},${r * 1.1} 0 0 1 ${x - r * .7},${y + r * .55}Z" fill="${d}" opacity=".55"/>${HL(x - r * .35, y - r * .4, r * .3, r * .2, .5)}`;
  const P = {
    bread: `${SH(20, 27, 17, 2.5)}<path d="M3,25 Q1,11 13,8 Q20,4 28,8 Q39,11 37,25Z" fill="#b8742f"/><path d="M5,19 Q6,9 15,8.5 Q20,6 27,9 Q35,10 35,19 Q20,13 5,19Z" fill="#d89a52"/>
      <path d="M12,10 l3,7 M19,8.5 l3,7 M26,9.5 l3,7" stroke="#f0c98a" stroke-width="2.2" stroke-linecap="round"/>${HL(14, 11, 5, 1.6, .35)}`,
    pita: `${SH(20, 27, 17, 2.5)}<ellipse cx="20" cy="23" rx="17" ry="5" fill="#d8ac6c"/><ellipse cx="20" cy="19.5" rx="17" ry="5" fill="#e6bf82"/><ellipse cx="20" cy="16" rx="17" ry="5.5" fill="#f1d39d"/>
      <circle cx="12" cy="15.5" r="1.1" fill="#c99456"/><circle cx="22" cy="17" r="1.4" fill="#c99456"/><circle cx="28" cy="14.5" r="1" fill="#c99456"/>${HL(16, 13.5, 6, 1.5, .4)}`,
    milk: `${SH(20, 29.5, 8, 1.5)}<rect x="17" y="0" width="6" height="3" rx="1" fill="${BLUE}"/><path d="M17.5,3 L22.5,3 L22.5,7 Q27,9 27,13 L27,28 Q27,30 25,30 L15,30 Q13,30 13,28 L13,13 Q13,9 17.5,7Z" fill="#fbfdff" stroke="#c9dcec" stroke-width=".8"/>
      <rect x="13.4" y="15" width="13.2" height="9" fill="${BLUE}"/><text x="20" y="22" text-anchor="middle" font-size="6.2" font-weight="700" fill="#fff" font-family="Arial, sans-serif">חלב</text>
      <rect x="23.5" y="11" width="2" height="16" rx="1" fill="#000" opacity=".06"/><path d="M15.5,10 L15.5,14 M15.5,25 L15.5,27.5" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`,
    cheese: `${SH(20, 26.5, 17, 2)}<path d="M4,25 L36,25 L36,13 L10,8Z" fill="#ffd35a"/><path d="M4,25 L36,25 L36,13 L4,25Z" fill="#efb93a"/>
      <circle cx="15" cy="15" r="2" fill="#e8b23a"/><circle cx="26" cy="19" r="2.5" fill="#d9a12a"/><circle cx="31" cy="15" r="1.4" fill="#e8b23a"/>${HL(16, 11, 5, 1.2, .4)}`,
    eggs: `${SH(20, 28.5, 18, 1.6)}<path d="M4,6 L36,6 L34,15 L6,15Z" fill="#d9c7ad"/><rect x="2" y="15" width="36" height="13" rx="2" fill="#c9b49a"/>
      <path d="M2,21.5 L38,21.5" stroke="#b39d82" stroke-width="1"/>
      <ellipse cx="9" cy="14.5" rx="4.2" ry="5" fill="#fff7ea"/><ellipse cx="20" cy="14" rx="4.2" ry="5" fill="#fbeedc"/><ellipse cx="31" cy="14.5" rx="4.2" ry="5" fill="#fff7ea"/>
      ${HL(7.6, 12.4, 1.2, 1.7, .9)}${HL(18.6, 11.9, 1.2, 1.7, .9)}${HL(29.6, 12.4, 1.2, 1.7, .9)}
      <circle cx="9" cy="25" r="1.4" fill="#b39d82"/><circle cx="20" cy="25" r="1.4" fill="#b39d82"/><circle cx="31" cy="25" r="1.4" fill="#b39d82"/>`,
    tomatoes: `${SH(20, 27, 16, 2)}${ball(11, 20, 7, "#e5483d", "#a8261d")}${ball(27, 20, 7, "#ef5a4a", "#a8261d")}${ball(19, 13, 6.5, "#e04237", "#a8261d")}
      <path d="M19,6.5 l-3,-1 M19,6.5 l3,-1 M19,6.5 l0,-2.5 M11,13 l-2.5,-1 M11,13 l2.5,-1 M27,13 l-2.5,-1 M27,13 l2.5,-1" stroke="#3f8f4c" stroke-width="1.6" stroke-linecap="round"/>`,
    cucumbers: `${SH(20, 27.5, 17, 2)}<path d="M4,15 Q4,11 9,11 L32,9 Q36,9 36,12.5 Q36,16 32,16 L9,18 Q4,18 4,15Z" fill="#2f7d3c"/>
      <path d="M6,23 Q6,19 11,19 L33,19 Q37,19 37,22.5 Q37,26 33,26 L11,27 Q6,27 6,23Z" fill="#3a8f47"/>
      <path d="M9,13 L32,11.5 M11,21.5 L33,21" stroke="#5fb06b" stroke-width="1" stroke-linecap="round"/>
      ${[[8, 14], [11, 12.5], [13, 15.5], [16, 13], [19, 15], [21, 12], [24, 14.2], [27, 11.6], [29, 13.8], [32, 12], [10, 24], [13, 21], [15, 25], [18, 22.5], [21, 24.5], [23, 21], [26, 23.8], [29, 21.2], [31, 24], [34, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".45" fill="#e6f5e8"/>`).join("")}`,
    apples: `${SH(20, 27, 16, 2)}${ball(11, 20, 7, "#9ccc4a", "#5d8f22")}${ball(27, 20, 7, "#8cc23e", "#5d8f22")}${ball(19, 13, 6.8, "#a6d453", "#5d8f22")}
      <path d="M19,6.5 q0.5,-3 2.5,-4.5" stroke="#7a5233" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M21,4 q4,-2 6,1 q-4,2 -6,-1Z" fill="#3f8f4c"/>`,
    bananas: `${SH(22, 27, 15, 2)}<path d="M8,6 Q6,22 22,26 Q32,27 36,20 Q24,24 15,17 Q11,12 11,6Z" fill="#f2c230"/>
      <path d="M11,6 Q11,18 22,21 Q30,22 35,15 Q24,18 17,12 Q14,9 14,6Z" fill="#ffd94f"/>
      <path d="M14,6 Q15,14 23,16 Q30,16 33,10 Q24,13 19,9 Q17,7.5 17,6Z" fill="#ffe680"/>
      <rect x="8" y="3" width="9" height="4" rx="1.5" fill="#6d4a2b"/><circle cx="36" cy="20" r="1" fill="#5a3d24"/><circle cx="35" cy="15" r="1" fill="#5a3d24"/><circle cx="33" cy="10" r="1" fill="#5a3d24"/>`,
    lemons: `${SH(20, 27, 16, 2)}${ball(12, 20, 6.5, "#f7dc3c", "#c9a40e")}${ball(27, 20, 6.5, "#fbe14a", "#c9a40e")}${ball(19.5, 13, 6, "#f7dc3c", "#c9a40e")}`,
    oranges: `${SH(20, 27, 16, 2)}${ball(11, 20, 7, "#f5932b", "#c25f0a")}${ball(27, 20, 7, "#fa9d35", "#c25f0a")}${ball(19, 13, 6.8, "#f5932b", "#c25f0a")}<circle cx="19" cy="7" r=".9" fill="#5d8f22"/>`,
    peppers: `${SH(20, 27, 16, 2)}<path d="M5,14 Q5,8 11,9 Q17,8 17,14 Q17,25 11,26 Q5,25 5,14Z" fill="#e23b2e"/><path d="M22,14 Q22,8 28,9 Q34,8 34,14 Q34,25 28,26 Q22,25 22,14Z" fill="#f3c62c"/>
      <path d="M11,9 l0,-4 M28,9 l0,-4" stroke="#3f8f4c" stroke-width="2.2" stroke-linecap="round"/>${HL(8.5, 13, 1.5, 3, .45)}${HL(25.5, 13, 1.5, 3, .5)}`,
    potatoes: `${SH(20, 27, 16, 2)}<ellipse cx="12" cy="20" rx="8" ry="6" fill="#c89a62"/><ellipse cx="27" cy="20.5" rx="8" ry="5.5" fill="#bf8e55"/><ellipse cx="19" cy="13.5" rx="7.5" ry="5.5" fill="#d1a56d"/>
      <circle cx="10" cy="19" r=".8" fill="#8d6538"/><circle cx="29" cy="21" r=".8" fill="#8d6538"/><circle cx="21" cy="12" r=".8" fill="#8d6538"/>${HL(16, 11.5, 3, 1.3, .3)}`,
    yogurt: `${SH(20, 28.5, 16, 1.5)}${[6, 17, 28].map((x, i) => `<path d="M${x},10 L${x + 8},10 L${x + 7},28 L${x + 1},28Z" fill="#fff" stroke="#dde6ee" stroke-width=".6"/><rect x="${x - .5}" y="8" width="9" height="3" rx="1" fill="${["#e8413a", "#b57be0", "#3a8ad6"][i]}"/><rect x="${x + 1.5}" y="16" width="5" height="5" rx="1" fill="${["#ffb3ae", "#dcc4f2", "#b9d8f5"][i]}"/>`).join("")}`,
    water: `${SH(20, 29.5, 14, 1.5)}${[9, 24].map(x => `<path d="M${x},2 L${x + 4},2 L${x + 4},6 Q${x + 8},8 ${x + 8},12 L${x + 8},29 L${x - 4},29 L${x - 4},12 Q${x - 4},8 ${x},6Z" fill="#cfe9fb" opacity=".95"/><rect x="${x - .5}" y="0" width="5" height="2.5" rx="1" fill="#3a8ad6"/><rect x="${x - 4}" y="16" width="12" height="6" fill="#3a8ad6"/>${HL(x - 1.5, 13, .9, 3, .8)}`).join("")}`,
    soda: `${SH(20, 29.5, 14, 1.5)}${[9, 24].map(x => `<path d="M${x},2 L${x + 4},2 L${x + 4},6 Q${x + 8},8 ${x + 8},12 L${x + 8},29 L${x - 4},29 L${x - 4},12 Q${x - 4},8 ${x},6Z" fill="#6b2a1c"/><rect x="${x - .5}" y="0" width="5" height="2.5" rx="1" fill="#e8413a"/><rect x="${x - 4}" y="15" width="12" height="7" fill="#e8413a"/>${HL(x - 1.5, 12, .9, 3, .5)}`).join("")}`,
    juice: `${SH(20, 29.5, 14, 1.5)}${[8, 22].map(x => `<path d="M${x},6 L${x + 5},1 L${x + 10},6Z" fill="#ffe0b8"/><rect x="${x}" y="6" width="10" height="23" fill="#fff3e2" stroke="#f3d2a8" stroke-width=".6"/>${ball(x + 5, 17, 3.6, "#f5932b", "#c25f0a")}`).join("")}`,
    snack: `${SH(20, 29, 15, 1.5)}${[5, 21].map((x, i) => `<path d="M${x},4 L${x + 14},4 L${x + 15},28 L${x - 1},28Z" fill="${i ? "#e8413a" : "#f3c62c"}"/><path d="M${x},4 L${x + 14},4 L${x + 14},6 L${x},6Z" fill="#000" opacity=".15"/><circle cx="${x + 7}" cy="16" r="4" fill="#fff" opacity=".85"/>${HL(x + 3, 10, 1.2, 4, .4)}`).join("")}`,
    cookies: `${SH(20, 29, 17, 1.5)}<rect x="3" y="8" width="34" height="20" rx="1.5" fill="#3a5fa8"/><rect x="3" y="8" width="34" height="5" fill="#2c4a86"/><circle cx="14" cy="19" r="5" fill="#c98a4b"/><circle cx="26" cy="20" r="4.5" fill="#b9773a"/><circle cx="13" cy="18" r=".8" fill="#5a3518"/><circle cx="26" cy="19" r=".8" fill="#5a3518"/>`,
    cans: `${SH(20, 29, 17, 1.5)}${[4, 15.5, 27].map((x, i) => `<rect x="${x}" y="10" width="9" height="19" rx="1.5" fill="#c9d1da"/><rect x="${x}" y="13" width="9" height="13" fill="${["#e8413a", "#3f8f5a", "#f3c62c"][i]}"/><rect x="${x + 1.5}" y="13" width="1.5" height="13" fill="#fff" opacity=".35"/>`).join("")}`,
    rice: `${SH(20, 29, 16, 1.5)}${[4, 21].map(x => `<path d="M${x + 1},5 L${x + 14},5 L${x + 15},28 L${x},28Z" fill="#f4efe2" stroke="#d9d0bb" stroke-width=".6"/><rect x="${x + 2}" y="12" width="11" height="8" rx="1" fill="#3f8f5a"/>`).join("")}`,
    bag: `${SH(20, 29, 15, 1.5)}<path d="M8,10 L32,10 L35,28 L5,28Z" fill="#fff" stroke="#d7e3ee"/><path d="M13,10 q0,-8 7,-8 q7,0 7,8" stroke="#d7e3ee" stroke-width="2" fill="none"/>
      <text x="20" y="23" text-anchor="middle" font-size="7" font-weight="700" fill="${BLUE}" font-family="Arial, sans-serif">שקית</text>`
  };
  function prodSVG(kind, w) {
    return `<svg viewBox="0 0 40 30" width="${w}" height="${Math.round(w * .75)}" overflow="visible">${P[kind] || P.bag}</svg>`;
  }
  const inner = (kind, x, y, w) => `<svg x="${x}" y="${y}" width="${w}" height="${w * .75}" viewBox="0 0 40 30" overflow="visible">${P[kind]}</svg>`;

  // ---------- Что где лежит (координаты мира 1080×440: вид 0 — x 0…360, вид 1 — 360…720, вид 2 — 720…1080) ----------
  // Каждая «ячейка» — это товар, на который можно нажать (kind) — несколько штук рядом
  const SPOTS = [];
  // Вид 0: стеллаж-горка с ящиками
  [["bananas", "apples", "lemons", "oranges"], ["tomatoes", "cucumbers", "peppers", "potatoes"]].forEach((row, r) => {
    row.forEach((k, i) => SPOTS.push({ kind: k, view: 0, x: 8 + i * 88, y: 196 + r * 84, w: 80, h: 56, type: "crate", price: ["5.90", "7.90", "6.90", "4.90", "6.90", "5.90", "9.90", "3.90"][r * 4 + i] }));
  });
  // Вид 1: хлебная этажерка слева от кассы
  SPOTS.push({ kind: "bread", view: 1, x: 372, y: 182, w: 86, h: 44, type: "rack", price: "8.90" });
  SPOTS.push({ kind: "bread", view: 1, x: 372, y: 244, w: 86, h: 44, type: "rack", price: "8.90" });
  SPOTS.push({ kind: "pita", view: 1, x: 372, y: 306, w: 86, h: 44, type: "rack", price: "6.50" });
  // Вид 2: холодильник, три дверцы × четыре полки
  const FRIDGE = [["milk", "yogurt", "cheese", "eggs"], ["water", "juice", "cheese", "eggs"], ["soda", "soda", "water", "yogurt"]];
  FRIDGE.forEach((col, c) => col.forEach((k, r) => SPOTS.push({ kind: k, view: 2, x: 742 + c * 108, y: 96 + r * 72, w: 96, h: 56, type: "fridge", price: { milk: "6.90", yogurt: "4.50", cheese: "12.90", eggs: "13.90", water: "3.90", juice: "9.90", soda: "7.50" }[k] })));

  function spotHTML(s, i) {
    const n = s.type === "crate" ? 5 : s.type === "rack" ? 2 : 2;
    let units = "";
    if (s.type === "crate") {
      // горка в ящике: два ряда
      units = inner(s.kind, 2, 6, 38) + inner(s.kind, 40, 6, 38) + inner(s.kind, 21, -4, 38) + inner(s.kind, -2, 16, 40) + inner(s.kind, 38, 16, 40);
    } else {
      const w = s.type === "rack" ? 42 : 46;
      for (let k = 0; k < n; k++) units += inner(s.kind, 2 + k * (s.w - w - 4) / (n - 1 || 1), s.h - w * .75 - 6, w);
    }
    const crateFront = s.type === "crate" ? `<rect x="-3" y="${s.h - 22}" width="${s.w + 6}" height="22" rx="2" fill="url(#mkWood)"/><path d="M-3,${s.h - 12} L${s.w + 3},${s.h - 12}" stroke="#8a5a2e" stroke-width="1.2" opacity=".7"/>` : "";
    const tag = `<g transform="translate(${s.w / 2 - 15},${s.h + (s.type === "fridge" ? 2 : 3)})"><rect width="30" height="11" rx="1.5" fill="#fff" stroke="#e1d6c4" stroke-width=".6"/><rect width="30" height="3" fill="#f3c62c"/><text x="15" y="10" text-anchor="middle" font-size="6.6" font-weight="700" fill="#2b2f3a" font-family="Arial, sans-serif">₪${s.price}</text></g>`;
    return `<g class="mk-spot" data-i="${i}" data-kind="${s.kind}" transform="translate(${s.x},${s.y})">
      <rect class="mk-hit" x="-4" y="-6" width="${s.w + 8}" height="${s.h + 18}" fill="transparent"/>
      <g class="mk-units">${units}</g>${crateFront}${tag}</g>`;
  }

  // ---------- Фон: стены, пол, полки ----------
  function decorShelf(x, y, w, kinds) {
    let s = `<rect x="${x}" y="${y + 34}" width="${w}" height="6" fill="url(#mkMetal)"/><rect x="${x}" y="${y + 40}" width="${w}" height="3" fill="#9aa3ad"/>`;
    const step = w / kinds.length;
    kinds.forEach((k, i) => { s += inner(k, x + i * step + 2, y + 2, Math.min(step - 4, 46)); });
    return s;
  }
  function worldSVG() {
    let floor = "";
    for (let x = -540; x < 1620; x += 60) floor += `<path d="M${540 + (x - 540) * .55},392 L${x},440" stroke="#cdbb9b" stroke-width="1.2"/>`;
    [404, 420].forEach(y => floor += `<path d="M0,${y} L1080,${y}" stroke="#cdbb9b" stroke-width="1"/>`);
    let lamps = "";
    for (let x = 40; x < 1080; x += 180) lamps += `<rect x="${x}" y="10" width="100" height="9" rx="4" fill="#fffef6"/><rect x="${x - 10}" y="19" width="120" height="16" fill="url(#mkGlow)"/>`;
    // вид 0: верхняя полка с упаковками + горка с ящиками
    const v0 = decorShelf(10, 64, 340, ["rice", "rice", "cans", "cookies", "cans", "rice", "cookies"]) + decorShelf(10, 120, 340, ["cookies", "snack", "cans", "snack", "cookies", "cans", "snack"]) +
      `<path d="M0,250 L360,250 L360,392 L0,392Z" fill="url(#mkWood)" opacity=".35"/>
       <rect x="0" y="252" width="360" height="8" fill="#8a5a2e" opacity=".6"/><rect x="0" y="336" width="360" height="8" fill="#8a5a2e" opacity=".6"/>`;
    // вид 1: стеллаж за продавцом (снеки, напитки), хлебная этажерка, прилавок
    const v1 = decorShelf(470, 50, 240, ["snack", "snack", "cookies", "snack", "snack"]) + decorShelf(470, 104, 240, ["soda", "water", "juice", "soda", "water"]) +
      decorShelf(470, 158, 240, ["cans", "rice", "cookies", "cans", "rice"]) +
      `<rect x="366" y="170" width="98" height="226" rx="3" fill="none" stroke="#8d969f" stroke-width="4"/>
       ${[226, 288, 350].map(y => `<rect x="366" y="${y}" width="98" height="5" fill="url(#mkMetal)"/>`).join("")}`;
    // вид 2: холодильник
    let v2 = `<rect x="730" y="58" width="338" height="340" rx="8" fill="#e9eef3"/><rect x="736" y="64" width="326" height="22" rx="4" fill="#2f6fb2"/>
      <text x="899" y="80" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Arial, sans-serif">❄</text>`;
    for (let c = 0; c < 3; c++) {
      const x = 738 + c * 108;
      v2 += `<rect x="${x}" y="90" width="104" height="300" fill="url(#mkCold)"/>`;
      for (let r = 0; r < 4; r++) v2 += `<rect x="${x}" y="${150 + r * 72}" width="104" height="4" fill="#c4ced8"/>`;
    }
    return `<svg class="mk-world-svg" viewBox="0 0 1080 440" width="1080" height="440">
      <defs>
        <linearGradient id="mkWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe4cf"/><stop offset="1" stop-color="#e2d3b8"/></linearGradient>
        <linearGradient id="mkFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4d6bc"/><stop offset="1" stop-color="#d6c4a3"/></linearGradient>
        <linearGradient id="mkWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c99a63"/><stop offset="1" stop-color="#a87442"/></linearGradient>
        <linearGradient id="mkMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9dee3"/><stop offset="1" stop-color="#aeb6be"/></linearGradient>
        <linearGradient id="mkCold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset="1" stop-color="#d9ebf6"/></linearGradient>
        <linearGradient id="mkGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe8" stop-opacity=".7"/><stop offset="1" stop-color="#fffbe8" stop-opacity="0"/></linearGradient>
        <linearGradient id="mkCounter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b98a58"/><stop offset="1" stop-color="#8f6236"/></linearGradient>
      </defs>
      <rect width="1080" height="44" fill="#f3ede2"/><rect y="44" width="1080" height="348" fill="url(#mkWall)"/>
      ${lamps}
      <rect y="392" width="1080" height="48" fill="url(#mkFloor)"/>${floor}<rect y="386" width="1080" height="7" fill="#c7b391"/>
      ${v0}${v1}${v2}
      ${SPOTS.map(spotHTML).join("")}
    </svg>`;
  }
  // Стекло холодильника и прилавок — поверх товаров и продавца
  function overlaySVG() {
    let glass = "";
    for (let c = 0; c < 3; c++) {
      const x = 738 + c * 108;
      glass += `<rect x="${x}" y="90" width="104" height="300" fill="#dff1ff" opacity=".12"/>
        <path d="M${x + 14},90 L${x + 40},90 L${x + 4},170 L${x},170 L${x},120Z" fill="#fff" opacity=".28"/>
        <path d="M${x + 60},90 L${x + 70},90 L${x + 20},200 L${x + 10},200Z" fill="#fff" opacity=".16"/>
        <rect x="${x - 2}" y="88" width="108" height="304" rx="3" fill="none" stroke="#b7c0c9" stroke-width="5"/>
        <rect x="${x + 92}" y="200" width="5" height="60" rx="2.5" fill="#8d969f"/>`;
    }
    return `<svg class="mk-over" viewBox="0 0 1080 440" width="1080" height="440">
      ${glass}
      <!-- прилавок -->
      <rect x="470" y="266" width="250" height="12" rx="3" fill="#e9e1d2"/>
      <rect x="474" y="278" width="246" height="112" fill="url(#mkCounter)"/>
      <rect x="474" y="278" width="246" height="7" fill="#000" opacity=".15"/>
      ${[0, 1, 2].map(i => `<rect x="${486 + i * 80}" y="296" width="66" height="80" rx="3" fill="#000" opacity=".07"/>`).join("")}
      <!-- касса -->
      <rect x="642" y="226" width="64" height="40" rx="5" fill="#3b4352"/><rect x="648" y="231" width="52" height="14" rx="2" fill="#a8e0b6"/>
      <text x="674" y="242" text-anchor="middle" font-size="10" font-weight="700" fill="#2c6b3f" font-family="Arial, sans-serif">₪</text>
      ${[0, 1, 2, 3].map(i => `<rect x="${650 + i * 12}" y="251" width="9" height="5" rx="1.5" fill="#d7dde4"/>`).join("")}
      <rect x="612" y="246" width="20" height="20" rx="3" fill="#2b2f3a"/><rect x="615" y="249" width="14" height="7" rx="1" fill="#7fb2e5"/>
    </svg>`;
  }
  // Вход: фасад маколета
  function facadeSVG() {
    return `<svg viewBox="0 0 360 440" width="360" height="440">
      <rect width="360" height="440" fill="#bfe0f5"/><rect y="70" width="360" height="330" fill="#e8dcc4"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path d="M0,${110 + i * 38} L360,${110 + i * 38}" stroke="#d7c8ab" stroke-width="2"/>`).join("")}
      <rect x="30" y="86" width="300" height="52" rx="6" fill="#2f7d4b"/><rect x="30" y="86" width="300" height="10" rx="5" fill="#fff" opacity=".12"/>
      <text x="180" y="125" text-anchor="middle" font-size="32" font-weight="700" fill="#fff" font-family="Arial, 'DejaVu Sans', sans-serif">מכולת</text>
      <rect x="20" y="160" width="80" height="120" rx="4" fill="#9fc8e4"/><rect x="260" y="160" width="80" height="120" rx="4" fill="#9fc8e4"/>
      ${inner("soda", 30, 220, 30)}${inner("snack", 62, 222, 30)}${inner("bread", 270, 222, 32)}${inner("juice", 302, 222, 30)}
      <rect x="112" y="158" width="136" height="242" fill="#efe4cf"/>
      <rect x="112" y="158" width="136" height="14" fill="#f8f3ea"/><rect x="140" y="162" width="80" height="5" rx="2" fill="#fffef6"/>
      <rect x="112" y="200" width="136" height="4" fill="#aeb6be"/><rect x="112" y="250" width="136" height="4" fill="#aeb6be"/>
      ${inner("snack", 116, 176, 30)}${inner("cookies", 148, 178, 30)}${inner("snack", 182, 176, 30)}${inner("cans", 214, 178, 30)}
      ${inner("soda", 116, 226, 30)}${inner("water", 148, 226, 30)}${inner("juice", 182, 226, 30)}${inner("soda", 214, 226, 30)}
      <rect x="150" y="290" width="60" height="70" rx="3" fill="#a87442"/><rect x="146" y="286" width="68" height="6" fill="#e9e1d2"/>
      <rect x="112" y="360" width="136" height="40" fill="#d9c9ab"/>
      <rect class="mk-door-l" x="116" y="162" width="64" height="238" fill="#a9d0ea" stroke="#7d8b99" stroke-width="3"/>
      <rect class="mk-door-r" x="180" y="162" width="64" height="238" fill="#a9d0ea" stroke="#7d8b99" stroke-width="3"/>
      <rect y="400" width="360" height="40" fill="#b9b1a3"/>
      <rect x="40" y="356" width="56" height="44" rx="3" fill="#a87442"/>${inner("apples", 40, 334, 28)}${inner("oranges", 66, 334, 28)}
    </svg>`;
  }

  // Продавец — тот же «живой» человечек, что и наш аватар (с объёмом)
  const SELLER = { head: "round", skin: 2, eyes: "round", mouth: "grin", hair: "short", hairColor: 0, top: "shirt", topColor: 4, bottom: "jeans", bottomColor: 0,
                   gender: "m", body: "base", beard: "short", payot: "none", headwear: "kippa", kippaColor: 0 };

  function createStore(view, opts) {
    opts = opts || {};
    let dead = false, cur = 1;
    const root = document.createElement("div");
    root.className = "hs-stage mk-stage";
    root.innerHTML = `<div class="mk-world"></div><div class="mk-basket" hidden><span>🧺</span><b>0</b></div>`;
    view.appendChild(root);
    const world = root.querySelector(".mk-world");
    world.innerHTML = worldSVG();
    // продавец за прилавком (между стеллажом и прилавком)
    const seller = document.createElement("div");
    seller.className = "mk-seller";
    let sv = "";
    try { if (window.HirbisAvatar) sv = HirbisAvatar.svg(HirbisAvatar.sanitize(Object.assign(HirbisAvatar.defaults("m"), SELLER)), { pose: "stand" }); } catch (e) {}
    seller.innerHTML = sv || (window.friendFigureSVG ? friendFigureSVG("m") : "");
    world.appendChild(seller);
    world.insertAdjacentHTML("beforeend", overlaySVG());
    const goods = document.createElement("div"); goods.className = "mk-goods"; world.appendChild(goods);
    const basket = root.querySelector(".mk-basket");
    const meA = document.createElement("div"); meA.className = "mk-anchor me"; root.appendChild(meA);
    const frA = document.createElement("div"); frA.className = "mk-anchor fr"; root.appendChild(frA);
    const who = { seller, me: meA, friend: frA };

    // Вход: двери разъезжаются, «заходим» внутрь
    const intro = document.createElement("div");
    intro.className = "mk-intro"; intro.innerHTML = facadeSVG();
    root.appendChild(intro);
    const introMs = 2300;
    if (window.cutDoorHole) window.cutDoorHole(intro);        // в проёме дверей видно, что внутри
    setTimeout(() => intro.classList.add("open"), 250);      // двери плавно разъезжаются (1,4 с)
    setTimeout(() => intro.classList.add("walk"), 1000);     // шаг внутрь с лёгким покачиванием (1,9 с)
    setTimeout(() => { intro.remove(); seller.classList.add("wave"); setTimeout(() => seller.classList.remove("wave"), 1800); }, introMs);

    let bubble = null, anchor = null, top = false;
    let sc = 1;
    function fit() {
      const w = view.clientWidth, h = view.clientHeight;
      // во всю ширину; если экран выше картинки — лишнее сверху (потолок), пол всегда внизу
      // во всю ширину; если экран высокий — немного приближаем (не больше чем в 1,3 раза), остаток сверху — потолок
      sc = Math.max(w / VW, Math.min(h / VH, w / VW * 1.3));
      const fx = FOCUS[cur];
      const x = Math.min(0, Math.max(w - 1080 * sc, -fx * sc + w / 2));
      const y = h >= VH * sc ? h - VH * sc : (h - VH * sc) / 2;
      world.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
      // фасад при входе: во всю ширину, снизу; сверху небо
      const isc = Math.max(w / VW, Math.min(h / VH, w / VW * 1.3));
      intro.style.transform = `translate(${(w - VW * isc) / 2}px, ${h - VH * isc}px) scale(${isc})`;
      placeBubble();
    }
    function look(i) {
      i = Math.max(0, Math.min(NV - 1, i));
      if (i === cur) return cur;
      cur = i;
      root.classList.remove("mk-step"); void root.offsetWidth; root.classList.add("mk-step");
      fit();
      return cur;
    }
    fit();
    window.addEventListener("resize", fit);
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(view); }

    // нажатие на товар
    const api = { onPick: null };
    world.addEventListener("click", (e) => {
      const g = e.target.closest(".mk-spot");
      if (!g || dead) return;
      e.stopPropagation();
      if (api.onPick) api.onPick(g.dataset.kind, g);
    });
    // свайп влево/вправо
    let sx = null;
    root.addEventListener("pointerdown", e => { sx = e.clientX; });
    root.addEventListener("pointerup", e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 60 && api.onSwipe) api.onSwipe(dx < 0 ? 1 : -1);
    });

    function shake(g) { g.classList.remove("mk-no"); void g.getBBox(); g.classList.add("mk-no"); }
    let taken = 0;
    function pick(g) {
      // одна штука «летит» в корзину
      const units = [...g.querySelectorAll(".mk-units > svg")].filter(u => !u.classList.contains("gone"));
      const u = units[units.length - 1];
      const r = (u || g).getBoundingClientRect(), vr = root.getBoundingClientRect();
      const fly = document.createElement("div");
      fly.className = "mk-fly";
      fly.innerHTML = prodSVG(g.dataset.kind, r.width);
      fly.style.left = (r.left - vr.left) + "px"; fly.style.top = (r.top - vr.top) + "px";
      root.appendChild(fly);
      if (u) u.classList.add("gone");
      basket.hidden = false;
      const br = basket.getBoundingClientRect();
      fly.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${(br.left - r.left) * .5}px, ${(br.top - r.top) * .5 - 60}px) scale(1.1)`, opacity: 1, offset: .5 },
        { transform: `translate(${br.left - r.left}px, ${br.top - r.top}px) scale(.35)`, opacity: .2 }
      ], { duration: 750, easing: "ease-in-out" }).onfinish = () => {
        fly.remove(); taken++;
        basket.querySelector("b").textContent = taken;
        basket.classList.remove("bump"); void basket.offsetWidth; basket.classList.add("bump");
      };
    }
    // На кассе: покупки из корзины ложатся на прилавок
    function food(kind) {
      const n = goods.children.length;
      const el = document.createElement("div");
      el.className = "mk-good";
      el.style.left = (488 + (n % 5) * 30) + "px"; el.style.top = (n >= 5 ? 222 : 238) + "px";
      el.style.setProperty("--ix", (575 - (488 + (n % 5) * 30)) + "px");
      el.innerHTML = prodSVG(kind, 34);
      goods.appendChild(el);
      el.animate([{ transform: "translate(-80px, 160px) scale(.6)", opacity: 0 }, { transform: "translate(-30px, -50px) scale(1.05)", opacity: 1, offset: .6 }, { transform: "none" }],
        { duration: 700, easing: "ease-out", fill: "both" });
      if (kind !== "bag") { taken = Math.max(0, taken - 1); basket.querySelector("b").textContent = taken; if (!taken) basket.hidden = true; }
      seller.classList.remove("mk-scan"); void seller.offsetWidth; seller.classList.add("mk-scan");
    }
    function wrap(img, cb) {
      [...goods.children].forEach((t, k) => { t.getAnimations().forEach(a => a.cancel()); t.style.transitionDelay = (k * 70) + "ms"; t.classList.add("in"); });
      setTimeout(() => {
        const b = document.createElement("img");
        b.className = "mk-bagfull"; b.src = "assets/" + img + ".png"; b.alt = "";
        goods.appendChild(b);
      }, 900);
      setTimeout(() => goods.classList.add("give"), 2200);
      setTimeout(() => { if (cb) cb(); }, 3600);
    }

    // Реплики-пузыри
    function placeBubble() {
      if (!bubble || !anchor) return;
      const vr = view.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      const cx = ar.left - vr.left + ar.width / 2, bw = bubble.offsetWidth, vw = view.clientWidth;
      const left = Math.min(Math.max(cx - bw / 2, 8), vw - 8 - bw);
      bubble.style.left = left + "px";
      bubble.style.setProperty("--tx", Math.min(Math.max(cx - left, 18), bw - 18) + "px");
      if (top) { bubble.style.top = "46px"; bubble.style.bottom = "auto"; }
      else bubble.style.bottom = Math.max(view.clientHeight - (ar.top - vr.top) + 10, 0) + "px";
    }
    function hide() {
      if (!bubble) return;
      const b = bubble; bubble = null; anchor = null;
      b.classList.remove("show"); seller.classList.remove("talk");
      setTimeout(() => b.remove(), 300);
    }
    function say(speaker, html) {
      hide();
      if (dead) return null;
      const b = document.createElement("div");
      b.className = "hs-st-bubble " + speaker;
      b.innerHTML = html;
      root.appendChild(b);
      bubble = b; anchor = who[speaker] || who.friend; top = speaker === "seller";
      if (speaker === "seller") { if (cur !== 1) look(1); seller.classList.add("talk"); }
      placeBubble();
      requestAnimationFrame(() => b.classList.add("show"));
      return b;
    }
    function destroy() {
      dead = true;
      window.removeEventListener("resize", fit);
      if (ro) ro.disconnect();
      root.remove();
    }
    return Object.assign(api, { say, hide, destroy, fit, root, food, wrap, look, pick, shake, introMs, current: () => cur, views: NV });
  }

  window.createStore = createStore;
  window.storeProdSVG = prodSVG;
  window.goodSVG = prodSVG;     // значки «Моего заказа» рисуются так же
})();
