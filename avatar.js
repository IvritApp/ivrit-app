// =====================================================
// АВАТАР ИГРОКА (вектор SVG): лицо, причёски, одежда, платные вещи.
// Один и тот же рисунок используется в конструкторе, на главном экране и в сценах.
// Публичный «разъём» для других частей приложения:
//   HirbisAvatar.svg(cfg, { pose: "stand" | "walk" | "sit" })  → строка SVG
//   HirbisAvatar.defaults(gender)                               → настройки по умолчанию
// =====================================================
(function () {
  // ---------- Палитры ----------
  const SKIN  = ["#f2c7a3", "#eab68c", "#d99d72", "#b97a52", "#7d4e33"];   // без «бледного» тона
  const HAIRC = ["#2b2230", "#5a3a24", "#a0612f", "#e3b04b", "#d4542e", "#9aa0a8"];
  const TOPC  = ["#5aa9f0", "#ff8a35", "#ffffff", "#2b2f3a", "#7fae5a", "#e8413a", "#b57be0"];
  const BOTC  = ["#1f2d4f", "#3b5b8c", "#2b2f3a", "#c9b48a", "#7a8592", "#ffffff"];

  // ---------- Варианты (бесплатно) ----------
  const OPTIONS = {
    head:  [{ id: "round", name: "Круглое" }, { id: "oval", name: "Овальное" }, { id: "square", name: "Квадратное" }],
    eyes:  [{ id: "round", name: "Круглые" }, { id: "dots", name: "Точки" }, { id: "happy", name: "Радостные" }, { id: "lashes", name: "С ресницами" }],
    mouth: [{ id: "smile", name: "Улыбка" }, { id: "grin", name: "Широкая" }, { id: "calm", name: "Спокойная" }, { id: "open", name: "Удивление" }],
    hair:  [
      { id: "short", name: "Короткая" }, { id: "side", name: "Пробор" }, { id: "curly", name: "Кудри" }, { id: "buzz", name: "Ёжик" },
      { id: "long", name: "Длинные" }, { id: "bob", name: "Каре" }, { id: "pony", name: "Хвост" }, { id: "curlylong", name: "Длинные кудри" }
    ],
    top:    [{ id: "tee", name: "Футболка" }, { id: "hoodie", name: "Худи" }, { id: "shirt", name: "Рубашка" }, { id: "hasid", name: "Лапсердак" }],
    beard:  [{ id: "none", name: "Без бороды" }, { id: "stubble", name: "Щетина" }, { id: "short", name: "Короткая" }, { id: "long", name: "Длинная" }],
    payot:  [{ id: "none", name: "Без пейсов" }, { id: "payot", name: "Пейсы" }],
    headwear: [{ id: "none", name: "Без убора" }, { id: "kippa", name: "Кипа" }, { id: "hasidhat", name: "Шляпа" }, { id: "tichel", name: "Платок" }],
    bottom: [{ id: "jeans", name: "Брюки" }, { id: "shorts", name: "Шорты" }, { id: "skirt", name: "Юбка" }]
  };

  // ---------- Платные вещи (магазин). Цены — черновик ----------
  const SHOP = [
    { id: "leather",  slot: "outer", name: "Кожаная куртка",  stars: 49, rub: 99 },
    { id: "puffer",   slot: "outer", name: "Пуховик",          stars: 49, rub: 99 },
    { id: "beanie",   slot: "hat",   name: "Шапка с помпоном", stars: 25, rub: 49 },
    { id: "cap",      slot: "hat",   name: "Кепка Hirbis",     stars: 25, rub: 49 },
    { id: "sunglass", slot: "glasses", name: "Солнечные очки", stars: 19, rub: 39 },
    { id: "crown",    slot: "hat",   name: "Корона Хибри",     stars: 99, rub: 199 }
  ];

  function defaults(gender) {
    const f = gender === "f";
    return {
      head: f ? "oval" : "round", skin: 1, eyes: f ? "lashes" : "round", mouth: "smile", body: f ? "slim" : "base",
      hair: f ? "long" : "short", hairColor: 1,
      top: "tee", topColor: 0, bottom: f ? "skirt" : "jeans", bottomColor: 0,
      beard: "none", payot: "none", headwear: "none",   // борода, пейсы, кипа / шляпа / платок — бесплатно
      outer: null, hat: null, glasses: null,        // надетые платные вещи
      owned: []                                      // купленные платные вещи
    };
  }

  // Чуть темнее / светлее цвет
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return "#" + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  // ---------- Части рисунка ----------
  // Кадр 200×400. Пропорции «мультяшные, но не чиби»: голова ≈ 30% роста,
  // лицо почти круглое, глаза и брови аккуратные. Ступни ≈ 386 (как у Давида).
  const FACE = {
    round:  `M56,86 Q56,40 100,40 Q144,40 144,86 Q144,120 124,131 Q100,141 76,131 Q56,120 56,86Z`,
    oval:   `M60,86 Q60,38 100,38 Q140,38 140,86 Q140,122 122,134 Q100,145 78,134 Q60,122 60,86Z`,
    square: `M56,82 Q56,40 100,40 Q144,40 144,82 L143,116 Q140,132 122,137 Q100,142 78,137 Q60,132 57,116Z`
  };
  function headShape(c, fill) { return `<path d="${FACE[c.head] || FACE.round}" fill="${fill}"/>`; }
  function earsX(c) { return c.head === "oval" ? [60, 140] : [56, 144]; }

  function hairBack(c, col) {
    switch (c.hair) {
      case "long":      return `<path d="M52,86 C46,16 154,16 148,86 L154,196 C134,208 66,208 46,196Z" fill="${col}"/>`;
      case "bob":       return `<path d="M52,88 C46,16 154,16 148,88 L152,142 C134,150 66,150 48,142Z" fill="${col}"/>`;
      case "curlylong": return `<path d="M52,86 L148,86 L152,184 Q100,198 48,184Z" fill="${col}"/>` +
                          [[50,100],[46,124],[48,148],[52,172],[150,100],[154,124],[152,148],[148,172],[72,190],[100,194],[128,190]]
                          .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="${col}"/>`).join("");
      case "pony":      return `<ellipse cx="150" cy="104" rx="13" ry="38" fill="${col}" transform="rotate(14 150 104)"/><circle cx="144" cy="70" r="7" fill="#ff8a35"/>`;
      default: return "";
    }
  }
  function curlsHTML(col, list) {
    const light = shade(col, 0.18);
    return list.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`).join("") +
      list.filter((_, i) => i % 2 === 0).map(([x, y]) =>
        `<path d="M${x - 4},${y + 1.5} q1.5,-6 6,-4.5 q4.5,1.5 1.5,6" stroke="${light}" stroke-width="2" fill="none" stroke-linecap="round"/>`).join("");
  }
  function hairFront(c, col) {
    const dark = shade(col, -0.18);
    switch (c.hair) {
      case "short": return `<path d="M54,90 C46,18 154,18 146,90 C138,62 122,54 100,56 C78,54 62,62 54,90Z" fill="${col}"/>`;
      case "side":  return `<path d="M54,92 C44,16 156,16 146,92 C143,68 132,56 114,54 C96,66 70,60 54,92Z" fill="${col}"/><path d="M114,54 C109,46 102,42 95,40" stroke="${dark}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      case "buzz":  return `<path d="M58,78 C56,26 144,26 142,78 C124,64 76,64 58,78Z" fill="${col}" opacity=".92"/>`;
      case "curly": return `<path d="M54,88 Q50,32 100,28 Q150,32 146,88 Q140,62 100,58 Q60,60 54,88Z" fill="${col}"/>` +
                      curlsHTML(col, [[56,82,10],[54,66,11],[60,50,12],[72,38,12],[86,30,12],[102,27,12],[118,30,12],[132,38,12],[142,52,11],[147,68,10],[148,84,9],[80,48,10],[100,42,10],[120,48,10]]);
      case "long":
      case "pony":  return `<path d="M52,100 C44,18 156,18 148,100 C144,72 124,56 102,60 L100,66 L98,60 C76,56 56,72 52,100Z" fill="${col}"/>`;
      case "bob":   return `<path d="M52,98 C44,18 156,18 148,98 L148,78 C128,70 72,70 52,78Z" fill="${col}"/>`;
      case "curlylong": return `<path d="M52,94 Q48,32 100,28 Q152,32 148,94 Q142,64 100,60 Q58,62 52,94Z" fill="${col}"/>` +
                      curlsHTML(col, [[54,74,9],[58,58,10],[68,44,10],[82,35,10],[100,31,10],[118,35,10],[132,44,10],[142,58,10],[146,74,9]]);
      default: return "";
    }
  }

  function eyes(c, hairCol) {
    const L = 83, R = 117, Y = 90;
    const fem = c.eyes === "lashes";
    const brow = shade(hairCol, -0.1), bw = fem ? 2.4 : 3.6;
    const brows = `<path d="M${L - 9} ${Y - 13} Q${L} ${Y - 18} ${L + 9} ${Y - 14}" stroke="${brow}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>
                   <path d="M${R - 9} ${Y - 14} Q${R} ${Y - 18} ${R + 9} ${Y - 13}" stroke="${brow}" stroke-width="${bw}" fill="none" stroke-linecap="round"/>`;
    const iris = "#8a5222", pupil = "#24150e";
    let e = "";
    if (c.eyes === "happy") {
      e = [L, R].map(x => `<path d="M${x - 7} ${Y + 2} Q${x} ${Y - 6} ${x + 7} ${Y + 2}" stroke="${pupil}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`).join("");
    } else if (c.eyes === "dots") {
      e = [L, R].map(x => `<g class="av-eye"><ellipse cx="${x}" cy="${Y}" rx="4.4" ry="5.6" fill="${pupil}"/><circle cx="${x + 1.6}" cy="${Y - 2}" r="1.6" fill="#fff"/></g>`).join("");
    } else {
      e = [L, R].map(x => `<g class="av-eye"><ellipse cx="${x}" cy="${Y}" rx="8" ry="9" fill="#fff"/>
        <circle cx="${x + .6}" cy="${Y + 1.2}" r="5.6" fill="${iris}"/><circle cx="${x + .6}" cy="${Y + 1.6}" r="3" fill="${pupil}"/>
        <circle cx="${x + 2.6}" cy="${Y - 1}" r="1.8" fill="#fff"/></g>`).join("");
      if (fem) e += `<path d="M${L - 8} ${Y - 4} l-4 -2.4 M${L - 6} ${Y - 7} l-2.2 -3.6 M${R + 8} ${Y - 4} l4 -2.4 M${R + 6} ${Y - 7} l2.2 -3.6" stroke="${pupil}" stroke-width="1.8" stroke-linecap="round"/>`;
    }
    return brows + e;
  }
  function mouth(c) {
    const ink = "#7a2630";
    switch (c.mouth) {
      case "grin": return `<path d="M86,111 Q100,128 114,111 Q100,115 86,111Z" fill="${ink}"/><path d="M88,111.6 Q100,115.4 112,111.6 L111,114.4 Q100,118 89,114.4Z" fill="#fff"/>`;
      case "calm": return `<path d="M93,115 Q100,119 107,115" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      case "open": return `<ellipse cx="100" cy="116" rx="5.4" ry="6.6" fill="${ink}"/><ellipse cx="100" cy="119.4" rx="3.2" ry="2" fill="#ff6b6b"/>`;
      default:     return `<path d="M90,112 Q100,124 110,112 Q100,115 90,112Z" fill="${ink}"/>
                           <path d="M91.6,112.6 Q100,115.2 108.4,112.6 L107.6,114.6 Q100,117 92.4,114.6Z" fill="#fff"/>
                           <ellipse cx="100" cy="119" rx="4" ry="1.8" fill="#ff6b6b"/>`;
    }
  }

  function sleeveCol(c) {
    if (c.outer === "leather") return "#2b2b33";
    if (c.outer === "puffer") return "#ff8a35";
    if (c.top === "hasid") return "#1d1e24";
    return TOPC[c.topColor] || TOPC[0];
  }
  function isSlim(c) { return c.body ? c.body === "slim" : c.eyes === "lashes"; }

  // Верх (+ руки). W — половина ширины плеч: парни 37, девушки 31
  function torso(c, pose) {
    const W = isSlim(c) ? 31 : 37;
    const col = TOPC[c.topColor] || TOPC[0], dk = shade(col, -0.16), skin = SKIN[c.skin] || SKIN[1];
    const sc = sleeveCol(c), sdk = shade(sc, -0.16);
    const longSleeve = c.top !== "tee" || !!c.outer;
    const xl = 100 - W, xr = 100 + W;
    const arm = (side) => {
      const cx = side === "l" ? xl - 7 : xr + 7;             // середина руки
      const sleeve = longSleeve
        ? `<rect x="${cx - 8.5}" y="152" width="17" height="86" rx="8.5" fill="${sc}"/><rect x="${cx - 8.5}" y="230" width="17" height="8" rx="4" fill="${sdk}"/>`
        : `<rect x="${cx - 9.5}" y="150" width="19" height="38" rx="9" fill="${sc}"/>
           <rect x="${cx - 9.5}" y="182" width="19" height="6" rx="3" fill="${sdk}"/>`;
      return `<g class="hs-arm hs-arm-${side} av-arm-${side}">
        <rect x="${cx - 7}" y="160" width="14" height="82" rx="7" fill="${skin}"/>
        <ellipse cx="${cx}" cy="246" rx="7.6" ry="9" fill="${skin}"/>${sleeve}</g>`;
    };
    let body = `<path d="M${xl},162 Q${xl + 2},150 ${xl + 22},148 L${xr - 22},148 Q${xr - 2},150 ${xr},162 L${xr - 2},248 Q100,254 ${xl + 2},248Z" fill="${col}"/>
                <path d="M${xr - 18},160 Q${xr - 10},176 ${xr - 12},244 L${xr - 2},244 L${xr},166Z" fill="${dk}" opacity=".4"/>`;
    if (c.top === "tee")    body += `<path d="M88,149 Q100,158 112,149" stroke="${dk}" stroke-width="3.4" fill="none"/>`;
    if (c.top === "hoodie") body += `<path d="M82,150 Q100,172 118,150" fill="${dk}"/><line x1="95" y1="160" x2="94" y2="182" stroke="#fff" stroke-width="2.4"/><line x1="105" y1="160" x2="106" y2="182" stroke="#fff" stroke-width="2.4"/><rect x="82" y="212" width="36" height="22" rx="8" fill="${dk}"/>`;
    if (c.top === "hasid")  body = `<path d="M${xl - 2},162 Q${xl},150 ${xl + 22},148 L${xr - 22},148 Q${xr},150 ${xr + 2},162 L${xr + 8},300 Q100,306 ${xl - 8},300Z" fill="#1d1e24"/>
                <path d="M88,148 L100,170 L112,148Z" fill="#fff"/><path d="M100,170 L100,300" stroke="#34353d" stroke-width="2"/>
                <path d="M88,148 L98,176 L94,148Z M112,148 L102,176 L106,148Z" fill="#2c2d35"/>
                <rect x="${xl}" y="236" width="${xr - xl}" height="6" fill="#2c2d35"/>
                ${[0, 1, 2, 3].map(i => `<path d="M${xl + 4 + i * 2.4},242 l-1,${34 + i * 3} M${xr - 4 - i * 2.4},242 l1,${34 + i * 3}" stroke="#f4f4f4" stroke-width="1.4"/>`).join("")}`;
    if (c.top === "shirt")  body += `<path d="M88,148 L100,164 L112,148 L107,144 L100,154 L93,144Z" fill="#fff"/><line x1="100" y1="164" x2="100" y2="248" stroke="${dk}" stroke-width="1.8"/>` +
                              [184, 204, 224].map(y => `<circle cx="100" cy="${y}" r="2.4" fill="${dk}"/>`).join("");
    return arm("l") + arm("r") + body;
  }

  // Низ (+ ноги, кеды)
  function legs(c, pose) {
    const slim = isSlim(c);
    const col = BOTC[c.bottomColor] || BOTC[0], dk = shade(col, 0.14), skin = SKIN[c.skin] || SKIN[1];
    const pants = c.bottom === "jeans";
    const lx = slim ? 89 : 87, rx = slim ? 111 : 113, lw = slim ? 18 : 22;
    const shoe = (x) => `<path d="M${x - 15},378 Q${x - 15},364 ${x - 3},362 L${x + 8},362 Q${x + 18},365 ${x + 20},378Z" fill="#f4f6f9"/>
      <rect x="${x - 17}" y="376" width="39" height="8" rx="4" fill="#c9d1db"/>
      <path d="M${x - 5},366 l8,0 M${x - 5},370.5 l8,0" stroke="#c9d1db" stroke-width="2"/>`;
    const leg = (x, side) => `<g class="hs-leg hs-leg-${side} av-leg-${side}">
        ${pants
          ? `<rect x="${x - lw / 2}" y="244" width="${lw}" height="112" rx="6" fill="${col}"/><rect x="${x - lw / 2 - 1}" y="348" width="${lw + 2}" height="11" rx="4" fill="${dk}"/>`
          : `<rect x="${x - lw / 2 + 2}" y="258" width="${lw - 4}" height="104" rx="7" fill="${skin}"/>`}
        ${shoe(x)}</g>`;
    let s = leg(lx, "l") + leg(rx, "r");
    const hip = slim ? 31 : 36;
    if (pants)                 s += `<rect x="${100 - hip}" y="240" width="${hip * 2}" height="22" rx="6" fill="${col}"/>`;
    if (c.bottom === "shorts") s += `<path d="M${100 - hip},242 L${100 + hip},242 L${102 + hip},290 L104,290 L100,280 L96,290 L${98 - hip},290Z" fill="${col}"/>`;
    if (c.bottom === "skirt")  s += `<path d="M${100 - hip},240 L${100 + hip},240 L${112 + hip},290 Q100,300 ${88 - hip},290Z" fill="${col}"/>`;
    return s;
  }

  // ---------- Борода, пейсы, головные уборы (бесплатно) ----------
  function beard(c, col) {
    const must = `<path d="M85,108 Q92,103 100,106 Q108,103 115,108 Q108,107 100,109 Q92,107 85,108Z" fill="${col}"/>`;
    if (c.beard === "stubble") return `<path d="M58,96 Q60,128 78,136 Q100,146 122,136 Q140,128 142,96 Q136,118 120,122 Q100,116 80,122 Q64,118 58,96Z" fill="${col}" opacity=".32"/>`;
    if (c.beard === "short") return `<path d="M57,94 Q58,130 78,140 Q100,152 122,140 Q142,130 143,94 Q137,118 120,124 Q100,118 80,124 Q63,118 57,94Z" fill="${col}"/>` + must;
    if (c.beard === "long") return `<path d="M57,94 Q57,128 72,148 Q82,188 100,198 Q118,188 128,148 Q143,128 143,94 Q137,118 120,124 Q100,118 80,124 Q63,118 57,94Z" fill="${col}"/>
      <path d="M86,150 Q92,172 100,186 M114,150 Q108,172 100,186 M100,140 L100,180" stroke="${shade(col, -0.2)}" stroke-width="1.6" fill="none" opacity=".6"/>` + must;
    return "";
  }
  function payot(c, col) {
    if (c.payot !== "payot") return "";
    const lock = (x, d) => `<path d="M${x},74 q${-4 * d},12 0,22 q${4 * d},8 0,16 q${-4 * d},7 0,14 q${4 * d},6 0,12" stroke="${col}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    return lock(55, 1) + lock(145, -1);
  }
  function headwear(c) {
    if (c.hat) return "";                                   // платная шапка важнее
    if (c.headwear === "kippa") return `<path d="M76,40 Q100,22 124,40 Q100,33 76,40Z" fill="#1f2d4f"/>
      <path d="M78,39 Q100,32 122,39" stroke="#ffffff" stroke-width="2" fill="none" opacity=".85"/>`;
    if (c.headwear === "hasidhat") return `<ellipse cx="100" cy="52" rx="64" ry="10" fill="#141418"/>
      <path d="M66,52 Q63,12 100,10 Q137,12 134,52Z" fill="#1d1e24"/>
      <path d="M67,42 Q100,46 133,42 L134,50 Q100,54 66,50Z" fill="#33343c"/>
      <path d="M86,14 Q100,22 114,14" stroke="#33343c" stroke-width="3" fill="none"/>`;
    if (c.headwear === "tichel") return `<path d="M50,100 Q40,22 100,18 Q160,22 150,100 Q146,74 134,62 Q100,46 66,62 Q54,74 50,100Z" fill="#7d5aa6"/>
      <path d="M58,64 Q100,44 142,64" stroke="#9c7cc4" stroke-width="5" fill="none"/>
      ${[[76,36],[100,30],[124,36],[64,54],[136,54],[88,46],[112,46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#c9b5e6"/>`).join("")}`;
    return "";
  }
  function headwearBack(c) {
    if (c.hat || c.headwear !== "tichel") return "";
    return `<path d="M52,86 C46,20 154,20 148,86 L150,120 Q100,128 50,120Z" fill="#6a4a92"/>
      <circle cx="152" cy="70" r="13" fill="#7d5aa6"/><path d="M156,80 Q170,100 160,120 M150,82 Q160,104 148,122" stroke="#7d5aa6" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  }

  // ---------- Платные вещи (корпус; рукава — в руках) ----------
  function outerwear(c) {
    const W = isSlim(c) ? 31 : 37, xl = 100 - W, xr = 100 + W;
    if (c.outer === "leather") return `
      <path d="M${xl - 2},164 Q${xl},150 ${xl + 22},147 L96,150 L92,250 L${xl},250Z" fill="#2b2b33"/>
      <path d="M${xr + 2},164 Q${xr},150 ${xr - 22},147 L104,150 L108,250 L${xr},250Z" fill="#2b2b33"/>
      <path d="M${xl + 22},147 L96,150 L90,172Z M${xr - 22},147 L104,150 L110,172Z" fill="#45454f"/>
      <circle cx="94" cy="206" r="2.2" fill="#c9c9d1"/><circle cx="106" cy="206" r="2.2" fill="#c9c9d1"/>`;
    if (c.outer === "puffer") return `
      <path d="M${xl - 4},166 Q${xl - 2},144 ${xl + 24},142 L${xr - 24},142 Q${xr + 2},144 ${xr + 4},166 L${xr + 2},254 L${xl - 2},254Z" fill="#ff8a35"/>
      ${[176, 200, 224].map(y => `<path d="M${xl - 2} ${y} Q100 ${y + 7} ${xr + 2} ${y}" stroke="#e46d1c" stroke-width="3" fill="none"/>`).join("")}
      <line x1="100" y1="144" x2="100" y2="254" stroke="#e46d1c" stroke-width="3"/>
      <rect x="84" y="134" width="32" height="15" rx="7" fill="#e46d1c"/>`;
    return "";
  }
  function hat(c) {
    if (c.hat === "beanie") return `
      <path d="M54,72 C54,20 146,20 146,72Z" fill="#e8413a"/>
      <rect x="50" y="64" width="100" height="16" rx="8" fill="#c62f29"/>
      ${[64, 82, 100, 118, 136].map(x => `<line x1="${x}" y1="66" x2="${x}" y2="78" stroke="#a8241f" stroke-width="2.6"/>`).join("")}
      <circle cx="100" cy="20" r="11" fill="#ffffff"/>`;
    if (c.hat === "cap") return `
      <path d="M56,76 C56,26 144,26 144,76Z" fill="#5aa9f0"/>
      <path d="M100,68 Q146,64 170,78 Q146,86 100,80Z" fill="#3a8ad6"/>
      <circle cx="100" cy="30" r="4.4" fill="#3a8ad6"/>
      <path d="M88,52 L93,42 L98,52 L103,40 L108,52" stroke="#ff8a35" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    if (c.hat === "crown") return `
      <path d="M70,46 L77,18 L90,38 L100,10 L110,38 L123,18 L130,46Z" fill="#ffc928" stroke="#e0a400" stroke-width="2.6" stroke-linejoin="round"/>
      <circle cx="100" cy="30" r="4.4" fill="#ff8a35"/><circle cx="82" cy="38" r="3.4" fill="#5aa9f0"/><circle cx="118" cy="38" r="3.4" fill="#5aa9f0"/>`;
    return "";
  }
  function glasses(c) {
    if (c.glasses !== "sunglass") return "";
    return `<rect x="71" y="81" width="25" height="17" rx="7" fill="#23263a"/><rect x="104" y="81" width="25" height="17" rx="7" fill="#23263a"/>
            <line x1="96" y1="88" x2="104" y2="88" stroke="#23263a" stroke-width="3"/>
            <line x1="75" y1="85" x2="83" y2="85" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>
            <line x1="108" y1="85" x2="116" y2="85" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>`;
  }

  // ---------- Сборка ----------
  let UID = 0;
  function svg(cfg, opts) {
    const c = Object.assign(defaults("m"), cfg || {});
    const pose = (opts && opts.pose) || "stand";
    const skin = SKIN[c.skin] || SKIN[1], hairCol = HAIRC[c.hairColor] || HAIRC[1];
    const skinD = shade(skin, -0.1);
    const [ex1, ex2] = earsX(c);
    const hideHairTop = c.hat === "beanie" || c.hat === "cap";
    const head = opts && opts.view === "head";
    const vb = head ? "40 4 120 150" : "0 0 200 400";
    // «Объём»: мягкие градиенты на коже, волосах и одежде (у каждого рисунка свои id)
    const id = "av" + (++UID);
    const top = TOPC[c.topColor] || TOPC[0];
    const G = (str, col, gid) => str.split(`fill="${col}"`).join(`fill="url(#${id}${gid})"`);
    const coverHair = c.headwear === "tichel" && !c.hat;
    const hideTop = hideHairTop || coverHair || (c.headwear === "hasidhat" && !c.hat);
    return `<svg class="hb-avatar hs-person pose-${pose}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient id="${id}s" cx="42%" cy="36%" r="72%"><stop offset="0" stop-color="${shade(skin, .16)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -.12)}"/></radialGradient>
        <linearGradient id="${id}h" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="${shade(hairCol, .26)}"/><stop offset=".5" stop-color="${hairCol}"/><stop offset="1" stop-color="${shade(hairCol, -.14)}"/></linearGradient>
        <linearGradient id="${id}t" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="${shade(top, .18)}"/><stop offset=".6" stop-color="${top}"/><stop offset="1" stop-color="${shade(top, -.12)}"/></linearGradient>
      </defs>
      ${head ? "" : `<ellipse cx="100" cy="386" rx="44" ry="6" fill="#1e3c6e" opacity=".12"/>`}
      ${coverHair ? headwearBack(c) : G(hairBack(c, hairCol), hairCol, "h")}
      ${legs(c, pose)}
      <rect x="92" y="130" width="16" height="22" rx="5" fill="${skinD}"/>
      ${G(torso(c, pose), top, "t")}
      ${outerwear(c)}
      <g class="av-head">
        <circle cx="${ex1}" cy="92" r="9" fill="${skin}"/><circle cx="${ex2}" cy="92" r="9" fill="${skin}"/>
        <circle cx="${ex1}" cy="92" r="4.5" fill="${skinD}"/><circle cx="${ex2}" cy="92" r="4.5" fill="${skinD}"/>
        ${headShape(c, `url(#${id}s)`)}
        <path d="M66,128 Q100,148 134,128 Q120,140 100,141 Q80,140 66,128Z" fill="${skinD}" opacity=".25"/>
        <ellipse cx="73" cy="106" rx="7" ry="4" fill="#ff8f80" opacity=".35"/>
        <ellipse cx="127" cy="106" rx="7" ry="4" fill="#ff8f80" opacity=".35"/>
        <ellipse cx="100" cy="102" rx="3.6" ry="2.6" fill="${skinD}"/>
        <ellipse cx="101.4" cy="100.6" rx="1.4" ry="1" fill="#fff" opacity=".55"/>
        ${eyes(c, hairCol)}
        ${beard(c, hairCol)}
        ${mouth(c)}
        ${coverHair ? "" : hideTop ? (["long", "bob", "pony", "curlylong"].includes(c.hair) ? `<path d="M53,78 C52,92 53,102 54,108 L62,82Z M147,78 C148,92 147,102 146,108 L138,82Z" fill="${hairCol}"/>` : "") : G(hairFront(c, hairCol), hairCol, "h")}
        ${coverHair || hideTop || ["buzz"].includes(c.hair) ? "" : `<path d="M76,46 Q98,34 120,42" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".18"/>`}
        ${payot(c, hairCol)}
        ${headwear(c)}
        ${glasses(c)}
        ${hat(c)}
      </g>
    </svg>`;
  }

  // =====================================================
  // КОНСТРУКТОР АВАТАРА
  // openEditor(cfg, onDone) — показывает экран, по «Готово» отдаёт новые настройки
  // =====================================================
  const TABS = [
    { id: "face",  name: "Лицо" },
    { id: "hair",  name: "Волосы" },
    { id: "wear",  name: "Одежда" },
    { id: "shop",  name: "Магазин ⭐" }
  ];
  let cur = null, tryOn = null, tab = "face", doneCb = null;

  function el(id) { return document.getElementById(id); }
  function toastMsg(t) { if (typeof showToast === "function") showToast(t); }

  function openEditor(cfg, onDone) {
    cur = JSON.parse(JSON.stringify(cfg)); tryOn = null; tab = "face"; doneCb = onDone;
    document.querySelectorAll("body > section").forEach(s => { if (s.id !== "avatarEditor") s.hidden = true; });
    el("avatarEditor").hidden = false;
    renderTabs(); renderPanel(); renderPreview();
    window.scrollTo(0, 0);
  }

  function shown() {                     // что видно в превью: надетое + примерка
    const c = Object.assign({}, cur);
    if (tryOn) c[tryOn.slot] = tryOn.id;
    return c;
  }
  function renderPreview() {
    el("aePrev").innerHTML = svg(shown(), { pose: "stand" });
    el("aeTry").hidden = !tryOn;
    if (tryOn) el("aeTry").textContent = "Примерка: " + tryOn.name;
    const p = el("aePrev"); p.classList.remove("bump"); void p.offsetWidth; p.classList.add("bump");
  }
  function renderTabs() {
    el("aeTabs").innerHTML = TABS.map(t => `<button class="ae-tab ${t.id === tab ? "on" : ""}" data-t="${t.id}">${t.name}</button>`).join("");
    el("aeTabs").querySelectorAll(".ae-tab").forEach(b => b.onclick = () => { tab = b.dataset.t; tryOn = null; renderTabs(); renderPanel(); renderPreview(); });
  }

  // Ряд вариантов с маленькими превью
  function optionRow(title, key, list, view) {
    return `<div class="ae-group"><div class="ae-title">${title}</div><div class="ae-row">` +
      list.map(o => {
        const c = Object.assign({}, cur, { [key]: o.id });
        return `<button class="ae-opt ${cur[key] === o.id ? "on" : ""}" data-k="${key}" data-v="${o.id}">
          <span class="ae-mini">${svg(c, { view })}</span><span class="ae-cap">${o.name}</span></button>`;
      }).join("") + `</div></div>`;
  }
  function swatchRow(title, key, colors) {
    return `<div class="ae-group"><div class="ae-title">${title}</div><div class="ae-row sw">` +
      colors.map((col, i) => `<button class="ae-sw ${cur[key] === i ? "on" : ""}" data-k="${key}" data-i="${i}" style="background:${col}"></button>`).join("") +
      `</div></div>`;
  }

  function renderPanel() {
    let h = "";
    if (tab === "face") {
      h += optionRow("Форма лица", "head", OPTIONS.head, "head");
      h += swatchRow("Цвет кожи", "skin", SKIN);
      h += optionRow("Глаза", "eyes", OPTIONS.eyes, "head");
      h += optionRow("Улыбка", "mouth", OPTIONS.mouth, "head");
      h += optionRow("Борода", "beard", OPTIONS.beard, "head");
    } else if (tab === "hair") {
      h += optionRow("Причёска", "hair", OPTIONS.hair, "head");
      h += swatchRow("Цвет волос", "hairColor", HAIRC);
      h += optionRow("Пейсы", "payot", OPTIONS.payot, "head");
    } else if (tab === "wear") {
      h += optionRow("Головной убор", "headwear", OPTIONS.headwear, "head");
      h += optionRow("Верх", "top", OPTIONS.top);
      h += swatchRow("Цвет верха", "topColor", TOPC);
      h += optionRow("Низ", "bottom", OPTIONS.bottom);
      h += swatchRow("Цвет низа", "bottomColor", BOTC);
    } else {
      h += `<div class="ae-shop-note">Базовая одежда — бесплатно. Особые вещи можно будет купить за ⭐ Telegram Stars или рубли. Нажми на вещь, чтобы примерить.</div><div class="ae-shop">` +
        SHOP.map(it => {
          const owned = (cur.owned || []).includes(it.id), worn = cur[it.slot] === it.id;
          const c = Object.assign({}, cur, { [it.slot]: it.id });
          return `<div class="ae-item ${tryOn && tryOn.id === it.id ? "on" : ""}" data-id="${it.id}">
            <span class="ae-mini big">${svg(c, { view: it.slot === "outer" ? undefined : "head" })}</span>
            <span class="ae-cap">${it.name}</span>
            ${owned
              ? `<button class="ae-buy owned" data-wear="${it.id}">${worn ? "Снять" : "Надеть"}</button>`
              : `<span class="ae-price">⭐ ${it.stars} · ${it.rub} ₽</span><button class="ae-buy" data-buy="${it.id}">🔒 Купить</button>`}
          </div>`;
        }).join("") + `</div>`;
    }
    el("aePanel").innerHTML = h;

    el("aePanel").querySelectorAll(".ae-opt").forEach(b => b.onclick = () => { cur[b.dataset.k] = b.dataset.v; tick(); });
    el("aePanel").querySelectorAll(".ae-sw").forEach(b => b.onclick = () => { cur[b.dataset.k] = +b.dataset.i; tick(); });
    el("aePanel").querySelectorAll(".ae-item").forEach(card => card.onclick = e => {
      const it = SHOP.find(x => x.id === card.dataset.id);
      if (e.target.dataset.buy) { toastMsg("Покупки появятся совсем скоро ✨"); return; }
      if (e.target.dataset.wear) { cur[it.slot] = cur[it.slot] === it.id ? null : it.id; tryOn = null; tick(); return; }
      tryOn = tryOn && tryOn.id === it.id ? null : it; renderPanel(); renderPreview();
    });
  }
  function tick() {
    if (typeof vibrate === "function") vibrate("success");
    renderPanel(); renderPreview();
  }

  function initEditor() {
    if (!el("avatarEditor")) return;
    el("aeDone").onclick = () => {
      // платные вещи остаются надетыми, только если куплены
      SHOP.forEach(it => { if (cur[it.slot] === it.id && !(cur.owned || []).includes(it.id)) cur[it.slot] = null; });
      el("avatarEditor").hidden = true;
      if (doneCb) doneCb(cur);
    };
  }
  document.addEventListener("DOMContentLoaded", initEditor);
  if (document.readyState !== "loading") initEditor();

  window.HirbisAvatar = { svg, defaults, openEditor, OPTIONS, SHOP, SKIN, HAIRC, TOPC, BOTC };
})();
