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
    hand: () => `<defs><linearGradient id="emHF" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e39a5e"/><stop offset=".3" stop-color="#fbcf9f"/><stop offset=".6" stop-color="#ffd9ae"/><stop offset="1" stop-color="#d98f54"/></linearGradient><radialGradient id="emHP" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#ffdcb4"/><stop offset=".6" stop-color="#f6bd86"/><stop offset="1" stop-color="#dd955c"/></radialGradient><linearGradient id="emHT" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8a265"/><stop offset=".45" stop-color="#ffd6a8"/><stop offset="1" stop-color="#d98d52"/></linearGradient></defs><ellipse cx="50" cy="98" rx="20" ry="2.4" fill="#000" opacity=".12"/>
   <g transform="rotate(34 70 84)"><path d="M64,86 L64,61 A6.5,6.5 0 0 1 77,61 L77,88Z" fill="url(#emHT)" stroke="#c97f45" stroke-width=".7" stroke-opacity=".55"/><path d="M65.5,72 Q70.5,74 75.5,72" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/><ellipse cx="69.5" cy="61" rx="2" ry="3" fill="#fff" opacity=".45"/></g>
   <g transform="rotate(-9 35 58)"><path d="M30,58 L30.7,30.3 A4.3,4.3 0 0 1 39.3,30.3 L40,58Z" fill="url(#emHF)" stroke="#c97f45" stroke-width=".7" stroke-opacity=".55"/>
    <path d="M32.08672,37.519999999999996 Q35,39.12 37.91328,37.519999999999996" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/><path d="M31.95232,47.120000000000005 Q35,48.720000000000006 38.04768,47.120000000000005" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/>
    <ellipse cx="33.968" cy="30.73" rx="1.892" ry="3.01" fill="#fff" opacity=".45"/></g><g transform="rotate(-3 45.5 56)"><path d="M40,56 L40.7,17.8 A4.8,4.8 0 0 1 50.3,17.8 L51,56Z" fill="url(#emHF)" stroke="#c97f45" stroke-width=".7" stroke-opacity=".55"/>
    <path d="M42.26672,28.479999999999997 Q45.5,30.08 48.73328,28.479999999999997" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/><path d="M42.13232,41.38 Q45.5,42.980000000000004 48.86768,41.38" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/>
    <ellipse cx="44.348" cy="18.28" rx="2.112" ry="3.36" fill="#fff" opacity=".45"/></g><g transform="rotate(0 56.5 56)"><path d="M50.8,56 L51.5,12 A5,5 0 0 1 61.5,12 L62.2,56Z" fill="url(#emHF)" stroke="#c97f45" stroke-width=".7" stroke-opacity=".55"/>
    <path d="M53.13872,24.64 Q56.5,26.240000000000002 59.86128,24.64" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/><path d="M53.00432,39.34 Q56.5,40.940000000000005 59.99568,39.34" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/>
    <ellipse cx="55.3" cy="12.5" rx="2.2" ry="3.5" fill="#fff" opacity=".45"/></g><g transform="rotate(4 67 57)"><path d="M61.5,57 L62.2,16.8 A4.8,4.8 0 0 1 71.8,16.8 L72.5,57Z" fill="url(#emHF)" stroke="#c97f45" stroke-width=".7" stroke-opacity=".55"/>
    <path d="M63.76672,28.2 Q67,29.8 70.23328,28.2" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/><path d="M63.63232,41.7 Q67,43.300000000000004 70.36768000000001,41.7" stroke="#c97f45" stroke-width=".8" fill="none" opacity=".6"/>
    <ellipse cx="65.848" cy="17.28" rx="2.112" ry="3.36" fill="#fff" opacity=".45"/></g>
   <path d="M30,58 Q31,52 37,53 Q42,50 46,52 Q51,49 56,51 Q61,49 66,51 Q72,51 72,56 L72,64 Q76,70 74,80 Q70,90 62,99 L40,99 Q33,90 31,80 Q28,68 30,58Z" fill="url(#emHP)" stroke="#c97f45" stroke-width=".7" stroke-opacity=".5"/>
   <path d="M34,64 Q46,61 58,66" stroke="#c97f45" stroke-width="1" fill="none" opacity=".55"/><path d="M37,71 Q48,67 62,71" stroke="#c97f45" stroke-width="1" fill="none" opacity=".5"/>
   <path d="M66,62 Q58,74 60,92" stroke="#c97f45" stroke-width="1" fill="none" opacity=".5"/><ellipse cx="66" cy="82" rx="6" ry="9" fill="#e9a46c" opacity=".35"/>
   <ellipse cx="45" cy="70" rx="9" ry="6" fill="#fff" opacity=".18"/>`,
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
