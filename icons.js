// =====================================================
// icons.js — КАРТИНКИ К СЛОВАМ в стиле Hirbis (плоский рисунок, мягкие тени, блики)
//   wordIcon(id, size)  → HTML картинки (SVG или PNG из assets/) или "" если картинки нет
//   WORD_ICON_IDS       → список всех готовых картинок
// В уроке у слова поле "img": "<id>" (ставит скрипт по переводу).
// Партия 1 (13.11): уровни 1–2.
// =====================================================
(function () {
  const C = { ink: "#2b2f3a", blue: "#3a8ad6", sky: "#8fc5f2", green: "#3cae5c", red: "#e5484d", orange: "#ff8a35",
    yellow: "#ffcf3f", skin: "#f2c7a3", skinD: "#d99d72", brown: "#8a5a35", gray: "#c7ced8", white: "#fff" };
  const SH = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * .18}" fill="#000" opacity=".12"/>`;
  const HL = (x, y, rx, ry, o) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o || .45}"/>`;
  const svg = (inner, vb) => `<svg viewBox="${vb || "0 0 48 48"}" width="100%" height="100%" overflow="visible">${inner}</svg>`;

  // --- детали ---
  const hand = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s || 1})"><path d="M-7,6 Q-9,-4 -6,-10 Q-4,-12 -3,-9 L-3,-14 Q-2,-17 0,-16 Q1,-18 3,-16 Q5,-17 6,-14 L6,-9 Q8,-11 9,-8 Q10,-2 7,6Z" fill="${c || C.skin}"/><path d="M-1,-14 L-1,-7 M2,-14 L2,-7" stroke="${C.skinD}" stroke-width=".9" stroke-linecap="round"/></g>`;
  const bubble = (fill, inner) => `${SH(24, 44, 14)}<path d="M8,10 Q8,5 13,5 L35,5 Q40,5 40,10 L40,30 Q40,35 35,35 L22,35 L14,42 L15,35 L13,35 Q8,35 8,30Z" fill="${fill}"/>${HL(16, 11, 5, 2)}${inner}`;
  const tile = (txt, fill, fs) => `${SH(24, 44, 15)}<rect x="7" y="7" width="34" height="34" rx="9" fill="${fill}"/><rect x="7" y="7" width="34" height="12" rx="9" fill="#fff" opacity=".18"/>
    <text x="24" y="${fs > 16 ? 32 : 30}" text-anchor="middle" font-size="${fs || 20}" font-weight="800" fill="#fff" font-family="Arial, sans-serif">${txt}</text>`;
  const arrow = (rot, fill) => `${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${fill || C.blue}"/>${HL(18, 15, 6, 3)}
    <g transform="rotate(${rot} 24 24)"><path d="M14,24 L31,24 M25,17 L32,24 L25,31" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const person = (shirt, hair, extra) => `${SH(24, 45, 11)}<rect x="15" y="27" width="18" height="17" rx="7" fill="${shirt}"/><circle cx="24" cy="17" r="9" fill="${C.skin}"/>
    <path d="M15,16 Q15,6 24,6 Q33,6 33,16 Q29,11 24,11 Q19,11 15,16Z" fill="${hair}"/><circle cx="21" cy="17" r="1.1" fill="${C.ink}"/><circle cx="27" cy="17" r="1.1" fill="${C.ink}"/>
    <path d="M21,21 Q24,23 27,21" stroke="${C.ink}" stroke-width="1.1" fill="none" stroke-linecap="round"/>${extra || ""}`;
  const dots = (n) => { const pos = [[24, 24], [16, 18], [32, 30], [32, 18], [16, 30], [24, 12], [24, 36], [12, 24], [36, 24], [18, 38], [30, 10], [10, 12], [38, 36]];
    return SH(24, 45, 15) + pos.slice(0, n).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="5" fill="${i % 2 ? C.orange : C.yellow}"/>${HL(x - 1.6, y - 1.8, 1.6, 1, .6)}`).join(""); };
  const sun = (cx, cy, r) => `${Array.from({ length: 8 }, (_, i) => `<rect x="${cx - 1.6}" y="${cy - r - 7}" width="3.2" height="5" rx="1.6" fill="${C.yellow}" transform="rotate(${i * 45} ${cx} ${cy})"/>`).join("")}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.yellow}"/>${HL(cx - r * .35, cy - r * .35, r * .3, r * .2)}`;
  const coin = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f2b632"/><circle cx="${x}" cy="${y}" r="${r * .75}" fill="#ffcf3f"/><text x="${x}" y="${y + r * .38}" text-anchor="middle" font-size="${r * 1.05}" font-weight="800" fill="#b5810f" font-family="Arial, sans-serif">₪</text>`;
  let curSize = 64;
  const prod = (kind) => (window.storeProdSVG ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">${window.storeProdSVG(kind, Math.round(curSize * .92))}</div>` : "");
  const png = (name) => `<img src="assets/${name}.png" alt="" style="width:100%;height:100%;object-fit:contain">`;

  // --- сами картинки (id → рисунок) ---
  const I = {
    // уровень 1: первые слова
    hello: () => svg(`${SH(24, 44, 12)}${hand(24, 30, 1.6)}<path d="M8,14 Q6,20 8,26 M40,14 Q42,20 40,26" stroke="${C.blue}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    thanks: () => svg(`${SH(24, 44, 14)}<path d="M24,40 C10,30 6,22 10,15 C13,9 21,9 24,16 C27,9 35,9 38,15 C42,22 38,30 24,40Z" fill="${C.red}"/>${HL(16, 16, 4, 2.5)}`),
    yes: () => svg(bubble(C.green, `<path d="M16,20 L22,26 L33,14" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)),
    no: () => svg(bubble(C.red, `<path d="M17,13 L31,27 M31,13 L17,27" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>`)),
    please: () => svg(`${SH(24, 44, 14)}<rect x="12" y="16" width="24" height="18" rx="3" fill="${C.orange}"/><rect x="10" y="12" width="28" height="7" rx="2" fill="#ff9f5a"/><rect x="22" y="12" width="4" height="22" fill="${C.yellow}"/>
      <path d="M24,12 Q16,4 14,9 Q13,13 24,12 Q32,4 34,9 Q35,13 24,12" fill="${C.yellow}"/>${hand(24, 41, 1.1)}`),
    bye: () => svg(`${SH(24, 44, 12)}<rect x="10" y="6" width="22" height="36" rx="2" fill="#a87442"/><rect x="13" y="9" width="16" height="30" rx="1" fill="#c99a63"/><circle cx="27" cy="25" r="1.6" fill="${C.yellow}"/>${hand(36, 26, 1.1)}<path d="M41,14 Q44,18 42,22" stroke="${C.blue}" stroke-width="2" fill="none" stroke-linecap="round"/>`),
    me: () => svg(person(C.blue, "#5a3d24", `<path d="M33,32 Q40,30 38,24" stroke="${C.skinD}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M36,22 L38,24 L36,26" stroke="${C.ink}" stroke-width="1.5" fill="none"/>`)),
    you: () => svg(person(C.green, "#2b2f3a", "") + `<path d="M4,30 L12,30 M9,27 L12,30 L9,33" stroke="${C.orange}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    want: () => svg(`${SH(24, 44, 12)}<circle cx="24" cy="21" r="15" fill="#fff" stroke="${C.gray}" stroke-width="1.5"/><circle cx="12" cy="39" r="3" fill="#fff" stroke="${C.gray}" stroke-width="1.2"/><circle cx="7" cy="44" r="1.8" fill="#fff" stroke="${C.gray}"/>
      <path d="M24,30 C16,24 15,19 17,16 C19,13 23,14 24,18 C25,14 29,13 31,16 C33,19 32,24 24,30Z" fill="${C.red}"/>`),
    what: () => svg(bubble(C.blue, `<text x="24" y="29" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="Arial, sans-serif">?</text>`)),
    this: () => svg(`${SH(24, 44, 14)}<rect x="22" y="18" width="20" height="20" rx="3" fill="${C.orange}"/><rect x="22" y="18" width="20" height="6" rx="3" fill="#ffad70"/><path d="M4,30 L14,30 Q18,30 18,27 L18,24" stroke="${C.skin}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M14,27 L20,27" stroke="${C.skin}" stroke-width="4" stroke-linecap="round"/>`),
    hungry: () => svg(`${SH(24, 44, 16)}<ellipse cx="24" cy="30" rx="18" ry="9" fill="#fff" stroke="${C.gray}" stroke-width="1.5"/><ellipse cx="24" cy="29" rx="11" ry="5" fill="#eef1f5"/>
      <path d="M6,8 L6,20 M3,8 L3,14 Q3,17 6,17 Q9,17 9,14 L9,8" stroke="${C.gray}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M42,8 Q37,12 40,20 L42,20 Z" fill="${C.gray}"/><path d="M42,20 L42,26" stroke="${C.gray}" stroke-width="2"/>
      <path d="M16,14 Q20,10 24,14 T32,14" stroke="${C.orange}" stroke-width="2" fill="none" stroke-linecap="round"/>`),
    very: () => svg(`${SH(24, 44, 14)}<path d="M24,4 L29,17 L43,17 L32,26 L36,40 L24,32 L12,40 L16,26 L5,17 L19,17Z" fill="${C.yellow}"/>${HL(19, 15, 4, 2.4)}<text x="24" y="30" text-anchor="middle" font-size="12" font-weight="900" fill="${C.orange}" font-family="Arial, sans-serif">!!</text>`),
    eat: () => svg(`${SH(24, 44, 16)}<ellipse cx="24" cy="30" rx="18" ry="9" fill="#fff" stroke="${C.gray}" stroke-width="1.5"/><path d="M14,30 Q24,18 34,30Z" fill="${C.orange}"/><circle cx="20" cy="27" r="2" fill="${C.red}"/><circle cx="27" cy="25" r="2.2" fill="${C.green}"/>
      <path d="M6,6 L6,20 M3,6 L3,12 Q3,15 6,15 Q9,15 9,12 L9,6" stroke="#9aa3ad" stroke-width="2" fill="none" stroke-linecap="round"/>`),
    drink: () => svg(`${SH(24, 45, 10)}<path d="M14,12 L34,12 L31,42 L17,42Z" fill="#dff1ff" stroke="${C.sky}" stroke-width="1.5"/><path d="M15.5,22 L32.5,22 L31,42 L17,42Z" fill="${C.orange}"/><path d="M27,4 L23,30" stroke="${C.red}" stroke-width="2.4" stroke-linecap="round"/>${HL(19, 28, 1.5, 5)}`),
    water: () => svg(`${SH(24, 45, 10)}<path d="M14,10 L34,10 L31,42 L17,42Z" fill="#dff1ff" stroke="${C.sky}" stroke-width="1.5"/><path d="M15.2,18 Q20,16 24,18 T32.8,18 L31,42 L17,42Z" fill="${C.sky}" opacity=".8"/>${HL(19, 28, 1.5, 6)}`),
    shawarma: () => png("gift-shawarma"), pita: () => png("ing-pita"), lafa: () => png("ing-lafa"),
    turkey: () => png("ing-meat-turkey"), chicken: () => png("ing-meat-chicken"), veal: () => png("ing-meat-veal"),
    salad: () => png("ing-salad"), hummus: () => png("ing-hummus"), tahini: () => png("ing-tahini"), spicy: () => png("ing-spicy"), fries: () => png("ing-chips"),
    with: () => svg(`${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${C.green}"/>${HL(18, 15, 6, 3)}<path d="M24,14 L24,34 M14,24 L34,24" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    without: () => svg(`${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${C.red}"/>${HL(18, 15, 6, 3)}<path d="M14,24 L34,24" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    or: () => svg(`${SH(24, 44, 14)}<path d="M24,42 L24,26 M24,26 L12,12 M24,26 L36,12" stroke="${C.blue}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M9,16 L12,12 L16,13 M32,13 L36,12 L39,16" stroke="${C.blue}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="26" r="4" fill="${C.orange}"/>`),
    all: () => svg(`${SH(24, 44, 15)}${[[12, 30], [24, 30], [36, 30], [18, 19], [30, 19], [24, 8]].map(([x, y]) => `<rect x="${x - 5.5}" y="${y - 5.5}" width="11" height="11" rx="2.5" fill="${C.green}"/><path d="M${x - 3},${y} L${x - .5},${y + 2.5} L${x + 3.5},${y - 2.5}" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`).join("")}`),
    howmuch: () => svg(`${SH(24, 44, 14)}<path d="M8,16 L22,6 L40,6 L40,30 L26,40 L8,26Z" fill="${C.yellow}"/><circle cx="34" cy="12" r="2.6" fill="#fff"/><text x="22" y="29" text-anchor="middle" font-size="15" font-weight="800" fill="#9a6a0a" font-family="Arial, sans-serif">₪?</text>`),
    shekel: () => svg(`${SH(24, 44, 14)}${coin(24, 24, 17)}${HL(17, 15, 5, 3)}`),
    n40: () => svg(tile("40", C.blue, 20)), n5: () => svg(tile("5", C.orange, 24)),
    here_take: () => svg(`${SH(24, 44, 14)}<rect x="16" y="8" width="16" height="16" rx="3" fill="${C.orange}"/><rect x="16" y="8" width="16" height="5" rx="2" fill="#ffad70"/>${hand(24, 36, 1.4)}`),
    bonappetit: () => svg(`${SH(24, 44, 16)}<ellipse cx="24" cy="31" rx="18" ry="9" fill="#fff" stroke="${C.gray}" stroke-width="1.5"/><path d="M13,31 Q24,15 35,31Z" fill="#e9a54a"/><path d="M17,25 Q20,21 23,25 M25,22 Q28,18 31,23" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>
      ${[[8, 12], [40, 10], [24, 6]].map(([x, y]) => `<path d="M${x},${y - 4} L${x + 1.2},${y - 1.2} L${x + 4},${y} L${x + 1.2},${y + 1.2} L${x},${y + 4} L${x - 1.2},${y + 1.2} L${x - 4},${y} L${x - 1.2},${y - 1.2}Z" fill="${C.yellow}"/>`).join("")}`),

    // уровень 2: магазин, время суток, количество, где
    morning: () => svg(`${SH(24, 45, 16)}<rect x="4" y="30" width="40" height="12" rx="3" fill="#bfe0f5"/>${sun(24, 30, 9)}<rect x="2" y="30" width="44" height="14" fill="#7fc38a"/>`),
    good: () => svg(`${SH(24, 44, 13)}<path d="M14,22 L20,22 L20,40 L14,40Z" fill="${C.blue}"/><path d="M20,22 L26,10 Q28,6 31,8 Q33,10 31,16 L30,20 L38,20 Q42,20 41,25 L38,37 Q37,40 33,40 L20,40Z" fill="${C.skin}"/><path d="M30,26 L38,26 M30,31 L37,31" stroke="${C.skinD}" stroke-width="1.2" stroke-linecap="round"/>`),
    howareyou: () => svg(`${SH(24, 44, 15)}<path d="M4,8 Q4,4 8,4 L26,4 Q30,4 30,8 L30,20 Q30,24 26,24 L12,24 L7,29 L8,24 Q4,24 4,20Z" fill="${C.blue}"/><text x="17" y="19" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Arial, sans-serif">?</text>
      <path d="M44,22 Q44,18 40,18 L22,18 Q18,18 18,22 L18,34 Q18,38 22,38 L36,38 L41,43 L40,38 Q44,38 44,34Z" fill="${C.green}"/><path d="M26,28 Q31,33 36,28" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="27" cy="24" r="1.4" fill="#fff"/><circle cx="35" cy="24" r="1.4" fill="#fff"/>`),
    okay: () => svg(`${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${C.green}"/>${HL(18, 15, 6, 3)}<text x="24" y="30" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="Arial, sans-serif">OK</text>`),
    day: () => svg(`<rect x="2" y="4" width="44" height="40" rx="8" fill="#bfe0f5"/>${sun(24, 22, 9)}<path d="M2,36 Q24,30 46,36 L46,36 Q46,44 38,44 L10,44 Q2,44 2,36Z" fill="#7fc38a"/>`),
    evening: () => svg(`<rect x="2" y="4" width="44" height="40" rx="8" fill="#f7a76c"/><rect x="2" y="4" width="44" height="16" rx="8" fill="#b57be0" opacity=".55"/><circle cx="24" cy="32" r="9" fill="#ffcf3f"/><path d="M2,32 L46,32 L46,36 Q46,44 38,44 L10,44 Q2,44 2,36Z" fill="#5a6a8a"/>`),
    night: () => svg(`<rect x="2" y="4" width="44" height="40" rx="8" fill="#26345a"/><path d="M30,10 A11,11 0 1 0 38,28 A9,9 0 1 1 30,10Z" fill="#ffe7a1"/>${[[10, 12], [16, 30], [40, 40], [22, 10], [8, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join("")}`),
    bread: () => prod("bread"), milk: () => prod("milk"), cheese: () => prod("cheese"), eggs: () => prod("eggs"),
    tomatoes: () => prod("tomatoes"), cucumbers: () => prod("cucumbers"), apples: () => prod("apples"), bananas: () => prod("bananas"),
    potatoes: () => prod("potatoes"), bag: () => prod("bag"),
    butter: () => svg(`${SH(24, 42, 16)}<path d="M6,26 L20,18 L44,24 L30,32Z" fill="#ffe7a1"/><path d="M6,26 L30,32 L30,40 L6,34Z" fill="#ffd35a"/><path d="M30,32 L44,24 L44,32 L30,40Z" fill="#f2c230"/><path d="M8,26 L30,31" stroke="#fff" stroke-width="1.2" opacity=".5"/>`),
    coffee: () => svg(`${SH(22, 44, 14)}<path d="M8,16 L34,16 L32,38 Q31,42 27,42 L15,42 Q11,42 10,38Z" fill="#fff" stroke="${C.gray}" stroke-width="1.4"/><path d="M34,21 Q42,21 41,28 Q40,34 32,33" stroke="${C.gray}" stroke-width="3" fill="none"/><ellipse cx="21" cy="17" rx="12.5" ry="2.6" fill="#6b3d1f"/>
      <path d="M16,4 Q13,8 16,12 M22,3 Q19,7 22,11 M28,4 Q25,8 28,12" stroke="#c7ced8" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
    tea: () => svg(`${SH(22, 44, 14)}<path d="M8,18 L34,18 L32,38 Q31,42 27,42 L15,42 Q11,42 10,38Z" fill="#fff" stroke="${C.gray}" stroke-width="1.4"/><path d="M34,23 Q42,23 41,30 Q40,36 32,35" stroke="${C.gray}" stroke-width="3" fill="none"/><ellipse cx="21" cy="19" rx="12.5" ry="2.6" fill="#d9952f"/>
      <path d="M26,19 L30,6" stroke="#a87442" stroke-width="1"/><rect x="27" y="2" width="7" height="6" rx="1" fill="${C.green}"/>`),
    there_is: () => svg(`${SH(24, 44, 15)}<path d="M8,18 L24,10 L40,18 L40,36 L24,44 L8,36Z" fill="#c99a63"/><path d="M8,18 L24,26 L40,18 L24,10Z" fill="#e2b989"/><path d="M24,26 L24,44" stroke="#a87442"/><circle cx="34" cy="10" r="8" fill="${C.green}"/><path d="M30,10 L33,13 L38,7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    there_isnt: () => svg(`${SH(24, 44, 15)}<path d="M8,18 L24,26 L40,18 L40,36 L24,44 L8,36Z" fill="#c99a63"/><path d="M8,18 L24,26 L40,18 L24,10Z" fill="#6b4a2b"/><circle cx="34" cy="10" r="8" fill="${C.red}"/><path d="M31,7 L37,13 M37,7 L31,13" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`),
    more: () => svg(`${SH(24, 44, 14)}<circle cx="18" cy="26" r="11" fill="${C.orange}"/>${HL(14, 22, 3, 2)}<circle cx="34" cy="14" r="9" fill="${C.green}"/><path d="M34,9 L34,19 M29,14 L39,14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`),
    also: () => svg(`${SH(24, 44, 16)}<circle cx="14" cy="22" r="9" fill="${C.blue}"/><circle cx="34" cy="22" r="9" fill="${C.blue}"/>${HL(11, 18, 3, 2)}${HL(31, 18, 3, 2)}<path d="M20,36 L28,36 M20,40 L28,40" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>`),
    only: () => svg(`${SH(24, 44, 16)}<circle cx="10" cy="26" r="5" fill="${C.gray}"/><circle cx="38" cy="26" r="5" fill="${C.gray}"/><circle cx="24" cy="24" r="10" fill="${C.orange}"/>${HL(20, 20, 3, 2)}<path d="M24,8 L24,12" stroke="${C.orange}" stroke-width="2.4" stroke-linecap="round"/><text x="24" y="28.5" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" font-family="Arial">1</text>`),
    many: () => svg(dots(13)), few: () => svg(dots(3)),
    kilo: () => svg(`${SH(24, 44, 15)}<path d="M14,16 L34,16 L40,42 L8,42Z" fill="#5a6372"/><circle cx="24" cy="12" r="5" fill="none" stroke="#5a6372" stroke-width="3"/><text x="24" y="35" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="Arial">кг</text>`),
    onion: () => svg(`${SH(24, 44, 13)}<path d="M24,6 Q21,12 22,14 Q10,18 10,30 Q10,42 24,42 Q38,42 38,30 Q38,18 26,14 Q27,12 24,6Z" fill="#c9875a"/><path d="M24,14 Q16,24 18,40 M24,14 Q32,24 30,40" stroke="#a8673c" stroke-width="1.3" fill="none"/>${HL(16, 24, 2.6, 5, .35)}<path d="M24,6 L22,2 M24,6 L27,2" stroke="${C.green}" stroke-width="1.8" stroke-linecap="round"/>`),
    where: () => svg(`${SH(24, 45, 10)}<path d="M24,44 Q10,28 10,18 Q10,4 24,4 Q38,4 38,18 Q38,28 24,44Z" fill="${C.red}"/><circle cx="24" cy="18" r="8" fill="#fff"/><text x="24" y="23" text-anchor="middle" font-size="13" font-weight="900" fill="${C.red}" font-family="Arial">?</text>`),
    here: () => svg(`<ellipse cx="24" cy="40" rx="14" ry="4" fill="${C.green}" opacity=".35"/><path d="M24,40 Q12,26 12,17 Q12,5 24,5 Q36,5 36,17 Q36,26 24,40Z" fill="${C.green}"/><circle cx="24" cy="17" r="5" fill="#fff"/>`),
    there: () => svg(`${SH(14, 44, 6)}<circle cx="14" cy="36" r="4" fill="${C.blue}"/><path d="M18,34 Q28,26 34,18" stroke="${C.gray}" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M38,22 Q31,14 31,10 Q31,4 38,4 Q45,4 45,10 Q45,14 38,22Z" fill="${C.red}"/><circle cx="38" cy="10" r="2.6" fill="#fff"/>`),
    right: () => svg(arrow(0)), left: () => svg(arrow(180)), straight: () => svg(arrow(-90)),
    near: () => svg(`${SH(24, 44, 16)}<rect x="6" y="18" width="16" height="20" rx="3" fill="${C.blue}"/><rect x="26" y="22" width="16" height="16" rx="3" fill="${C.orange}"/><path d="M14,12 L34,12 M18,9 L14,12 L18,15 M30,9 L34,12 L30,15" stroke="${C.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
    n1: () => svg(tile("1", C.green, 24)), n2: () => svg(tile("2", C.blue, 24)), n3: () => svg(tile("3", C.orange, 24)),
    n4: () => svg(tile("4", "#b57be0", 24)), n10: () => svg(tile("10", C.red, 20)), n20: () => svg(tile("20", "#2f9e8f", 20)),
    card: () => svg(`${SH(24, 42, 18)}<rect x="4" y="12" width="40" height="26" rx="4" fill="${C.blue}"/><rect x="4" y="17" width="40" height="5" fill="#26345a"/><rect x="9" y="27" width="9" height="6" rx="1.5" fill="${C.yellow}"/>${HL(14, 15, 7, 1.4, .35)}`),
    cash: () => svg(`${SH(24, 42, 18)}<rect x="6" y="18" width="36" height="20" rx="3" fill="#5fae6c" transform="rotate(-8 24 28)"/><rect x="6" y="14" width="36" height="20" rx="3" fill="#7fc38a"/><circle cx="24" cy="24" r="6" fill="#5fae6c"/><text x="24" y="28" text-anchor="middle" font-size="10" font-weight="900" fill="#fff" font-family="Arial">₪</text>`),
    can: () => svg(`${SH(24, 44, 12)}<rect x="12" y="10" width="24" height="32" rx="2" fill="#a87442"/><rect x="15" y="13" width="18" height="29" rx="1" fill="#2b2f3a"/><path d="M15,13 L29,20 L29,42 L15,42Z" fill="#c99a63"/><circle cx="34" cy="10" r="8" fill="${C.green}"/><path d="M30,10 L33,13 L38,7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    need: () => svg(`${SH(24, 44, 14)}<path d="M24,4 L44,40 L4,40Z" fill="${C.orange}"/><rect x="21.5" y="14" width="5" height="14" rx="2.5" fill="#fff"/><circle cx="24" cy="34" r="2.8" fill="#fff"/>`),
    receipt: () => svg(`${SH(24, 45, 12)}<path d="M12,4 L36,4 L36,44 L33,41 L30,44 L27,41 L24,44 L21,41 L18,44 L15,41 L12,44Z" fill="#fff" stroke="${C.gray}" stroke-width="1.3"/>${[12, 18, 24, 30].map(y => `<path d="M16,${y} L${y === 30 ? 26 : 32},${y}" stroke="${C.gray}" stroke-width="2" stroke-linecap="round"/>`).join("")}<text x="31" y="36" text-anchor="end" font-size="8" font-weight="800" fill="${C.ink}" font-family="Arial">₪25</text>`),
    change: () => svg(`${SH(24, 44, 16)}${coin(16, 28, 10)}${coin(31, 22, 9)}<path d="M38,38 Q44,32 40,26" stroke="${C.green}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M36,26 L40,25 L41,29" stroke="${C.green}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)
  };

  // Перевод (русский, как в уроке) → картинка. Так картинки подставляются ко всем урокам автоматически.
  const BY_RU = {
    "привет": "hello", "спасибо": "thanks", "да": "yes", "нет": "no", "пожалуйста": "please", "до свидания": "bye",
    "я": "me", "хочу": "want", "ты": "you", "что": "what", "это": "this", "очень": "very", "ем": "eat", "пью": "drink", "вода": "water",
    "шаурма": "shawarma", "пита": "pita", "лафа": "lafa", "с": "with", "без": "without", "индейка": "turkey", "курица": "chicken", "телятина": "veal",
    "или": "or", "всё": "all", "салат": "salad", "хумус": "hummus", "тхина": "tahini", "острый": "spicy", "картошка фри": "fries",
    "сколько": "howmuch", "шекель": "shekel", "сорок": "n40", "пять": "n5", "вот (держи)": "here_take", "приятного аппетита": "bonappetit",
    "утро": "morning", "хорошо, хороший": "good", "как дела?": "howareyou", "в порядке, нормально": "okay", "день": "day", "вечер": "evening", "ночь": "night",
    "хлеб": "bread", "молоко": "milk", "сыр": "cheese", "яйца": "eggs", "сливочное масло": "butter", "кофе": "coffee", "чай": "tea",
    "есть (имеется)": "there_is", "нет (не имеется)": "there_isnt", "ещё": "more", "тоже, также": "also", "только": "only", "много": "many", "немного": "few",
    "помидоры": "tomatoes", "огурцы": "cucumbers", "яблоки": "apples", "килограмм": "kilo", "бананы": "bananas", "лук": "onion", "картошка": "potatoes",
    "где": "where", "здесь": "here", "там": "there", "направо": "right", "налево": "left", "прямо": "straight", "рядом с": "near",
    "одна (1)": "n1", "две (2)": "n2", "три (3)": "n3", "десять (10)": "n10", "двадцать (20)": "n20", "четыре (4)": "n4", "пять (5)": "n5",
    "пакет": "bag", "карта (банковская)": "card", "наличные": "cash", "можно": "can", "нужно, нужен": "need", "чек": "receipt", "сдача": "change"
  };
  const norm = (s) => String(s || "").replace(/\{m:([^}]*)\}\{f:[^}]*\}/g, "$1").trim().toLowerCase();

  window.WORD_ICON_IDS = Object.keys(I);
  window.WORD_ICON_BY_RU = BY_RU;
  window.wordIconId = (w) => (w && (w.img || BY_RU[norm(w.ru)] || BY_RU[norm(w.ru).replace(/^голод.*/, "голоден")])) || (/^голод/.test(norm(w && w.ru)) ? "hungry" : null);
  window.wordIcon = function (idOrWord, size) {
    const id = typeof idOrWord === "string" ? idOrWord : window.wordIconId(idOrWord);
    if (!id || !I[id]) return "";
    const s = size || 64; curSize = s;
    return `<span class="w-ico" style="width:${s}px;height:${s}px">${I[id]()}</span>`;
  };
})();
