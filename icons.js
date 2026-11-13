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
  const shek = (x, y, size, fill) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${size}" font-weight="800" fill="${fill}" font-family="Arial, sans-serif">₪</text>`;
  const coin = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f2b632"/><circle cx="${x}" cy="${y}" r="${r * .75}" fill="#ffcf3f"/>${shek(x, y + r * .04, r * 1.05, "#b5810f")}`;
  let curSize = 64;
  const prod = (kind) => (window.storeProdSVG ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">${window.storeProdSVG(kind, Math.round(curSize * .92))}</div>` : "");
  const png = (name) => `<img src="assets/${name}.png" alt="" style="width:100%;height:100%;object-fit:contain">`;


  // --- Герой главы по пояс: все жесты показывает он. Герой меняется по главе и полу игрока ---
  // Глава 1: парню — Давид, девушке — Циля. Новый герой = новая запись в HEROES (+ "hero" у главы в course.json).
  const HEROES = {
    david: { shirt: "#1f7fd6", shirtD: "#1766b3", eye: "#5a3214", brow: "#2b2130", ears: true,
      back: "",
      hair: () => [[16, 12, 4.2], [20, 8, 4.6], [25, 6.5, 4.8], [30, 8.5, 4.4], [33, 13, 3.8], [15, 17, 3.2], [33.5, 18, 3], [22.5, 10, 3.6], [28, 10.5, 3.4]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b2130"/>`).join("") +
        [[18, 9], [25, 6], [31, 10]].map(([x, y]) => `<path d="M${x - 1.6},${y + .6} q.6,-2 2.2,-1.4" stroke="#463949" stroke-width=".7" fill="none" stroke-linecap="round"/>`).join("") },
    tzila: { shirt: "#ef9a62", shirtD: "#dc8550", eye: "#5f7d3e", brow: "#633a22", ears: false,
      back: `<path d="M14,17 Q13,5 24,5 Q35,5 34,17 L36.5,34 Q31,37.5 24,36.5 Q17,37.5 11.5,34Z" fill="#7a4a2e"/><path d="M13.5,26 Q12.5,31 14.5,34 M34.5,26 Q35.5,31 33.5,34" stroke="#633a22" stroke-width=".8" fill="none" opacity=".6"/>`,
      hair: () => `<path d="M14.6,20 Q13.5,6.5 24,6.3 Q34.5,6.5 33.4,20 Q32.5,13 29,11 Q25.5,14.5 19,14.5 Q16,15.5 14.6,20Z" fill="#7a4a2e"/>
        <path d="M18,10.5 Q23,7.8 29,9 M20,12.6 Q24.5,10.5 29.5,11.2" stroke="#93603f" stroke-width=".7" fill="none" stroke-linecap="round" opacity=".9"/>
        <rect x="28.6" y="8.2" width="3.6" height="3.6" rx=".9" fill="#e8874a" transform="rotate(14 30.4 10)"/>
        ${[[21.2, 19.6], [22.3, 20.4], [20.4, 20.6], [26.8, 19.6], [25.7, 20.4], [27.6, 20.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".32" fill="#c98b6a"/>`).join("")}` }
  };
  let H = HEROES.david;
  const heroId = () => {
    if (window.iconHero && HEROES[window.iconHero]) return window.iconHero;
    try { if (typeof profile !== "undefined" && profile && profile.gender === "f") return "tzila"; } catch (e) {}
    return "david";
  };
  const arm = (pts) => {               // pts: [плечо, локоть, кисть]
    const [a, b, c] = pts;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    return `<path d="M${a[0]},${a[1]} L${mid[0]},${mid[1]}" stroke="${H.shirtD}" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M${mid[0]},${mid[1]} L${b[0]},${b[1]} L${c[0]},${c[1]}" stroke="${C.skin}" stroke-width="4.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${c[0]}" cy="${c[1]}" r="3.3" fill="${C.skin}"/>`;
  };
  const davHead = (mouth, eyes) => `${H.ears ? `<circle cx="14.6" cy="18.5" r="2" fill="${C.skin}"/><circle cx="33.4" cy="18.5" r="2" fill="${C.skin}"/>` : ""}<circle cx="24" cy="17" r="9" fill="${C.skin}"/>${H.hair()}
    ${eyes || `<circle cx="20.8" cy="17.5" r="1.45" fill="${H.eye}"/><circle cx="27.2" cy="17.5" r="1.45" fill="${H.eye}"/><circle cx="20.8" cy="17.6" r=".75" fill="${C.ink}"/><circle cx="27.2" cy="17.6" r=".75" fill="${C.ink}"/><circle cx="21.3" cy="17" r=".4" fill="#fff"/><circle cx="27.7" cy="17" r=".4" fill="#fff"/>`}
    <path d="M19.5,15 Q21,14 22.3,14.6 M25.7,14.6 Q27,14 28.5,15" stroke="${H.brow}" stroke-width=".9" fill="none" stroke-linecap="round"/>
    ${mouth || `<path d="M21,21.6 Q24,24 27,21.6" stroke="${C.ink}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`}
    <circle cx="19" cy="20.6" r="1.4" fill="#f4a3a3" opacity=".5"/><circle cx="29" cy="20.6" r="1.4" fill="#f4a3a3" opacity=".5"/>`;
  const davBody = () => `<path d="M13,48 L13,35 Q13,28 20,27 L28,27 Q35,28 35,35 L35,48Z" fill="${H.shirt}"/><path d="M20,27 Q24,31 28,27" stroke="${H.shirtD}" stroke-width="1.4" fill="none"/>`;
  const david = (arms, mouth, extraBack, extraFront, eyes) => { H = HEROES[heroId()];
    return svg(`<clipPath id="dvc"><rect x="-6" y="-6" width="60" height="54" rx="2"/></clipPath><g clip-path="url(#dvc)">${extraBack || ""}${H.back}${davBody()}${arms.map(arm).join("")}${davHead(mouth, eyes)}${extraFront || ""}</g>`); };
  const L0 = [15, 31], R0 = [33, 31];          // плечи
  const giftBox = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="${w * .8}" rx="1.5" fill="${C.orange}"/><rect x="${x - 1}" y="${y - 2.4}" width="${w + 2}" height="4" rx="1" fill="#ff9f5a"/><rect x="${x + w / 2 - 1.2}" y="${y - 2.4}" width="2.4" height="${w * .8 + 2.4}" fill="${C.yellow}"/>
    <path d="M${x + w / 2},${y - 2.4} q-5,-5 -6,-1 q0,2 6,1 q5,-5 6,-1 q0,2 -6,1" fill="${C.yellow}"/>`;

  // --- сами картинки (id → рисунок) ---
  const I = {
    // уровень 1: первые слова
    hello: () => david([[L0, [11, 37], [12, 43]], [R0, [40, 26], [41, 15]]], null, "", `<path d="M44,9 Q47,13 45,18 M37,9 Q35,12 36,15" stroke="${C.blue}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
    thanks: () => svg(`${SH(24, 44, 14)}<path d="M24,40 C10,30 6,22 10,15 C13,9 21,9 24,16 C27,9 35,9 38,15 C42,22 38,30 24,40Z" fill="${C.red}"/>${HL(16, 16, 4, 2.5)}`),
    yes: () => svg(bubble(C.green, `<path d="M16,20 L22,26 L33,14" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`)),
    no: () => svg(bubble(C.red, `<path d="M17,13 L31,27 M31,13 L17,27" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/>`)),
    please: () => david([[L0, [14, 40], [19, 41]], [R0, [34, 40], [29, 41]]], null, "", giftBox(17, 37, 14)),
    bye: () => david([[L0, [11, 39], [12, 44]], [R0, [40, 26], [41, 15]]], null, `<rect x="-2" y="2" width="14" height="46" fill="#c99a63"/><rect x="-2" y="2" width="14" height="46" fill="none" stroke="#a87442" stroke-width="2"/><circle cx="8" cy="27" r="1.4" fill="${C.yellow}"/>`, `<path d="M44,9 Q47,13 45,18" stroke="${C.blue}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
    me: () => david([[L0, [11, 39], [13, 44]], [R0, [33, 41], [25, 35]]], null, "", `<path d="M40,8 L42.5,12.5 L47,13 L43.5,16 L44.5,21 L40,18.5 L35.5,21 L36.5,16 L33,13 L37.5,12.5Z" fill="${C.yellow}"/>`),
    you: () => svg(`${person(C.green, "#2b2f3a", "")}<path d="M3,30 L12,30 M8.5,26.5 L12,30 L8.5,33.5" stroke="${C.orange}" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    want: () => david([[L0, [11, 39], [12, 44]], [R0, [37, 39], [36, 44]]], null, `<circle cx="38" cy="7" r="8.5" fill="#fff" stroke="${C.gray}" stroke-width="1.2"/><circle cx="32" cy="16" r="1.8" fill="#fff" stroke="${C.gray}" stroke-width="1"/>
      <path d="M38,11.5 C34,9 33,6.5 34.2,5 C35.3,3.6 37.3,4 38,5.8 C38.7,4 40.7,3.6 41.8,5 C43,6.5 42,9 38,11.5Z" fill="${C.red}"/>`, "", `<circle cx="21.4" cy="16.8" r="1.25" fill="${C.ink}"/><circle cx="27.8" cy="16.8" r="1.25" fill="${C.ink}"/>`),
    what: () => svg(bubble(C.blue, `<text x="24" y="29" text-anchor="middle" font-size="22" font-weight="800" fill="#fff" font-family="Arial, sans-serif">?</text>`)),
    this: () => david([[L0, [11, 39], [12, 44]], [R0, [38, 30], [44, 28]]], null, "", `<rect x="37" y="33" width="11" height="11" rx="2" fill="${C.orange}"/><rect x="37" y="33" width="11" height="3.5" rx="1.5" fill="#ffad70"/><path d="M46,25 L47,22" stroke="${C.orange}" stroke-width="1.4" stroke-linecap="round"/>`),
    hungry: () => david([[L0, [14, 41], [22, 40]], [R0, [34, 41], [27, 41]]], `<ellipse cx="24" cy="22.2" rx="2" ry="2.4" fill="${C.ink}"/>`, "", `<path d="M17,45 q2,-2 4,0 t4,0 t4,0" stroke="${C.orange}" stroke-width="1.5" fill="none" stroke-linecap="round"/><text x="41" y="12" font-size="9" font-weight="800" fill="${C.orange}" font-family="Arial">?!</text>`),
    very: () => svg(`${SH(24, 44, 14)}<path d="M24,4 L29,17 L43,17 L32,26 L36,40 L24,32 L12,40 L16,26 L5,17 L19,17Z" fill="${C.yellow}"/>${HL(19, 15, 4, 2.4)}<text x="24" y="30" text-anchor="middle" font-size="12" font-weight="900" fill="${C.orange}" font-family="Arial, sans-serif">!!</text>`),
    eat: () => david([[L0, [11, 39], [12, 44]], [R0, [36, 34], [29, 25]]], `<ellipse cx="24" cy="22.4" rx="2.2" ry="1.8" fill="#b5483d"/>`, "", `<g transform="rotate(-30 31 22)"><path d="M27,24 L35,24 L33.5,34 Q31,36 28.5,34Z" fill="#cfd6de"/><path d="M27,24 Q31,18 35,24Z" fill="#e8c27a"/><circle cx="29.5" cy="22.5" r="1.3" fill="${C.red}"/><circle cx="32.5" cy="22" r="1.2" fill="${C.green}"/><path d="M27,27 L35,27" stroke="#aab4bf" stroke-width=".8"/></g>`),
    drink: () => david([[L0, [11, 39], [12, 44]], [R0, [37, 36], [32, 30]]], `<circle cx="24.8" cy="22.2" r="1.2" fill="${C.ink}"/>`, "", `<path d="M29,24 L37,24 L36,36 L30,36Z" fill="#dff1ff" stroke="${C.sky}" stroke-width="1"/><path d="M29.6,28 L36.4,28 L36,36 L30,36Z" fill="${C.orange}"/><path d="M33,25 L25.5,22" stroke="${C.red}" stroke-width="1.6" stroke-linecap="round"/>`, `<path d="M19.5,17.8 Q20.8,16.6 22.1,17.8 M25.9,17.8 Q27.2,16.6 28.5,17.8" stroke="${C.ink}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`),
    water: () => svg(`${SH(24, 45, 10)}<path d="M14,10 L34,10 L31,42 L17,42Z" fill="#dff1ff" stroke="${C.sky}" stroke-width="1.5"/><path d="M15.2,18 Q20,16 24,18 T32.8,18 L31,42 L17,42Z" fill="${C.sky}" opacity=".8"/>${HL(19, 28, 1.5, 6)}`),
    shawarma: () => svg(`${SH(24, 45, 10)}<g transform="rotate(14 24 26)">
      <path d="M15,16 Q24,10 33,16 L30,44 Q24,47 18,44Z" fill="#e7c48a"/>
      <path d="M15,16 Q19,9 24,11 Q29,8 33,16 Q28,13 24,15 Q20,13 15,16Z" fill="#f1d7a8"/>
      <circle cx="19" cy="13.5" r="2.4" fill="#8a4b2a"/><circle cx="23" cy="11.5" r="2.6" fill="#9b5a33"/><circle cx="27.5" cy="12" r="2.2" fill="#8a4b2a"/><circle cx="30.5" cy="14.5" r="1.8" fill="#9b5a33"/>
      <rect x="20.5" y="9.5" width="3.2" height="2.6" rx=".6" fill="${C.red}"/><rect x="26" y="9.8" width="3" height="2.4" rx=".6" fill="#3f8f4c"/><rect x="17.5" y="11" width="2.6" height="2.2" rx=".6" fill="#5fae6c"/>
      <path d="M18,12 Q22,15 26,12 T31,13" stroke="#fff6e6" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <path d="M16.5,27 L31.5,27 L30,44 Q24,47 18,44Z" fill="#cfd6de"/><path d="M16.5,27 L31.5,27" stroke="#aab4bf" stroke-width="1"/><path d="M19,30 L19,43 M23,30 L23,45 M27,30 L27,44" stroke="#e8edf2" stroke-width="1.2" opacity=".8"/>
      <path d="M16.8,18 Q18,24 17,27" stroke="#d1a866" stroke-width="1" fill="none"/></g>`),
    lafa: () => png("ing-lafa"), hummus: () => png("ing-hummus"), tahini: () => png("ing-tahini"), spicy: () => png("ing-spicy"),
    pita: () => svg(`${SH(24, 40, 20)}<ellipse cx="24" cy="31" rx="20" ry="9" fill="#d5a565"/><ellipse cx="24" cy="29" rx="20" ry="9" fill="#ecc68a"/>
      <path d="M8,27 Q24,22 40,27" stroke="#c99550" stroke-width="1.3" fill="none"/>
      <circle cx="15" cy="30" r="1.8" fill="#c88b45"/><circle cx="24" cy="33" r="2.2" fill="#c88b45"/><circle cx="32" cy="29" r="1.6" fill="#c88b45"/><circle cx="20" cy="26" r="1.2" fill="#c88b45"/><circle cx="29" cy="34" r="1.3" fill="#d79a52"/>
      ${HL(16, 25, 6, 1.5, .4)}`),
    fries: () => svg(`${SH(24, 45, 12)}${[[15, 6, -9], [18, 3, -5], [21, 5, -2], [24, 2, 0], [27, 4, 3], [30, 3, 6], [33, 6, 9], [19.5, 8, -3], [25.5, 7, 2], [29, 9, 5], [17, 10, -7], [31.5, 10, 8]].map(([x, y, r]) => `<rect x="${x - 1.4}" y="${y}" width="2.8" height="24" rx="1.2" fill="${r % 2 ? "#f5c542" : "#ffd65e"}" transform="rotate(${r} ${x} 30)"/>`).join("")}
      <path d="M11,20 L37,20 L33,44 L15,44Z" fill="${C.red}"/><path d="M11,20 Q24,27 37,20 L36,25 Q24,31 12,25Z" fill="#c9302c"/>
      <path d="M17,33 Q24,36 31,33" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>${HL(16, 32, 1.5, 6, .35)}`),
    turkey: () => png("ing-meat-turkey"), chicken: () => png("ing-meat-chicken"), veal: () => png("ing-meat-veal"),
    salad: () => svg(`${SH(24, 45, 18)}<path d="M4,24 L44,24 Q43,42 24,42 Q5,42 4,24Z" fill="#fff" stroke="${C.gray}" stroke-width="1.4"/><ellipse cx="24" cy="24" rx="20" ry="4.5" fill="#f4f6f9"/>
      ${[[10, 21], [15, 19], [20, 21], [26, 18.5], [31, 20.5], [36, 19], [13, 23], [18, 17.5], [23, 22.5], [29, 23], [34, 22.5], [24, 16.5], [38, 22]].map(([x, y], i) => `<rect x="${x - 2.4}" y="${y - 2.4}" width="4.8" height="4.8" rx="1" fill="${i % 3 === 1 ? "#4f9a5c" : i % 3 === 2 ? "#e9f3d8" : "#e5483d"}" transform="rotate(${i * 23} ${x} ${y})"/>`).join("")}
      ${[[12, 17], [28, 15.5], [35, 16.5], [21, 15]].map(([x, y]) => `<path d="M${x},${y} q2,-3 4,0 q-2,1 -4,0" fill="#3f8f4c"/>`).join("")}`),
    with: () => svg(`${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${C.green}"/>${HL(18, 15, 6, 3)}<path d="M24,14 L24,34 M14,24 L34,24" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    without: () => svg(`${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${C.red}"/>${HL(18, 15, 6, 3)}<path d="M14,24 L34,24" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`),
    or: () => svg(`${SH(24, 45, 10)}<rect x="22" y="12" width="4.5" height="32" rx="2" fill="#8a5a35"/>
      <path d="M24,9 L42,9 L47,14 L42,19 L24,19Z" fill="${C.blue}"/><path d="M27,14 L40,14" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <path d="M25,21 L7,21 L2,26 L7,31 L25,31Z" fill="${C.orange}"/><path d="M9,26 L22,26" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24.2" cy="6" r="2.2" fill="#8a5a35"/>`),
    all: () => svg(`${SH(24, 44, 15)}${[[12, 30], [24, 30], [36, 30], [18, 19], [30, 19], [24, 8]].map(([x, y]) => `<rect x="${x - 5.5}" y="${y - 5.5}" width="11" height="11" rx="2.5" fill="${C.green}"/><path d="M${x - 3},${y} L${x - .5},${y + 2.5} L${x + 3.5},${y - 2.5}" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`).join("")}`),
    howmuch: () => svg(`${SH(24, 44, 14)}<path d="M8,16 L22,6 L40,6 L40,30 L26,40 L8,26Z" fill="${C.yellow}"/><circle cx="34" cy="12" r="2.6" fill="#fff"/><text x="22" y="29" text-anchor="middle" font-size="15" font-weight="800" fill="#9a6a0a" font-family="Arial, sans-serif">₪?</text>`),
    shekel: () => svg(`${SH(24, 44, 14)}${coin(24, 24, 17)}${HL(17, 15, 5, 3)}`),
    n40: () => svg(tile("40", C.blue, 20)), n5: () => svg(tile("5", C.orange, 24)),
    here_take: () => david([[L0, [12, 39], [14, 44]], [R0, [38, 35], [44, 33]]], null, "", `<rect x="39" y="23" width="10" height="10" rx="2" fill="${C.orange}"/><rect x="39" y="23" width="10" height="3" rx="1.5" fill="#ffad70"/><path d="M36,22 Q34,18 37,15" stroke="${C.blue}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),
    bonappetit: () => svg(`${SH(24, 44, 18)}<ellipse cx="24" cy="31" rx="15" ry="7.5" fill="#fff" stroke="${C.gray}" stroke-width="1.4"/><ellipse cx="24" cy="30" rx="10" ry="4.5" fill="#f4f6f9"/>
      <path d="M15,30 Q16,24 21,24 Q24,21 28,24 Q33,24 33,30 Q24,33 15,30Z" fill="#e9a54a"/><circle cx="20" cy="27" r="1.6" fill="${C.red}"/><circle cx="26" cy="25.5" r="1.5" fill="${C.green}"/><circle cx="29" cy="28" r="1.4" fill="${C.red}"/>
      <path d="M4,20 L4,40 M2,20 L2,25 Q2,27 4,27 Q6,27 6,25 L6,20" stroke="#9aa3ad" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M44,20 Q40,26 43,32 L44,32 L44,40" stroke="#9aa3ad" stroke-width="1.6" fill="#c7ced8" stroke-linecap="round"/>
      <path d="M18,18 Q16,14 18,10 M24,16 Q22,12 24,8 M30,18 Q28,14 30,10" stroke="#c7ced8" stroke-width="1.6" fill="none" stroke-linecap="round"/>`),
    morning: () => svg(`<clipPath id="mornc"><rect x="2" y="4" width="44" height="40" rx="8"/></clipPath><g clip-path="url(#mornc)"><rect x="2" y="4" width="44" height="40" rx="8" fill="#ffd9c2"/><rect x="2" y="4" width="44" height="18" rx="8" fill="#bfe0f5" opacity=".8"/>${sun(24, 31, 9)}
      <path d="M2,31 L46,31 L46,36 Q46,44 38,44 L10,44 Q2,44 2,36Z" fill="#7fb8e6"/><path d="M8,36 L18,36 M24,39 L36,39 M30,35 L40,35" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></g>`),
    good: () => david([[L0, [9, 25], [8, 15]], [R0, [39, 25], [40, 15]]], `<path d="M20.5,21 Q24,25.5 27.5,21Z" fill="#fff" stroke="${C.ink}" stroke-width="1"/>`, "", `${[[4, 8], [44, 8], [24, 2]].map(([x, y]) => `<path d="M${x},${y - 3.5} L${x + 1},${y - 1} L${x + 3.5},${y} L${x + 1},${y + 1} L${x},${y + 3.5} L${x - 1},${y + 1} L${x - 3.5},${y} L${x - 1},${y - 1}Z" fill="${C.yellow}"/>`).join("")}`),
    howareyou: () => svg(`${SH(24, 44, 15)}<path d="M4,8 Q4,4 8,4 L26,4 Q30,4 30,8 L30,20 Q30,24 26,24 L12,24 L7,29 L8,24 Q4,24 4,20Z" fill="${C.blue}"/><text x="17" y="19" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="Arial, sans-serif">?</text>
      <path d="M44,22 Q44,18 40,18 L22,18 Q18,18 18,22 L18,34 Q18,38 22,38 L36,38 L41,43 L40,38 Q44,38 44,34Z" fill="${C.green}"/><path d="M26,28 Q31,33 36,28" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="27" cy="24" r="1.4" fill="#fff"/><circle cx="35" cy="24" r="1.4" fill="#fff"/>`),
    okay: () => svg(`${SH(24, 44, 14)}<circle cx="24" cy="24" r="17" fill="${C.green}"/>${HL(18, 15, 6, 3)}<text x="24" y="30" text-anchor="middle" font-size="15" font-weight="900" fill="#fff" font-family="Arial, sans-serif">OK</text>`),
    day: () => svg(`<rect x="2" y="4" width="44" height="40" rx="8" fill="#bfe0f5"/>${sun(24, 22, 9)}<path d="M2,36 Q24,30 46,36 L46,36 Q46,44 38,44 L10,44 Q2,44 2,36Z" fill="#7fc38a"/>`),
    evening: () => svg(`<rect x="2" y="4" width="44" height="40" rx="8" fill="#f7a76c"/><rect x="2" y="4" width="44" height="16" rx="8" fill="#b57be0" opacity=".55"/><circle cx="24" cy="32" r="9" fill="#ffcf3f"/><path d="M2,32 L46,32 L46,36 Q46,44 38,44 L10,44 Q2,44 2,36Z" fill="#5a6a8a"/>`),
    night: () => svg(`<rect x="2" y="4" width="44" height="40" rx="8" fill="#26345a"/><path d="M30,10 A11,11 0 1 0 38,28 A9,9 0 1 1 30,10Z" fill="#ffe7a1"/>${[[10, 12], [16, 30], [40, 40], [22, 10], [8, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join("")}`),
    bread: () => svg(`${SH(24, 43, 19)}<path d="M5,34 Q3,18 17,15 Q24,11 31,15 Q45,18 43,34 Q43,39 37,39 L11,39 Q5,39 5,34Z" fill="#b8742f"/>
      <path d="M7,27 Q8,18 18,17 Q24,14 30,17 Q40,18 41,27 Q24,21 7,27Z" fill="#d89a52"/>
      ${[13, 21, 29, 36].map(x => `<path d="M${x - 3},30 Q${x},21 ${x + 3},19" stroke="#f0c98a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join("")}
      ${HL(16, 19, 6, 1.6, .35)}<path d="M8,36 L40,36" stroke="#9c6026" stroke-width="1.4" opacity=".5"/>`),
    tomatoes: () => prod("tomatoes"), cucumbers: () => prod("cucumbers"), apples: () => prod("apples"), bananas: () => svg(`<ellipse cx="24" cy="41" rx="10.5" ry="2.6" fill="#000" opacity=".1"/><g transform="translate(9.71 7.88) scale(0.657)"><g transform="rotate(-40 24 24)"><path d="M38.26,4.75 L35.90,3.37 L33.47,2.62 L31.08,2.09 L28.72,1.75 L26.41,1.60 L24.14,1.62 L21.93,1.83 L19.78,2.22 L17.70,2.80 L15.71,3.56 L13.81,4.51 L12.02,5.64 L10.36,6.94 L8.83,8.40 L7.45,10.02 L6.21,11.77 L5.13,13.66 L4.21,15.66 L3.44,17.77 L2.85,19.99 L2.45,22.33 L2.39,24.80 L2.35,27.31 L2.09,29.85 L3.91,30.15 L4.57,27.79 L5.65,25.66 L6.86,23.73 L7.90,21.93 L8.93,20.26 L9.96,18.74 L11.00,17.35 L12.06,16.10 L13.14,14.97 L14.24,13.96 L15.37,13.04 L16.53,12.22 L17.75,11.47 L19.03,10.80 L20.38,10.19 L21.83,9.65 L23.37,9.18 L25.03,8.77 L26.80,8.43 L28.70,8.17 L30.73,7.97 L32.89,7.84 L35.20,7.73 L37.74,7.25Z" fill="none" stroke="#a8740f" stroke-width="1.6" stroke-linejoin="round"/><path d="M38.26,4.75 L35.90,3.37 L33.47,2.62 L31.08,2.09 L28.72,1.75 L26.41,1.60 L24.14,1.62 L21.93,1.83 L19.78,2.22 L17.70,2.80 L15.71,3.56 L13.81,4.51 L12.02,5.64 L10.36,6.94 L8.83,8.40 L7.45,10.02 L6.21,11.77 L5.13,13.66 L4.21,15.66 L3.44,17.77 L2.85,19.99 L2.45,22.33 L2.39,24.80 L2.35,27.31 L2.09,29.85 L3.91,30.15 L4.57,27.79 L5.65,25.66 L6.86,23.73 L7.90,21.93 L8.93,20.26 L9.96,18.74 L11.00,17.35 L12.06,16.10 L13.14,14.97 L14.24,13.96 L15.37,13.04 L16.53,12.22 L17.75,11.47 L19.03,10.80 L20.38,10.19 L21.83,9.65 L23.37,9.18 L25.03,8.77 L26.80,8.43 L28.70,8.17 L30.73,7.97 L32.89,7.84 L35.20,7.73 L37.74,7.25Z" fill="#ffd93b"/><path d="M37.96,6.19 L35.50,5.88 L33.14,5.62 L30.88,5.47 L28.71,5.44 L26.63,5.53 L24.65,5.73 L22.76,6.05 L20.96,6.49 L19.24,7.05 L17.62,7.72 L16.08,8.51 L14.62,9.42 L13.24,10.45 L11.94,11.60 L10.72,12.87 L9.58,14.26 L8.51,15.78 L7.52,17.43 L6.60,19.20 L5.76,21.10 L4.98,23.14 L4.26,25.29 L3.63,27.59 L3.14,30.02 L3.91,30.15 L4.57,27.79 L5.65,25.66 L6.86,23.73 L7.90,21.93 L8.93,20.26 L9.96,18.74 L11.00,17.35 L12.06,16.10 L13.14,14.97 L14.24,13.96 L15.37,13.04 L16.53,12.22 L17.75,11.47 L19.03,10.80 L20.38,10.19 L21.83,9.65 L23.37,9.18 L25.03,8.77 L26.80,8.43 L28.70,8.17 L30.73,7.97 L32.89,7.84 L35.20,7.73 L37.74,7.25Z" fill="#f0b81e" opacity="0.85"/><path d="M33.14,5.62 L30.88,5.47 L28.71,5.44 L26.63,5.53 L24.65,5.73 L22.76,6.05 L20.96,6.49 L19.24,7.05 L17.62,7.72 L16.08,8.51 L14.62,9.42 L13.24,10.45 L11.94,11.60 L10.72,12.87 L9.58,14.26 L8.51,15.78 L7.52,17.43 L6.60,19.20 L5.76,21.10 L4.98,23.14 L4.26,25.29" stroke="#d39b14" stroke-width=".7" fill="none" opacity=".6"/><path d="M26.48,2.78 L24.30,2.85 L22.18,3.10 L20.13,3.50 L18.17,4.07 L16.28,4.81 L14.49,5.71 L12.80,6.77 L11.22,7.99 L9.76,9.36 L8.43,10.87 L7.22,12.52" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/><circle cx="3" cy="30" r="1.5" fill="#5b3f22"/><path d="M37.88,4.65 L34.91,3.99 L32.08,3.98 L29.35,4.20 L26.73,4.61 L24.22,5.20 L21.82,5.97 L19.54,6.91 L17.39,8.02 L15.39,9.31 L13.53,10.77 L11.84,12.39 L10.33,14.17 L9.01,16.10 L7.88,18.15 L6.97,20.32 L6.26,22.58 L5.76,24.93 L5.46,27.36 L5.37,29.85 L5.50,32.41 L5.86,35.02 L6.62,37.67 L7.44,40.36 L8.03,43.15 L9.97,42.85 L9.84,40.10 L10.20,37.45 L10.78,34.98 L11.24,32.69 L11.73,30.55 L12.28,28.57 L12.90,26.74 L13.58,25.04 L14.34,23.47 L15.15,22.02 L16.04,20.67 L17.00,19.40 L18.04,18.21 L19.17,17.07 L20.42,15.98 L21.78,14.94 L23.28,13.93 L24.92,12.97 L26.72,12.04 L28.67,11.15 L30.79,10.30 L33.08,9.47 L35.53,8.63 L38.12,7.35Z" fill="none" stroke="#a8740f" stroke-width="1.6" stroke-linejoin="round"/><path d="M37.88,4.65 L34.91,3.99 L32.08,3.98 L29.35,4.20 L26.73,4.61 L24.22,5.20 L21.82,5.97 L19.54,6.91 L17.39,8.02 L15.39,9.31 L13.53,10.77 L11.84,12.39 L10.33,14.17 L9.01,16.10 L7.88,18.15 L6.97,20.32 L6.26,22.58 L5.76,24.93 L5.46,27.36 L5.37,29.85 L5.50,32.41 L5.86,35.02 L6.62,37.67 L7.44,40.36 L8.03,43.15 L9.97,42.85 L9.84,40.10 L10.20,37.45 L10.78,34.98 L11.24,32.69 L11.73,30.55 L12.28,28.57 L12.90,26.74 L13.58,25.04 L14.34,23.47 L15.15,22.02 L16.04,20.67 L17.00,19.40 L18.04,18.21 L19.17,17.07 L20.42,15.98 L21.78,14.94 L23.28,13.93 L24.92,12.97 L26.72,12.04 L28.67,11.15 L30.79,10.30 L33.08,9.47 L35.53,8.63 L38.12,7.35Z" fill="#ffd93b"/><path d="M38.02,6.20 L35.27,6.66 L32.65,7.14 L30.18,7.71 L27.85,8.37 L25.66,9.13 L23.60,9.99 L21.69,10.95 L19.92,12.00 L18.28,13.15 L16.78,14.39 L15.40,15.74 L14.16,17.18 L13.05,18.73 L12.06,20.38 L11.20,22.13 L10.47,24.00 L9.86,25.97 L9.38,28.06 L9.03,30.26 L8.80,32.57 L8.69,35.00 L8.68,37.54 L8.82,40.21 L9.15,42.98 L9.97,42.85 L9.84,40.10 L10.20,37.45 L10.78,34.98 L11.24,32.69 L11.73,30.55 L12.28,28.57 L12.90,26.74 L13.58,25.04 L14.34,23.47 L15.15,22.02 L16.04,20.67 L17.00,19.40 L18.04,18.21 L19.17,17.07 L20.42,15.98 L21.78,14.94 L23.28,13.93 L24.92,12.97 L26.72,12.04 L28.67,11.15 L30.79,10.30 L33.08,9.47 L35.53,8.63 L38.12,7.35Z" fill="#f0b81e" opacity="0.85"/><path d="M32.65,7.14 L30.18,7.71 L27.85,8.37 L25.66,9.13 L23.60,9.99 L21.69,10.95 L19.92,12.00 L18.28,13.15 L16.78,14.39 L15.40,15.74 L14.16,17.18 L13.05,18.73 L12.06,20.38 L11.20,22.13 L10.47,24.00 L9.86,25.97 L9.38,28.06 L9.03,30.26 L8.80,32.57 L8.69,35.00 L8.68,37.54" stroke="#d39b14" stroke-width=".7" fill="none" opacity=".6"/><path d="M24.65,6.38 L22.36,7.17 L20.19,8.12 L18.15,9.21 L16.25,10.46 L14.50,11.86 L12.91,13.40 L11.48,15.08 L10.22,16.89 L9.14,18.82 L8.24,20.86 L7.52,23.01" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/><circle cx="9" cy="43" r="1.5" fill="#5b3f22"/><path d="M37.33,4.91 L34.70,5.50 L32.42,6.59 L30.31,7.83 L28.35,9.19 L26.52,10.66 L24.84,12.22 L23.31,13.89 L21.94,15.64 L20.72,17.48 L19.68,19.40 L18.80,21.40 L18.11,23.45 L17.60,25.56 L17.28,27.71 L17.14,29.88 L17.19,32.08 L17.42,34.28 L17.84,36.49 L18.43,38.69 L19.22,40.87 L20.22,43.03 L21.57,45.10 L22.96,47.18 L24.16,49.39 L25.84,48.61 L25.06,46.31 L24.74,43.96 L24.65,41.69 L24.48,39.58 L24.35,37.58 L24.31,35.67 L24.34,33.85 L24.46,32.11 L24.66,30.44 L24.94,28.83 L25.30,27.28 L25.75,25.76 L26.27,24.27 L26.88,22.80 L27.58,21.34 L28.38,19.88 L29.28,18.41 L30.30,16.93 L31.43,15.44 L32.68,13.93 L34.06,12.39 L35.56,10.81 L37.16,9.16 L38.67,7.09Z" fill="none" stroke="#a8740f" stroke-width="1.6" stroke-linejoin="round"/><path d="M37.33,4.91 L34.70,5.50 L32.42,6.59 L30.31,7.83 L28.35,9.19 L26.52,10.66 L24.84,12.22 L23.31,13.89 L21.94,15.64 L20.72,17.48 L19.68,19.40 L18.80,21.40 L18.11,23.45 L17.60,25.56 L17.28,27.71 L17.14,29.88 L17.19,32.08 L17.42,34.28 L17.84,36.49 L18.43,38.69 L19.22,40.87 L20.22,43.03 L21.57,45.10 L22.96,47.18 L24.16,49.39 L25.84,48.61 L25.06,46.31 L24.74,43.96 L24.65,41.69 L24.48,39.58 L24.35,37.58 L24.31,35.67 L24.34,33.85 L24.46,32.11 L24.66,30.44 L24.94,28.83 L25.30,27.28 L25.75,25.76 L26.27,24.27 L26.88,22.80 L27.58,21.34 L28.38,19.88 L29.28,18.41 L30.30,16.93 L31.43,15.44 L32.68,13.93 L34.06,12.39 L35.56,10.81 L37.16,9.16 L38.67,7.09Z" fill="#ffd93b"/><path d="M38.10,6.16 L36.11,7.60 L34.23,9.02 L32.47,10.45 L30.84,11.91 L29.34,13.41 L27.98,14.93 L26.75,16.49 L25.64,18.08 L24.67,19.70 L23.82,21.36 L23.10,23.05 L22.50,24.78 L22.03,26.55 L21.69,28.35 L21.47,30.20 L21.37,32.10 L21.40,34.03 L21.56,36.02 L21.84,38.05 L22.24,40.13 L22.77,42.26 L23.40,44.45 L24.17,46.68 L25.13,48.94 L25.84,48.61 L25.06,46.31 L24.74,43.96 L24.65,41.69 L24.48,39.58 L24.35,37.58 L24.31,35.67 L24.34,33.85 L24.46,32.11 L24.66,30.44 L24.94,28.83 L25.30,27.28 L25.75,25.76 L26.27,24.27 L26.88,22.80 L27.58,21.34 L28.38,19.88 L29.28,18.41 L30.30,16.93 L31.43,15.44 L32.68,13.93 L34.06,12.39 L35.56,10.81 L37.16,9.16 L38.67,7.09Z" fill="#f0b81e" opacity="0.85"/><path d="M34.23,9.02 L32.47,10.45 L30.84,11.91 L29.34,13.41 L27.98,14.93 L26.75,16.49 L25.64,18.08 L24.67,19.70 L23.82,21.36 L23.10,23.05 L22.50,24.78 L22.03,26.55 L21.69,28.35 L21.47,30.20 L21.37,32.10 L21.40,34.03 L21.56,36.02 L21.84,38.05 L22.24,40.13 L22.77,42.26 L23.40,44.45" stroke="#d39b14" stroke-width=".7" fill="none" opacity=".6"/><path d="M27.37,11.48 L25.79,13.04 L24.34,14.67 L23.05,16.37 L21.91,18.15 L20.92,19.99 L20.09,21.89 L19.43,23.85 L18.93,25.85 L18.60,27.90 L18.44,29.98 L18.44,32.08" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".5"/><circle cx="25" cy="49" r="1.5" fill="#5b3f22"/><path d="M40.15,8.09 L44.23,2.30 L41.51,-0.34 L35.84,3.90Z" fill="#9c9a3c"/><path d="M38.71,6.69 L43.30,1.39" stroke="#b9b65a" stroke-width="1" stroke-linecap="round"/><path d="M35.84,3.90 L41.51,-0.34" stroke="#77752a" stroke-width="1.2"/><ellipse cx="42.87" cy="0.97" rx="1.4" ry="2" transform="rotate(-45.83 42.87 0.97)" fill="#5a4a24"/></g></g>`),
    potatoes: () => svg(`${SH(24, 44, 17)}
      ${[[15, 31, 10, 7.5, -10, "#c99a62"], [32, 32, 10, 7, 12, "#bd8d55"], [24, 21, 10, 7.5, 4, "#d4a86f"]].map(([x, y, rx, ry, r, c]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${r} ${x} ${y})"/>${HL(x - 3, y - 3, 3, 1.4, .3)}`).join("")}
      ${[[10, 29], [13, 34], [18, 30], [20, 34], [28, 30], [31, 35], [36, 30], [37, 34], [19, 19], [24, 23], [28, 19], [22, 17], [27, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#8d6538"/>`).join("")}`),
    milk: () => prod("milk"), cheese: () => prod("cheese"), eggs: () => prod("eggs"), bag: () => prod("bag"),
    butter: () => svg(`${SH(24, 42, 16)}<path d="M6,26 L20,18 L44,24 L30,32Z" fill="#ffe7a1"/><path d="M6,26 L30,32 L30,40 L6,34Z" fill="#ffd35a"/><path d="M30,32 L44,24 L44,32 L30,40Z" fill="#f2c230"/><path d="M8,26 L30,31" stroke="#fff" stroke-width="1.2" opacity=".5"/>`),
    coffee: () => svg(`${SH(22, 44, 14)}<path d="M8,16 L34,16 L32,38 Q31,42 27,42 L15,42 Q11,42 10,38Z" fill="#fff" stroke="${C.gray}" stroke-width="1.4"/><path d="M34,21 Q42,21 41,28 Q40,34 32,33" stroke="${C.gray}" stroke-width="3" fill="none"/><ellipse cx="21" cy="17" rx="12.5" ry="2.6" fill="#6b3d1f"/>
      <path d="M16,4 Q13,8 16,12 M22,3 Q19,7 22,11 M28,4 Q25,8 28,12" stroke="#c7ced8" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
    tea: () => svg(`${SH(22, 44, 14)}<path d="M8,18 L34,18 L32,38 Q31,42 27,42 L15,42 Q11,42 10,38Z" fill="#fff" stroke="${C.gray}" stroke-width="1.4"/><path d="M34,23 Q42,23 41,30 Q40,36 32,35" stroke="${C.gray}" stroke-width="3" fill="none"/><ellipse cx="21" cy="19" rx="12.5" ry="2.6" fill="#d9952f"/>
      <path d="M26,19 L30,6" stroke="#a87442" stroke-width="1"/><rect x="27" y="2" width="7" height="6" rx="1" fill="${C.green}"/>`),
    there_is: () => svg(`<rect x="4" y="6" width="34" height="34" rx="3" fill="#efe4cf"/><rect x="4" y="22" width="34" height="3" fill="#c99a63"/><rect x="4" y="38" width="34" height="3" fill="#c99a63"/>
      <rect x="9" y="11" width="7" height="11" rx="1.5" fill="${C.blue}"/><rect x="18" y="13" width="7" height="9" rx="1.5" fill="${C.orange}"/><rect x="27" y="11" width="7" height="11" rx="1.5" fill="${C.red}"/>
      <rect x="9" y="28" width="7" height="10" rx="1.5" fill="${C.yellow}"/><rect x="18" y="27" width="7" height="11" rx="1.5" fill="${C.green}"/><rect x="27" y="29" width="7" height="9" rx="1.5" fill="${C.blue}"/>
      <circle cx="38" cy="38" r="8" fill="${C.green}" stroke="#fff" stroke-width="2"/><path d="M34.5,38 L37,40.5 L41.5,35.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
    there_isnt: () => svg(`<rect x="4" y="6" width="34" height="34" rx="3" fill="#efe4cf"/><rect x="4" y="22" width="34" height="3" fill="#c99a63"/><rect x="4" y="38" width="34" height="3" fill="#c99a63"/>
      <path d="M10,18 Q14,15 18,18 M24,34 Q28,31 32,34" stroke="#d8cbb2" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <circle cx="38" cy="38" r="8" fill="${C.red}" stroke="#fff" stroke-width="2"/><path d="M35,35 L41,41 M41,35 L35,41" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`),
    more: () => svg(`${SH(22, 44, 15)}<ellipse cx="22" cy="36" rx="16" ry="6" fill="#fff" stroke="${C.gray}" stroke-width="1.3"/>
      ${[[15, 32], [23, 33], [19, 27]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#f2a64b"/><circle cx="${x - 1.5}" cy="${y - 1.5}" r="1.3" fill="#c97b2a"/>`).join("")}
      <circle cx="33" cy="12" r="5" fill="#f2a64b"/><circle cx="31.5" cy="10.5" r="1.3" fill="#c97b2a"/><path d="M33,19 L31,24" stroke="${C.gray}" stroke-width="1.4" stroke-dasharray="2 2"/>
      <circle cx="42" cy="8" r="6" fill="${C.green}"/><path d="M42,5 L42,11 M39,8 L45,8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`),
    also: () => svg(`${SH(24, 44, 18)}
      <path d="M3,10 Q3,5 8,5 L20,5 Q25,5 25,10 L25,20 Q25,25 20,25 L11,25 L6,30 L7,25 Q3,25 3,20Z" fill="${C.blue}"/>
      <path d="M14,21 C9,17.5 8,14.5 9.5,12.5 C11,10.6 13.4,11.1 14,13.4 C14.6,11.1 17,10.6 18.5,12.5 C20,14.5 19,17.5 14,21Z" fill="#fff"/>
      <path d="M45,22 Q45,17 40,17 L28,17 Q23,17 23,22 L23,32 Q23,37 28,37 L37,37 L42,42 L41,37 Q45,37 45,32Z" fill="${C.green}"/>
      <path d="M34,33 C29,29.5 28,26.5 29.5,24.5 C31,22.6 33.4,23.1 34,25.4 C34.6,23.1 37,22.6 38.5,24.5 C40,26.5 39,29.5 34,33Z" fill="#fff"/>`),
    only: () => svg(`${SH(24, 44, 16)}<circle cx="10" cy="26" r="5" fill="${C.gray}"/><circle cx="38" cy="26" r="5" fill="${C.gray}"/><circle cx="24" cy="24" r="10" fill="${C.orange}"/>${HL(20, 20, 3, 2)}<path d="M24,8 L24,12" stroke="${C.orange}" stroke-width="2.4" stroke-linecap="round"/><text x="24" y="28.5" text-anchor="middle" font-size="12" font-weight="900" fill="#fff" font-family="Arial">1</text>`),
    many: () => svg(dots(13)), few: () => svg(dots(3)),
    kilo: () => svg(`${SH(24, 44, 15)}<path d="M14,16 L34,16 L40,42 L8,42Z" fill="#5a6372"/><circle cx="24" cy="12" r="5" fill="none" stroke="#5a6372" stroke-width="3"/><text x="24" y="35" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="Arial">кг</text>`),
    onion: () => svg(`${SH(24, 44, 13)}<path d="M24,6 Q21,12 22,14 Q9,18 9,30 Q9,42 24,42 Q39,42 39,30 Q39,18 26,14 Q27,12 24,6Z" fill="#f2b04b"/>
      <path d="M24,14 Q15,24 17,41 M24,14 Q33,24 31,41 M24,14 L24,42" stroke="#e08a2a" stroke-width="1.3" fill="none"/>${HL(15, 25, 2.8, 6, .5)}
      <path d="M24,6 L21.5,1.5 M24,6 L27,1.5 M24,6 L24,1" stroke="#7fb04a" stroke-width="1.8" stroke-linecap="round"/><path d="M19,42 Q24,45 29,42" stroke="#c9a06a" stroke-width="1.5" fill="none"/>`),
    where: () => svg(`${SH(24, 45, 10)}<path d="M24,44 Q10,28 10,18 Q10,4 24,4 Q38,4 38,18 Q38,28 24,44Z" fill="${C.red}"/><circle cx="24" cy="18" r="8" fill="#fff"/><text x="24" y="23" text-anchor="middle" font-size="13" font-weight="900" fill="${C.red}" font-family="Arial">?</text>`),
    here: () => svg(`<ellipse cx="24" cy="40" rx="14" ry="4" fill="${C.green}" opacity=".35"/><path d="M24,40 Q12,26 12,17 Q12,5 24,5 Q36,5 36,17 Q36,26 24,40Z" fill="${C.green}"/><circle cx="24" cy="17" r="5" fill="#fff"/>`),
    there: () => svg(`${SH(14, 44, 6)}<circle cx="14" cy="36" r="4" fill="${C.blue}"/><path d="M18,34 Q28,26 34,18" stroke="${C.gray}" stroke-width="2" stroke-dasharray="3 3" fill="none"/><path d="M38,22 Q31,14 31,10 Q31,4 38,4 Q45,4 45,10 Q45,14 38,22Z" fill="${C.red}"/><circle cx="38" cy="10" r="2.6" fill="#fff"/>`),
    right: () => svg(arrow(0)), left: () => svg(arrow(180)), straight: () => svg(arrow(-90)),
    near: () => svg(`${SH(24, 44, 16)}<rect x="6" y="18" width="16" height="20" rx="3" fill="${C.blue}"/><rect x="26" y="22" width="16" height="16" rx="3" fill="${C.orange}"/><path d="M14,12 L34,12 M18,9 L14,12 L18,15 M30,9 L34,12 L30,15" stroke="${C.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`),
    n1: () => svg(tile("1", C.green, 24)), n2: () => svg(tile("2", C.blue, 24)), n3: () => svg(tile("3", C.orange, 24)),
    n4: () => svg(tile("4", "#b57be0", 24)), n10: () => svg(tile("10", C.red, 20)), n20: () => svg(tile("20", "#2f9e8f", 20)),
    card: () => svg(`${SH(24, 42, 18)}<rect x="4" y="12" width="40" height="26" rx="4" fill="${C.blue}"/><rect x="4" y="17" width="40" height="5" fill="#26345a"/><rect x="9" y="27" width="9" height="6" rx="1.5" fill="${C.yellow}"/>${HL(14, 15, 7, 1.4, .35)}`),
    cash: () => svg(`${SH(24, 42, 18)}<rect x="6" y="18" width="36" height="20" rx="3" fill="#5fae6c" transform="rotate(-8 24 28)"/><rect x="6" y="14" width="36" height="20" rx="3" fill="#7fc38a"/>
      <rect x="9" y="17" width="30" height="14" rx="2" fill="none" stroke="#5fae6c" stroke-width="1"/><circle cx="24" cy="24" r="6" fill="#5fae6c"/>${shek(24, 24.3, 9, "#fff")}`),
    can: () => svg(`${SH(24, 44, 12)}<rect x="12" y="10" width="24" height="32" rx="2" fill="#a87442"/><rect x="15" y="13" width="18" height="29" rx="1" fill="#2b2f3a"/><path d="M15,13 L29,20 L29,42 L15,42Z" fill="#c99a63"/><circle cx="34" cy="10" r="8" fill="${C.green}"/><path d="M30,10 L33,13 L38,7" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    need: () => svg(`${SH(24, 44, 14)}<path d="M24,4 L44,40 L4,40Z" fill="${C.orange}"/><rect x="21.5" y="14" width="5" height="14" rx="2.5" fill="#fff"/><circle cx="24" cy="34" r="2.8" fill="#fff"/>`),
    receipt: () => svg(`${SH(24, 46, 12)}<g transform="rotate(-4 24 24)"><path d="M11,6 L14,3 L17,6 L20,3 L23,6 L26,3 L29,6 L32,3 L35,6 L37,4 L37,42 L34,45 L31,42 L28,45 L25,42 L22,45 L19,42 L16,45 L13,42 L11,44Z" fill="#fff" stroke="${C.gray}" stroke-width="1.2"/>
      <rect x="15" y="9" width="18" height="4" rx="2" fill="${C.green}"/>${[17, 21, 25].map((y, i) => `<path d="M15,${y} L${[30, 27, 31][i]},${y}" stroke="${C.gray}" stroke-width="1.8" stroke-linecap="round"/>`).join("")}
      <path d="M15,30 L33,30" stroke="${C.ink}" stroke-width="1" stroke-dasharray="2 1.5"/><path d="M15,37 L19,37" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/><text x="34" y="39.5" text-anchor="end" font-size="6.5" font-weight="800" fill="${C.ink}" font-family="Arial">25₪</text></g>`),
    change: () => svg(`${SH(24, 44, 17)}<rect x="6" y="10" width="24" height="14" rx="2" fill="#7fc38a" transform="rotate(-10 18 17)"/><circle cx="18" cy="17" r="3.6" fill="#5fae6c" transform="rotate(-10 18 17)"/>
      ${[38, 34, 30].map((y) => `<ellipse cx="17" cy="${y}" rx="9" ry="3.4" fill="#f2b632"/><ellipse cx="17" cy="${y - 1.2}" rx="9" ry="3.4" fill="#ffcf3f"/>`).join("")}${coin(34, 32, 9)}`)
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
