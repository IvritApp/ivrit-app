// =====================================================
// art2.js — ПЕРЕРИСОВАННЫЕ ПРЕДМЕТЫ (14.11, по отзыву): еда реалистичнее, раковина, проездной,
// балкон (3 варианта), части тела без «детскости». Подменяют рисунки из places.js / places-a1.js
// (и в квестах, и в картинках к словам). Размеры (vb) прежние — сцены не съезжают.
// =====================================================
(function () {
  if (!window.PLACE_KIT) return;
  const { ART } = window.PLACE_KIT;
  const rr = (x, y, w, h, r, f, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${extra || ""}/>`;
  const txt = (x, y, s, size, f) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${f}" font-family="Arial, sans-serif">${s}</text>`;
  const sh = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".13"/>`;
  const frame = (inner) => `${rr(0, 0, 110, 110, 6, "#fff", 'stroke="#c8d0d8" stroke-width="4"')}${inner}`;
  const SK = "#f2c7a3", SKD = "#d99d72", SKL = "#f8dcc3";

  Object.assign(ART, {
    // ---------- КРУАССАН: слоёные «дольки», золотистый градиент, блики ----------
    croissant: { vb: [80, 46], svg: () => `<defs><linearGradient id="a2cr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7c46a"/><stop offset=".55" stop-color="#d98a2b"/><stop offset="1" stop-color="#a5581a"/></linearGradient></defs>
      ${sh(40, 42, 34, 4)}
      <path d="M4,34 Q2,26 10,24 Q14,30 20,31Z" fill="url(#a2cr)"/><path d="M76,34 Q78,26 70,24 Q66,30 60,31Z" fill="url(#a2cr)"/>
      <path d="M10,24 Q12,14 22,13 Q26,24 24,33 Q16,33 10,24Z" fill="url(#a2cr)" stroke="#9a5418" stroke-width=".8"/>
      <path d="M70,24 Q68,14 58,13 Q54,24 56,33 Q64,33 70,24Z" fill="url(#a2cr)" stroke="#9a5418" stroke-width=".8"/>
      <path d="M22,13 Q30,5 40,5 Q50,5 58,13 Q56,26 56,34 Q40,38 24,34 Q24,26 22,13Z" fill="url(#a2cr)" stroke="#9a5418" stroke-width=".8"/>
      <path d="M31,9 Q33,22 32,35 M49,9 Q47,22 48,35" stroke="#a5581a" stroke-width="1.2" fill="none" opacity=".7"/>
      <ellipse cx="38" cy="11" rx="9" ry="2.6" fill="#fff" opacity=".45"/><ellipse cx="17" cy="19" rx="3" ry="1.4" fill="#fff" opacity=".4"/><ellipse cx="63" cy="19" rx="3" ry="1.4" fill="#fff" opacity=".35"/>
      ${[[28, 20], [44, 17], [52, 24], [36, 27], [18, 27]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".8" fill="#fff4d6" opacity=".7"/>`).join("")}` },

    // ---------- СЭНДВИЧ: багет в разрезе — салат волной, помидор, сыр, ветчина ----------
    sandwich: { vb: [86, 46], svg: () => `<defs><linearGradient id="a2sw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9a95a"/><stop offset="1" stop-color="#b8702c"/></linearGradient></defs>
      ${sh(43, 43, 38, 3.5)}
      <path d="M6,30 Q4,40 14,41 L72,41 Q82,40 80,30Z" fill="url(#a2sw)"/>
      <path d="M5,27 Q14,33 22,27 T40,27 T58,27 T76,27 L81,28 L80,31 L6,31Z" fill="#5fae4c"/>
      <path d="M8,24 L30,24 L28,29 L10,29Z" fill="#ffcf3f"/><path d="M30,24 L50,23 L52,28 L32,29Z" fill="#f2a0a0"/>
      ${[[56, 25], [70, 25]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="3.4" fill="#e5484d"/><ellipse cx="${x}" cy="${y - .6}" rx="5.4" ry="1.8" fill="#ff7a6e"/><circle cx="${x - 2}" cy="${y - .6}" r=".7" fill="#ffe08a"/><circle cx="${x + 2}" cy="${y - .4}" r=".7" fill="#ffe08a"/>`).join("")}
      <path d="M6,23 Q4,8 26,6 L62,6 Q82,8 80,23 Q80,25 76,25 L10,25 Q6,25 6,23Z" fill="url(#a2sw)"/>
      ${[[22, 13], [38, 10], [54, 12], [68, 15]].map(([x, y]) => `<path d="M${x - 5},${y + 3} Q${x},${y - 2} ${x + 5},${y + 3}" stroke="#8a4f1c" stroke-width="1.6" fill="none" opacity=".7"/>`).join("")}
      <ellipse cx="34" cy="9" rx="14" ry="2" fill="#fff" opacity=".35"/>
      ${[[18, 10], [30, 8], [46, 9], [60, 10], [72, 14]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1" ry=".6" fill="#fff6dc"/>`).join("")}` },

    // ---------- ШАКШУКА: чугунная сковорода, томатный соус, 3 яйца, петрушка ----------
    shakshuka: { vb: [110, 80], svg: () => `<defs><radialGradient id="a2ss" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#e8452f"/><stop offset=".7" stop-color="#c22d1f"/><stop offset="1" stop-color="#8f1d14"/></radialGradient>
      <radialGradient id="a2yk" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffd23a"/><stop offset="1" stop-color="#f29a12"/></radialGradient></defs>
      ${sh(52, 72, 46, 6)}<path d="M92,40 L108,34 Q111,33 110,37 L95,47Z" fill="#2b2f3a"/>
      <ellipse cx="50" cy="42" rx="44" ry="30" fill="#2f3440"/><ellipse cx="50" cy="40" rx="40" ry="26" fill="#3b4150"/><ellipse cx="50" cy="41" rx="36" ry="23" fill="url(#a2ss)"/>
      ${[[26, 32], [70, 30], [36, 56], [64, 54], [48, 26], [80, 44], [20, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#a51f14" opacity=".6"/>`).join("")}
      ${[[34, 38], [62, 36], [50, 52]].map(([x, y]) => `<path d="M${x - 11},${y} Q${x - 10},${y - 9} ${x},${y - 9} Q${x + 12},${y - 8} ${x + 11},${y + 1} Q${x + 9},${y + 8} ${x},${y + 8} Q${x - 10},${y + 7} ${x - 11},${y}Z" fill="#fffaf0"/>
        <circle cx="${x + 1}" cy="${y - 1}" r="5" fill="url(#a2yk)"/><ellipse cx="${x - .5}" cy="${y - 2.8}" rx="1.8" ry="1.1" fill="#fff" opacity=".7"/>`).join("")}
      ${[[22, 40], [46, 30], [76, 38], [58, 60], [40, 62], [74, 52], [28, 52]].map(([x, y], i) => `<path d="M${x},${y} l3,-2 l1,3Z" fill="${i % 2 ? "#3cae5c" : "#2e8b47"}"/>`).join("")}
      <ellipse cx="34" cy="22" rx="14" ry="3" fill="#fff" opacity=".12"/>` },

    // ---------- МОРОЖЕНОЕ: вафельный рожок с сеткой, 2 шарика, подтёк, посыпка ----------
    icecream: { vb: [44, 80], svg: () => `<defs><linearGradient id="a2cn" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c98a45"/><stop offset=".5" stop-color="#e7b26b"/><stop offset="1" stop-color="#b57534"/></linearGradient></defs>
      <path d="M8,40 L22,78 L36,40Z" fill="url(#a2cn)"/>
      <clipPath id="a2cc"><path d="M8,40 L22,78 L36,40Z"/></clipPath><g clip-path="url(#a2cc)" stroke="#9a6127" stroke-width="1" opacity=".75">
        ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${2 + i * 7},38 L${22 + i * 7},80"/><path d="M${42 - i * 7},38 L${22 - i * 7},80"/>`).join("")}</g>
      <circle cx="22" cy="24" r="12" fill="#ffd9e4"/><circle cx="22" cy="24" r="12" fill="#ff9bb8" opacity=".55"/>
      <path d="M8,40 Q8,30 16,31 Q22,28 28,31 Q36,30 36,40 Q32,44 28,40 Q26,46 22,42 Q18,46 15,41 Q11,44 8,40Z" fill="#fff6e3"/>
      <path d="M27,41 Q28,48 26,50 Q24,48 25,42Z" fill="#fff6e3"/>
      <ellipse cx="17" cy="18" rx="4" ry="2.4" fill="#fff" opacity=".6"/><ellipse cx="14" cy="34" rx="3" ry="1.4" fill="#fff" opacity=".7"/>
      ${[[18, 14, "#3a8ad6"], [26, 18, "#3cae5c"], [21, 28, "#ffcf3f"], [29, 26, "#e5484d"], [14, 24, "#b57be0"]].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="3.4" height="1.2" rx=".6" fill="${c}" transform="rotate(${i * 40} ${x} ${y})"/>`).join("")}` },

    // ---------- АРБУЗ: большой ломоть + треугольник, корка, белая полоса, семечки ----------
    watermelon: { vb: [110, 70], svg: () => `<defs><linearGradient id="a2wm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4b5c"/><stop offset="1" stop-color="#e02c45"/></linearGradient></defs>
      ${sh(55, 66, 50, 4)}
      <path d="M4,26 A38,38 0 0 0 80,26Z" fill="#2e7d32"/><path d="M8,26 A34,34 0 0 0 76,26Z" fill="#8bd17c"/><path d="M11,26 A31,31 0 0 0 73,26Z" fill="#f4fbe8"/><path d="M14,26 A28,28 0 0 0 70,26Z" fill="url(#a2wm)"/>
      ${[[24, 34], [34, 42], [42, 30], [50, 42], [60, 34], [42, 48], [30, 32]].map(([x, y]) => `<path d="M${x},${y} q1.6,2.6 0,4.4 q-1.6,-1.8 0,-4.4Z" fill="#2b1d16"/>`).join("")}
      <path d="M4,26 L80,26" stroke="#e02c45" stroke-width="1"/><ellipse cx="34" cy="29" rx="14" ry="2" fill="#fff" opacity=".3"/>
      <g transform="translate(82 18) rotate(18)"><path d="M0,0 L26,0 L13,40Z" fill="url(#a2wm)"/><path d="M-1,-3 L27,-3 L26,0 L0,0Z" fill="#8bd17c"/><path d="M-1,-6 L27,-6 L27,-3 L-1,-3Z" fill="#2e7d32"/>
        ${[[8, 8], [17, 9], [12, 18]].map(([x, y]) => `<path d="M${x},${y} q1.4,2.2 0,3.8 q-1.4,-1.6 0,-3.8Z" fill="#2b1d16"/>`).join("")}</g>` },

    // ---------- ТОРТ: два коржа, крем, розовая глазурь с подтёками, клубника, тарелка ----------
    cake: { vb: [80, 60], svg: () => `<defs><linearGradient id="a2ck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d79c"/><stop offset="1" stop-color="#d9a25a"/></linearGradient></defs>
      <ellipse cx="40" cy="54" rx="38" ry="5" fill="#fff" stroke="#d6dde6" stroke-width="1.4"/>
      <rect x="10" y="28" width="60" height="24" rx="3" fill="url(#a2ck)"/>
      <rect x="10" y="38" width="60" height="4" fill="#fff6ea"/><rect x="10" y="39.2" width="60" height="1.6" fill="#ff8fab" opacity=".7"/>
      <path d="M8,26 Q8,18 18,18 L62,18 Q72,18 72,26 L72,30 Q68,35 65,30 Q62,37 58,30 Q54,34 50,30 Q46,38 42,30 Q38,34 34,30 Q30,37 26,30 Q22,34 18,30 Q14,36 11,30 Q8,32 8,30Z" fill="#ff8fab"/>
      <ellipse cx="40" cy="20" rx="30" ry="3" fill="#ffb3c6"/><ellipse cx="26" cy="21" rx="8" ry="1.2" fill="#fff" opacity=".6"/>
      ${[[24, 14], [40, 12], [56, 14]].map(([x, y]) => `<path d="M${x - 5},${y} Q${x},${y - 5} ${x + 5},${y} Q${x + 4},${y + 7} ${x},${y + 8} Q${x - 4},${y + 7} ${x - 5},${y}Z" fill="#e5484d"/><path d="M${x - 3},${y - 1} L${x},${y - 4} L${x + 3},${y - 1}" stroke="#3cae5c" stroke-width="2" fill="none" stroke-linecap="round"/>
        <circle cx="${x - 1.5}" cy="${y + 2}" r=".6" fill="#ffe08a"/><circle cx="${x + 1.5}" cy="${y + 4}" r=".6" fill="#ffe08a"/>`).join("")}
      ${[[16, 46], [30, 48], [52, 46], [64, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#b5762e" opacity=".6"/>`).join("")}` },

    // ---------- РАКОВИНА: столешница, стальная чаша с бликом, хромированный смеситель ----------
    sink: { vb: [90, 60], svg: () => `<defs><linearGradient id="a2sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d98a4"/><stop offset="1" stop-color="#d9e0e7"/></linearGradient>
      <linearGradient id="a2ch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa4ae"/><stop offset=".5" stop-color="#f4f7fa"/><stop offset="1" stop-color="#8d98a4"/></linearGradient></defs>
      <rect x="0" y="24" width="90" height="36" rx="2" fill="#efe7da"/><rect x="0" y="24" width="90" height="4" fill="#fff" opacity=".6"/>
      <rect x="11" y="31" width="68" height="23" rx="7" fill="#b7c1cb"/><rect x="14" y="33" width="62" height="19" rx="6" fill="url(#a2sk)"/>
      <circle cx="45" cy="45" r="2.4" fill="#5b6470"/><path d="M18,36 Q30,34 44,35" stroke="#fff" stroke-width="1.6" opacity=".7" fill="none"/>
      <rect x="42" y="18" width="6" height="14" rx="2" fill="url(#a2ch)"/><path d="M45,20 Q45,4 58,4 Q66,4 66,14" stroke="url(#a2ch)" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="62" y="13" width="8" height="4" rx="2" fill="#8d98a4"/>
      <rect x="30" y="21" width="9" height="4" rx="2" fill="#4a90d9"/><rect x="51" y="21" width="9" height="4" rx="2" fill="#e5484d"/>
      <path d="M66,18 Q65,24 66,30" stroke="#8fc5f2" stroke-width="1.6" opacity=".7" fill="none"/>` },

    // ---------- ПРОЕЗДНОЙ: бесконтактная карта в духе израильского «рав-кав» (свой рисунок, без чужого логотипа) ----------
    ticket: { vb: [80, 52], svg: () => `<defs><linearGradient id="a2rk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1f6fbf"/><stop offset=".6" stop-color="#2aa2b8"/><stop offset="1" stop-color="#39b56a"/></linearGradient></defs>
      ${sh(40, 49, 34, 3)}<rect x="2" y="4" width="76" height="44" rx="6" fill="url(#a2rk)"/>
      <path d="M2,34 Q30,22 78,30 L78,42 Q78,48 72,48 L8,48 Q2,48 2,42Z" fill="#fff" opacity=".18"/>
      <rect x="9" y="17" width="13" height="10" rx="2" fill="#f2c94c"/><path d="M9,22 L22,22 M15.5,17 L15.5,27" stroke="#c99a1e" stroke-width=".8"/>
      <path d="M27,18 Q30,22 27,26 M31,16 Q36,22 31,28" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${txt(58, 17, "רַב־קַו", 10, "#fff")}
      <g transform="translate(50 24)"><rect x="0" y="0" width="16" height="11" rx="2.5" fill="#fff"/><rect x="2" y="2" width="12" height="4" rx="1" fill="#2aa2b8"/><circle cx="4" cy="11" r="1.6" fill="#1f2a37"/><circle cx="12" cy="11" r="1.6" fill="#1f2a37"/></g>
      <text x="9" y="43" font-size="5.5" fill="#fff" font-family="Arial" opacity=".85">0123 4567 89</text>` },
  });

  // ---------- БАЛКОН: 3 варианта (выбираем на картинке), по умолчанию — A ----------
  const BAL = {
    A: () => `<rect x="0" y="0" width="112" height="300" rx="3" fill="#f4f0e8"/><rect x="8" y="8" width="96" height="190" fill="#a9dcf7"/>
      <circle cx="80" cy="40" r="13" fill="#ffd54f"/><path d="M8,118 Q30,100 52,114 Q74,98 104,112 L104,198 L8,198Z" fill="#cfe9c4"/>
      <rect x="18" y="128" width="16" height="70" fill="#e9dcc6"/><rect x="40" y="110" width="22" height="88" fill="#f2e6d0"/><rect x="70" y="122" width="18" height="76" fill="#dccbb0"/>
      ${[[22, 136], [28, 150], [44, 120], [52, 136], [44, 152], [74, 132], [80, 150]].map(([x, y]) => rr(x, y, 4, 6, 1, "#9fc8e4")).join("")}
      <rect x="54" y="8" width="4" height="190" fill="#e6dfd2"/><rect x="8" y="196" width="96" height="104" fill="#d8cfbf"/>
      <rect x="4" y="194" width="104" height="6" rx="2" fill="#4a5361"/>${[14, 26, 38, 50, 62, 74, 86, 98].map(x => rr(x, 200, 3, 60, 1, "#4a5361")).join("")}<rect x="4" y="258" width="104" height="5" rx="2" fill="#4a5361"/>
      <rect x="76" y="232" width="20" height="26" rx="3" fill="#c96f3b"/><path d="M86,232 Q76,212 80,200 M86,232 Q90,210 98,204 M86,232 Q84,216 88,206" stroke="#3cae5c" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    B: () => `<rect x="0" y="0" width="112" height="300" rx="3" fill="#efe6d6"/><path d="M8,60 Q8,8 56,8 Q104,8 104,60 L104,300 L8,300Z" fill="#a9dcf7"/>
      <path d="M8,60 Q8,8 56,8 Q104,8 104,60" stroke="#fff" stroke-width="6" fill="none"/><rect x="53" y="10" width="6" height="290" fill="#fff"/><rect x="8" y="150" width="96" height="5" fill="#fff"/>
      <circle cx="34" cy="50" r="11" fill="#ffd54f"/><path d="M8,170 Q56,150 104,170 L104,300 L8,300Z" fill="#7fb8e0" opacity=".5"/>
      <path d="M4,214 L108,214" stroke="#2b2f3a" stroke-width="4"/>${[12, 28, 44, 60, 76, 92].map(x => `<path d="M${x},214 L${x},268 M${x + 8},214 Q${x + 8},236 ${x + 2},240 Q${x + 8},244 ${x + 8},268" stroke="#2b2f3a" stroke-width="2.4" fill="none"/>`).join("")}<path d="M4,268 L108,268" stroke="#2b2f3a" stroke-width="4"/>
      <path d="M20,214 Q26,196 34,200 Q30,188 40,190 Q46,182 52,192 Q60,188 58,200 Q66,198 66,210" fill="#e5484d" opacity=".85"/><path d="M20,214 Q40,206 66,212" stroke="#3cae5c" stroke-width="3" fill="none"/>`,
    C: () => `<rect x="0" y="0" width="112" height="300" rx="3" fill="#e9eef2"/><rect x="6" y="6" width="100" height="294" fill="#bfe3f7"/>
      <path d="M6,170 L106,170 L106,300 L6,300Z" fill="#7fc8e8"/><path d="M6,176 Q30,170 56,176 T106,176" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>
      <path d="M78,170 L80,90" stroke="#8a5a36" stroke-width="5"/>${[-60, -25, 10, 45, 80].map(a => `<path d="M80,90 Q${80 + 26 * Math.cos(a * Math.PI / 180)},${82 + 16 * Math.sin(a * Math.PI / 180)} ${80 + 34 * Math.cos(a * Math.PI / 180)},${96 + 20 * Math.sin(a * Math.PI / 180)}" stroke="#3cae5c" stroke-width="5" fill="none" stroke-linecap="round"/>`).join("")}
      <rect x="54" y="6" width="5" height="294" fill="#cfd8e0"/><rect x="6" y="6" width="100" height="294" fill="#fff" opacity=".12"/>
      <rect x="6" y="210" width="100" height="58" fill="#dff1ff" opacity=".55" stroke="#9fb3c4" stroke-width="2"/><rect x="2" y="206" width="108" height="6" rx="2" fill="#9fb3c4"/>
      <path d="M14,30 L40,30 M18,40 L34,40" stroke="#fff" stroke-width="3" opacity=".8"/>`,
  };
  window.BALCONY_VARIANTS = BAL;
  let balV = "A"; try { balV = localStorage.getItem("hirbis_balcony") || "A"; } catch (e) {}
  ART.balcony = { vb: [112, 300], svg: () => (BAL[balV] || BAL.A)() };

  // ---------- ЧАСТИ ТЕЛА (переделаны): рука, спина, ухо, горло ----------
  Object.assign(ART, {
    hand: { vb: [110, 110], svg: () => frame(`<defs><linearGradient id="a2hd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8d5b8"/><stop offset=".6" stop-color="#eebc95"/><stop offset="1" stop-color="#d9996f"/></linearGradient>
        <radialGradient id="a2pl" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#f6cfae"/><stop offset="1" stop-color="#e3a77e"/></radialGradient></defs>
      <rect x="44" y="84" width="24" height="18" fill="url(#a2hd)"/>
      <rect x="27.5" y="30" width="11" height="31" rx="5.5" fill="url(#a2hd)" stroke="#c98a60" stroke-width="1.1" transform="rotate(-12 33 45)"/>
      <rect x="39" y="17" width="12.4" height="40" rx="6.2" fill="url(#a2hd)" stroke="#c98a60" stroke-width="1.1" transform="rotate(-4 45 37)"/>
      <rect x="52.4" y="12" width="13" height="44" rx="6.5" fill="url(#a2hd)" stroke="#c98a60" stroke-width="1.1"/>
      <rect x="66" y="17" width="12.4" height="40" rx="6.2" fill="url(#a2hd)" stroke="#c98a60" stroke-width="1.1" transform="rotate(5 72 37)"/>
      <rect x="80" y="40" width="13" height="40" rx="6.5" fill="url(#a2hd)" stroke="#c98a60" stroke-width="1.1" transform="rotate(34 86 68)"/><path d="M93,46 Q96,44 97,47" stroke="#c98a60" stroke-width=".9" fill="none" opacity=".7"/>
      <path d="M30,54 Q30,48 40,48 L78,49 Q84,50 84,58 Q85,72 78,82 Q72,92 56,92 Q40,92 34,82 Q28,70 30,54Z" fill="url(#a2pl)" stroke="#c98a60" stroke-width="1.1"/>
      ${[[31.5, 37], [31, 44], [44.2, 26], [44.6, 35], [58.9, 21], [58.9, 31], [73.6, 26], [73, 35]].map(([x, y]) => `<path d="M${x - 3.4},${y} Q${x},${y + 1.6} ${x + 3.4},${y}" stroke="#c98a60" stroke-width=".9" fill="none" opacity=".75"/>`).join("")}
      <path d="M36,60 Q52,58 70,62" stroke="#c98a60" stroke-width="1" fill="none" opacity=".7"/><path d="M40,68 Q54,64 64,70" stroke="#c98a60" stroke-width="1" fill="none" opacity=".6"/>
      <path d="M70,58 Q60,72 64,90" stroke="#c98a60" stroke-width="1" fill="none" opacity=".6"/>
      ${[[32, 34], [45, 22], [59, 17], [73, 22]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.4" fill="#fff" opacity=".35"/>`).join("")}${txt(55, 106, "יָד", 9, "#3a8ad6")}`) },
    back: { vb: [110, 110], svg: () => frame(`<path d="M22,98 Q20,58 30,40 Q38,30 46,28 L46,20 Q46,14 55,14 Q64,14 64,20 L64,28 Q72,30 80,40 Q90,58 88,98Z" fill="${SK}" stroke="${SKD}" stroke-width="2"/>
      <path d="M46,22 Q55,26 64,22" stroke="${SKD}" stroke-width="1.6" fill="none"/><path d="M55,32 L55,94" stroke="${SKD}" stroke-width="2" stroke-dasharray="4 3"/>
      <path d="M36,46 Q42,60 50,58 M74,46 Q68,60 60,58" stroke="${SKD}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <ellipse cx="55" cy="74" rx="14" ry="10" fill="#e5484d" opacity=".25"/>${txt(55, 106, "גַּב", 9, "#3a8ad6")}`) },
    ear: { vb: [110, 110], svg: () => frame(`<path d="M30,40 Q30,16 56,14 Q82,14 84,42 Q86,66 70,80 L62,96 L40,96 L42,82 Q28,70 30,40Z" fill="${SK}" stroke="${SKD}" stroke-width="2"/>
      <path d="M30,40 Q34,18 58,16 Q80,16 82,34 Q70,24 56,26 Q40,28 30,40Z" fill="#5a3a24"/>
      <path d="M58,40 Q72,38 74,54 Q75,68 64,72 Q60,80 54,76 Q51,72 56,67 Q63,63 62,54 Q61,47 56,47 Q52,47 52,52" fill="${SKL}" stroke="${SKD}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M60,46 Q68,48 67,58" stroke="${SKD}" stroke-width="1.8" fill="none"/><circle cx="40" cy="50" r="2.4" fill="#2b2f3a"/>
      <path d="M84,50 Q92,52 92,58 M88,44 Q98,48 98,60" stroke="#3a8ad6" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>${txt(55, 106, "אוֹזֶן", 9, "#3a8ad6")}`) },
    throat: { vb: [110, 110], svg: () => frame(`<path d="M30,10 Q30,4 40,4 L70,4 Q80,4 80,10 L80,30 Q80,44 66,48 L44,48 Q30,44 30,30Z" fill="${SK}" stroke="${SKD}" stroke-width="2"/>
      <path d="M46,30 Q55,36 64,30" stroke="#b5562f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M44,46 L44,72 Q55,78 66,72 L66,46" fill="${SK}" stroke="${SKD}" stroke-width="2"/>
      <path d="M20,98 Q22,76 44,70 Q55,76 66,70 Q88,76 90,98Z" fill="#3a8ad6"/>
      <ellipse cx="55" cy="58" rx="8" ry="9" fill="#e5484d" opacity=".55"/><ellipse cx="55" cy="58" rx="4" ry="5" fill="#e5484d" opacity=".55"/>
      <path d="M70,54 L80,50 M70,60 L82,60 M70,66 L80,70" stroke="#e5484d" stroke-width="2" stroke-linecap="round"/>${txt(55, 106, "גָּרוֹן", 9, "#3a8ad6")}`) },
    leg: { vb: [110, 110], svg: () => frame(`<defs><linearGradient id="a2lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9996f"/><stop offset=".45" stop-color="#f6cfae"/><stop offset="1" stop-color="#e0a479"/></linearGradient></defs>
      <path d="M38,6 L66,6 L66,16 L38,16Z" fill="#3a6ea8"/><path d="M38,15 L66,15" stroke="#2a5688" stroke-width="2"/>
      <path d="M40,16 Q36,30 40,44 Q43,56 44,66 L44,72 Q42,80 36,82 Q30,86 32,90 Q34,94 44,94 L86,94 Q96,94 95,88 Q94,83 86,82 Q72,80 64,74 L62,66 Q62,52 66,40 Q68,26 64,16Z" fill="url(#a2lg)" stroke="#c98a60" stroke-width="1.2"/>
      <path d="M46,28 Q42,40 46,52" stroke="#c98a60" stroke-width="1" fill="none" opacity=".55"/><ellipse cx="60" cy="72" rx="3.2" ry="2.4" fill="#e3a77e"/>
      <path d="M64,82 Q70,84 74,82" stroke="#c98a60" stroke-width="1" fill="none" opacity=".6"/>
      ${[[89, 88, 4.2], [82.5, 89.5, 3.2], [77, 90.5, 2.8], [72, 91, 2.5], [67.5, 91.5, 2.2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f2c39d" stroke="#c98a60" stroke-width=".8"/>`).join("")}
      <path d="M86.5,85.5 Q89,84.5 91,86" stroke="#fff" stroke-width="1.2" fill="none" opacity=".8"/><ellipse cx="38" cy="90" rx="4" ry="2" fill="#e3a77e" opacity=".7"/>
      <ellipse cx="50" cy="30" rx="3" ry="9" fill="#fff" opacity=".22"/>${txt(55, 106, "רֶגֶל", 9, "#3a8ad6")}`) },
    belly: { vb: [110, 110], svg: () => frame(`<defs><radialGradient id="a2bl" cx=".5" cy=".5" r=".62"><stop offset="0" stop-color="#f7d2b2"/><stop offset=".7" stop-color="#eab58c"/><stop offset="1" stop-color="#cf8f63"/></radialGradient></defs>
      <path d="M26,18 Q54,10 84,18 L84,28 Q54,22 26,28Z" fill="#3a8ad6"/><path d="M26,26 Q54,20 84,26" stroke="#2f74bd" stroke-width="2" fill="none"/>
      <path d="M27,26 Q55,20 83,26 Q90,46 86,66 Q84,80 80,88 L30,88 Q26,80 24,66 Q20,46 27,26Z" fill="url(#a2bl)" stroke="#c98a60" stroke-width="1.2"/>
      <path d="M55,30 L55,50" stroke="#d29a70" stroke-width="1.2" opacity=".5"/><path d="M40,40 Q46,44 52,42 M70,40 Q64,44 58,42" stroke="#d29a70" stroke-width="1.1" fill="none" opacity=".45"/>
      <ellipse cx="55" cy="60" rx="2.6" ry="3.6" fill="#b5764c"/><path d="M52.6,58.6 Q55,56.4 57.4,58.6" stroke="#9a5f3a" stroke-width="1" fill="none"/>
      <ellipse cx="44" cy="52" rx="8" ry="12" fill="#fff" opacity=".14"/>
      <path d="M28,84 Q55,90 82,84 L82,96 L28,96Z" fill="#2b3a52"/><path d="M28,85 Q55,91 82,85" stroke="#4a5d7a" stroke-width="2.4" fill="none"/>${txt(55, 106, "בֶּטֶן", 9, "#3a8ad6")}`) },
  });
})();
