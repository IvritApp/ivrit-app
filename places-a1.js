// =====================================================
// places-a1.js — живые места главы A1 (уровни 4–10). Движок — places.js.
//   bus (город и автобус), shabbat, cafe, shuk, clinic, office, bank
// Каждое место: фон 1080×440 (3 части по 360), хозяин, предметы-«споты», вход (фасад), подарок.
// =====================================================
(function () {
  if (!window.PLACE_KIT) return;
  const { ART, GIFTS, PLACES, HL, SHD, planks, doorway, W } = window.PLACE_KIT;
  const rr = (x, y, w, h, r, f, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${extra || ""}/>`;
  const txt = (x, y, s, size, f, w) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${w || 700}" fill="${f}" font-family="Arial, sans-serif">${s}</text>`;
  const crate = (w, h) => `${rr(-3, h - 22, w + 6, 22, 2, "#a87442")}<path d="M-3,${h - 12} L${w + 3},${h - 12}" stroke="#8a5a2e" stroke-width="1.2" opacity=".7"/>`;
  const balls = (w, h, r, c, d, n) => { let s = ""; const per = Math.floor(w / (r * 2)); for (let i = 0; i < n; i++) { const x = r + (i % per) * r * 2 + (Math.floor(i / per) % 2) * r, y = h - 22 - r * .6 - Math.floor(i / per) * r * 1.4; s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r * .3}" cy="${y - r * .35}" r="${r * .3}" fill="#fff" opacity=".35"/>${d ? `<circle cx="${x + r * .4}" cy="${y + r * .3}" r="${r * .45}" fill="${d}" opacity=".35"/>` : ""}`; } return s; };
  const frame = (inner) => `${rr(0, 0, 110, 110, 6, "#fff", 'stroke="#c8d0d8" stroke-width="4"')}${inner}`;
  const sky = (c1, c2) => `<defs><linearGradient id="plSky${c1.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="${W}" height="440" fill="url(#plSky${c1.slice(1)})"/>`;
  const doors = (x, y, w, h, fill, stroke) => `<rect class="mk-door-l" x="${x}" y="${y}" width="${w / 2}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="3"/><rect class="mk-door-r" x="${x + w / 2}" y="${y}" width="${w / 2}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  const glassDoors = (x, y, w, h) => doors(x, y, w, h, "#a9d0ea", "#7d8b99");

  // =====================================================
  // ПРЕДМЕТЫ
  // =====================================================
  Object.assign(ART, {
    // ---------- город ----------
    light: { vb: [46, 240], svg: () => `${rr(19, 96, 8, 144, 3, "#5b6470")}${rr(0, 0, 46, 100, 9, "#2b2f3a")}
      <circle cx="23" cy="20" r="11" fill="#e8413a"/><circle cx="23" cy="50" r="11" fill="#5b4a1e"/><circle cx="23" cy="80" r="11" fill="#2a4a32"/>${HL(19, 16, 4, 3, .6)}${rr(10, 236, 26, 6, 2, "#3b4352")}` },
    shop: { vb: [170, 200], svg: () => `${rr(0, 30, 170, 170, 3, "#f3e3c3")}${rr(0, 0, 170, 40, 4, "#3a8ad6")}${txt(85, 28, "חנות", 22, "#fff")}
      ${Array.from({ length: 7 }, (_, i) => `<path d="M${i * 25},40 L${i * 25 + 12.5},58 L${i * 25 + 25},40Z" fill="${i % 2 ? "#fff" : "#e8413a"}"/>`).join("")}
      ${rr(12, 70, 90, 80, 3, "#bfe0f5", 'stroke="#8d969f" stroke-width="3"')}${rr(112, 70, 46, 130, 2, "#8a5a36")}<circle cx="148" cy="138" r="3" fill="#f2b632"/>
      <circle cx="35" cy="128" r="9" fill="#e8913a"/><circle cx="55" cy="130" r="8" fill="#9ccc4a"/>${rr(68, 112, 22, 28, 3, "#e8413a")}` },
    streetlamp: { vb: [36, 230], svg: () => `${rr(15, 20, 6, 210, 3, "#5b6470")}<path d="M18,22 Q18,4 34,6" stroke="#5b6470" stroke-width="5" fill="none"/>${rr(24, 4, 14, 10, 3, "#ffe08a")}${rr(8, 224, 20, 6, 2, "#3b4352")}` },
    car: { vb: [120, 64], svg: () => `${SHD(60, 62, 56, 4)}<path d="M6,40 Q6,24 24,24 L34,8 Q38,4 46,4 L80,4 Q88,4 92,10 L102,24 Q116,26 116,40 L116,48 L6,48Z" fill="#5aa9f0"/>
      <path d="M40,10 L56,10 L56,24 L32,24Z M62,10 L84,10 L94,24 L62,24Z" fill="#dff1ff"/><circle cx="30" cy="50" r="11" fill="#2b2f3a"/><circle cx="92" cy="50" r="11" fill="#2b2f3a"/><circle cx="30" cy="50" r="4" fill="#aeb6be"/><circle cx="92" cy="50" r="4" fill="#aeb6be"/>` },
    taxi: { vb: [140, 78], svg: () => `${SHD(70, 76, 66, 4)}<path d="M6,50 Q6,32 26,32 L38,12 Q42,6 52,6 L92,6 Q102,6 106,14 L118,32 Q134,34 134,50 L134,60 L6,60Z" fill="#ffd23a"/>
      ${rr(56, 0, 30, 10, 3, "#2b2f3a")}${txt(71, 8, "TAXI", 7, "#ffd23a")}<path d="M44,14 L64,14 L64,32 L36,32Z M70,14 L96,14 L108,32 L70,32Z" fill="#dff1ff"/>
      ${Array.from({ length: 8 }, (_, i) => rr(10 + i * 15, 42, 7, 7, 0, i % 2 ? "#2b2f3a" : "#ffd23a")).join("")}<circle cx="34" cy="62" r="13" fill="#2b2f3a"/><circle cx="108" cy="62" r="13" fill="#2b2f3a"/><circle cx="34" cy="62" r="5" fill="#aeb6be"/><circle cx="108" cy="62" r="5" fill="#aeb6be"/>` },
    bus: { vb: [190, 136], svg: () => `${SHD(95, 134, 92, 5)}${rr(0, 6, 190, 112, 14, "#3cae5c")}${rr(0, 6, 190, 18, 10, "#2e9d50")}
      ${[0, 1, 2, 3].map(i => rr(12 + i * 38, 30, 32, 36, 4, "#dff1ff")).join("")}${rr(162, 30, 24, 78, 3, "#bfe0f5", 'stroke="#2b2f3a" stroke-width="2"')}
      ${rr(10, 84, 140, 6, 3, "#fff", 'opacity=".6"')}${rr(70, 10, 56, 12, 3, "#2b2f3a")}${txt(98, 20, "5 מרכז", 10, "#ffd23a")}
      <circle cx="38" cy="120" r="14" fill="#2b2f3a"/><circle cx="150" cy="120" r="14" fill="#2b2f3a"/><circle cx="38" cy="120" r="5" fill="#aeb6be"/><circle cx="150" cy="120" r="5" fill="#aeb6be"/>${HL(30, 40, 6, 3, .5)}` },
    stop: { vb: [40, 230], svg: () => `${rr(17, 40, 6, 190, 3, "#5b6470")}<circle cx="20" cy="22" r="20" fill="#3a8ad6"/><circle cx="20" cy="22" r="15" fill="#fff"/>${txt(20, 28, "🚌", 16, "#3a8ad6")}${rr(4, 60, 32, 44, 3, "#fff", 'stroke="#c8d0d8"')}${txt(20, 78, "5", 13, "#3cae5c")}${txt(20, 96, "18", 11, "#e8913a")}` },
    park: { vb: [150, 230], svg: () => `<ellipse cx="75" cy="218" rx="74" ry="12" fill="#8fce6a"/>
      ${[[30, 120, 34], [104, 100, 42], [70, 70, 36]].map(([x, y, r]) => `${rr(x - 5, y, 10, 220 - y, 3, "#8a5a36")}<circle cx="${x}" cy="${y}" r="${r}" fill="#4f9d5d"/><circle cx="${x - r * .3}" cy="${y - r * .3}" r="${r * .5}" fill="#6dbb6a"/>`).join("")}
      ${rr(30, 190, 90, 8, 3, "#a87442")}${rr(36, 198, 6, 16, 1, "#5b3a22")}${rr(108, 198, 6, 16, 1, "#5b3a22")}${rr(30, 176, 90, 6, 3, "#a87442")}
      ${rr(54, 0, 44, 24, 4, "#fff", 'stroke="#3cae5c" stroke-width="3"')}${txt(76, 17, "פארק", 11, "#3cae5c")}` },
    bench: { vb: [100, 60], svg: () => `${rr(0, 20, 100, 9, 3, "#a87442")}${rr(0, 4, 100, 8, 3, "#a87442")}${rr(8, 29, 7, 30, 1, "#5b6470")}${rr(85, 29, 7, 30, 1, "#5b6470")}` },
    ticket: { vb: [80, 52], svg: () => `${rr(0, 0, 80, 52, 7, "#3a8ad6")}${rr(0, 34, 80, 10, 0, "#2f6fb2")}${txt(28, 24, "רב-קו", 14, "#fff")}<circle cx="64" cy="18" r="9" fill="#ffd23a"/>${HL(16, 8, 10, 3, .35)}` },

    // ---------- шабат ----------
    soup: { vb: [110, 120], svg: () => `${SHD(55, 118, 50, 4)}<path d="M8,44 L102,44 L96,108 Q94,116 84,116 L26,116 Q16,116 14,108Z" fill="#c9cfd6"/>${rr(2, 38, 106, 10, 5, "#aeb6be")}
      <ellipse cx="55" cy="44" rx="46" ry="7" fill="#f2b632"/>${rr(-6, 54, 18, 8, 4, "#8d969f")}${rr(98, 54, 18, 8, 4, "#8d969f")}
      <path d="M70,40 L92,-4" stroke="#8a5a36" stroke-width="6" stroke-linecap="round"/>
      <path d="M30,30 Q24,18 32,8 M48,30 Q42,16 50,4 M66,24 Q62,14 68,6" stroke="#c7ced8" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>${HL(26, 76, 6, 20, .4)}` },
    salt: { vb: [40, 64], svg: () => `${SHD(20, 63, 16, 2)}<path d="M6,20 L34,20 L32,62 L8,62Z" fill="#f4f6fa" stroke="#c8d0d8" stroke-width="2"/>${rr(4, 8, 32, 14, 6, "#aeb6be")}
      ${[12, 20, 28].map(x => `<circle cx="${x}" cy="14" r="1.6" fill="#5b6470"/>`).join("")}${txt(20, 48, "מלח", 9, "#3a8ad6")}` },
    kettle: { vb: [70, 64], svg: () => `${SHD(32, 63, 28, 2)}<path d="M8,60 Q4,24 32,22 Q60,24 56,60Z" fill="#e8413a"/><path d="M54,40 Q68,34 70,22" stroke="#e8413a" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M18,22 Q32,0 46,22" stroke="#2b2f3a" stroke-width="5" fill="none"/>${HL(20, 38, 5, 10, .4)}` },
    candles: { vb: [70, 100], svg: () => `${SHD(35, 98, 30, 3)}${[14, 50].map(x => `${rr(x - 8, 82, 22, 14, 3, "#d9b25a")}${rr(x - 4, 34, 14, 50, 3, "#fffaf0")}<path d="M${x + 3},34 L${x + 3},28" stroke="#2b2f3a" stroke-width="1.5"/>
      <path d="M${x + 3},6 Q${x + 11},20 ${x + 3},28 Q${x - 5},20 ${x + 3},6Z" fill="#ffb02e"/><path d="M${x + 3},14 Q${x + 7},22 ${x + 3},27 Q${x - 1},22 ${x + 3},14Z" fill="#ffe86a"/>`).join("")}` },
    challah: { vb: [110, 60], svg: () => {
  // плетёная хала: 5 «узлов», в каждом две пряди крест-накрест, глянец и кунжут
  let s = `<ellipse cx="55" cy="56" rx="52" ry="4" fill="#000" opacity=".12"/>
    <defs><linearGradient id="chG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8a24f"/><stop offset=".55" stop-color="#c97a2c"/><stop offset="1" stop-color="#9a5a1e"/></linearGradient></defs>
    <path d="M8,42 Q10,30 24,30 L86,30 Q100,30 102,42 Q98,52 84,53 L26,53 Q12,52 8,42Z" fill="#a8641f"/>`;
  const n = 5;
  for (let i = 0; i < n; i++) {
    const cx = 17 + i * 19, h = 1 - Math.abs(i - 2) * .17;
    const cy = 42 - 14 * h;
    s += `<ellipse cx="${cx - 3}" cy="${cy}" rx="${10.5 * h}" ry="${15 * h}" fill="url(#chG)" transform="rotate(-38 ${cx - 3} ${cy})"/>`;
    s += `<ellipse cx="${cx + 3}" cy="${cy + 3}" rx="${10.5 * h}" ry="${15 * h}" fill="url(#chG)" transform="rotate(38 ${cx + 3} ${cy + 3})"/>`;
    s += `<path d="M${cx - 8},${cy - 6 * h} Q${cx - 3},${cy - 12 * h} ${cx + 1},${cy - 8 * h}" stroke="#ffd79a" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>`;
  }
  [[14, 24], [22, 30], [33, 22], [41, 28], [52, 20], [60, 27], [70, 22], [78, 29], [89, 24], [95, 31], [28, 34], [65, 33]].forEach(([x, y]) => s += `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="1" fill="#fff6dc" transform="rotate(${(x * 7) % 60 - 30} ${x} ${y})"/>`);
  return s;
    } },
    wine: { vb: [50, 110], svg: () => `${SHD(25, 108, 20, 3)}${rr(19, 0, 12, 30, 3, "#5a1e2e")}<path d="M19,28 Q4,40 6,56 L6,104 Q6,108 10,108 L40,108 Q44,108 44,104 L44,56 Q46,40 31,28Z" fill="#7a2638"/>
      ${rr(10, 60, 30, 30, 3, "#f4e9d0")}${txt(25, 80, "יין", 11, "#7a2638")}${HL(14, 50, 3, 12, .35)}` },
    flowers: { vb: [56, 100], svg: () => `<ellipse cx="28" cy="98" rx="18" ry="3" fill="#000" opacity=".12"/>
  <path d="M28,62 Q14,40 12,22 M28,62 Q28,36 30,12 M28,62 Q40,42 46,24" stroke="#3f8f4c" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M28,64 Q8,52 6,40 Q20,46 28,60Z M28,64 Q48,54 52,42 Q38,46 28,60Z" fill="#4f9d5d"/>
  ${[[12, 22, "#e8413a", "#ff7a6e"], [30, 12, "#ffc21a", "#ffe07a"], [46, 24, "#f06aa6", "#ffa6cf"]].map(([x, y, c, l]) => `<path d="M${x - 8},${y} Q${x - 9},${y - 12} ${x - 4},${y - 15} L${x},${y - 9} L${x + 4},${y - 15} Q${x + 9},${y - 12} ${x + 8},${y} Q${x},${y + 8} ${x - 8},${y}Z" fill="${c}"/><path d="M${x - 4},${y - 12} Q${x - 4},${y - 2} ${x - 1},${y + 2}" stroke="${l}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join("")}
  <path d="M16,62 L40,62 Q42,62 41,66 L38,96 Q38,98 36,98 L20,98 Q18,98 18,96 L15,66 Q14,62 16,62Z" fill="#bfe3f7" opacity=".85"/><path d="M17,74 L39,74 L37,96 L19,96Z" fill="#8cc8ec" opacity=".7"/><path d="M20,66 L22,92" stroke="#fff" stroke-width="2" opacity=".7"/>` },
    books: { vb: [120, 230], svg: () => `${rr(0, 0, 120, 230, 3, "#a87442")}${[0, 1, 2, 3].map(r => `${rr(6, 6 + r * 56, 108, 50, 1, "#7a5230")}${[0, 1, 2, 3, 4, 5, 6].map(i => rr(10 + i * 14, 14 + r * 56 + (i % 3) * 3, 11, 40 - (i % 3) * 3, 1, ["#e8413a", "#3a8ad6", "#f2b632", "#3cae5c", "#b57be0", "#ff8a35", "#fff"][(i + r) % 7])).join("")}`).join("")}` },
    cake: { vb: [80, 60], svg: () => `${SHD(40, 58, 36, 3)}${rr(6, 22, 68, 34, 6, "#f7c6d9")}${rr(6, 22, 68, 10, 5, "#fff")}<path d="M6,32 Q16,40 26,32 Q36,40 46,32 Q56,40 66,32 L74,32" stroke="#fff" stroke-width="4" fill="none"/>
      ${[20, 40, 60].map(x => `<circle cx="${x}" cy="18" r="5" fill="#e8413a"/>`).join("")}` },

    // ---------- кафе ----------
    croissant: { vb: [80, 46], svg: () => `${SHD(40, 44, 36, 3)}<path d="M4,34 Q8,10 40,8 Q72,10 76,34 Q66,40 58,32 Q50,42 40,34 Q30,42 22,32 Q14,40 4,34Z" fill="#e0a24a"/>
      ${[22, 40, 58].map(x => `<path d="M${x},12 Q${x - 4},24 ${x},34" stroke="#b9772a" stroke-width="2" fill="none"/>`).join("")}${HL(34, 16, 10, 3, .35)}` },
    muffin: { vb: [54, 56], svg: () => `${SHD(27, 54, 22, 2)}<path d="M8,26 L46,26 L42,54 L12,54Z" fill="#5aa9f0"/>${[16, 24, 32, 40].map(x => `<path d="M${x},28 L${x - 1},52" stroke="#3a8ad6" stroke-width="1.5"/>`).join("")}
      <path d="M4,28 Q4,4 27,4 Q50,4 50,28Z" fill="#8a5a36"/>${[[16, 14], [30, 10], [38, 20], [22, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#3b2a20"/>`).join("")}` },
    sandwich: { vb: [86, 46], svg: () => `${SHD(43, 44, 40, 3)}<path d="M4,30 L82,30 L76,40 L10,40Z" fill="#e6bf82"/><path d="M4,26 Q20,20 40,26 Q60,20 82,26 L82,31 L4,31Z" fill="#7fae5a"/>
      ${rr(6, 20, 74, 6, 2, "#e8413a")}${rr(6, 14, 74, 6, 2, "#ffd54f")}<path d="M4,14 Q43,-4 82,14Z" fill="#e6bf82"/>` },
    cappuccino: { vb: [62, 56], svg: () => `${SHD(28, 55, 26, 2)}<ellipse cx="28" cy="50" rx="27" ry="5" fill="#f4f6fa" stroke="#c8d0d8"/>
      <path d="M6,16 L50,16 L46,44 Q44,50 38,50 L18,50 Q12,50 10,44Z" fill="#fff" stroke="#c8d0d8" stroke-width="2"/><path d="M50,22 Q62,22 60,32 Q58,40 47,38" stroke="#c8d0d8" stroke-width="4" fill="none"/>
      <ellipse cx="28" cy="17" rx="21" ry="5" fill="#c58b55"/><path d="M22,16 Q28,12 34,16 Q28,22 22,16Z" fill="#fff4e4"/>
      <path d="M20,10 Q16,4 20,-2 M32,10 Q28,2 32,-4" stroke="#c7ced8" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
    juice: { vb: [44, 66], svg: () => `${SHD(22, 65, 18, 2)}<path d="M4,6 L40,6 L36,64 L8,64Z" fill="#ffb02e" opacity=".9"/><path d="M4,6 L40,6 L39,16 L5,16Z" fill="#ffd27a"/>
      <path d="M26,-8 L22,30" stroke="#e8413a" stroke-width="3"/><circle cx="38" cy="8" r="9" fill="#ff9f2e"/><circle cx="38" cy="8" r="6" fill="#ffd27a"/>${HL(12, 34, 3, 14, .4)}` },
    shakshuka: { vb: [110, 80], svg: () => frame2(`<ellipse cx="55" cy="44" rx="40" ry="26" fill="#2b2f3a"/><ellipse cx="55" cy="42" rx="34" ry="21" fill="#d9442f"/>
      ${[[40, 36], [66, 34], [54, 50]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="7" fill="#fff"/><circle cx="${x}" cy="${y}" r="4" fill="#ffc21a"/>`).join("")}
      <path d="M12,44 L-4,40" stroke="#2b2f3a" stroke-width="6" stroke-linecap="round"/>${[[30, 50], [74, 48], [48, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#3f8f4c"/>`).join("")}`, "שקשוקה") },
    omelet: { vb: [110, 80], svg: () => frame2(`<ellipse cx="55" cy="44" rx="40" ry="20" fill="#fff" stroke="#c8d0d8" stroke-width="2"/>
      <path d="M24,44 Q30,26 55,26 Q80,26 86,44 Q70,54 55,50 Q40,54 24,44Z" fill="#ffd54f"/>${[[40, 38], [60, 34], [70, 42]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#3f8f4c"/>`).join("")}${HL(46, 32, 10, 3, .5)}`, "חביתה") },
    salad: { vb: [110, 80], svg: () => frame2(`<ellipse cx="55" cy="46" rx="38" ry="18" fill="#fff" stroke="#c8d0d8" stroke-width="2"/>
      ${[[38, 40, "#e8413a"], [50, 36, "#7fae5a"], [62, 42, "#e8413a"], [72, 38, "#7fae5a"], [44, 48, "#7fae5a"], [58, 48, "#ffd54f"]].map(([x, y, c]) => rr(x - 5, y - 5, 10, 10, 2, c)).join("")}`, "סלט") },
    pancakes: { vb: [110, 80], svg: () => frame2(`<ellipse cx="55" cy="52" rx="38" ry="12" fill="#fff" stroke="#c8d0d8" stroke-width="2"/>
      ${[0, 1, 2].map(i => `<ellipse cx="55" cy="${48 - i * 8}" rx="28" ry="8" fill="#d99a4e"/>`).join("")}<path d="M38,30 Q55,22 72,30 L70,40 Q60,34 50,42 Z" fill="#8a4a1e" opacity=".8"/>`, "פנקייק") },
    icecream: { vb: [44, 80], svg: () => `<path d="M10,32 L34,32 L22,78Z" fill="#e0a24a"/><path d="M12,36 L30,58 M32,36 L16,60" stroke="#b9772a" stroke-width="1.5"/>
      <circle cx="22" cy="24" r="14" fill="#f7c6d9"/><circle cx="14" cy="16" r="10" fill="#fff4e4"/><circle cx="30" cy="14" r="9" fill="#8a5a36"/>${HL(18, 12, 4, 2, .6)}` },

    // ---------- шук ----------
    grapes: { vb: [80, 56], svg: () => `${balls(80, 56, 6, "#8a4fb5", "#5a2e80", 18)}${crate(80, 56)}` },
    watermelon: { vb: [110, 70], svg: () => `${SHD(55, 68, 52, 3)}<ellipse cx="38" cy="40" rx="34" ry="26" fill="#3f8f4c"/>${[18, 30, 42, 54].map(x => `<path d="M${x},16 Q${x - 4},40 ${x},64" stroke="#2c6b3a" stroke-width="3" fill="none"/>`).join("")}
      <path d="M58,62 L106,62 Q104,22 82,22 Q60,22 58,62Z" fill="#3f8f4c"/><path d="M62,62 L102,62 Q100,28 82,28 Q64,28 62,62Z" fill="#ff5a5f"/>${[[72, 50], [82, 40], [92, 50], [80, 54]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#2b2f3a"/>`).join("")}` },
    pomegranate: { vb: [80, 56], svg: () => `${balls(80, 56, 11, "#c0283a", "#7a1424", 5)}${crate(80, 56)}` },
    oranges: { vb: [80, 56], svg: () => `${balls(80, 56, 10, "#ff9f2e", "#c25f0a", 6)}${crate(80, 56)}` },
    lemons: { vb: [80, 56], svg: () => `${balls(80, 56, 9, "#f7dc3c", "#c9a40e", 7)}${crate(80, 56)}` },
    carrot: { vb: [80, 56], svg: () => `${[0, 1, 2, 3, 4].map(i => `<g transform="translate(${8 + i * 14},${4 + (i % 2) * 4}) rotate(${-10 + i * 5})"><path d="M0,8 L12,8 L6,40Z" fill="#ff8a1e"/><path d="M6,8 L2,-4 M6,8 L6,-6 M6,8 L10,-4" stroke="#3f8f4c" stroke-width="2.5" stroke-linecap="round"/></g>`).join("")}${crate(80, 56)}` },
    pepper: { vb: [80, 56], svg: () => `${[0, 1, 2].map(i => `<g transform="translate(${6 + i * 24},${8 + (i % 2) * 4})"><path d="M2,10 Q0,2 10,2 Q20,2 18,10 Q20,30 10,34 Q0,30 2,10Z" fill="#e23b2e"/><path d="M10,2 L10,-4" stroke="#3f8f4c" stroke-width="3"/>${HL(6, 12, 2, 6, .45)}</g>`).join("")}${crate(80, 56)}` },
    tomatoes: { vb: [80, 56], svg: () => `${balls(80, 56, 9, "#e5483d", "#a8261d", 7)}${crate(80, 56)}` },
    cucumbers: { vb: [80, 56], svg: () => `${[0, 1, 2, 3].map(i => rr(4 + (i % 2) * 6, 6 + i * 7, 66, 9, 4.5, i % 2 ? "#2f7d3c" : "#3a8f47")).join("")}${crate(80, 56)}` },
    potatoes: { vb: [80, 56], svg: () => `${balls(80, 56, 10, "#c99a62", "#8d6538", 6)}${crate(80, 56)}` },
    strawberries: { vb: [70, 50], svg: () => `${rr(0, 22, 70, 28, 4, "#fff", 'stroke="#c8d0d8" stroke-width="2"')}${[[12, 18], [26, 14], [40, 18], [54, 14], [20, 26], [46, 26]].map(([x, y]) => `<path d="M${x - 7},${y} Q${x},${y + 16} ${x + 7},${y} Q${x},${y - 4} ${x - 7},${y}Z" fill="#e8413a"/><path d="M${x - 4},${y - 1} L${x},${y - 5} L${x + 4},${y - 1}" stroke="#3f8f4c" stroke-width="2" fill="none"/>`).join("")}` },

    // ---------- врач (картинки на плакате) ----------
    head: { vb: [110, 110], svg: () => frame(`<circle cx="55" cy="52" r="30" fill="#f2c7a3"/><path d="M25,46 Q28,18 55,18 Q82,18 85,46 Q70,30 55,32 Q40,30 25,46Z" fill="#5a3a24"/>
      <circle cx="45" cy="54" r="3" fill="#2b2f3a"/><circle cx="65" cy="54" r="3" fill="#2b2f3a"/><path d="M46,68 Q55,74 64,68" stroke="#2b2f3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>${txt(55, 102, "רֹאשׁ", 12, "#3a8ad6")}`) },
    ear: { vb: [110, 110], svg: () => frame(`<path d="M42,22 Q76,18 78,50 Q78,72 60,76 Q56,92 44,88 Q36,84 42,72 Q52,66 52,52 Q52,40 44,40 Q36,40 36,48 L26,46 Q26,24 42,22Z" fill="#f2c7a3" stroke="#d99d72" stroke-width="2"/>
      <path d="M46,30 Q66,30 66,50" stroke="#d99d72" stroke-width="3" fill="none"/>${txt(55, 102, "אוֹזֶן", 12, "#3a8ad6")}`) },
    eye: { vb: [110, 110], svg: () => frame(`<path d="M16,52 Q55,16 94,52 Q55,88 16,52Z" fill="#fff" stroke="#2b2f3a" stroke-width="3"/><circle cx="55" cy="52" r="16" fill="#6a9ed8"/><circle cx="55" cy="52" r="7" fill="#2b2f3a"/><circle cx="60" cy="47" r="3" fill="#fff"/>${txt(55, 102, "עַיִן", 12, "#3a8ad6")}`) },
    nose: { vb: [110, 110], svg: () => frame(`<path d="M52,20 Q50,50 38,64 Q36,74 48,74 Q55,80 62,74 Q74,74 72,64 Q60,50 58,20Z" fill="#f2c7a3" stroke="#d99d72" stroke-width="2"/><circle cx="47" cy="70" r="3" fill="#b97a52"/><circle cx="63" cy="70" r="3" fill="#b97a52"/>${txt(55, 102, "אַף", 12, "#3a8ad6")}`) },
    throat: { vb: [110, 110], svg: () => frame(`<circle cx="55" cy="30" r="18" fill="#f2c7a3"/>${rr(44, 44, 22, 30, 6, "#f2c7a3")}<path d="M22,90 Q24,70 55,72 Q86,70 88,90Z" fill="#5aa9f0"/>
      <ellipse cx="55" cy="58" rx="9" ry="7" fill="#e8413a" opacity=".6"/>${[[40, 54], [70, 54]].map(([x, y]) => `<path d="M${x},${y} l-6,-4 M${x},${y} l-7,2" stroke="#e8413a" stroke-width="2"/>`).join("")}${txt(55, 102, "גָּרוֹן", 12, "#3a8ad6")}`) },
    belly: { vb: [110, 110], svg: () => frame(`<path d="M28,16 Q55,10 82,16 Q92,50 80,86 L30,86 Q18,50 28,16Z" fill="#f2c7a3" stroke="#d99d72" stroke-width="2"/><circle cx="55" cy="58" r="3" fill="#b97a52"/>
      <path d="M40,30 Q55,36 70,30" stroke="#d99d72" stroke-width="2" fill="none"/>${txt(55, 102, "בֶּטֶן", 12, "#3a8ad6")}`) },
    back: { vb: [110, 110], svg: () => frame(`<path d="M24,18 Q55,8 86,18 Q92,52 82,86 L28,86 Q18,52 24,18Z" fill="#f2c7a3" stroke="#d99d72" stroke-width="2"/>
      ${[20, 30, 40, 50, 60, 70].map(y => `<circle cx="55" cy="${y + 4}" r="3" fill="#d99d72"/>`).join("")}<path d="M36,30 Q46,40 40,56 M74,30 Q64,40 70,56" stroke="#d99d72" stroke-width="2" fill="none"/>${txt(55, 102, "גַּב", 12, "#3a8ad6")}`) },
    hand: { vb: [110, 110], svg: () => frame(`<path d="M40,88 L40,48 Q40,40 46,40 Q50,40 50,48 L50,22 Q50,16 55,16 Q60,16 60,22 L60,44 L62,26 Q62,20 67,20 Q72,20 72,26 L72,50 L74,36 Q75,30 80,31 Q84,32 84,38 L82,66 Q80,86 64,90 Z" fill="#f2c7a3" stroke="#d99d72" stroke-width="2"/>${txt(55, 102, "יָד", 12, "#3a8ad6")}`) },
    leg: { vb: [110, 110], svg: () => frame(`${rr(40, 10, 24, 64, 10, "#5aa9f0")}${rr(42, 60, 20, 22, 6, "#f2c7a3")}<path d="M40,80 L76,80 Q84,80 84,88 L40,88Z" fill="#2b2f3a"/>${txt(55, 102, "רֶגֶל", 12, "#3a8ad6")}`) },
    prescription: { vb: [60, 76], svg: () => `${rr(0, 0, 60, 76, 4, "#fff", 'stroke="#c8d0d8" stroke-width="2"')}${rr(0, 0, 60, 14, 3, "#3cae5c")}${txt(30, 11, "מרשם", 9, "#fff")}
      ${[24, 34, 44, 54].map((y, i) => `<path d="M8,${y} L${[52, 40, 48, 30][i]},${y}" stroke="#c8d0d8" stroke-width="3" stroke-linecap="round"/>`).join("")}<path d="M34,66 Q40,58 46,66 T56,64" stroke="#3a8ad6" stroke-width="2" fill="none"/>` },

    // ---------- офис ----------
    desk: { vb: [200, 90], svg: () => `${SHD(100, 88, 96, 4)}${rr(0, 0, 200, 14, 3, "#e9e1d2")}${rr(4, 14, 70, 74, 2, "#c99a63")}${rr(10, 22, 58, 20, 2, "#d6ab76")}${rr(10, 48, 58, 20, 2, "#d6ab76")}
      ${rr(34, 30, 10, 3, 1, "#7a5230")}${rr(34, 56, 10, 3, 1, "#7a5230")}${rr(186, 14, 10, 74, 2, "#a87442")}` },
    computer: { vb: [90, 80], svg: () => `${rr(0, 0, 90, 56, 5, "#2b2f3a")}${rr(5, 5, 80, 46, 2, "#5aa9f0")}${rr(12, 12, 30, 6, 2, "#fff", 'opacity=".7"')}${rr(12, 22, 50, 4, 2, "#fff", 'opacity=".5"')}${rr(12, 30, 40, 4, 2, "#fff", 'opacity=".5"')}
      ${rr(38, 56, 14, 12, 0, "#5b6470")}${rr(24, 66, 42, 6, 3, "#3b4352")}${rr(70, 70, 22, 8, 3, "#c8d0d8")}` },
    chair: { vb: [64, 104], svg: () => `${SHD(32, 102, 26, 3)}${rr(8, 0, 48, 56, 12, "#3b4352")}${rr(2, 52, 60, 14, 6, "#2b2f3a")}${rr(29, 66, 6, 26, 2, "#8d969f")}
      <path d="M10,98 L54,98 M32,92 L12,100 M32,92 L52,100" stroke="#5b6470" stroke-width="4" stroke-linecap="round"/>` },
    printer: { vb: [100, 80], svg: () => `${SHD(50, 78, 46, 3)}${rr(18, 0, 64, 20, 2, "#fff", 'stroke="#c8d0d8"')}${rr(0, 16, 100, 46, 8, "#d7dde4")}${rr(0, 52, 100, 26, 6, "#aeb6be")}
      ${rr(20, 60, 60, 16, 2, "#fff")}<circle cx="86" cy="28" r="4" fill="#3cae5c"/>${rr(10, 26, 40, 6, 3, "#5b6470")}` },
    phone: { vb: [60, 44], svg: () => `${SHD(30, 43, 26, 2)}${rr(4, 16, 52, 28, 6, "#2b2f3a")}<path d="M2,16 Q2,2 14,4 L46,4 Q58,2 58,16 L48,18 L46,10 L14,10 L12,18Z" fill="#3b4352"/>
      ${[0, 1, 2].map(r => [0, 1, 2].map(c => rr(18 + c * 9, 22 + r * 6, 6, 4, 1, "#c8d0d8")).join("")).join("")}` },
    clock: { vb: [56, 56], svg: () => `<circle cx="28" cy="28" r="26" fill="#fff" stroke="#3b4352" stroke-width="4"/><path d="M28,28 L28,12 M28,28 L40,32" stroke="#2b2f3a" stroke-width="3" stroke-linecap="round"/>${[0, 3, 6, 9].map(i => `<circle cx="${28 + Math.sin(i * Math.PI / 6) * 19}" cy="${28 - Math.cos(i * Math.PI / 6) * 19}" r="2" fill="#2b2f3a"/>`).join("")}` },
    cooler: { vb: [50, 150], svg: () => `${SHD(25, 148, 22, 3)}<path d="M8,10 Q8,0 25,0 Q42,0 42,10 L42,44 L8,44Z" fill="#9fd3f5" opacity=".9"/>${rr(4, 44, 42, 104, 4, "#e9eef3", 'stroke="#c8d0d8" stroke-width="2"')}${rr(14, 60, 8, 8, 2, "#3a8ad6")}${rr(28, 60, 8, 8, 2, "#e8413a")}${rr(12, 80, 26, 4, 2, "#aeb6be")}` },
    badge: { vb: [56, 80], svg: () => `<path d="M28,0 L28,14" stroke="#3a8ad6" stroke-width="4"/>${rr(0, 12, 56, 68, 6, "#fff", 'stroke="#3a8ad6" stroke-width="3"')}${rr(0, 12, 56, 16, 5, "#3a8ad6")}
      <circle cx="28" cy="44" r="11" fill="#f2c7a3"/><path d="M17,40 Q20,30 28,30 Q36,30 39,40Z" fill="#5a3a24"/>${rr(10, 62, 36, 5, 2, "#c8d0d8")}${rr(14, 70, 28, 4, 2, "#c8d0d8")}` },
    plant: ART.plant,
    lamp2: { vb: [40, 60], svg: () => `${rr(14, 54, 16, 6, 2, "#3b4352")}<path d="M22,56 L22,24 L34,10" stroke="#3b4352" stroke-width="3" fill="none"/><path d="M26,2 L42,8 L36,22 L22,14Z" fill="#ffd54f"/>` },

    // ---------- банк и почта ----------
    envelope: { vb: [80, 52], svg: () => `${SHD(40, 51, 36, 2)}${rr(0, 0, 80, 50, 3, "#fff", 'stroke="#c8d0d8" stroke-width="2"')}<path d="M2,2 L40,30 L78,2" stroke="#c8d0d8" stroke-width="2" fill="none"/>
      ${rr(58, 6, 16, 18, 1, "#e8413a")}<path d="M10,38 L36,38 M10,44 L30,44" stroke="#8d969f" stroke-width="2"/>` },
    stamp: { vb: [60, 70], svg: () => `${rr(0, 0, 60, 70, 2, "#fff", 'stroke="#c8d0d8" stroke-dasharray="3 2" stroke-width="2"')}${rr(6, 6, 48, 58, 1, "#3a8ad6")}
      <path d="M30,16 L36,30 L50,30 L38,40 L42,54 L30,46 L18,54 L22,40 L10,30 L24,30Z" fill="#ffd23a"/>${txt(30, 62, "₪5", 8, "#fff")}` },
    parcel: { vb: [80, 70], svg: () => `${SHD(40, 68, 36, 3)}${rr(0, 10, 80, 58, 3, "#c99a63")}<path d="M0,10 L14,0 L94,0 L80,10Z" fill="#d6ab76" transform="translate(-7 0)"/>${rr(34, 10, 12, 58, 0, "#e9d6b4")}${rr(50, 30, 24, 16, 2, "#fff")}` },
    mailbox: { vb: [50, 120], svg: () => `${rr(22, 50, 6, 70, 2, "#5b6470")}${rr(0, 0, 50, 56, 8, "#e8413a")}${rr(8, 14, 34, 6, 3, "#2b2f3a")}${txt(25, 42, "דואר", 10, "#fff")}` },
    form: { vb: [70, 90], svg: () => `${rr(0, 0, 70, 90, 3, "#fff", 'stroke="#c8d0d8" stroke-width="2"')}${rr(0, 0, 70, 14, 2, "#3a8ad6")}${txt(35, 11, "טופס", 9, "#fff")}
      ${[24, 36, 48, 60].map(y => `${rr(8, y, 14, 7, 1, "none", 'stroke="#8d969f"')}<path d="M26,${y + 5} L62,${y + 5}" stroke="#c8d0d8" stroke-width="2.5"/>`).join("")}<path d="M10,80 Q20,72 28,80 T46,78" stroke="#3a8ad6" stroke-width="2" fill="none"/>` },
    pen: { vb: [80, 18], svg: () => `${rr(10, 4, 60, 10, 4, "#3a8ad6")}<path d="M70,4 L80,9 L70,14Z" fill="#e9e1d2"/><path d="M78,9 L80,9" stroke="#2b2f3a" stroke-width="2"/>${rr(0, 4, 12, 10, 3, "#2b2f3a")}${rr(16, 2, 26, 3, 1.5, "#aeb6be")}` },
    passport: { vb: [60, 80], svg: () => `${rr(0, 0, 60, 80, 5, "#1f3d7a")}<circle cx="30" cy="32" r="14" fill="none" stroke="#f2c75a" stroke-width="2.5"/><path d="M30,20 L35,36 L22,26 L38,26 L25,36Z" fill="#f2c75a"/>
      ${txt(30, 62, "דרכון", 10, "#f2c75a")}${txt(30, 72, "PASSPORT", 6, "#f2c75a")}` },
    calculator: { vb: [56, 70], svg: () => `${rr(0, 0, 56, 70, 6, "#3b4352")}${rr(6, 6, 44, 16, 2, "#a8e0b6")}${[0, 1, 2].map(r => [0, 1, 2].map(c => rr(7 + c * 15, 28 + r * 13, 12, 10, 2, "#d7dde4")).join("")).join("")}` },
    card: { vb: [80, 52], svg: () => `${rr(0, 0, 80, 52, 7, "#3cae5c")}${rr(8, 16, 16, 12, 2, "#f2c75a")}${txt(52, 42, "•••• 2026", 9, "#fff")}${HL(20, 8, 14, 3, .35)}` },
  });
  // табличка-картинка в меню кафе
  function frame2(inner, name) { return `${rr(0, 0, 110, 80, 6, "#fffaf0", 'stroke="#c9a06a" stroke-width="3"')}${inner}${txt(55, 76, name, 10, "#8a5a36")}`; }

  // =====================================================
  // ПОДАРКИ
  // =====================================================
  const g120 = (inner) => `<svg viewBox="0 0 120 120" width="100%" height="100%"><ellipse cx="60" cy="110" rx="42" ry="6" fill="#000" opacity=".1"/>${inner}</svg>`;
  const asIcon = (k, x, y, w, h) => { const a = ART[k]; return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${a.vb[0]} ${a.vb[1]}">${a.svg()}</svg>`; };
  Object.assign(GIFTS, {
    "gift-ticket": () => g120(`<g transform="rotate(-8 60 60)">${asIcon("ticket", 10, 30, 100, 65)}</g>`),
    "gift-challah": () => g120(`${rr(10, 70, 100, 30, 15, "#fff", 'stroke="#e1d6c4" stroke-width="2"')}${asIcon("challah", 8, 36, 104, 58)}`),
    "gift-coffee": () => g120(`${asIcon("cappuccino", 14, 22, 92, 84)}`),
    "gift-watermelon": () => g120(`${asIcon("watermelon", 6, 30, 108, 70)}`),
    "gift-pills": () => g120(`${rr(22, 30, 76, 70, 6, "#fff", 'stroke="#c8d0d8" stroke-width="3"')}${rr(22, 30, 76, 18, 5, "#3cae5c")}${txt(60, 44, "תרופה", 12, "#fff")}
      ${[[40, 66], [60, 66], [80, 66], [50, 84], [70, 84]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="5" fill="#f7c6d9" transform="rotate(30 ${x} ${y})"/>`).join("")}`),
    "gift-badge": () => g120(`${asIcon("badge", 30, 10, 60, 92)}`),
    "gift-card": () => g120(`<g transform="rotate(-10 60 60)">${asIcon("card", 10, 32, 100, 65)}</g>`),
  });

  // =====================================================
  // ХОЗЯЕВА
  // =====================================================
  const M = (o) => Object.assign({ head: "round", skin: 1, eyes: "round", mouth: "smile", body: "base", gender: "m", beard: "none", payot: "none", headwear: "none", bottom: "jeans", bottomColor: 0 }, o);
  const F = (o) => Object.assign({ head: "oval", skin: 1, eyes: "lashes", mouth: "smile", body: "slim", gender: "f", beard: "none", payot: "none", headwear: "none", bottom: "jeans", bottomColor: 0 }, o);

  // фон «улица» и «помещение»
  const street = (c1, c2) => `${sky(c1, c2)}
    ${Array.from({ length: 9 }, (_, i) => `${rr(i * 124 - 10, 150 - (i % 3) * 40, 110, 240, 4, ["#e9dcc6", "#f2e6d0", "#dccbb0"][i % 3])}${Array.from({ length: 6 }, (_, k) => rr(i * 124 + 6 + (k % 3) * 32, 166 - (i % 3) * 40 + Math.floor(k / 3) * 44, 22, 28, 2, "#9fc8e4")).join("")}`).join("")}
    ${rr(0, 340, W, 52, 0, "#d9d2c5")}${Array.from({ length: 27 }, (_, i) => `<path d="M${i * 40},340 L${i * 40},392" stroke="#c9c0b0" stroke-width="2"/>`).join("")}
    ${rr(0, 392, W, 48, 0, "#7b8592")}${Array.from({ length: 14 }, (_, i) => rr(20 + i * 80, 414, 40, 5, 2, "#fff")).join("")}`;
  const room = (wall, floor1, floor2) => `${rr(0, 0, W, 392, 0, wall)}${rr(0, 0, W, 16, 0, "#fff", 'opacity=".5"')}${rr(0, 380, W, 12, 0, "#fff", 'opacity=".55"')}${planks(392, 440, floor1, floor2)}`;
  const tiles = (y0, c1, c2) => `${rr(0, y0, W, 440 - y0, 0, c1)}${Array.from({ length: 28 }, (_, i) => `<path d="M${i * 40},${y0} L${i * 40 - 20},440" stroke="${c2}" stroke-width="1.5"/>`).join("")}<path d="M0,${y0 + 22} L${W},${y0 + 22}" stroke="${c2}" stroke-width="1.5"/>`;
  const facadeBase = (bg, inner) => `<svg viewBox="0 0 360 440" width="360" height="440">${rr(0, 0, 360, 440, 0, bg)}${inner}</svg>`;

  // =====================================================
  // МЕСТА
  // =====================================================
  Object.assign(PLACES, {
    // ---------- 4. Автобус и город ----------
    bus: {
      viewNames: ["Улица", "Остановка", "Парк"], sky: "#bfe3f7", basket: "🔎", hostName: "Водитель",
      host: { view: 1, x: 378, y: 148, cfg: M({ hair: "short", hairColor: 0, top: "shirt", topColor: 0, bottomColor: 2, beard: "stubble", skin: 2 }) },
      goodsAt: [520, 40],
      bg: () => `${street("#9fd3f5", "#e6f4fc")}<circle cx="980" cy="60" r="28" fill="#ffd54f"/>`,
      spots: [
        { kind: "light", view: 0, x: 44, y: 150, w: 40, h: 216 },
        { kind: "shop", view: 0, x: 104, y: 150, w: 160, h: 196 },
        { kind: "streetlamp", view: 0, x: 280, y: 130, w: 30, h: 220 },
        { kind: "car", view: 0, x: 150, y: 360, w: 120, h: 62 },
        { kind: "stop", view: 1, x: 498, y: 160, w: 28, h: 210 },
        { kind: "bus", view: 1, x: 530, y: 270, w: 150, h: 112 },
        { kind: "park", view: 2, x: 752, y: 150, w: 150, h: 232 },
        { kind: "bench", view: 2, x: 912, y: 300, w: 100, h: 56 },
        { kind: "taxi", view: 2, x: 892, y: 352, w: 140, h: 76 },
      ],
      // поездка: город за окном едет мимо, сосед по сиденью
      ride: {
        pano: () => {
          const put = (k, x, y, w, h) => { const a = ART[k]; return `<g data-kind="${k}"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${a.vb[0]} ${a.vb[1]}" overflow="visible">${a.svg()}</svg><rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" fill="transparent"/></g>`; };
          const houses = Array.from({ length: 8 }, (_, i) => `${rr(i * 116 - 6, 40 + (i % 3) * 18, 104, 170, 4, ["#e9dcc6", "#f2e6d0", "#dccbb0"][i % 3])}${Array.from({ length: 4 }, (_, k) => rr(i * 116 + 8 + (k % 2) * 46, 60 + (i % 3) * 18 + Math.floor(k / 2) * 46, 32, 30, 2, "#9fc8e4")).join("")}`).join("");
          return `<rect width="900" height="260" fill="#bfe3f7"/><circle cx="760" cy="34" r="18" fill="#ffd54f"/>${houses}
            ${rr(0, 196, 900, 20, 0, "#d9d2c5")}${rr(0, 216, 900, 44, 0, "#7b8592")}${Array.from({ length: 12 }, (_, i) => rr(10 + i * 76, 236, 36, 4, 2, "#fff")).join("")}
            ${[180, 520, 860].map(x => `${rr(x - 3, 120, 6, 80, 2, "#8a5a36")}<circle cx="${x}" cy="112" r="26" fill="#4f9d5d"/>`).join("")}
            ${put("light", 40, 84, 28, 132)}${put("car", 96, 186, 92, 50)}${put("shop", 210, 70, 120, 140)}${put("streetlamp", 346, 70, 22, 140)}
            ${put("taxi", 390, 178, 110, 62)}${put("park", 510, 54, 120, 160)}${put("bench", 640, 170, 70, 40)}${put("bus", 720, 140, 150, 106)}`;
        },
        interior: () => `<path fill-rule="evenodd" d="M0,0 H360 V440 H0Z M18,50 H342 V310 H18Z" fill="#e3e9ef"/>
          <rect x="15" y="47" width="330" height="266" rx="6" fill="none" stroke="#8d969f" stroke-width="7"/><rect x="176" y="47" width="8" height="266" fill="#8d969f"/>
          ${rr(0, 16, 360, 7, 3, "#aeb6be")}${[60, 140, 220, 300].map(x => `<path d="M${x},23 L${x},34" stroke="#aeb6be" stroke-width="3"/><circle cx="${x}" cy="40" r="7" fill="none" stroke="#5b6470" stroke-width="3"/>`).join("")}
          ${rr(0, 313, 360, 22, 0, "#c8d0d8")}${rr(344, 0, 9, 440, 4, "#f2b632")}${rr(336, 190, 24, 18, 4, "#e8413a")}
          <text x="348" y="223" text-anchor="middle" font-size="8" font-weight="700" fill="#e8413a" font-family="Arial">עצירה</text>
          ${rr(4, 330, 200, 110, 22, "#3a8ad6")}${rr(14, 340, 180, 20, 10, "#5aa9f0")}${rr(204, 360, 132, 80, 18, "#2f6fb2")}`,
        npc: { name: "Пассажирка", x: 214, y: 196, cfg: F({ hair: "bob", hairColor: 5, top: "blouse", topColor: 4, bottom: "longskirt", bottomColor: 1, skin: 1 }) },
        front: () => `${rr(214, 380, 146, 60, 16, "#3a8ad6")}${rr(222, 388, 130, 16, 8, "#5aa9f0")}`,
      },
      facade: () => facadeBase("#bfe3f7", `${rr(0, 380, 360, 60, 0, "#7b8592")}${rr(30, 40, 300, 360, 30, "#3cae5c")}${rr(54, 64, 252, 120, 12, "#dff1ff")}${rr(110, 46, 140, 14, 4, "#2b2f3a")}${txt(180, 57, "5 מרכז", 11, "#ffd23a")}
        ${glassDoors(126, 200, 108, 180)}<circle cx="72" cy="330" r="14" fill="#fff4b0"/><circle cx="288" cy="330" r="14" fill="#fff4b0"/>${rr(60, 380, 50, 20, 6, "#2b2f3a")}${rr(250, 380, 50, 20, 6, "#2b2f3a")}`),
    },

    // ---------- 5. Шабат у друзей ----------
    shabbat: {
      viewNames: ["Кухня", "Столовая", "Гостиная"], sky: "#2c3e66", basket: "🕯️",
      hostName: (g) => g === "f" ? "Ирит, мама Цили" : "Рина, мама Давида",
      host: { view: 2, x: 742, y: 148, cfg: F({ hair: "bob", hairColor: 1, headwear: "tichel", top: "blouse", topColor: 6, bottom: "longskirt", bottomColor: 2, skin: 1 }),
              byGender: { f: F({ hair: "long", hairColor: 3, top: "blouse", topColor: 1, bottom: "skirt", bottomColor: 2, skin: 1 }) } },
      goodsAt: [380, 40],
      // ходишь джойстиком: берёшь вещи на кухне и в гостиной и ставишь на стол в столовой
      walk: { start: 860, table: { x1: 380, x2: 700, slots: { candles: [394, 228, 44, 74], wine: [456, 246, 28, 56], challah: [500, 264, 84, 38], soup: [598, 244, 64, 50], salt: [670, 258, 22, 42] } } },
      bg: () => `${room("#f4e2c8", "#b98a58", "#9a6e42")}
        ${rr(10, 180, 330, 12, 2, "#e9e1d2")}${rr(10, 192, 330, 190, 2, "#c99a63")}${[0, 1, 2, 3].map(i => rr(18 + i * 82, 200, 74, 176, 2, "#d6ab76")).join("")}
        ${rr(40, 150, 120, 30, 3, "#3b4352")}${[60, 100, 140].map(x => `<circle cx="${x}" cy="160" r="9" fill="#5b6470"/>`).join("")}
        ${rr(196, 26, 136, 96, 4, "#2c3e66", 'stroke="#fff" stroke-width="5"')}<circle cx="300" cy="54" r="12" fill="#fff4b0"/>${[[216, 46], [236, 96], [276, 80], [320, 104]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join("")}${rr(261, 26, 5, 96, 0, "#fff")}
        ${rr(196, 166, 92, 14, 3, "#c99a63")}
        ${doorway(360)}${doorway(720)}
        ${rr(470, 56, 100, 70, 4, "#a87442")}${rr(476, 62, 88, 58, 2, "#fff4d6")}${txt(520, 100, "שבת שלום", 13, "#3a8ad6")}
        <path d="M540,0 L540,150" stroke="#5b6470" stroke-width="2"/><path d="M512,150 L568,150 L558,172 L522,172Z" fill="#ffd54f"/><ellipse cx="540" cy="176" rx="40" ry="10" fill="#fff4b0" opacity=".35"/>
        ${[400, 640].map(x => `${rr(x, 236, 46, 70, 8, "#8a5a36")}${rr(x + 4, 240, 38, 40, 6, "#a87442")}`).join("")}
        ${rr(376, 296, 328, 12, 3, "#fff")}${rr(384, 308, 312, 76, 3, "#8a5a36")}<path d="M378,300 L702,300 L694,334 L386,334Z" fill="#fff" opacity=".95"/>
        <path d="M386,334 Q420,342 454,334 Q488,342 522,334 Q556,342 590,334 Q624,342 658,334 Q676,340 694,334" stroke="#d9cfa8" stroke-width="2" fill="none"/>
        ${[420, 500, 580, 660].map(x => `<ellipse cx="${x}" cy="300" rx="16" ry="4.5" fill="#fff" stroke="#c8d0d8"/>`).join("")}
        ${rr(872, 300, 186, 10, 2, "#7a5230")}${rr(876, 310, 178, 72, 2, "#a87442")}${[0, 1].map(i => rr(884 + i * 88, 318, 80, 56, 2, "#8a5a36")).join("")}
        ${rr(900, 120, 120, 90, 4, "#a87442")}${rr(906, 126, 108, 78, 2, "#2c3e66")}<circle cx="990" cy="150" r="10" fill="#fff4b0"/>${[[920, 140], [950, 180], [1000, 190]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join("")}`,
      spots: [
        { kind: "soup", view: 0, x: 64, y: 84, w: 92, h: 70 },
        { kind: "challah", view: 0, x: 198, y: 130, w: 86, h: 40 },
        { kind: "salt", view: 0, x: 296, y: 136, w: 30, h: 44 },
        { kind: "kettle", view: 0, x: 40, y: 340, w: 0, h: 0 },
        { kind: "candles", view: 2, x: 884, y: 228, w: 50, h: 76 },
        { kind: "wine", view: 2, x: 946, y: 246, w: 30, h: 56 },
        { kind: "flowers", view: 2, x: 990, y: 232, w: 40, h: 72 },
      ].filter(x => x.w),
      // семья за столом (вид «сел за стол»), внешность героев по id
      familyLooks: {
        avi: M({ hair: "short", hairColor: 1, beard: "short", headwear: "kippa", kippaColor: 0, top: "shirt", topColor: 2, skin: 1 }),
        rina: F({ hair: "bob", hairColor: 1, headwear: "tichel", top: "blouse", topColor: 6, bottom: "longskirt", bottomColor: 2, skin: 1 }),
        tova: F({ hair: "bob", hairColor: 5, top: "blouse", topColor: 5, bottom: "longskirt", bottomColor: 1, skin: 1 }),
        shlomo: M({ hair: "short", hairColor: 5, beard: "short", headwear: "kippa", kippaColor: 1, top: "shirt", topColor: 2, skin: 1 }),
        shira: F({ hair: "long", hairColor: 0, top: "tee", topColor: 3, bottom: "jeans", bottomColor: 0, skin: 1 }),
        yossi: M({ hair: "short", hairColor: 0, beard: "stubble", top: "shirt", topColor: 0, skin: 2 }),
        irit: F({ hair: "long", hairColor: 3, top: "blouse", topColor: 1, bottom: "skirt", bottomColor: 2, skin: 1 }),
        batya: F({ hair: "bob", hairColor: 5, top: "blouse", topColor: 4, bottom: "longskirt", bottomColor: 1, skin: 2 }),
        moti: M({ hair: "side", hairColor: 5, beard: "short", top: "shirt", topColor: 2, skin: 2 }),
        daniel: M({ hair: "curly", hairColor: 2, top: "tee", topColor: 1, skin: 1 }),
      },
      family: {
        bg: () => `${rr(0, 0, 360, 440, 0, "#f4e2c8")}${rr(20, 40, 110, 80, 4, "#a87442")}${rr(26, 46, 98, 68, 2, "#2c3e66")}<circle cx="100" cy="66" r="10" fill="#fff4b0"/>
          ${rr(220, 44, 110, 72, 4, "#a87442")}${rr(226, 50, 98, 60, 2, "#fff4d6")}${txt(275, 86, "שבת שלום", 13, "#3a8ad6")}
          <path d="M180,0 L180,30" stroke="#5b6470" stroke-width="2"/><path d="M156,30 L204,30 L196,48 L164,48Z" fill="#ffd54f"/><ellipse cx="180" cy="54" rx="60" ry="14" fill="#fff4b0" opacity=".4"/>`,
        front: (on) => {
          const put = (k, x, y, w, h) => { if (!on.includes(k) || !ART[k]) return ""; const a = ART[k]; return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${a.vb[0]} ${a.vb[1]}" overflow="visible">${a.svg()}</svg>`; };
          return `${rr(-10, 262, 380, 16, 4, "#fff")}<path d="M-10,270 L370,270 L370,440 L-10,440Z" fill="#fff"/>
            <path d="M-10,300 Q30,310 70,300 Q110,310 150,300 Q190,310 230,300 Q270,310 310,300 Q340,308 370,300" stroke="#d9cfa8" stroke-width="2" fill="none"/>
            ${[40, 110, 180, 250, 320].map(x => `<ellipse cx="${x}" cy="290" rx="24" ry="7" fill="#fff" stroke="#c8d0d8"/>`).join("")}
            ${put("candles", 14, 196, 40, 70)}${put("wine", 70, 214, 24, 52)}${put("challah", 128, 234, 104, 46)}${put("soup", 240, 216, 70, 54)}${put("salt", 318, 230, 22, 40)}`;
        },
      },
      facade: () => facadeBase("#2c3e66", `${[[40, 40], [300, 60], [200, 30], [90, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join("")}<circle cx="290" cy="40" r="16" fill="#fff4b0"/>
        ${rr(0, 120, 360, 280, 0, "#e9dcc6")}${rr(0, 392, 360, 48, 0, "#b9b1a3")}${rr(110, 150, 140, 242, 4, "#6b4426")}${doors(116, 156, 128, 236, "#8a5a36", "#5b3a22")}
        ${rr(258, 210, 8, 40, 3, "#c9a227", 'transform="rotate(20 262 230)"')}${rr(20, 170, 70, 80, 4, "#ffe7a1")}${rr(270, 170, 70, 80, 4, "#ffe7a1")}${txt(180, 140, "שַׁבָּת שָׁלוֹם", 14, "#fff4d6")}`),
    },

    // ---------- 6. Кафе и кофе ----------
    cafe: {
      viewNames: ["Витрина", "Бар", "Меню"], sky: "#f6e7d3", basket: "☕", hostName: "Официантка",
      host: { view: 1, x: 500, y: 150, cfg: F({ hair: "pony", hairColor: 4, top: "tee", topColor: 3, bottomColor: 2, skin: 0 }) },
      goodsAt: [376, 40],
      bg: () => `${room("#f6e7d3", "#8a5a36", "#6b4426")}
        ${rr(20, 262, 320, 120, 4, "#c99a63")}${rr(16, 250, 328, 14, 3, "#e9e1d2")}${rr(26, 150, 308, 104, 4, "#dff1ff", 'opacity=".55" stroke="#aeb6be" stroke-width="3"')}${rr(26, 200, 308, 4, 0, "#aeb6be")}
        ${txt(180, 120, "מאפים", 22, "#8a5a36")}
        ${rr(374, 100, 120, 80, 6, "#5b6470")}${rr(384, 112, 100, 30, 4, "#3b4352")}${[400, 440].map(x => rr(x, 148, 20, 20, 3, "#2b2f3a")).join("")}${txt(434, 96, "☕ קפה", 16, "#8a5a36")}
        ${rr(560, 90, 140, 70, 4, "#3b2a20")}${[0, 1, 2].map(i => `<circle cx="${585 + i * 45}" cy="125" r="14" fill="#e0a24a"/>`).join("")}
        ${rr(740, 50, 320, 260, 8, "#2b3a32", 'stroke="#a87442" stroke-width="8"')}${txt(900, 82, "תפריט", 22, "#fff")}
        ${[780, 960].map(x => `${rr(x, 330, 80, 8, 3, "#a87442")}${rr(x + 36, 338, 8, 44, 2, "#5b3a22")}`).join("")}`,
      front: () => `${rr(366, 300, 348, 14, 3, "#e9e1d2")}${rr(370, 314, 340, 78, 3, "#8a5a36")}${[0, 1, 2, 3].map(i => rr(380 + i * 82, 324, 70, 58, 3, "#a87442")).join("")}`,
      spots: [
        { kind: "croissant", view: 0, x: 44, y: 212, w: 74, h: 40 },
        { kind: "muffin", view: 0, x: 140, y: 204, w: 46, h: 48 },
        { kind: "sandwich", view: 0, x: 210, y: 214, w: 80, h: 40 },
        { kind: "cake", view: 0, x: 120, y: 156, w: 60, h: 42 },
        { kind: "cappuccino", view: 1, x: 382, y: 254, w: 56, h: 50 },
        { kind: "juice", view: 1, x: 664, y: 238, w: 40, h: 64 },
        { kind: "shakshuka", view: 2, x: 770, y: 96, w: 120, h: 88 },
        { kind: "omelet", view: 2, x: 910, y: 96, w: 120, h: 88 },
        { kind: "salad", view: 2, x: 770, y: 200, w: 120, h: 88 },
        { kind: "pancakes", view: 2, x: 910, y: 200, w: 120, h: 88 },
      ],
      facade: () => facadeBase("#bfe3f7", `${rr(0, 120, 360, 280, 0, "#f6e7d3")}${rr(0, 392, 360, 48, 0, "#c9c0b0")}
        ${Array.from({ length: 12 }, (_, i) => `<path d="M${i * 30},96 L${i * 30 + 15},132 L${i * 30 + 30},96Z" fill="${i % 2 ? "#fff" : "#3cae5c"}"/>`).join("")}${rr(0, 70, 360, 30, 0, "#3cae5c")}${txt(180, 93, "קפה", 22, "#fff")}
        ${glassDoors(120, 170, 120, 222)}${rr(16, 170, 90, 120, 4, "#dff1ff", 'stroke="#8a5a36" stroke-width="4"')}${rr(254, 170, 90, 120, 4, "#dff1ff", 'stroke="#8a5a36" stroke-width="4"')}
        ${rr(30, 330, 60, 8, 3, "#a87442")}${rr(56, 338, 8, 54, 2, "#5b3a22")}<circle cx="300" cy="320" r="14" fill="#e8413a"/>`),
    },

    // ---------- 7. Рынок (шук) ----------
    shuk: {
      viewNames: ["Фрукты", "Продавец", "Овощи"], sky: "#fbe3b8", basket: "🧺", hostName: "Продавец",
      host: { view: 1, x: 486, y: 132, cfg: M({ hair: "curly", hairColor: 0, top: "tee", topColor: 1, bottomColor: 2, beard: "short", headwear: "kippa", kippaColor: 1, skin: 2 }) },
      goodsAt: [376, 40],
      bg: () => `${sky("#fbe3b8", "#f6d3a0")}${tiles(392, "#d9cbb0", "#c4b394")}
        ${Array.from({ length: 18 }, (_, i) => `<path d="M${i * 60},40 L${i * 60 + 30},90 L${i * 60 + 60},40Z" fill="${["#e8413a", "#fff", "#3a8ad6", "#fff"][i % 4]}"/>`).join("")}${rr(0, 20, W, 24, 0, "#a87442")}
        ${[10, 730].map(x => `${rr(x, 300, 340, 82, 3, "#a87442")}${rr(x - 4, 296, 348, 10, 3, "#c99a63")}`).join("")}
        ${rr(380, 230, 320, 20, 3, "#c99a63")}${txt(540, 140, "שוק", 30, "#a3402f")}`,
      front: () => `${rr(370, 292, 340, 12, 3, "#c99a63")}${rr(374, 304, 332, 88, 3, "#a87442")}${[0, 1, 2, 3].map(i => `<path d="M${380 + i * 82},314 L${446 + i * 82},314" stroke="#8a5a2e" stroke-width="2"/>`).join("")}
        ${rr(560, 252, 70, 40, 4, "#5b6470")}${rr(570, 244, 50, 10, 3, "#aeb6be")}${rr(578, 262, 34, 18, 2, "#a8e0b6")}${txt(595, 276, "15₪", 10, "#2c6b3f")}
        <g transform="translate(400,250)">${ART.strawberries.svg()}</g><g transform="translate(640,250)">${ART.strawberries.svg()}</g>`,
      spots: [
        { kind: "grapes", view: 0, x: 26, y: 244, w: 80, h: 56 },
        { kind: "oranges", view: 0, x: 118, y: 244, w: 80, h: 56 },
        { kind: "pomegranate", view: 0, x: 210, y: 244, w: 80, h: 56 },
        { kind: "watermelon", view: 0, x: 60, y: 316, w: 120, h: 72 },
        { kind: "lemons", view: 0, x: 210, y: 326, w: 80, h: 56 },
        { kind: "carrot", view: 2, x: 748, y: 244, w: 80, h: 56 },
        { kind: "pepper", view: 2, x: 840, y: 244, w: 80, h: 56 },
        { kind: "tomatoes", view: 2, x: 932, y: 244, w: 80, h: 56 },
        { kind: "cucumbers", view: 2, x: 780, y: 326, w: 80, h: 56 },
        { kind: "potatoes", view: 2, x: 900, y: 326, w: 80, h: 56 },
      ],
      facade: () => facadeBase("#fbe3b8", `${rr(0, 392, 360, 48, 0, "#d9cbb0")}<path d="M30,392 L30,140 Q180,30 330,140 L330,392 L290,392 L290,160 Q180,80 70,160 L70,392Z" fill="#c99a63"/>
        ${txt(180, 128, "שוק הכרמל", 22, "#a3402f")}${doors(70, 170, 220, 222, "#e8413a", "#a3402f")}
        ${Array.from({ length: 6 }, (_, i) => `<path d="M${70 + i * 36.6},170 L${70 + i * 36.6},392" stroke="#fff" stroke-width="6" opacity=".6"/>`).join("")}`),
    },

    // ---------- 8. У врача ----------
    clinic: {
      viewNames: ["Плакат 1", "Врач", "Плакат 2"], sky: "#e3f1f7", basket: "🩺", hostName: "Врач",
      host: { view: 1, x: 520, y: 148, cfg: M({ hair: "side", hairColor: 5, top: "shirt", topColor: 2, bottomColor: 4, beard: "short", skin: 0 }) },
      goodsAt: [376, 40],
      bg: () => `${room("#e9f4f8", "#c8d0d8", "#aeb6be")}${rr(0, 200, W, 6, 0, "#7fc0f5", 'opacity=".5"')}
        ${rr(30, 60, 300, 290, 8, "#fff", 'stroke="#7fc0f5" stroke-width="5"')}${txt(180, 86, "גּוּף הָאָדָם", 16, "#3a8ad6")}
        ${rr(750, 60, 300, 290, 8, "#fff", 'stroke="#7fc0f5" stroke-width="5"')}${txt(900, 86, "גּוּף הָאָדָם", 16, "#3a8ad6")}
        ${doorway(360)}${doorway(720)}
        ${rr(380, 90, 80, 100, 4, "#fff", 'stroke="#c8d0d8" stroke-width="3"')}<path d="M420,110 L420,170 M390,140 L450,140" stroke="#e8413a" stroke-width="14"/>
        ${rr(380, 300, 180, 12, 3, "#e9e1d2")}${rr(384, 312, 172, 70, 2, "#aeb6be")}<path d="M410,300 Q400,270 420,262 Q440,256 446,280" stroke="#3b4352" stroke-width="4" fill="none"/><circle cx="446" cy="284" r="6" fill="#aeb6be"/>
        ${rr(480, 270, 50, 30, 3, "#fff", 'stroke="#c8d0d8"')}`,
      spots: [
        { kind: "head", view: 0, x: 60, y: 100, w: 110, h: 110 },
        { kind: "ear", view: 0, x: 190, y: 100, w: 110, h: 110 },
        { kind: "eye", view: 0, x: 60, y: 226, w: 110, h: 110 },
        { kind: "nose", view: 0, x: 190, y: 226, w: 110, h: 110 },
        { kind: "throat", view: 2, x: 768, y: 100, w: 82, h: 82 },
        { kind: "belly", view: 2, x: 856, y: 100, w: 82, h: 82 },
        { kind: "back", view: 2, x: 944, y: 100, w: 82, h: 82 },
        { kind: "hand", view: 2, x: 812, y: 210, w: 82, h: 82 },
        { kind: "leg", view: 2, x: 900, y: 210, w: 82, h: 82 },
      ],
      facade: () => facadeBase("#e3f1f7", `${rr(0, 100, 360, 300, 0, "#fff")}${rr(0, 392, 360, 48, 0, "#c8d0d8")}${rr(60, 50, 240, 50, 8, "#3a8ad6")}${txt(180, 84, "מרפאה", 26, "#fff")}
        ${rr(160, 120, 40, 40, 4, "#fff", 'stroke="#e8413a" stroke-width="3"')}<path d="M180,126 L180,154 M166,140 L194,140" stroke="#e8413a" stroke-width="8"/>${glassDoors(110, 172, 140, 220)}`),
    },

    // ---------- 9. Работа ----------
    office: {
      viewNames: ["Твоё место", "Начальник", "Принтер"], sky: "#e6edf5", basket: "💼", hostName: "Начальник",
      host: { view: 1, x: 486, y: 148, cfg: M({ hair: "slick", hairColor: 0, top: "shirt", topColor: 0, bottomColor: 2, skin: 1 }) },
      goodsAt: [376, 40],
      bg: () => `${room("#eef2f6", "#9aa3ad", "#7b8592")}${rr(0, 230, W, 4, 0, "#c8d0d8")}
        ${rr(30, 60, 140, 90, 4, "#bfe0f5", 'stroke="#aeb6be" stroke-width="5"')}${rr(98, 60, 4, 90, 0, "#aeb6be")}
        ${rr(380, 70, 180, 110, 4, "#fff", 'stroke="#aeb6be" stroke-width="5"')}<path d="M400,150 L440,120 L470,135 L520,90" stroke="#3cae5c" stroke-width="5" fill="none"/>${txt(470, 98, "10:00", 14, "#e8413a")}
        ${doorway(360)}${doorway(720)}
        ${rr(750, 300, 140, 82, 3, "#c8d0d8")}${rr(746, 292, 148, 10, 3, "#e9e1d2")}${rr(900, 330, 70, 52, 3, "#a87442")}${rr(896, 322, 78, 10, 3, "#c99a63")}
        ${rr(770, 80, 230, 120, 4, "#fff", 'stroke="#aeb6be" stroke-width="5"')}${txt(885, 150, "Hirbis Tech", 22, "#3a8ad6")}`,
      spots: [
        { kind: "plant", view: 0, x: 12, y: 300, w: 44, h: 84 },
        { kind: "desk", view: 0, x: 60, y: 296, w: 200, h: 90 },
        { kind: "computer", view: 0, x: 120, y: 222, w: 90, h: 76 },
        { kind: "lamp2", view: 0, x: 70, y: 240, w: 34, h: 56 },
        { kind: "chair", view: 0, x: 266, y: 284, w: 60, h: 100 },
        { kind: "clock", view: 1, x: 620, y: 70, w: 50, h: 50 },
        { kind: "printer", view: 2, x: 770, y: 222, w: 100, h: 74 },
        { kind: "phone", view: 2, x: 908, y: 288, w: 56, h: 38 },
        { kind: "cooler", view: 2, x: 985, y: 232, w: 46, h: 150 },
      ],
      facade: () => facadeBase("#e6edf5", `${rr(20, 40, 320, 360, 4, "#9fb6cc")}${Array.from({ length: 5 }, (_, r) => Array.from({ length: 4 }, (_, c) => rr(34 + c * 76, 52 + r * 46, 64, 36, 2, "#dff1ff")).join("")).join("")}
        ${rr(0, 392, 360, 48, 0, "#aeb6be")}${rr(100, 250, 160, 142, 4, "#5b6470")}${glassDoors(110, 260, 140, 132)}${rr(110, 226, 140, 22, 4, "#3a8ad6")}${txt(180, 243, "משרד", 15, "#fff")}`),
    },

    // ---------- 10. Банк и почта ----------
    bank: {
      viewNames: ["Почта", "Окошко", "Стол"], sky: "#e9eef3", basket: "📋", hostName: "Служащая",
      host: { view: 1, x: 486, y: 126, cfg: F({ hair: "bob", hairColor: 0, top: "blouse", topColor: 0, bottom: "skirt", bottomColor: 2, skin: 2 }) },
      goodsAt: [376, 40],
      bg: () => `${room("#eef0e8", "#c9c0b0", "#b3a890")}
        ${rr(10, 290, 340, 92, 3, "#e8413a")}${rr(6, 282, 348, 12, 3, "#e9e1d2")}${txt(180, 340, "דואר ישראל", 18, "#fff")}${rr(40, 60, 280, 60, 6, "#e8413a")}${txt(180, 100, "📮 דואר", 24, "#fff")}
        ${rr(372, 40, 336, 40, 4, "#2f6fb2")}${txt(540, 68, "🏦 בנק", 22, "#fff")}${rr(380, 90, 320, 170, 4, "#dff1ff", 'opacity=".6" stroke="#aeb6be" stroke-width="4"')}
        ${rr(760, 318, 280, 12, 3, "#e9e1d2")}${rr(766, 330, 268, 52, 2, "#a87442")}`,
      front: () => `${rr(370, 260, 340, 14, 3, "#e9e1d2")}${rr(374, 274, 332, 118, 3, "#2f6fb2")}${rr(470, 290, 140, 34, 4, "#fff", 'opacity=".3"')}${txt(540, 314, "קופה 3", 16, "#fff")}`,
      spots: [
        { kind: "envelope", view: 0, x: 48, y: 236, w: 70, h: 46 },
        { kind: "stamp", view: 0, x: 128, y: 220, w: 50, h: 62 },
        { kind: "parcel", view: 0, x: 188, y: 220, w: 70, h: 62 },
        { kind: "mailbox", view: 0, x: 266, y: 164, w: 46, h: 116 },
        { kind: "form", view: 2, x: 770, y: 226, w: 70, h: 92 },
        { kind: "calculator", view: 2, x: 856, y: 236, w: 52, h: 66 },
        { kind: "pen", view: 2, x: 846, y: 302, w: 84, h: 18 },
        { kind: "passport", view: 2, x: 946, y: 238, w: 62, h: 80 },
      ],
      facade: () => facadeBase("#e9eef3", `${rr(0, 392, 360, 48, 0, "#c9c0b0")}<path d="M10,120 L180,50 L350,120Z" fill="#e9e1d2"/>${rr(10, 120, 340, 272, 0, "#f4f0e8")}
        ${[30, 290].map(x => rr(x, 140, 40, 252, 4, "#e9e1d2")).join("")}${txt(180, 108, "בנק", 26, "#2f6fb2")}${rr(110, 150, 140, 30, 4, "#2f6fb2")}${txt(180, 171, "בנק · דואר", 14, "#fff")}
        ${glassDoors(110, 200, 140, 192)}`),
    },
  });
})();
