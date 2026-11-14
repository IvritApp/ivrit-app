// =====================================================
// art3.js — рисунки «в духе эмодзи»: мультяшно, но объёмно (градиенты, блики, мягкие тени).
// Свои рисунки (не копии чьих-то эмодзи). Рука, нога, ухо, солнце, клубника, лимон, гранат, перец, виноград.
// window.EMO.<имя>() → SVG-содержимое для viewBox 0 0 100 100
// =====================================================
(function () {
  const rg = (id, stops, cx, cy, r) => `<radialGradient id="${id}" cx="${cx || .35}" cy="${cy || .3}" r="${r || .75}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</radialGradient>`;
  const lg = (id, stops, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 == null ? 1 : x2}" y2="${y2 == null ? 1 : y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
  const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * .16}" fill="#000" opacity=".14"/>`;
  const SKIN = [[0, "#ffe2bf"], [.55, "#f8bf86"], [1, "#e0955a"]];

  const EMO = {
    hand: () => `<defs>${rg("emHand", SKIN, .38, .3, .8)}</defs>${shadow(52, 97, 22)}
      <path d="M36,95 L33,72 C29,62 26,54 26,45 L26,35 C26,26.5 38.5,26.5 38.5,35 L39,21 C39,11.5 52.5,11.5 52.5,21 L53,15 C53,5.5 66.5,5.5 66.5,15 L67,21 C67,11.5 80.5,11.5 80.5,21 L80.5,57 C83,51 88,45 93,46.5 C99,48.5 98,55 95,59.5 L85,75 C81,82 76,89 72,95Z" fill="url(#emHand)"/>
      <path d="M38.8,36 L38.8,60 M52.8,25 L52.8,58 M66.8,25 L66.8,58" stroke="#d98a4e" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>
      <path d="M80.5,57 C79,63 76,66 72,68" stroke="#d98a4e" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".45"/>
      ${[[32.2, 31], [45.7, 17], [59.7, 11], [73.7, 17]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="4.4" fill="#ffe7cc" opacity=".9"/><ellipse cx="${x - .8}" cy="${y - 1.4}" rx="1.4" ry="1.8" fill="#fff" opacity=".8"/>`).join("")}
      <ellipse cx="50" cy="66" rx="13" ry="8" fill="#fff" opacity=".18"/>`,
    leg: () => `<defs>${lg("emLeg", [[0, "#f6b679"], [.4, "#ffe0bc"], [1, "#df935a"]], 1, 0)}</defs>${shadow(46, 98, 34)}
      <path d="M46,8 C56,0 76,4 76,18 C80,32 76,48 72,60 C70,70 72,79 74,85 C76,94 70,98 62,98 L23,98 C13,98 11,90 17,86 C29,82 37,78 41,70 C42,50 40,30 40,20 C40,14 42,10 46,8Z" fill="url(#emLeg)"/>
      ${[[18, 92, 5.6], [26.5, 94, 4.4], [33.5, 95, 3.8], [39.5, 95.6, 3.4], [45, 96, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#f9c690"/><ellipse cx="${x - r * .25}" cy="${y - r * .45}" rx="${r * .5}" ry="${r * .35}" fill="#fff" opacity=".6"/>`).join("")}
      <ellipse cx="65" cy="76" rx="3.4" ry="2.6" fill="#e9a46c"/><path d="M46,16 C48,30 48,48 46,66" stroke="#fff" stroke-width="4" opacity=".35" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="14" rx="7" ry="3" fill="#fff" opacity=".35"/>`,
    ear: () => `<defs>${rg("emEar", SKIN, .35, .3, .8)}${rg("emEarIn", [[0, "#f3a678"], [1, "#d8804f"]], .5, .4, .7)}</defs>${shadow(54, 97, 20)}
      <path d="M42,12 C68,4 90,22 86,50 C84,64 74,70 70,80 C66,92 52,97 44,90 C38,85 42,78 46,74 C53,67 61,61 59,49 C57,39 47,37 43,45 C41,50 33,50 32,42 C31,28 34,16 42,12Z" fill="url(#emEar)"/>
      <path d="M48,24 C64,20 76,32 74,48 C72,58 66,62 62,70 C59,76 55,78 52,76 C56,68 64,62 64,50 C64,38 56,32 48,34Z" fill="url(#emEarIn)" opacity=".85"/>
      <path d="M44,18 C60,12 78,22 80,40" stroke="#fff" stroke-width="3.4" opacity=".45" fill="none" stroke-linecap="round"/>
      <ellipse cx="49" cy="88" rx="5" ry="3.4" fill="#ffd2a8" opacity=".9"/>`,
    sun: () => `<defs>${rg("emSun", [[0, "#fffbd1"], [.45, "#ffd83a"], [1, "#ff9d1e"]], .4, .38, .7)}${lg("emRay", [[0, "#ffd23a"], [1, "#ff8a1e"]], 0, 1)}</defs>
      <circle cx="50" cy="50" r="44" fill="#ffd23a" opacity=".13"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M45,22 Q50,4 55,22 Z" fill="url(#emRay)" transform="rotate(${i * 30} 50 50)"/>`).join("")}
      <circle cx="50" cy="50" r="27" fill="url(#emSun)"/><ellipse cx="41" cy="40" rx="9" ry="6" fill="#fff" opacity=".55" transform="rotate(-30 41 40)"/>`,
    strawberry: () => `<defs>${rg("emStr", [[0, "#ff8a8a"], [.5, "#ef2b3c"], [1, "#a80d22"]], .35, .3, .8)}${rg("emLeaf", [[0, "#8ee07a"], [1, "#2f8f3a"]], .4, .3, .8)}</defs>${shadow(50, 97, 24)}
      <path d="M50,94 C28,86 14,64 16,44 C18,31 31,27 50,31 C69,27 82,31 84,44 C86,64 72,86 50,94Z" fill="url(#emStr)"/>
      ${[[32, 46], [44, 44], [56, 44], [68, 46], [26, 58], [38, 57], [50, 56], [62, 57], [74, 58], [32, 69], [44, 69], [56, 69], [68, 69], [40, 80], [52, 81], [62, 78]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#ffe27a"/><ellipse cx="${x}" cy="${y + 1.3}" rx="1.4" ry=".9" fill="#b3112a" opacity=".45"/>`).join("")}
      <path d="M50,34 L36,26 L44,30 L32,20 L46,26 L44,14 L50,25 L56,14 L54,26 L68,20 L56,30 L64,26 Z" fill="url(#emLeaf)"/><path d="M50,26 Q51,16 56,10" stroke="#3f8f3c" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="34" cy="44" rx="6" ry="9" fill="#fff" opacity=".28" transform="rotate(25 34 44)"/>`,
    lemon: () => `<defs>${rg("emLem", [[0, "#fff7a8"], [.5, "#ffde2e"], [1, "#d9a608"]], .38, .32, .8)}</defs>${shadow(50, 88, 34)}
      <path d="M10,52 C8,47 13,44 17,44 C24,28 40,22 52,22 C66,22 80,30 85,44 C89,45 93,48 91,53 C89,57 85,57 83,58 C77,72 64,80 50,80 C36,80 22,72 17,60 C13,59 11,57 10,52Z" fill="url(#emLem)" transform="rotate(-14 50 52)"/>
      ${Array.from({ length: 18 }, (_, i) => `<circle cx="${22 + (i * 37) % 58}" cy="${36 + (i * 17) % 36}" r=".9" fill="#c99a06" opacity=".35"/>`).join("")}
      <ellipse cx="38" cy="38" rx="11" ry="5" fill="#fff" opacity=".55" transform="rotate(-25 38 38)"/>
      <path d="M70,24 C78,12 90,12 94,16 C88,24 78,26 70,24Z" fill="#4caf50"/><path d="M70,24 L90,15" stroke="#2f7d32" stroke-width="1.2"/>`,
    pomegranate: () => `<defs>${rg("emPom", [[0, "#ff8f8f"], [.45, "#d8213a"], [1, "#7c0d1c"]], .35, .32, .8)}</defs>${shadow(50, 96, 30)}
      <path d="M42,22 L40,12 L45,16 L50,8 L55,16 L60,12 L58,22Z" fill="#9c1426"/><path d="M42,22 L58,22 L57,27 L43,27Z" fill="#b51a2e"/>
      <circle cx="50" cy="58" r="36" fill="url(#emPom)"/><path d="M28,40 Q38,30 52,28" stroke="#fff" stroke-width="5" opacity=".35" fill="none" stroke-linecap="round"/>
      <ellipse cx="34" cy="46" rx="7" ry="10" fill="#fff" opacity=".22" transform="rotate(30 34 46)"/><path d="M78,70 Q70,86 52,90" stroke="#5a0814" stroke-width="3" opacity=".25" fill="none"/>`,
    pepper: () => `<defs>${rg("emPep", [[0, "#ff8a6a"], [.45, "#e82c1c"], [1, "#8f1208"]], .35, .3, .8)}${lg("emStem", [[0, "#7fd16a"], [1, "#2e7d32"]], 1, 1)}</defs>${shadow(50, 96, 28)}
      <path d="M26,34 C30,24 44,24 50,28 C56,24 70,24 74,34 C80,46 78,64 72,78 C68,88 60,94 54,90 C51,94 49,94 46,90 C40,94 32,88 28,78 C22,64 20,46 26,34Z" fill="url(#emPep)"/>
      <path d="M50,30 C48,48 49,70 50,90" stroke="#9a150a" stroke-width="2" opacity=".35" fill="none"/>
      <path d="M38,32 C33,46 33,64 38,80" stroke="#fff" stroke-width="5" opacity=".38" fill="none" stroke-linecap="round"/>
      <path d="M40,28 C44,22 56,22 60,28 C56,30 44,30 40,28Z" fill="#2e7d32"/><path d="M50,26 C50,16 54,10 62,8" stroke="url(#emStem)" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    grapes: () => `<defs>${rg("emGr", [[0, "#d7a6ff"], [.45, "#8a3fc8"], [1, "#3f1170"]], .35, .3, .8)}${lg("emGL", [[0, "#8ee07a"], [1, "#2f8f3a"]])}</defs>${shadow(50, 97, 22)}
      <path d="M50,20 C50,12 54,8 60,6" stroke="#6b4a2a" stroke-width="3.4" fill="none" stroke-linecap="round"/>
      <path d="M54,16 C64,6 82,8 86,16 C78,24 64,24 54,16Z" fill="url(#emGL)"/><path d="M56,16 L84,14" stroke="#2f7d32" stroke-width="1.2"/>
      ${[[38, 30], [50, 28], [62, 30], [32, 42], [44, 41], [56, 41], [68, 42], [38, 53], [50, 53], [62, 53], [44, 65], [56, 65], [50, 77], [44, 87], [56, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.6" fill="url(#emGr)"/><ellipse cx="${x - 2.4}" cy="${y - 2.6}" rx="2.2" ry="1.5" fill="#fff" opacity=".6"/>`).join("")}`,
  };
  window.EMO = EMO;
  if (!window.PLACE_KIT) return;
  const { ART } = window.PLACE_KIT;
  const txt = (x, y, s) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="9" font-weight="700" fill="#3a8ad6" font-family="Arial, sans-serif">${s}</text>`;
  const card = (inner, label) => `<rect x="0" y="0" width="110" height="110" rx="10" fill="#fff" opacity=".001"/><g transform="translate(9 0) scale(.92)">${inner}</g>${txt(55, 106, label)}`;
  // части тела в квесте врача (подпись на иврите в карточке нужна — в словах она вырезается)
  ART.hand = { vb: [110, 110], svg: () => card(EMO.hand(), "יָד") };
  ART.leg = { vb: [110, 110], svg: () => card(EMO.leg(), "רֶגֶל") };
  ART.ear = { vb: [110, 110], svg: () => card(EMO.ear(), "אוֹזֶן") };
  // одиночные фрукты — для картинок к словам
  ["strawberry", "lemon", "pomegranate", "pepper", "grapes", "sun"].forEach(k => { ART["emo_" + k] = { vb: [100, 100], svg: EMO[k] }; });
  // ящики на шуке: те же фрукты, несколько штук
  const crate = (w, h) => `<rect x="2" y="${h * .5}" width="${w - 4}" height="${h * .5 - 2}" rx="3" fill="#b07a46"/><rect x="2" y="${h * .5}" width="${w - 4}" height="5" fill="#c99a63"/><path d="M8,${h * .78} L${w - 8},${h * .78}" stroke="#8a5a30" stroke-width="2"/>`;
  const pile = (k, n, s, w, h) => Array.from({ length: n }, (_, i) => { const x = 6 + (i % Math.ceil(n / 2)) * ((w - 12 - s) / Math.max(1, Math.ceil(n / 2) - 1)), y = i < Math.ceil(n / 2) ? h * .5 - s * .62 : h * .5 - s * .95; return `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox="0 0 100 100" overflow="visible">${EMO[k]()}</svg>`; }).reverse().join("");
  ART.grapes = { vb: [80, 56], svg: () => `${pile("grapes", 4, 30, 80, 56)}${crate(80, 56)}` };
  ART.pomegranate = { vb: [80, 56], svg: () => `${pile("pomegranate", 5, 26, 80, 56)}${crate(80, 56)}` };
  ART.lemons = { vb: [80, 56], svg: () => `${pile("lemon", 6, 24, 80, 56)}${crate(80, 56)}` };
  ART.pepper = { vb: [80, 56], svg: () => `${pile("pepper", 5, 26, 80, 56)}${crate(80, 56)}` };
  ART.strawberries = { vb: [70, 50], svg: () => `<rect x="2" y="25" width="66" height="23" rx="4" fill="#fff" stroke="#c8d0d8" stroke-width="2"/>${pile("strawberry", 6, 20, 70, 50)}<rect x="2" y="36" width="66" height="12" rx="4" fill="#fff" stroke="#c8d0d8" stroke-width="2"/>` };
})();
