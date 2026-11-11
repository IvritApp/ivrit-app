// =====================================================
// КИНО «ПРИЛЁТ» — мультик перед квестом «Первая шаурма».
//
//   playArrivalScene(container, { gender: "m" | "f", profile }, onDone)
//
// 1) самолёт садится  2) зал прилёта, встреча с другом
// 3) такси едет вдоль города и моря  4) шаурмичная → onDone()
// Все картинки нарисованы прямо здесь (SVG) в стиле Хибри:
// плоская «бумажная аппликация», белый + голубой, оранжевый акцент.
// Аватар игрока берём из HirbisAvatar.svg(...), если он подключён,
// иначе рисуем простую временную фигурку.
// Ничего вне себя не трогает: только добавляет свой блок в container.
// =====================================================
(function () {
  "use strict";

  const W = 360, H = 700;                 // размер «кадра» в условных пикселях
  const ASSETS = "assets/";               // папка с картинками приложения

  // ---------- Тексты (всё, что говорят герои) ----------
  // Иврит — отдельной строкой (смешанные строки ломают направление текста)
  const TEXT = {
    country:  { he: "יִשְׂרָאֵל", ru: "Израиль" },
    hereIAm:  { ru: "Эй! Я здесь!" },
    welcome:  { he: { m: "בָּרוּךְ הַבָּא", f: "בְּרוּכָה הַבָּאָה" }, ru: "Добро пожаловать в Израиль!" },
    hello:    { m: "Шалом, Давид! Как же я рад тебя видеть!", f: "Шалом, Циля! Как же я рада тебя видеть!" },
    taxi:     { he: "מוֹנִית", ru: "Такси!" },
    hungry:   { m: "Ты голоден? Едем за шаурмой!", f: "Ты голодна? Едем за шаурмой!" },
    yes:      { ru: "Ещё как!" },
    arrived:  { ru: "Приехали! Заказываешь ты — на иврите 😉" },
    drive:    { ru: "Садись, поехали! По дороге кое-что расскажу 😉" },
    final:    { small: "Квест", big: "Первая шаурма", sub: "Закажи шаурму на иврите" }
  };

  // ---------- Цвета ----------
  const C = {
    blue: "#5aa9f0", blueD: "#3a8ad6", blueL: "#cfe8fb", sky: "#e6f3fd",
    orange: "#ff8a35", orangeL: "#ff9f43", ink: "#191b29",
    sand: "#f6e4c0", green: "#7cc490", greenD: "#5aa874", grey: "#c9d6e3"
  };

  // ---------- Внешность героев (временные, потом заменим) ----------
  const LOOK = {
    david: { custom: "david" },          // нарисован отдельно (davidSVG) по картинке из Шедеврума
    tzila: { custom: "tzila" },          // нарисована отдельно (tzilaSVG) по картинке из Шедеврума, цвета приглушены
    playerM: { skin: "#f1c9a8", hair: "short", hairC: "#6b4a32", top: "#6fbfb4", bottom: "#3a4660", shoes: "#ffffff" },
    playerF: { skin: "#f1c9a8", hair: "long", hairC: "#5a3a26", top: "#6fbfb4", bottom: "#3a4660", shoes: "#ffffff" },
    seller: { skin: "#e8b48c", hair: "short", hairC: "#2b211c", top: "#ffffff", bottom: "#ffffff", shoes: C.ink, hat: "chef", beard: true },
    driver: { skin: "#eabd98", hair: "short", hairC: "#444", top: "#8fa8c8", bottom: "#34405e", shoes: C.ink, hat: "cap" }
  };

  // =====================================================
  // РИСУНКИ (SVG-строки)
  // =====================================================

  // Человечек 100×200: руки и ноги — отдельные группы, чтобы шагать и махать
  // ---------- ДАВИД (по образцу из Шедеврума, 11.11) ----------
  // Те же части, что у человечков: руки и ноги — отдельные группы (машет, шагает, обнимает),
  // глаза моргают, голова чуть покачивается.
  function davidSVG() {
    const skin = "#f4c39a", skinD = "#e5a77c", hair = "#2b2130", hairL = "#463949";
    const tee = "#1f7fd6", teeD = "#1766b3", jeans = "#1f2d4f", cuff = "#3b4b72";
    let curls = "";
    const ring = [[22,44,8],[21,33,9],[25,22,10],[33,13,10],[43,8,10],[54,7,10],[64,10,10],[73,17,10],[78,28,9],[79,39,8],[30,30,8],[50,16,9],[68,26,8],[40,20,8],[59,18,8]];
    ring.forEach(([x, y, r]) => { curls += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#hsDavH)"/>`; });
    let swirls = "";
    [[26,24],[38,12],[52,9],[66,14],[75,27],[23,37],[46,20],[61,21]].forEach(([x, y]) => {
      swirls += `<path d="M${x - 3},${y + 1} q1,-4 4,-3 q3,1 1,4" stroke="${hairL}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    });
    const shoe = (x, flip) => `<path d="M${x - 9},190 Q${x - 9},182 ${x - 2},181 L${x + 5},181 Q${x + 11},183 ${x + 12},190 Z" fill="#f4f6f9"/>
      <rect x="${x - 10}" y="189" width="${23}" height="4" rx="2" fill="#c9d1db"/>
      <path d="M${x - 3},183.5 l5,0 M${x - 3},186 l5,0" stroke="#c9d1db" stroke-width="1.1"/>`;
    // Голова уменьшена до пропорций героев (≈30% роста), тело вытянуто — рост прежний
    return `<svg viewBox="0 0 100 200" class="hs-person hs-david" overflow="visible">
      <defs>
        <radialGradient id="hsDavS" cx="42%" cy="36%" r="72%"><stop offset="0" stop-color="#fbd5b4"/><stop offset=".55" stop-color="#f4c39a"/><stop offset="1" stop-color="#dca47c"/></radialGradient>
        <linearGradient id="hsDavH" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#4a3b4e"/><stop offset=".5" stop-color="#2b2130"/><stop offset="1" stop-color="#1e1722"/></linearGradient>
        <linearGradient id="hsDavT" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#4a9be4"/><stop offset=".6" stop-color="#1f7fd6"/><stop offset="1" stop-color="#1766b3"/></linearGradient>
      </defs>
      <g transform="translate(0 66) scale(1 1.104) translate(0 -78)">
      <g class="hs-leg hs-leg-l">
        <rect x="36.5" y="124" width="13" height="55" rx="3" fill="${jeans}"/>
        <rect x="36" y="174" width="14" height="6" rx="2" fill="${cuff}"/>${shoe(42)}</g>
      <g class="hs-leg hs-leg-r">
        <rect x="50.5" y="124" width="13" height="55" rx="3" fill="${jeans}"/>
        <rect x="50" y="174" width="14" height="6" rx="2" fill="${cuff}"/>${shoe(58)}</g>
      <path d="M35,124 L65,124 L65,134 L35,134Z" fill="${jeans}"/>
      <g class="hs-arm hs-arm-l">
        <rect x="21.5" y="100" width="8" height="34" rx="4" fill="${skin}"/>
        <path d="M21,133 q-1,6 3,8 q3,1 5,-1 l1,-6 q-1,-4 -5,-4 q-3,0 -4,3Z" fill="${skin}"/>
        <path d="M24,88 Q30,84 34,88 L33,104 Q27,106 20,103 Z" fill="${tee}"/>
        <path d="M20,101 Q27,104 33,102 L33,105 Q27,107 20,104Z" fill="${teeD}"/></g>
      <g class="hs-arm hs-arm-r">
        <rect x="70.5" y="100" width="8" height="34" rx="4" fill="${skin}"/>
        <path d="M79,133 q1,6 -3,8 q-3,1 -5,-1 l-1,-6 q1,-4 5,-4 q3,0 4,3Z" fill="${skin}"/>
        <path d="M76,88 Q70,84 66,88 L67,104 Q73,106 80,103 Z" fill="${tee}"/>
        <path d="M80,101 Q73,104 67,102 L67,105 Q73,107 80,104Z" fill="${teeD}"/></g>
      <path d="M31,92 Q32,86 42,85 L58,85 Q68,86 69,92 L68,128 Q50,131 32,128Z" fill="url(#hsDavT)"/>
      <path d="M58,92 Q63,100 62,124 L68,124 L68,96Z" fill="${teeD}" opacity=".45"/>
      <rect x="44.5" y="78" width="11" height="10" rx="3" fill="${skinD}"/>
      <path d="M42,85.5 Q50,91 58,85.5" stroke="${teeD}" stroke-width="2.4" fill="none"/>
      </g>
      <g transform="translate(50 70) scale(.7) translate(-50 -87)"><g class="hs-head">
        <circle cx="22.5" cy="50" r="6" fill="${skin}"/><circle cx="77.5" cy="50" r="6" fill="${skin}"/>
        <circle cx="22.5" cy="50" r="3" fill="${skinD}"/><circle cx="77.5" cy="50" r="3" fill="${skinD}"/>
        <path d="M23,46 Q23,20 50,20 Q77,20 77,46 Q77,70 64,79 Q50,87 36,79 Q23,70 23,46Z" fill="url(#hsDavS)"/>
        <path d="M26,56 Q27,74 38,80 Q50,87 62,80 Q73,74 74,56 Q70,70 61,73 Q50,69 39,73 Q30,70 26,56Z" fill="#a9785a" opacity=".42"/>
        <path d="M42,62 Q50,59 58,62" stroke="#a9785a" stroke-width="2" fill="none" opacity=".5" stroke-linecap="round"/>
        <ellipse cx="31" cy="60" rx="5" ry="3" fill="#ff8f80" opacity=".4"/><ellipse cx="69" cy="60" rx="5" ry="3" fill="#ff8f80" opacity=".4"/>
        <g class="hs-eyes">
          <ellipse cx="39" cy="46" rx="7" ry="7.5" fill="#fff"/><ellipse cx="61" cy="46" rx="7" ry="7.5" fill="#fff"/>
          <circle cx="39.5" cy="47" r="5" fill="#8a5222"/><circle cx="60.5" cy="47" r="5" fill="#8a5222"/>
          <circle cx="39.5" cy="47.5" r="2.6" fill="#24150e"/><circle cx="60.5" cy="47.5" r="2.6" fill="#24150e"/>
          <circle cx="41.2" cy="45" r="1.6" fill="#fff"/><circle cx="62.2" cy="45" r="1.6" fill="#fff"/>
        </g>
        <path d="M30,36 Q38,30 46,35" stroke="${hair}" stroke-width="3.8" fill="none" stroke-linecap="round"/>
        <path d="M54,35 Q62,30 70,36" stroke="${hair}" stroke-width="3.8" fill="none" stroke-linecap="round"/>
        <ellipse cx="50" cy="56" rx="3.2" ry="2.4" fill="${skinD}"/>
        <path d="M39,63.5 Q50,76 61,63.5 Q50,66.5 39,63.5Z" fill="#7a2630"/>
        <path d="M40.5,64 Q50,67 59.5,64 L58.8,66.2 Q50,69 41.2,66.2Z" fill="#fff"/>
        <ellipse cx="50" cy="70.6" rx="4.4" ry="2" fill="#ff6b6b"/>
        <path d="M22,46 Q19,14 50,12 Q81,14 78,46 Q74,30 50,28 Q28,29 22,46Z" fill="${hair}"/>
        ${curls}${swirls}
      </g></g>
    </svg>`;
  }

  // ---------- ЦИЛЯ (по образцу из Шедеврума, 11.11; цвета спокойнее, чем на картинке) ----------
  function tzilaSVG() {
    const skin = "#f0c19c", skinD = "#e0a882", hair = "#7a4a2e", hairL = "#93603f", hairD = "#633a22";
    const tee = "#ef9a62", teeD = "#dc8550", jeans = "#c7d3d0", cuff = "#b2c0bd", shoeC = "#6aa0c4";
    const shoe = (x) => `<path d="M${x - 8},190 Q${x - 8},182 ${x - 1},181 L${x + 5},181 Q${x + 10},183 ${x + 11},190Z" fill="${shoeC}"/>
      <rect x="${x - 9}" y="189" width="21" height="4" rx="2" fill="#eef2f6"/>
      <path d="M${x - 2},183.4 l4.4,0 M${x - 2},185.8 l4.4,0" stroke="#fff" stroke-width="1"/>`;
    const freckles = [[43.5,51],[45.5,52.6],[42,53],[56.5,51],[54.5,52.6],[58,53],[47.5,50.2],[52.5,50.2]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".55" fill="#cf9473" opacity=".75"/>`).join("");
    const eye = (x) => `<ellipse cx="${x}" cy="44" rx="4.4" ry="4.8" fill="#fff"/>
      <circle cx="${x + .3}" cy="44.6" r="3" fill="#7c9c5c"/><circle cx="${x + .3}" cy="44.8" r="1.6" fill="#22301a"/>
      <circle cx="${x + 1.3}" cy="43.4" r=".95" fill="#fff"/>`;
    return `<svg viewBox="0 0 100 200" class="hs-person hs-david hs-tzila" overflow="visible">
      <defs>
        <radialGradient id="hsTzS" cx="42%" cy="36%" r="72%"><stop offset="0" stop-color="#f8d3b4"/><stop offset=".55" stop-color="#f0c19c"/><stop offset="1" stop-color="#d9a681"/></radialGradient>
        <linearGradient id="hsTzH" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#9a6a48"/><stop offset=".5" stop-color="#7a4a2e"/><stop offset="1" stop-color="#5e3620"/></linearGradient>
        <linearGradient id="hsTzT" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#f6b483"/><stop offset=".6" stop-color="#ef9a62"/><stop offset="1" stop-color="#d9844f"/></linearGradient>
      </defs>
      <path fill="url(#hsTzH)" d="M25,40 Q23,11 50,10 Q77,11 75,40 L77,62 Q81,74 77,86 Q81,98 76,108 Q70,116 62,112 L38,112 Q30,116 24,108 Q19,98 23,86 Q19,74 23,62Z"/>
      <path d="M24,88 Q21,98 26,106 M76,88 Q79,98 74,106" stroke="${hairD}" stroke-width="1.2" fill="none" opacity=".55"/>
      <g class="hs-leg hs-leg-l"><rect x="41" y="122" width="8.5" height="54" rx="3" fill="${jeans}"/>
        <rect x="40.5" y="171" width="9.5" height="6" rx="2" fill="${cuff}"/><rect x="42" y="176" width="6.5" height="5" fill="${skin}"/>${shoe(44)}</g>
      <g class="hs-leg hs-leg-r"><rect x="50.5" y="122" width="8.5" height="54" rx="3" fill="${jeans}"/>
        <rect x="50" y="171" width="9.5" height="6" rx="2" fill="${cuff}"/><rect x="51.5" y="176" width="6.5" height="5" fill="${skin}"/>${shoe(55)}</g>
      <path d="M39.5,120 L60.5,120 L61,131 L39,131Z" fill="${jeans}"/>
      <path d="M50,121 L50,130" stroke="${cuff}" stroke-width=".8"/>
      <g class="hs-arm hs-arm-l"><rect x="28.6" y="80" width="6.8" height="42" rx="3.4" fill="${skin}"/>
        <ellipse cx="32" cy="123.5" rx="3.8" ry="4.4" fill="${skin}"/>
        <rect x="27.2" y="75" width="9.6" height="18" rx="4.6" fill="${tee}"/><rect x="27.2" y="90" width="9.6" height="3" rx="1.5" fill="${teeD}"/></g>
      <g class="hs-arm hs-arm-r"><rect x="64.6" y="80" width="6.8" height="42" rx="3.4" fill="${skin}"/>
        <ellipse cx="68" cy="123.5" rx="3.8" ry="4.4" fill="${skin}"/>
        <rect x="63.2" y="75" width="9.6" height="18" rx="4.6" fill="${tee}"/><rect x="63.2" y="90" width="9.6" height="3" rx="1.5" fill="${teeD}"/></g>
      <rect x="46" y="63" width="8" height="13" rx="2.5" fill="${skinD}"/>
      <path d="M35,82 Q36,76 43,75 L57,75 Q64,76 65,82 L64,123 Q50,126 36,123Z" fill="url(#hsTzT)"/>
      <path d="M57,80 Q61,92 60,121 L64,121 L64.6,84Z" fill="${teeD}" opacity=".45"/>
      <path d="M44,75.6 Q50,80 56,75.6" stroke="${teeD}" stroke-width="1.6" fill="none"/>
      <g transform="translate(0 -1)"><g class="hs-head">
        <circle cx="28" cy="45" r="3.8" fill="${skin}"/><circle cx="72" cy="45" r="3.8" fill="${skin}"/>
        <circle cx="72.4" cy="50.4" r="1.1" fill="#e8a25c"/>
        <path d="M28.5,43 Q28.5,20 50,20 Q71.5,20 71.5,43 Q71.5,59 62,65.5 Q50,71 38,65.5 Q28.5,59 28.5,43Z" fill="url(#hsTzS)"/>
        <ellipse cx="36" cy="53" rx="3.8" ry="2.2" fill="#ff9c8a" opacity=".35"/><ellipse cx="64" cy="53" rx="3.8" ry="2.2" fill="#ff9c8a" opacity=".35"/>
        ${freckles}
        <g class="hs-eyes">${eye(41.5)}${eye(58.5)}</g>
        <path d="M37,40.6 l-2.2,-1.2 M37.6,39.4 l-1.2,-1.9 M63,40.6 l2.2,-1.2 M62.4,39.4 l1.2,-1.9" stroke="#3a2418" stroke-width=".9" stroke-linecap="round"/>
        <path d="M37.4,37 Q41.5,34.4 45.6,36.4" stroke="${hairD}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        <path d="M54.4,36.4 Q58.5,34.4 62.6,37" stroke="${hairD}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        <ellipse cx="50" cy="50.4" rx="1.7" ry="1.2" fill="${skinD}"/>
        <path d="M44.4,56 Q50,62.8 55.6,56 Q50,57.6 44.4,56Z" fill="#8a3438"/>
        <path d="M45.4,56.3 Q50,57.9 54.6,56.3 L54.1,57.5 Q50,59 45.9,57.5Z" fill="#fff"/>
        <path d="M27,47 Q23,15 51,16 Q77,17 73,46 Q70,32 62,27 Q55,33 44,31 Q34,31 27,47Z" fill="url(#hsTzH)"/>
        <path d="M33,30 Q44,22 58,22 M38,27 Q48,21 62,24" stroke="${hairL}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>
        <rect x="63" y="25" width="6.6" height="6.6" rx="1.6" fill="#e8874a" transform="rotate(14 66.3 28.3)"/>
        <path d="M65,27.4 q1.4,-1 2.6,.3 q.8,1.2 -.6,2" stroke="#c96f39" stroke-width=".7" fill="none"/>
      </g></g>
    </svg>`;
  }

  function personSVG(o) {
    if (o.custom === "tzila") return tzilaSVG();
    if (o.custom === "david") return davidSVG();
    if (o.custom === "avatar" && window.HirbisAvatar) return HirbisAvatar.svg(o.cfg, { pose: "stand" });
    const legC = o.legs || o.bottom;
    const backHair = o.hair === "long"
      ? `<path d="M24,46 Q22,13 50,13 Q78,13 76,46 L79,98 Q64,106 50,99 Q36,106 21,98Z" fill="${o.hairC}"/>` : "";
    const lower = o.skirt
      ? `<path d="M31,110 L69,110 L78,146 Q50,152 22,146Z" fill="${o.bottom}"/>`
      : `<rect x="31" y="108" width="38" height="26" rx="8" fill="${o.bottom}"/>`;
    let hair = "";
    if (o.hair === "curly") {
      hair = `<path d="M26,46 Q22,18 50,18 Q78,18 74,46 Q70,30 50,31 Q32,31 26,46Z" fill="${o.hairC}"/>
        <circle cx="32" cy="27" r="8" fill="${o.hairC}"/><circle cx="43" cy="20" r="9" fill="${o.hairC}"/>
        <circle cx="56" cy="19" r="9" fill="${o.hairC}"/><circle cx="67" cy="26" r="8" fill="${o.hairC}"/>`;
    } else if (o.hair === "long") {
      hair = `<path d="M27,46 Q28,20 50,20 Q72,20 73,46 Q64,30 46,31 Q34,33 27,46Z" fill="${o.hairC}"/>
        <circle cx="66" cy="27" r="4" fill="${C.orange}"/>`;
    } else {
      hair = `<path d="M26,44 Q24,19 50,19 Q76,19 74,44 Q66,30 50,30 Q34,30 26,44Z" fill="${o.hairC}"/>`;
    }
    let hat = "";
    if (o.hat === "chef") hat = `<path d="M30,34 Q18,16 34,12 Q38,0 52,4 Q66,-2 70,12 Q84,16 70,34Z" fill="#fff"/><rect x="29" y="28" width="42" height="9" rx="3" fill="#eef4fa"/>`;
    if (o.hat === "cap") hat = `<path d="M27,36 Q28,16 50,16 Q72,16 73,36Z" fill="${C.blueD}"/><rect x="60" y="32" width="24" height="5" rx="2.5" fill="${C.blueD}"/>`;
    const beard = o.beard ? `<path d="M32,52 Q34,72 50,72 Q66,72 68,52 Q60,62 50,62 Q40,62 32,52Z" fill="${o.hairC}"/>` : "";
    return `<svg viewBox="0 0 100 200" class="hs-person" overflow="visible">
      ${backHair}
      <g class="hs-leg hs-leg-l"><rect x="36" y="124" width="12" height="58" rx="6" fill="${legC}"/><ellipse cx="41" cy="184" rx="10" ry="6" fill="${o.shoes}"/></g>
      <g class="hs-leg hs-leg-r"><rect x="52" y="124" width="12" height="58" rx="6" fill="${legC}"/><ellipse cx="59" cy="184" rx="10" ry="6" fill="${o.shoes}"/></g>
      ${lower}
      <rect x="30" y="72" width="40" height="52" rx="14" fill="${o.top}"/>
      <g class="hs-arm hs-arm-l"><rect x="20" y="76" width="11" height="50" rx="5.5" fill="${o.top}"/><circle cx="25.5" cy="128" r="6" fill="${o.skin}"/></g>
      <g class="hs-arm hs-arm-r"><rect x="69" y="76" width="11" height="50" rx="5.5" fill="${o.top}"/><circle cx="74.5" cy="128" r="6" fill="${o.skin}"/></g>
      <rect x="45" y="62" width="10" height="14" rx="3" fill="${o.skin}"/>
      <circle cx="27.5" cy="48" r="4.5" fill="${o.skin}"/><circle cx="72.5" cy="48" r="4.5" fill="${o.skin}"/>
      <circle cx="50" cy="45" r="23" fill="${o.skin}"/>
      ${beard}
      <circle cx="42" cy="45" r="3" fill="${C.ink}"/><circle cx="58" cy="45" r="3" fill="${C.ink}"/>
      <circle cx="43" cy="44" r="1" fill="#fff"/><circle cx="59" cy="44" r="1" fill="#fff"/>
      <ellipse cx="36" cy="53" rx="4" ry="2.5" fill="#ff9f8a" opacity=".55"/><ellipse cx="64" cy="53" rx="4" ry="2.5" fill="#ff9f8a" opacity=".55"/>
      <path d="M44,55 Q50,60 56,55" stroke="${C.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>
      ${hair}${hat}
    </svg>`;
  }

  // Чемодан на колёсиках 50×74
  function suitcaseSVG() {
    return `<svg viewBox="0 0 50 74" overflow="visible">
      <rect x="21" y="0" width="3" height="22" fill="#9fb0c2"/><rect x="29" y="0" width="3" height="22" fill="#9fb0c2"/>
      <rect x="18" y="0" width="17" height="5" rx="2.5" fill="#7d8ea2"/>
      <g filter="url(#hsPaper)"><rect x="4" y="18" width="44" height="46" rx="8" fill="${C.orange}"/></g>
      <rect x="14" y="20" width="5" height="42" fill="#fff" opacity=".45"/><rect x="33" y="20" width="5" height="42" fill="#fff" opacity=".45"/>
      <circle cx="26" cy="34" r="5" fill="${C.blue}"/>
      <g class="hs-wheel"><circle cx="13" cy="68" r="5" fill="${C.ink}"/><circle cx="13" cy="68" r="1.6" fill="#ccc"/></g>
      <g class="hs-wheel"><circle cx="39" cy="68" r="5" fill="${C.ink}"/><circle cx="39" cy="68" r="1.6" fill="#ccc"/></g>
    </svg>`;
  }

  // Самолёт 200×80, смотрит вправо
  function planeSVG() {
    let win = "";
    for (let x = 58; x <= 156; x += 10) win += `<circle cx="${x}" cy="37" r="2.4" fill="${C.blue}"/>`;
    return `<svg viewBox="0 0 200 80" overflow="visible">
      <path d="M98,30 L134,30 L114,16 L104,16Z" fill="#c4d5e6"/>
      <path d="M30,30 L12,4 Q10,1 14,1 L30,1 Q34,1 37,5 L58,30Z" fill="${C.orange}"/>
      <g filter="url(#hsPaper)"><path d="M18,40 Q16,28 34,28 L168,28 Q192,30 198,42 Q192,54 168,54 L40,54 Q22,52 18,40Z" fill="#fff"/></g>
      <path d="M170,31 Q186,33 192,39 L181,39 Q177,34 170,34Z" fill="${C.blueD}"/>
      <rect x="30" y="46" width="150" height="3" rx="1.5" fill="${C.blue}"/>
      ${win}
      <path d="M22,37 L6,35 Q2,35 4,39 L24,43Z" fill="#ffb27a"/>
      <g class="hs-gear"><rect x="62" y="52" width="3" height="12" fill="#8a97a6"/><circle cx="63.5" cy="67" r="4" fill="#2a2d3d"/>
        <rect x="150" y="52" width="3" height="12" fill="#8a97a6"/><circle cx="151.5" cy="67" r="4" fill="#2a2d3d"/></g>
      <g filter="url(#hsPaper)"><path d="M84,47 L126,47 L108,64 L96,64Z" fill="#dbe7f3"/></g>
      <ellipse cx="104" cy="60" rx="12" ry="5" fill="#c9d8e8"/><ellipse cx="115" cy="60" rx="2" ry="4.5" fill="${C.orange}"/>
    </svg>`;
  }

  function cloud(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})" filter="url(#hsPaper)"><path d="M0,30 Q0,14 16,14 Q20,0 38,2 Q52,-6 62,10 Q80,8 80,24 Q86,32 76,36 L6,36 Q0,36 0,30Z" fill="#fff"/></g>`;
  }

  // Пальма: основание в (x, base)
  function palm(x, base, s) {
    return `<g transform="translate(${x},${base}) scale(${s})">
      <g filter="url(#hsPaper)"><path d="M-6,0 Q-10,-90 6,-172 L15,-170 Q2,-90 8,0Z" fill="#cf9f6e"/></g>
      <path d="M-5,-40 L7,-40 M-4,-80 L7,-80 M0,-120 L10,-120" stroke="#b8865a" stroke-width="2"/>
      <g transform="translate(10,-172)"><g class="hs-frond">
        <path d="M0,0 Q-44,-34 -86,-4 Q-44,-16 0,8Z" fill="${C.greenD}"/>
        <path d="M0,0 Q44,-34 86,-4 Q44,-16 0,8Z" fill="${C.greenD}"/>
        <path d="M0,0 Q-30,-50 -64,-50 Q-28,-30 0,6Z" fill="${C.green}"/>
        <path d="M0,0 Q30,-50 64,-50 Q28,-30 0,6Z" fill="${C.green}"/>
        <path d="M0,2 Q-40,6 -66,40 Q-30,16 0,8Z" fill="${C.green}"/>
        <path d="M0,2 Q40,6 66,40 Q30,16 0,8Z" fill="${C.green}"/>
        <circle cx="-5" cy="8" r="5" fill="#a8743f"/><circle cx="5" cy="9" r="5" fill="#a8743f"/>
      </g></g>
    </g>`;
  }

  function sunSVG(cx, cy) {
    let rays = "";
    for (let i = 0; i < 12; i++) rays += `<rect x="-3" y="-62" width="6" height="16" rx="3" fill="#ffd27a" transform="rotate(${i * 30})"/>`;
    return `<g transform="translate(${cx},${cy})"><g class="hs-rays">${rays}</g>
      <circle r="40" fill="#ffe7b8" opacity=".6"/><circle r="30" fill="#ffc46b" filter="url(#hsPaper)"/></g>`;
  }

  // Дом в стиле Тель-Авива (белый «баухаус» с балконами)
  function bldg(x, w, h, col, base) {
    base = base || 560;
    let s = `<g filter="url(#hsPaper)"><rect x="${x}" y="${base - h}" width="${w}" height="${h}" fill="${col}"/></g>`;
    for (let y = base - h + 16; y < base - 24; y += 28) {
      for (let wx = x + 8; wx < x + w - 14; wx += 18) s += `<rect x="${wx}" y="${y}" width="10" height="12" rx="2" fill="#a9d2f3"/>`;
      s += `<rect x="${x - 3}" y="${y + 15}" width="${w + 6}" height="5" rx="2.5" fill="#fff" filter="url(#hsPaper)"/>`;
    }
    return s;
  }

  // ---------- Сцена 1: небо, море, город, полоса ----------
  function bgFlight() {
    let city = "";
    [[150,16,26,"#e9f2fb"],[168,12,40,"#d7e7f6"],[182,20,22,"#fff"],[206,14,66,"#dbe9f6"],[224,16,58,"#cfe2f3"],
     [244,14,74,"#e5eff9"],[262,22,30,"#fff"],[288,12,46,"#d7e7f6"],[302,26,24,"#eef5fd"],[330,14,38,"#dbe9f6"],[346,20,26,"#fff"]]
      .forEach(b => { city += `<rect x="${b[0]}" y="${472 - b[2]}" width="${b[1]}" height="${b[2]}" fill="${b[3]}"/>`; });
    let dashes = "", lights = "";
    for (let x = 6; x < 360; x += 40) dashes += `<rect x="${x}" y="626" width="22" height="3" rx="1.5" fill="#fff"/>`;
    for (let x = 10; x < 360; x += 30) lights += `<circle cx="${x}" cy="611" r="2" fill="${C.orangeL}"/><circle cx="${x}" cy="645" r="2" fill="${C.orangeL}"/>`;
    return `<svg class="hs-bg" viewBox="0 0 360 700" width="360" height="700">
      <defs><linearGradient id="hsSky1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9ddf7"/><stop offset="1" stop-color="#f3faff"/></linearGradient></defs>
      <rect width="360" height="700" fill="url(#hsSky1)"/>
      ${sunSVG(290, 112)}
      <g filter="url(#hsPaper)">${city}</g>
      <rect y="472" width="360" height="125" fill="#8fd0f0"/>
      <path d="M20,505 q10,-5 20,0 t20,0 M140,530 q10,-5 20,0 t20,0 M250,500 q10,-5 20,0 t20,0 M60,560 q10,-5 20,0 t20,0 M290,560 q10,-5 20,0 t20,0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M0,590 Q90,576 180,584 T360,580 L360,606 L0,606Z" fill="${C.sand}" filter="url(#hsPaper)"/>
      <rect y="603" width="360" height="97" fill="#d9edd2"/>
      <rect y="612" width="360" height="32" fill="#b7c3cf" filter="url(#hsPaper)"/>
      ${dashes}${lights}
      ${palm(26, 604, .38)}${palm(338, 602, .32)}
    </svg>`;
  }

  // ---------- Сцена 2: зал прилёта ----------
  function bgHall() {
    let floor = "";
    [612, 640, 676].forEach(y => floor += `<line x1="0" y1="${y}" x2="360" y2="${y}" stroke="#d3e1ee" stroke-width="2"/>`);
    [-60, 40, 140, 240, 340, 440].forEach(x => floor += `<line x1="${x + 40}" y1="588" x2="${x}" y2="700" stroke="#d3e1ee" stroke-width="2"/>`);
    let lamps = "";
    [60, 180, 300].forEach(x => lamps += `<ellipse cx="${x}" cy="40" rx="30" ry="6" fill="#fff"/><ellipse cx="${x}" cy="40" rx="30" ry="6" fill="#fff6dc" opacity=".8"/>`);
    return `<svg class="hs-bg" viewBox="0 0 360 700" width="360" height="700">
      <defs>
        <linearGradient id="hsGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0f8"/><stop offset="1" stop-color="#eef7ff"/></linearGradient>
        <clipPath id="hsWin"><rect x="8" y="68" width="344" height="214"/></clipPath>
      </defs>
      <rect width="360" height="700" fill="#f4f9fe"/>
      <rect width="360" height="58" fill="#eaf3fc"/>${lamps}
      <rect x="0" y="60" width="360" height="230" fill="#dcebf8"/>
      <rect x="8" y="68" width="344" height="214" fill="url(#hsGlass)"/>
      <g clip-path="url(#hsWin)" opacity=".9">
        ${palm(60, 290, .55)}${palm(300, 290, .45)}
        <path d="M200,282 L214,214 L236,214 L232,282Z" fill="${C.orange}" opacity=".85"/>
        <rect x="8" y="262" width="344" height="20" fill="#cfe2f3"/>
      </g>
      <rect x="92" y="68" width="6" height="214" fill="#dcebf8"/><rect x="178" y="68" width="6" height="214" fill="#dcebf8"/><rect x="264" y="68" width="6" height="214" fill="#dcebf8"/>
      <line x1="94" y1="290" x2="94" y2="320" stroke="#b5c7d8" stroke-width="3"/><line x1="266" y1="290" x2="266" y2="320" stroke="#b5c7d8" stroke-width="3"/>
      <g filter="url(#hsPaper)"><rect x="34" y="316" width="292" height="74" rx="14" fill="${C.blue}"/></g>
      <text x="180" y="348" text-anchor="middle" font-size="26" font-weight="700" fill="#fff" font-family="Arial, 'DejaVu Sans', sans-serif">ברוכים הבאים</text>
      <text x="180" y="376" text-anchor="middle" font-size="18" font-weight="600" fill="#fff" font-family="-apple-system, 'Segoe UI', Roboto, sans-serif">Добро пожаловать</text>
      <rect y="560" width="360" height="8" fill="#d4e7f8"/>
      <rect x="12" y="408" width="132" height="180" rx="6" fill="#c9dbec" filter="url(#hsPaper)"/>
      <rect x="18" y="414" width="120" height="174" fill="#9fbcd6"/>
      <g class="hs-door hs-door-l"><rect x="18" y="414" width="60" height="174" fill="#e4f2fd" opacity=".95"/><rect x="72" y="480" width="3" height="34" rx="1.5" fill="#9fb7cc"/></g>
      <g class="hs-door hs-door-r"><rect x="78" y="414" width="60" height="174" fill="#e4f2fd" opacity=".95"/><rect x="81" y="480" width="3" height="34" rx="1.5" fill="#9fb7cc"/></g>
      <rect y="588" width="360" height="112" fill="#e2ecf6"/>${floor}
      <g filter="url(#hsPaper)">
        <ellipse cx="300" cy="528" rx="9" ry="26" fill="${C.greenD}" transform="rotate(-25 300 548)"/>
        <ellipse cx="320" cy="526" rx="9" ry="28" fill="${C.green}" transform="rotate(20 320 548)"/>
        <ellipse cx="310" cy="520" rx="9" ry="30" fill="${C.green}"/>
        <path d="M290,548 L330,548 L324,588 L296,588Z" fill="${C.orangeL}"/>
      </g>
    </svg>`;
  }

  // ---------- Сцена 3: улица (небо неподвижно, остальное — слои) ----------
  function bgStreetSky() {
    return `<svg class="hs-bg" viewBox="0 0 360 700" width="360" height="700">
      <defs><linearGradient id="hsSky3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9ddf7"/><stop offset="1" stop-color="#f3faff"/></linearGradient></defs>
      <rect width="360" height="700" fill="url(#hsSky3)"/>
      ${sunSVG(74, 104)}
      ${cloud(190, 70, .8)}${cloud(280, 150, .55)}
    </svg>`;
  }
  // Дальний слой, плитка 720: сначала город, потом пляж и море
  function farTile() {
    let s = "";
    s += bldg(40, 22, 270, "#dbe9f6") + bldg(214, 26, 300, "#dbe9f6");
    s += bldg(0, 70, 190, "#ffffff") + bldg(74, 60, 150, "#fbf1e4") + bldg(138, 80, 232, "#ffffff")
       + bldg(222, 62, 170, "#eaf3fc") + bldg(288, 72, 204, "#ffffff");
    // море
    s += `<rect x="360" y="470" width="360" height="72" fill="#8fd0f0"/>
      <path d="M380,495 q10,-5 20,0 t20,0 M470,515 q10,-5 20,0 t20,0 M600,492 q10,-5 20,0 t20,0 M660,520 q10,-5 20,0 t20,0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".75"/>
      <g transform="translate(520,448)" filter="url(#hsPaper)"><path d="M0,26 L44,26 L38,36 L6,36Z" fill="#fff"/><path d="M22,24 L22,-12 L44,22Z" fill="#fff"/><path d="M20,24 L20,-4 L4,22Z" fill="${C.orangeL}"/></g>
      <path d="M360,536 Q450,526 540,532 T720,530 L720,560 L360,560Z" fill="${C.sand}" filter="url(#hsPaper)"/>
      <g filter="url(#hsPaper)">
        <path d="M410,534 L410,500" stroke="#9fb0c2" stroke-width="3"/><path d="M386,504 Q410,484 434,504Z" fill="${C.orangeL}"/>
        <path d="M590,532 L590,498" stroke="#9fb0c2" stroke-width="3"/><path d="M566,502 Q590,482 614,502Z" fill="#fff"/>
        <path d="M640,556 L644,520 M676,556 L672,520" stroke="#c9b08c" stroke-width="4"/>
        <rect x="634" y="496" width="48" height="26" rx="3" fill="#fff"/><path d="M628,498 L658,482 L688,498Z" fill="${C.blue}"/>
      </g>`;
    return `<svg viewBox="0 0 720 700" width="720" height="700">${s}</svg>`;
  }
  function midTile() {
    return `<svg viewBox="0 0 360 700" width="360" height="700" overflow="visible">
      ${palm(70, 580, .62)}
      <g filter="url(#hsPaper)"><rect x="252" y="440" width="5" height="140" fill="#9fb0c2"/><path d="M254,442 Q254,428 272,428 L278,428" stroke="#9fb0c2" stroke-width="5" fill="none"/><rect x="270" y="426" width="18" height="8" rx="4" fill="#fff"/></g>
      ${palm(210, 582, .5)}
    </svg>`;
  }
  function bgStreetGround() {
    return `<svg class="hs-bg" viewBox="0 0 360 700" width="360" height="700">
      <rect y="556" width="360" height="42" fill="#efe4d2"/>
      <path d="M0,572 L360,572" stroke="#e4d6bf" stroke-width="2"/>
      <rect y="596" width="360" height="7" fill="#dccfb9"/>
      <rect y="603" width="360" height="97" fill="#b4c1ce"/>
    </svg>`;
  }
  function dashTile() {
    return `<svg viewBox="0 0 120 700" width="120" height="700"><rect x="0" y="650" width="54" height="5" rx="2.5" fill="#fff"/></svg>`;
  }

  // ---------- Такси 220×110 (три слоя: салон, пассажиры, кузов с окнами-дырками) ----------
  const TAXI_BODY = "M10,72 Q10,56 28,53 L62,50 L82,25 Q86,20 94,20 L150,20 Q158,20 163,25 L188,50 L202,53 Q214,56 214,72 L214,84 Q214,90 208,90 L16,90 Q10,90 10,84Z";
  const TAXI_WIN = "M93,30 L128,30 L128,49 L76,49Z M134,30 L152,30 Q156,30 159,33 L175,49 L134,49Z";
  function taxiBackSVG() {
    return `<svg viewBox="0 0 220 110"><rect x="70" y="24" width="112" height="28" fill="#cfe3f4"/></svg>`;
  }
  function taxiFrontSVG() {
    const wheel = (cx) => `<circle cx="${cx}" cy="88" r="18" fill="#dfe8f1"/>
      <g class="hs-wheel"><circle cx="${cx}" cy="88" r="15" fill="#2a2d3d"/><circle cx="${cx}" cy="88" r="7" fill="#dfe7ef"/>
      <path d="M${cx - 6},88 L${cx + 6},88 M${cx},82 L${cx},94" stroke="#8fa1b4" stroke-width="2.4"/></g>`;
    return `<svg viewBox="0 0 220 110" overflow="visible">
      <g filter="url(#hsPaper)">
        <rect x="100" y="6" width="48" height="16" rx="4" fill="${C.orangeL}"/>
        <path d="${TAXI_BODY} ${TAXI_WIN}" fill="#fff" fill-rule="evenodd"/>
      </g>
      <text x="124" y="18" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Arial, 'DejaVu Sans', sans-serif">מונית</text>
      <path d="${TAXI_WIN}" fill="#bfe0f8" opacity=".28"/>
      <path d="M95,29 L100,29 L84,46 L79,46Z" fill="#fff" opacity=".6"/>
      <rect x="12" y="62" width="200" height="6" fill="${C.orange}"/>
      <path d="M131,50 L131,86 M71,50 L67,86" stroke="#dfe7ef" stroke-width="2"/>
      <rect x="112" y="56" width="10" height="3" rx="1.5" fill="#b5c4d3"/><rect x="164" y="56" width="10" height="3" rx="1.5" fill="#b5c4d3"/>
      <ellipse cx="210" cy="60" rx="4" ry="5" fill="#ffd86b"/><rect x="10" y="57" width="4" height="9" rx="2" fill="#ff6b5a"/>
      <rect x="4" y="78" width="16" height="7" rx="3.5" fill="#dfe7ef"/><rect x="202" y="78" width="16" height="7" rx="3.5" fill="#dfe7ef"/>
      ${wheel(56)}${wheel(172)}
    </svg>`;
  }

  // ---------- Шаурмичная 230×190 ----------
  function shopSVG() {
    let awning = "";
    const sw = 222 / 9;
    for (let i = 0; i < 9; i++) {
      const x = 4 + i * sw, c = i % 2 ? "#fff" : C.orange;
      awning += `<rect x="${x}" y="38" width="${sw + .5}" height="18" fill="${c}"/><path d="M${x},55 a${sw / 2},${sw / 2} 0 0 0 ${sw},0Z" fill="${c}"/>`;
    }
    let bands = "";
    for (let x = 130; x < 190; x += 9) bands += `<rect x="${x}" y="80" width="4" height="64" fill="#e39a5c"/>`;
    const seller = personSVG(LOOK.seller).replace('<svg viewBox="0 0 100 200"', '<svg x="58" y="72" width="48" height="96" viewBox="0 0 100 200"');
    return `<svg viewBox="0 0 230 190" overflow="visible">
      <defs><clipPath id="hsCone"><path d="M146,86 L176,86 L170,140 L152,140Z"/></clipPath></defs>
      <g filter="url(#hsPaper)"><rect x="10" y="40" width="210" height="150" fill="#fff7ea"/></g>
      <rect x="4" y="40" width="10" height="150" fill="#f1e5d1"/><rect x="216" y="40" width="10" height="150" fill="#f1e5d1"/>
      <rect x="26" y="74" width="178" height="80" rx="4" fill="#ffe4c4"/>
      <path d="M26,96 L204,96 M26,118 L204,118" stroke="#fbd6ad" stroke-width="2"/>
      <rect x="36" y="82" width="10" height="14" rx="3" fill="${C.green}"/><rect x="50" y="84" width="10" height="12" rx="3" fill="#ff6b5a"/>
      <rect x="180" y="80" width="10" height="64" rx="3" fill="${C.orange}" class="hs-glow"/>
      <line x1="161" y1="76" x2="161" y2="150" stroke="#8a97a6" stroke-width="3"/>
      <path d="M146,86 L176,86 L170,140 L152,140Z" fill="#c8763c"/>
      <g clip-path="url(#hsCone)"><g class="hs-spit">${bands}</g></g>
      <path d="M146,100 L175,100 M147,114 L173,114 M149,128 L171,128" stroke="#a85c28" stroke-width="2" opacity=".6"/>
      <g class="hs-steam" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9">
        <path d="M156,74 q-5,-8 0,-16 t0,-16"/><path d="M168,72 q5,-8 0,-16 t0,-16"/></g>
      ${seller}
      <rect x="14" y="142" width="202" height="9" rx="3" fill="#dbe9f6"/>
      <rect x="18" y="150" width="194" height="40" fill="#fff"/>
      <rect x="18" y="168" width="194" height="6" fill="${C.blue}"/>
      <path d="M30,142 a10,7 0 0 1 20,0Z" fill="${C.green}"/><path d="M56,142 a10,7 0 0 1 20,0Z" fill="#ff6b5a"/>
      <path d="M82,142 a10,7 0 0 1 20,0Z" fill="#ffd86b"/><path d="M108,142 a10,7 0 0 1 20,0Z" fill="${C.sand}"/>
      ${awning}
      <g filter="url(#hsPaper)"><rect x="40" y="0" width="150" height="36" rx="9" fill="${C.blue}"/></g>
      <text x="115" y="25" text-anchor="middle" font-size="21" font-weight="700" fill="#fff" font-family="Arial, 'DejaVu Sans', sans-serif">שווארמה</text>
    </svg>`;
  }

  function heartSVG() {
    return `<svg viewBox="0 0 24 22"><path d="M12,21 C-6,9 4,-4 12,5 C20,-4 30,9 12,21Z" fill="${C.orange}"/></svg>`;
  }

  // Общий «бумажный» эффект: мягкая тень под каждым кусочком
  const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
    <filter id="hsPaper" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.1" flood-color="#2a4a6a" flood-opacity=".22"/></filter>
  </defs></svg>`;

  // =====================================================
  // ГЛАВНАЯ ФУНКЦИЯ
  // =====================================================
  function playArrivalScene(container, opts, onDone) {
    opts = opts || {};
    const female = opts.gender === "f";
    // part: "arrival" — только прилёт и посадка в такси (перед уроками уровня);
    //       "shop"    — только подъезд к шаурмичной и карточка квеста (перед квестом);
    //       иначе     — всё кино целиком.
    const part = opts.part || "all";
    const G = female ? "f" : "m";
    const profile = opts.profile || {};
    const friendName = female ? "Циля" : "Давид";
    const friendLook = female ? LOOK.tzila : LOOK.david;
    const playerLook = female ? LOOK.playerF : LOOK.playerM;

    let done = false, scale = 1;
    const timers = [], anims = [];

    // --- Корень, кадр, кнопка «Пропустить» ---
    const root = el("div", "hs-root");
    const fitsInside = container && container !== document.body && container.clientHeight >= 300 &&
      getComputedStyle(container).position !== "static";
    if (fitsInside) root.classList.add("hs-inside");
    root.innerHTML = DEFS;
    const frame = el("div", "hs-frame", root);
    const skip = el("button", "hs-skip", root);
    skip.type = "button";
    skip.textContent = "Пропустить ›";
    skip.onclick = finish;
    (container || document.body).appendChild(root);

    function fit() {
      const r = root.getBoundingClientRect();
      const sx = r.width / W, sy = r.height / H;
      const cover = Math.max(sx, sy), contain = Math.min(sx, sy);
      scale = cover / contain <= 1.3 ? cover : contain;   // почти всегда заполняем экран целиком
      frame.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
    fit();
    window.addEventListener("resize", fit);

    // --- Помощники ---
    function el(tag, cls, parent) {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (parent) parent.appendChild(e);
      return e;
    }
    function at(t, fn) { timers.push(setTimeout(() => { if (!done) fn(); }, t * 1000)); }
    function anim(e, kf, o) {
      const a = e.animate(kf, Object.assign({ fill: "forwards" }, o));
      anims.push(a);
      return a;
    }
    // Поставить элемент: x, y — левый верхний угол в кадре 360×700
    function put(parent, html, x, y, w, h, cls) {
      const e = el("div", "hs-abs " + (cls || ""), parent);
      e.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      e.innerHTML = html;
      e._dx = 0; e._dy = 0;
      return e;
    }
    function move(e, dx, dy, dur, easing) {
      const from = `translate(${e._dx}px, ${e._dy}px)`;
      e._dx = dx; e._dy = dy;
      return anim(e, [{ transform: from }, { transform: `translate(${dx}px, ${dy}px)` }],
        { duration: dur * 1000, easing: easing || "ease-in-out" });
    }
    function fade(e, to, dur) {
      return anim(e, [{ opacity: getComputedStyle(e).opacity }, { opacity: to }], { duration: dur * 1000 });
    }
    // Реплика над героем
    function say(anchor, who, ru, he, dur) {
      const b = el("div", "hs-bubble", anchor);
    anchor.style.zIndex = 12;               // реплика всегда поверх сердечек и декораций
      b.innerHTML = (who ? `<div class="hs-who">${who}</div>` : "") +
        (he ? `<div class="hs-he" dir="rtl">${he}</div>` : "") + (ru ? `<div>${ru}</div>` : "");
      // не даём пузырю вылезти за край кадра
      const fr = frame.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      const ax = (ar.left - fr.left) / scale, aw = ar.width / scale, bw = b.offsetWidth;
      const center = ax + aw / 2;
      const left = Math.min(Math.max(center - bw / 2, 10), W - 10 - bw);
      b.style.left = (left - ax) + "px";
      b.style.setProperty("--tx", (center - left) + "px");
      requestAnimationFrame(() => b.classList.add("show"));
      if (dur) at(dur, () => { b.classList.remove("show"); setTimeout(() => b.remove(), 400); });
      return b;
    }
    // Фигура игрока: аватар из avatar.js или временная
    function playerFig(pose) {
      try {
        if (window.HirbisAvatar && typeof HirbisAvatar.svg === "function") {
          const s = HirbisAvatar.svg(profile.avatar, { pose: pose });
          if (s) return `<div class="hs-fig hs-custom">${s}</div>`;
        }
      } catch (e) { /* если аватар сломался — рисуем временного */ }
      return `<div class="hs-fig">${personSVG(playerLook)}</div>`;
    }
    const fig = (look) => `<div class="hs-fig">${personSVG(look)}</div>`;
    const setPose = (actor, cls, on) => actor.firstElementChild.classList.toggle(cls, on);
    function scene() { const s = el("div", "hs-scene", frame); return s; }
    let current = null;
    function show(s) { if (current) current.classList.remove("on"); s.classList.add("on"); current = s; }

    // ================= СЦЕНА 1: ПОСАДКА =================
    const s1 = scene();
    s1.innerHTML = bgFlight();
    const clouds = put(s1, `<svg viewBox="0 0 720 300" width="720" height="300">${cloud(30, 60, 1)}${cloud(230, 150, .7)}${cloud(400, 40, .9)}${cloud(600, 170, .6)}</svg>`, 0, 40, 720, 300);
    const plane = put(s1, planeSVG(), 0, 544, 220, 88, "hs-plane");
    const cap = put(s1, `<div class="hs-caption"><span class="hs-he" dir="rtl">${TEXT.country.he}</span><span>${TEXT.country.ru}</span></div>`, 0, 210, 360, 60);

    // ================= СЦЕНА 2: ЗАЛ ПРИЛЁТА =================
    const s2 = scene();
    s2.innerHTML = bgHall();
    const friend2 = put(s2, fig(friendLook), 250, 480, 80, 160);
    const player2 = put(s2, playerFig("walk"), 38, 480, 80, 160, "hs-player");
    const bag2 = put(player2, suitcaseSVG(), -26, 108, 36, 54, "hs-bag");
    player2.style.opacity = 0;

    // ================= СЦЕНА 3–4: УЛИЦА, ТАКСИ, ШАУРМА =================
    const s3 = scene();
    s3.innerHTML = bgStreetSky();
    const far = put(s3, farTile() + farTile(), 0, 0, 1440, 700, "hs-layer");
    const ground = put(s3, bgStreetGround(), 0, 0, 360, 700);
    const mid = put(s3, midTile() + midTile() + midTile(), 0, 0, 1080, 700, "hs-layer");
    let dashHTML = ""; for (let i = 0; i < 5; i++) dashHTML += dashTile();
    const dashes = put(s3, dashHTML, 0, 0, 600, 700, "hs-layer");
    const shop = put(s3, shopSVG(), 124, 380, 230, 190, "hs-shop");
    shop.style.visibility = "hidden";
    const friend3 = put(s3, fig(friendLook), 262, 466, 65, 130);
    const player3 = put(s3, playerFig("stand"), 186, 466, 65, 130, "hs-player");
    put(player3, suitcaseSVG(), -22, 86, 30, 44, "hs-bag");
    const taxi = put(s3, "", 4, 552, 264, 132, "hs-taxi");
    taxi.innerHTML = `<div class="hs-abs hs-full">${taxiBackSVG()}</div><div class="hs-abs hs-full hs-pass"></div><div class="hs-abs hs-full">${taxiFrontSVG()}</div>`;
    const pass = taxi.querySelector(".hs-pass");
    put(pass, fig(LOOK.driver), 166, 17, 44, 88);
    const pFriend = put(pass, fig(friendLook), 82, 17, 44, 88);
    const pPlayer = put(pass, playerFig("sit"), 116, 17, 44, 88);
    pFriend.style.opacity = 0; pPlayer.style.opacity = 0;
    const talkFriend = put(taxi, "", 96, 20, 30, 20);   // точки, над которыми появляются реплики в такси
    const talkPlayer = put(taxi, "", 128, 20, 30, 20);

    // Бегущие слои (когда такси едет). Скорость меняем плавно через playbackRate.
    const loops = [
      anim(far, [{ transform: "translateX(0)" }, { transform: "translateX(-720px)" }], { duration: 9000, iterations: Infinity, fill: "none" }),
      anim(mid, [{ transform: "translateX(0)" }, { transform: "translateX(-360px)" }], { duration: 1800, iterations: Infinity, fill: "none" }),
      anim(dashes, [{ transform: "translateX(0)" }, { transform: "translateX(-120px)" }], { duration: 420, iterations: Infinity, fill: "none" })
    ];
    loops.forEach(a => { a.playbackRate = 0; });
    function speed(to, dur) {             // плавно разогнать / затормозить фон
      const from = loops[0].playbackRate, t0 = performance.now();
      (function step(now) {
        if (done) return;
        const k = Math.min(1, (now - t0) / (dur * 1000));
        const e = to > from ? k * k : 1 - (1 - k) * (1 - k);
        loops.forEach(a => { a.playbackRate = from + (to - from) * e; });
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }

    // ================= ПОСЛЕДНИЙ КАДР =================
    const finalCard = put(frame, `<div class="hs-final">
        <img src="${ASSETS}gift-shawarma.png" alt="">
        <div class="hs-final-small">${TEXT.final.small}</div>
        <div class="hs-final-big">${TEXT.final.big}</div>
        <div class="hs-final-sub">${TEXT.final.sub}</div></div>`, 30, 180, 300, 300, "hs-final-wrap");
    finalCard.onclick = finish;

    // =====================================================
    // СЦЕНАРИЙ (время в секундах от начала)
    // =====================================================
    // --- Только шаурмичная (перед квестом): такси уже едет ---
    if (part === "shop") {
      show(s3);
      [player3, friend3].forEach(a => { a.style.opacity = 0; });
      pFriend.style.opacity = 1; pPlayer.style.opacity = 1;
      taxi.classList.add("hs-moving", "hs-driving"); speed(1, .4);
      at(.6, () => say(talkFriend, friendName, TEXT.hungry[G].replace("Ты голоден? ", "").replace("Ты голодна? ", "") , "", 1.6));
      at(.8, () => {
        shop.style.visibility = "visible";
        setPose(shop, "wave", true);
        anim(shop, [{ transform: "translateX(330px)" }, { transform: "translateX(0)" }], { duration: 2600, easing: "cubic-bezier(.25,.6,.3,1)" });
        speed(0, 2.6);
      });
      at(3.4, () => taxi.classList.remove("hs-moving", "hs-driving"));
      at(3.5, () => say(talkFriend, friendName, TEXT.arrived.ru, "", 2));
      at(5.6, () => finalCard.classList.add("show"));
      at(7.8, finish);
      return { skip: finish };
    }

    // --- 1. Посадка: 0 … 5 ---
    show(s1);
    anim(clouds, [{ transform: "translateX(0)" }, { transform: "translateX(-240px)" }], { duration: 6000 });
    anim(plane, [
      { transform: "translate(-260px, -430px) rotate(9deg) scale(1.25)", offset: 0 },
      { transform: "translate(0px, -90px) rotate(5deg) scale(1.05)", offset: .55, easing: "ease-out" },
      { transform: "translate(70px, 0px) rotate(-3deg) scale(1)", offset: .72, easing: "ease-out" },
      { transform: "translate(110px, 0px) rotate(0deg) scale(1)", offset: .86 },
      { transform: "translate(124px, 0px) rotate(0deg) scale(1)", offset: 1 }
    ], { duration: 4600, easing: "linear" });
    at(.5, () => cap.classList.add("show"));
    at(3.3, () => {                           // колёса коснулись полосы — облачка пыли
      [70 + 70, 70 + 167].forEach((x, i) => {
        const p = put(s1, `<svg viewBox="0 0 30 20"><circle cx="10" cy="12" r="7" fill="#fff"/><circle cx="20" cy="10" r="8" fill="#fff"/></svg>`, x - 12, 610, 30, 20);
        anim(p, [{ transform: "scale(.4)", opacity: .95 }, { transform: `translate(${-26 - i * 6}px,-10px) scale(1.6)`, opacity: 0 }], { duration: 900, easing: "ease-out" });
      });
    });
    at(4.2, () => cap.classList.remove("show"));

    // --- 2. Зал прилёта: 5 … 12.4 ---
    const T2 = 5;
    at(T2, () => { show(s2); setPose(friend2, "wave", true); });
    at(T2 + .4, () => s2.querySelector(".hs-bg").classList.add("hs-open"));
    at(T2 + .7, () => say(friend2, friendName, TEXT.hereIAm.ru, "", 1.8));
    at(T2 + .9, () => {
      fade(player2, 1, .35);
      setPose(player2, "walk", true); bag2.classList.add("hs-roll");
      move(player2, 72, 0, 2, "cubic-bezier(.3,.1,.5,1)");
    });
    at(T2 + 2.9, () => { setPose(player2, "walk", false); bag2.classList.remove("hs-roll"); });
    at(T2 + 2.7, () => {                       // друг бежит навстречу
      setPose(friend2, "wave", false); setPose(friend2, "walk", true);
      move(friend2, -86, 0, .8, "ease-in");
    });
    at(T2 + 3.5, () => {                       // обнимашки
      setPose(friend2, "walk", false);
      setPose(friend2, "hug-r", true); setPose(player2, "hug-l", true);
      anim(friend2, [{ transform: "translate(-86px,0)" }, { transform: "translate(-86px,-10px)" }, { transform: "translate(-86px,0)" }], { duration: 500, easing: "ease-out" });
      anim(player2, [{ transform: "translate(72px,0)" }, { transform: "translate(72px,-10px)" }, { transform: "translate(72px,0)" }], { duration: 500, easing: "ease-out", delay: 60 });
      for (let i = 0; i < 4; i++) {
        const h = put(s2, heartSVG(), 168 + i * 10, 470, 18, 17);
        anim(h, [{ transform: "translate(0,0) scale(.3)", opacity: 0 },
          { transform: `translate(${(i - 1.5) * 22}px,-30px) scale(1)`, opacity: 1, offset: .4 },
          { transform: `translate(${(i - 1.5) * 34}px,-80px) scale(.8)`, opacity: 0 }],
          { duration: 1600, delay: i * 140, easing: "ease-out", fill: "both" });
      }
    });
    at(T2 + 3.8, () => say(friend2, friendName, TEXT.welcome.ru, TEXT.welcome.he[G], 1.6));
    at(T2 + 4.9, () => { setPose(friend2, "hug-r", false); setPose(player2, "hug-l", false); });
    at(T2 + 5.5, () => say(player2, "", TEXT.hello[G], "", 1.9));

    // --- 3. Улица и такси: 12.4 … ---
    const T3 = 12.4;
    at(T3, () => { show(s3); setPose(friend3, "wave", true); });
    at(T3 + .4, () => say(friend3, friendName, TEXT.taxi.ru, TEXT.taxi.he, 1.6));
    at(T3 + .6, () => {                        // такси подъезжает
      taxi.classList.add("hs-moving");
      anim(taxi, [{ transform: "translateX(-300px)" }, { transform: "translateX(0)" }], { duration: 1800, easing: "cubic-bezier(.2,.7,.35,1)" });
    });
    at(T3 + 2.2, () => { taxi.classList.remove("hs-moving"); setPose(friend3, "wave", false); });
    at(T3 + 2.4, () => {                       // садятся в машину
      [player3, friend3].forEach(a => { setPose(a, "walk", true); move(a, -84, 0, 1, "ease-in"); });
      anim(player3, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 700 });
      anim(friend3, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 700 });
    });
    at(T3 + 3.2, () => { fade(pFriend, 1, .4); fade(pPlayer, 1, .4); });
    at(T3 + 3.7, () => { taxi.classList.add("hs-moving", "hs-driving"); speed(1, 1.2); });
    if (part === "arrival") {
      at(T3 + 4.4, () => say(talkFriend, friendName, TEXT.hungry[G], "", 2.6));
      at(T3 + 7.2, () => say(talkPlayer, "", TEXT.yes.ru, "", 1.6));
      at(T3 + 9.2, finish);
      return { skip: finish };
    }
    at(T3 + 4.4, () => say(talkFriend, friendName, TEXT.hungry[G], "", 2.4));
    at(T3 + 7.0, () => say(talkPlayer, "", TEXT.yes.ru, "", 1.4));

    // --- 4. Шаурмичная ---
    at(T3 + 8.4, () => {
      shop.style.visibility = "visible";
      setPose(shop, "wave", true);
      anim(shop, [{ transform: "translateX(330px)" }, { transform: "translateX(0)" }], { duration: 2600, easing: "cubic-bezier(.25,.6,.3,1)" });
      speed(0, 2.6);
    });
    at(T3 + 11, () => taxi.classList.remove("hs-moving", "hs-driving"));
    at(T3 + 11.1, () => say(talkFriend, friendName, TEXT.arrived.ru, "", 2));
    at(T3 + 13.2, () => finalCard.classList.add("show"));
    at(T3 + 15.4, finish);

    // --- Конец (по таймеру или по кнопке) ---
    function finish() {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      root.classList.add("hs-out");
      setTimeout(() => {
        anims.forEach(a => { try { a.cancel(); } catch (e) {} });
        window.removeEventListener("resize", fit);
        root.remove();
        if (typeof onDone === "function") onDone();
      }, 380);
    }
    return { skip: finish };
  }


  // =====================================================
  // СЦЕНА-ДИАЛОГ: сверху картинка (такси едет / шаурмичная),
  // реплики выскакивают пузырями над героями. Варианты ответа
  // рисует приложение снизу, в своей панели.
  //
  //   const st = createStage(viewEl, { gender, profile, place: "taxi" | "shop" })
  //   st.say("friend" | "me" | "seller", html)   → показать реплику (прошлая исчезает)
  //   st.hide()     → убрать реплику
  //   st.destroy()  → убрать сцену
  // =====================================================
  // ---------- Крупный план шаурмичной (кадр 360×700, видна нижняя часть) ----------
  // Где стоят миски (кадр 360×700); мясо продавец срезает с вертела
  const BOWLS = [
    { kind: "salad", x: 4 }, { kind: "hummus", x: 38 }, { kind: "chips", x: 72 },
    { kind: "tahini", x: 254 }, { kind: "spicy", x: 288 }
  ];
  const SOURCE = { "meat-turkey": [294, 470], "meat-chicken": [294, 470], "meat-veal": [294, 470] };
  BOWLS.forEach(b => { SOURCE[b.kind] = [b.x + 17, 548]; });

  // Нарезанная начинка (кусочки), ширина w, высота ≈ w*0.6
  function chopSVG(kind, w) {
    const h = Math.round(w * .6);
    const R = (seed) => { let x = seed; return () => (x = (x * 9301 + 49297) % 233280) / 233280; };
    const r = R(kind.length * 31 + w);
    let p = "";
    const n = 9;
    const at = () => [4 + r() * (w - 10), 3 + r() * (h - 9)];
    if (kind.startsWith("meat")) {
      const cols = kind === "meat-chicken" ? ["#e0a25a", "#c8843e"] : kind === "meat-veal" ? ["#8e4a22", "#a85c28"] : ["#c8763c", "#a85c28"];
      for (let i = 0; i < n; i++) { const [x, y] = at(); p += `<rect x="${x}" y="${y}" width="${w * .26}" height="${h * .16}" rx="2" fill="${cols[i % 2]}" transform="rotate(${r() * 50 - 25} ${x} ${y})"/>`; }
    } else if (kind === "salad") {
      for (let i = 0; i < n + 3; i++) { const [x, y] = at(); const c = ["#5aa874", "#7cc490", "#ff6b5a", "#fbe7a1"][i % 4]; p += `<rect x="${x}" y="${y}" width="${w * .13}" height="${w * .13}" rx="1.5" fill="${c}" transform="rotate(${r() * 40} ${x} ${y})"/>`; }
    } else if (kind === "hummus") {
      p = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * .42}" ry="${h * .36}" fill="#e9c98f"/>
        <path d="M${w * .3},${h * .5} q${w * .2},-${h * .3} ${w * .4},0" stroke="#d4ad6c" stroke-width="2" fill="none"/>
        <circle cx="${w * .55}" cy="${h * .45}" r="${w * .05}" fill="#c9a24a"/>`;
    } else if (kind === "tahini") {
      p = `<path d="M${w * .1},${h * .4} q${w * .15},-${h * .3} ${w * .3},0 t${w * .3},0 t${w * .2},0" stroke="#f6f0e2" stroke-width="${h * .2}" fill="none" stroke-linecap="round"/>
        <path d="M${w * .15},${h * .7} q${w * .2},-${h * .2} ${w * .4},0 t${w * .3},0" stroke="#efe6cf" stroke-width="${h * .16}" fill="none" stroke-linecap="round"/>`;
    } else if (kind === "spicy") {
      for (let i = 0; i < n; i++) { const [x, y] = at(); p += `<circle cx="${x}" cy="${y}" r="${w * .06}" fill="${i % 3 ? "#e5322b" : "#5aa874"}"/>`; }
    } else if (kind === "chips") {
      for (let i = 0; i < n; i++) { const [x, y] = at(); p += `<rect x="${x}" y="${y}" width="${w * .07}" height="${h * .5}" rx="1.5" fill="${i % 2 ? "#ffd86b" : "#f5c242"}" transform="rotate(${r() * 80 - 40} ${x} ${y})"/>`; }
    }
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" overflow="visible">${p}</svg>`;
  }

  function counterBackSVG() {
    let tiles = "";
    for (let y = 300; y < 560; y += 22) tiles += `<path d="M0,${y} L360,${y}" stroke="#f3e2c8" stroke-width="2"/>`;
    for (let x = 0; x < 360; x += 30) tiles += `<path d="M${x},300 L${x},560" stroke="#f6e8d3" stroke-width="2"/>`;
    let bands = "";
    for (let x = 262; x < 330; x += 10) bands += `<rect x="${x}" y="400" width="5" height="130" fill="#e39a5c"/>`;
    return `<svg class="hs-bg" viewBox="0 0 360 700" width="360" height="700">
      <defs><clipPath id="hsCone2"><path d="M262,404 L326,404 L312,530 L276,530Z"/></clipPath></defs>
      <rect width="360" height="700" fill="#fff4e4"/>${tiles}
      <g filter="url(#hsPaper)">
        <rect x="20" y="352" width="104" height="96" rx="10" fill="${C.blue}"/>
        <text x="72" y="378" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="Arial, 'DejaVu Sans', sans-serif">תַּפְרִיט</text>
        <path d="M34,394 L110,394 M34,410 L98,410 M34,426 L104,426" stroke="#cfe8fb" stroke-width="5" stroke-linecap="round"/>
      </g>
      <rect x="318" y="380" width="12" height="160" rx="4" fill="${C.orange}" class="hs-glow"/>
      <line x1="294" y1="388" x2="294" y2="545" stroke="#8a97a6" stroke-width="4"/>
      <path d="M262,404 L326,404 L312,530 L276,530Z" fill="#c8763c"/>
      <g clip-path="url(#hsCone2)"><g class="hs-spit">${bands}</g></g>
      <g class="hs-steam" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9">
        <path d="M284,392 q-6,-10 0,-20 t0,-20"/><path d="M302,390 q6,-10 0,-20 t0,-20"/></g>
    </svg>`;
  }
  function counterFrontSVG() {
    let awning = "";
    const sw = 40;
    for (let i = 0; i < 9; i++) {
      const x = i * sw, c = i % 2 ? "#fff" : C.orange;
      awning += `<rect x="${x}" y="286" width="${sw + .5}" height="26" fill="${c}"/><path d="M${x},311 a${sw / 2},${sw / 2 * .7} 0 0 0 ${sw},0Z" fill="${c}"/>`;
    }
    // Миски с нарезанной начинкой: из них продавец берёт и кладёт в питу/лафу
    const bowl = (x, kind) => `<g transform="translate(${x},538)">
      <path d="M0,18 a17,13 0 0 0 34,0Z" fill="#fff" filter="url(#hsPaper)"/>
      <g transform="translate(-1,6)">${chopSVG(kind, 36)}</g>
      <path d="M0,18 L34,18" stroke="#dbe9f6" stroke-width="2"/></g>`;
    return `<svg class="hs-abs hs-full" viewBox="0 0 360 700" width="360" height="700" style="left:0;top:0;width:360px;height:700px">
      <g filter="url(#hsPaper)">
        <rect x="0" y="556" width="360" height="14" fill="#dbe9f6"/>
        <rect x="0" y="568" width="360" height="132" fill="#fff"/>
      </g>
      <rect x="0" y="606" width="360" height="10" fill="${C.blue}"/>
      ${BOWLS.map(b => bowl(b.x, b.kind)).join("")}
      <rect x="0" y="300" width="12" height="270" fill="#f1e5d1"/><rect x="348" y="300" width="12" height="270" fill="#f1e5d1"/>
      <g filter="url(#hsPaper)">${awning}</g>
    </svg>`;
  }

  const VIEW_MIN = 300;                    // сколько «кадра» минимум видно по ширине и высоте
  function createStage(view, opts) {
    opts = opts || {};
    const female = opts.gender === "f";
    const profile = opts.profile || {};
    const friendLook = female ? LOOK.tzila : LOOK.david;
    const playerLook = female ? LOOK.playerF : LOOK.playerM;
    const place = opts.place || "taxi";
    const anims = [];
    let dead = false;

    const root = document.createElement("div");
    root.className = "hs-stage";
    root.innerHTML = DEFS;
    const frame = document.createElement("div");
    frame.className = "hs-frame hs-stage-frame";
    root.appendChild(frame);
    view.appendChild(root);

    function put(parent, html, x, y, w, h, cls) {
      const e = document.createElement("div");
      e.className = "hs-abs " + (cls || "");
      e.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
      e.innerHTML = html;
      parent.appendChild(e);
      return e;
    }
    function playerFig(pose) {
      try {
        if (window.HirbisAvatar && typeof HirbisAvatar.svg === "function") {
          const sv = HirbisAvatar.svg(profile.avatar, { pose: pose });
          if (sv) return `<div class="hs-fig hs-custom">${sv}</div>`;
        }
      } catch (e) {}
      return `<div class="hs-fig">${personSVG(playerLook)}</div>`;
    }
    const fig = (look) => `<div class="hs-fig">${personSVG(look)}</div>`;

    const who = {};                        // к кому «привязывать» пузыри
    let far, mid, dashes, breadBox = null;
    if (place !== "counter") {
      // Фон улицы
      frame.insertAdjacentHTML("beforeend", bgStreetSky());
      far = put(frame, farTile() + farTile(), 0, 0, 1440, 700, "hs-layer");
      put(frame, bgStreetGround(), 0, 0, 360, 700);
      mid = put(frame, midTile() + midTile() + midTile(), 0, 0, 1080, 700, "hs-layer");
      let dashHTML = ""; for (let i = 0; i < 5; i++) dashHTML += dashTile();
      dashes = put(frame, dashHTML, 0, 0, 600, 700, "hs-layer");
    }

    if (place === "counter") {
      // КРУПНЫЙ ПЛАН: окно шаурмичной, продавец за прилавком, на прилавке собирается шаурма
      root.classList.add("hs-counter");
      frame.insertAdjacentHTML("beforeend", counterBackSVG());
      who.seller = put(frame, fig(LOOK.seller), 130, 432, 100, 200, "hs-seller");
      who.sellerHead = who.seller;
      frame.insertAdjacentHTML("beforeend", counterFrontSVG());
      breadBox = put(frame, "", 104, 520, 152, 80, "hs-bread");
      who.me = put(frame, "", 20, 690, 60, 10);
      who.friend = put(frame, "", 280, 690, 60, 10);
    } else if (place === "taxi") {
      const loops = [
        far.animate([{ transform: "translateX(0)" }, { transform: "translateX(-720px)" }], { duration: 9000, iterations: Infinity }),
        mid.animate([{ transform: "translateX(0)" }, { transform: "translateX(-360px)" }], { duration: 1800, iterations: Infinity }),
        dashes.animate([{ transform: "translateX(0)" }, { transform: "translateX(-120px)" }], { duration: 420, iterations: Infinity })
      ];
      anims.push(...loops);
      const big = put(frame, "", 48, 552, 264, 132, "hs-taxi-big");
      const taxi = put(big, "", 0, 0, 264, 132, "hs-taxi hs-moving hs-driving");
      taxi.innerHTML = `<div class="hs-abs hs-full">${taxiBackSVG()}</div><div class="hs-abs hs-full hs-pass"></div><div class="hs-abs hs-full">${taxiFrontSVG()}</div>`;
      const pass = taxi.querySelector(".hs-pass");
      put(pass, fig(LOOK.driver), 166, 17, 44, 88);
      who.friend = put(pass, fig(friendLook), 82, 17, 44, 88);
      who.me = put(pass, playerFig("sit"), 116, 17, 44, 88);
    } else {
      const shop = put(frame, shopSVG(), 65, 366, 230, 190, "hs-shop");
      who.seller = put(shop, "", 64, 72, 36, 30);        // голова продавца внутри вывески
      who.me = put(frame, playerFig("stand"), 34, 470, 65, 130, "hs-player");
      who.friend = put(frame, fig(friendLook), 262, 470, 65, 130);
    }

    function fit() {
      const w = view.clientWidth, h = view.clientHeight;
      const sc = place === "counter" ? Math.min(w / 300, h / 330) : Math.min(w / VIEW_MIN, h / VIEW_MIN);
      const bottom = place === "taxi" || place === "counter" ? H : 628;   // у шаурмичной дорогу внизу не показываем
      const ty = place === "counter" ? -280 * sc + Math.max(0, (h - 420 * sc) / 2)   // крупный план: по центру, лишнее — стена и прилавок
                                     : Math.min(0, h - bottom * sc);
      frame.style.transform = `translate(${(w - W * sc) / 2}px, ${ty}px) scale(${sc})`;
      root.style.setProperty("--split", (ty + 562 * sc) + "px");
    }
    fit();
    window.addEventListener("resize", fit);
    // Панель с ответами снизу меняет высоту картинки — подстраиваемся
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { fit(); placeBubble(); }); ro.observe(view); }

    // Пузырь с репликой (в пикселях экрана, поверх картинки)
    let bubble = null, bubbleAnchor = null, bubbleTop = false;
    function placeBubble() {
      if (!bubble || !bubbleAnchor) return;
      if (bubbleTop) {                                  // крупный план: реплика продавца — сверху
        const vr = view.getBoundingClientRect(), ar = bubbleAnchor.getBoundingClientRect();
        const cx = ar.left - vr.left + ar.width / 2, bw = bubble.offsetWidth, vw = view.clientWidth;
        const left = Math.min(Math.max(cx - bw / 2, 8), vw - 8 - bw);
        bubble.style.left = left + "px"; bubble.style.top = "46px"; bubble.style.bottom = "auto";
        bubble.style.setProperty("--tx", Math.min(Math.max(cx - left, 18), bw - 18) + "px");
        return;
      }
      const b = bubble, anchor = bubbleAnchor;
      const vr = view.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      const cx = ar.left - vr.left + ar.width / 2;
      const headTop = ar.top - vr.top;
      const bw = b.offsetWidth, vw = view.clientWidth;
      const left = Math.min(Math.max(cx - bw / 2, 8), vw - 8 - bw);
      b.style.left = left + "px";
      b.style.bottom = Math.max(view.clientHeight - headTop + 10, 0) + "px";
      b.style.setProperty("--tx", Math.min(Math.max(cx - left, 18), bw - 18) + "px");
    }
    function hide() {
      if (!bubble) return;
      const b = bubble; bubble = null; bubbleAnchor = null; bubbleTop = false;
      b.classList.remove("show");
      setTimeout(() => b.remove(), 300);
    }
    function say(speaker, html) {
      hide();
      if (dead) return null;
      const anchor = who[speaker] || who.friend;
      const b = document.createElement("div");
      b.className = "hs-st-bubble " + speaker;
      b.innerHTML = html;
      root.appendChild(b);
      bubble = b; bubbleAnchor = anchor; bubbleTop = place === "counter" && speaker === "seller";
      placeBubble();
      requestAnimationFrame(() => b.classList.add("show"));
      return b;
    }
    function destroy() {
      dead = true;
      anims.forEach(a => { try { a.cancel(); } catch (e) {} });
      window.removeEventListener("resize", fit);
      if (ro) ro.disconnect();
      root.remove();
    }
    // --- Сборка шаурмы на прилавке (только крупный план) ---
    let bread = null;
    function food(it) {
      if (!breadBox) return;
      if (it === "pita" || it === "lafa") {
        breadBox.innerHTML = "";
        breadBox.dataset.kind = it;
        bread = document.createElement("img");
        bread.className = "hs-bread-base " + it; bread.src = ASSETS + "ing-" + it + ".png";
        breadBox.appendChild(bread);
        return;
      }
      // Кусочки летят из миски (или с вертела) на питу/лафу
      const pita = breadBox.dataset.kind === "pita";
      const n = breadBox.querySelectorAll(".hs-topping").length;
      const spotsL = [[46, 22], [70, 18], [58, 30], [40, 34], [78, 30], [54, 12]];
      const spotsP = [[52, 16], [62, 20], [56, 24], [48, 20], [66, 14], [58, 12]];
      const [x, y] = (pita ? spotsP : spotsL)[n % 6];
      const w = pita ? 34 : 44;
      const el = document.createElement("div");
      el.className = "hs-topping";
      el.style.left = x + "px"; el.style.top = y + "px";
      el.innerHTML = chopSVG(it, w);
      breadBox.appendChild(el);
      const src = SOURCE[it] || [180, 470];
      const dx = src[0] - (104 + x + w / 2), dy = src[1] - (520 + y);
      el.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(.8)`, opacity: 0 },
        { transform: `translate(${dx}px, ${dy - 10}px) scale(.8)`, opacity: 1, offset: .15 },
        { transform: `translate(${dx * .45}px, ${Math.min(dy, 0) - 60}px) scale(1)`, offset: .55 },
        { transform: "translate(0, 0) scale(1)" }
      ], { duration: 900, easing: "ease-in-out", fill: "both" });
      const s = who.seller;
      s.classList.remove("hs-put", "hs-put-l", "hs-put-r"); void s.offsetWidth;
      s.classList.add("hs-put", src[0] < 180 ? "hs-put-l" : "hs-put-r");
    }
    // Заворачивает и протягивает тебе
    function wrap(img, cb) {
      if (!breadBox) { if (cb) cb(); return; }
      breadBox.querySelectorAll(".hs-topping").forEach((t, k) => { t.getAnimations().forEach(a => a.finish()); t.getAnimations().forEach(a => a.cancel()); t.style.transitionDelay = (k * 60) + "ms"; t.classList.add("in"); });
      setTimeout(() => {
        breadBox.innerHTML = `<img class="hs-wrapped" src="${ASSETS}${img}.png" alt="">`;
      }, 900);
      setTimeout(() => breadBox.classList.add("give"), 2200);
      setTimeout(() => { if (cb) cb(); }, 3600);
    }
    return { say, hide, destroy, fit, root, food, wrap };
  }
  window.createStage = createStage;
  // Фигура друга (Давид / Циля) для уроков: он задаёт вопросы
  window.friendFigureSVG = (gender) => personSVG(gender === "f" ? LOOK.tzila : LOOK.david);
  window.playArrivalScene = playArrivalScene;
})();
