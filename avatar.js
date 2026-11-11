// =====================================================
// АВАТАР ИГРОКА (вектор SVG): лицо, причёски, одежда, платные вещи.
// Один и тот же рисунок используется в конструкторе, на главном экране и в сценах.
// Публичный «разъём» для других частей приложения:
//   HirbisAvatar.svg(cfg, { pose: "stand" | "walk" | "sit" })  → строка SVG
//   HirbisAvatar.defaults(gender)                               → настройки по умолчанию
// =====================================================
(function () {
  // ---------- Палитры ----------
  const SKIN  = ["#fde0c5", "#f5c9a3", "#e3ad83", "#b97a52", "#7d4e33"];
  const HAIRC = ["#2b2230", "#5a3a24", "#a0612f", "#e3b04b", "#d4542e", "#9aa0a8"];
  const TOPC  = ["#5aa9f0", "#ff8a35", "#ffffff", "#2b2f3a", "#7fae5a", "#e8413a", "#b57be0"];
  const BOTC  = ["#3b5b8c", "#2b2f3a", "#c9b48a", "#7a8592"];

  // ---------- Варианты (бесплатно) ----------
  const OPTIONS = {
    head:  [{ id: "round", name: "Круглое" }, { id: "oval", name: "Овальное" }, { id: "square", name: "Квадратное" }],
    eyes:  [{ id: "round", name: "Круглые" }, { id: "dots", name: "Точки" }, { id: "happy", name: "Радостные" }, { id: "lashes", name: "С ресницами" }],
    mouth: [{ id: "smile", name: "Улыбка" }, { id: "grin", name: "Широкая" }, { id: "calm", name: "Спокойная" }, { id: "open", name: "Удивление" }],
    hair:  [
      { id: "short", name: "Короткая" }, { id: "side", name: "Пробор" }, { id: "curly", name: "Кудри" }, { id: "buzz", name: "Ёжик" },
      { id: "long", name: "Длинные" }, { id: "bob", name: "Каре" }, { id: "pony", name: "Хвост" }, { id: "curlylong", name: "Длинные кудри" }
    ],
    top:    [{ id: "tee", name: "Футболка" }, { id: "hoodie", name: "Худи" }, { id: "shirt", name: "Рубашка" }],
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
      head: "round", skin: 1, eyes: f ? "lashes" : "round", mouth: "smile",
      hair: f ? "long" : "short", hairColor: 1,
      top: "tee", topColor: 0, bottom: f ? "skirt" : "jeans", bottomColor: 0,
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
  function headShape(c, fill) {
    if (c.head === "oval")   return `<ellipse cx="100" cy="90" rx="45" ry="56" fill="${fill}"/>`;
    if (c.head === "square") return `<rect x="52" y="36" width="96" height="106" rx="36" fill="${fill}"/>`;
    return `<ellipse cx="100" cy="90" rx="51" ry="53" fill="${fill}"/>`;
  }
  function earsX(c) { return c.head === "oval" ? [56, 144] : [49, 151]; }

  function hairBack(c, col) {
    switch (c.hair) {
      case "long":      return `<path d="M44 80 C38 8 162 8 156 80 L162 186 C140 198 60 198 38 186 Z" fill="${col}"/>`;
      case "bob":       return `<path d="M44 82 C38 8 162 8 156 82 L160 142 C140 152 60 152 40 142 Z" fill="${col}"/>`;
      case "curlylong": return [[50,110],[46,140],[52,170],[150,110],[154,140],[148,170],[70,182],[100,188],[130,182]]
                          .map(([x,y]) => `<circle cx="${x}" cy="${y}" r="22" fill="${col}"/>`).join("");
      case "pony":      return `<ellipse cx="160" cy="96" rx="17" ry="40" fill="${col}" transform="rotate(14 160 96)"/><circle cx="152" cy="62" r="8" fill="#ff8a35"/>`;
      default: return "";
    }
  }
  function hairFront(c, col) {
    const dark = shade(col, -0.18);
    switch (c.hair) {
      case "short": return `<path d="M47 92 C40 8 160 8 153 92 C142 66 122 58 100 62 C80 58 60 66 47 92 Z" fill="${col}"/>`;
      case "side":  return `<path d="M47 94 C38 6 162 6 153 94 C150 70 140 58 118 55 C98 68 68 62 47 94 Z" fill="${col}"/><path d="M118 55 C112 46 104 42 96 40" stroke="${dark}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      case "buzz":  return `<path d="M50 80 C48 16 152 16 150 80 C130 64 70 64 50 80 Z" fill="${col}" opacity=".9"/>`;
      case "curly": return [[58,62],[76,46],[100,40],[124,46],[142,62],[66,78],[134,78],[88,54],[112,54]]
                      .map(([x,y]) => `<circle cx="${x}" cy="${y}" r="17" fill="${col}"/>`).join("");
      case "long":
      case "pony":  return `<path d="M46 100 C36 6 164 6 154 100 C150 70 124 52 102 58 L100 66 L98 58 C76 52 50 70 46 100 Z" fill="${col}"/>`;
      case "bob":   return `<path d="M45 96 C38 8 162 8 155 96 L155 74 C132 68 68 68 45 74 Z" fill="${col}"/>`;
      case "curlylong": return [[58,64],[78,48],[100,42],[122,48],[142,64],[52,86],[148,86]]
                      .map(([x,y]) => `<circle cx="${x}" cy="${y}" r="17" fill="${col}"/>`).join("");
      default: return "";
    }
  }

  function eyes(c, hairCol) {
    const L = 82, R = 118, Y = 92, ink = "#23263a";
    const brow = shade(hairCol, -0.1);
    const brows = `<path d="M${L-9} ${Y-16} Q${L} ${Y-21} ${L+9} ${Y-16}" stroke="${brow}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                   <path d="M${R-9} ${Y-16} Q${R} ${Y-21} ${R+9} ${Y-16}" stroke="${brow}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    let e = "";
    if (c.eyes === "happy") {
      e = [L, R].map(x => `<path d="M${x-8} ${Y+2} Q${x} ${Y-7} ${x+8} ${Y+2}" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join("");
    } else if (c.eyes === "dots") {
      e = [L, R].map(x => `<g class="av-eye"><ellipse cx="${x}" cy="${Y}" rx="5" ry="6.5" fill="${ink}"/><circle cx="${x+1.8}" cy="${Y-2.5}" r="1.7" fill="#fff"/></g>`).join("");
    } else {
      e = [L, R].map(x => `<g class="av-eye"><ellipse cx="${x}" cy="${Y}" rx="9.5" ry="10" fill="#fff"/><circle cx="${x+1.5}" cy="${Y+1}" r="5.6" fill="${ink}"/><circle cx="${x+3.2}" cy="${Y-1.5}" r="1.9" fill="#fff"/></g>`).join("");
      if (c.eyes === "lashes") e += `<path d="M${L-9} ${Y-5} l-5 -3 M${L-6} ${Y-8} l-3 -4 M${R+9} ${Y-5} l5 -3 M${R+6} ${Y-8} l3 -4" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    return brows + e;
  }
  function mouth(c) {
    const ink = "#7a3a1a";
    switch (c.mouth) {
      case "grin": return `<path d="M86 110 Q100 128 114 110 Z" fill="${ink}"/><path d="M89 111 Q100 116 111 111 Z" fill="#fff"/>`;
      case "calm": return `<path d="M92 115 Q100 118 108 115" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
      case "open": return `<ellipse cx="100" cy="116" rx="6" ry="7.5" fill="${ink}"/>`;
      default:     return `<path d="M88 111 Q100 123 112 111" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    }
  }

  // Верх: футболка / худи / рубашка (+ руки)
  function torso(c, pose) {
    const col = TOPC[c.topColor] || TOPC[0], dk = shade(col, -0.14), skin = SKIN[c.skin];
    const armL = pose === "walk" ? "rotate(14 64 156)" : "rotate(0)";
    const armR = pose === "walk" ? "rotate(-14 136 156)" : "rotate(0)";
    const longSleeve = c.top !== "tee";
    const arm = (side, tr) => {
      const x0 = side === "L" ? 64 : 136, x1 = side === "L" ? 54 : 146;
      return `<g class="av-arm-${side.toLowerCase()}" transform="${tr}">
        <line x1="${x0}" y1="156" x2="${x1}" y2="214" stroke="${longSleeve ? col : skin}" stroke-width="16" stroke-linecap="round"/>
        ${longSleeve ? "" : `<line x1="${x0}" y1="156" x2="${x0 + (x1 - x0) * .35}" y2="176" stroke="${col}" stroke-width="18" stroke-linecap="round"/>`}
        <circle cx="${x1}" cy="218" r="9" fill="${skin}"/></g>`;
    };
    let body = `<path d="M62 160 Q64 146 84 144 L116 144 Q136 146 138 160 L136 232 L64 232 Z" fill="${col}"/>
                <path d="M118 148 Q136 150 137 166 L136 232 L122 232 Z" fill="${dk}" opacity=".55"/>`;
    if (c.top === "tee")    body += `<path d="M88 144 Q100 156 112 144" stroke="${dk}" stroke-width="3" fill="none"/>`;
    if (c.top === "hoodie") body += `<path d="M80 146 Q100 168 120 146" fill="${dk}"/><line x1="94" y1="156" x2="93" y2="178" stroke="#fff" stroke-width="2.5"/><line x1="106" y1="156" x2="107" y2="178" stroke="#fff" stroke-width="2.5"/><rect x="80" y="196" width="40" height="22" rx="8" fill="${dk}"/>`;
    if (c.top === "shirt")  body += `<path d="M86 144 L100 160 L114 144 L108 140 L100 150 L92 140 Z" fill="#fff"/><line x1="100" y1="160" x2="100" y2="230" stroke="${dk}" stroke-width="2"/>` +
                              [172, 190, 208].map(y => `<circle cx="100" cy="${y}" r="2.6" fill="${dk}"/>`).join("");
    return arm("L", armL) + arm("R", armR) + body;
  }

  // Низ: брюки / шорты / юбка (+ ноги, обувь)
  function legs(c, pose) {
    const col = BOTC[c.bottomColor] || BOTC[0], skin = SKIN[c.skin];
    const shoe = "#2b2f3a";
    const lw = pose === "walk" ? ["rotate(10 84 236)", "rotate(-10 116 236)"] : pose === "sit" ? ["rotate(-70 84 236)", "rotate(-70 116 236)"] : ["", ""];
    const leg = (x, tr, cls) => {
      const pants = c.bottom === "jeans";
      return `<g class="${cls}" transform="${tr}">
        <rect x="${x - 12}" y="230" width="24" height="52" rx="10" fill="${pants ? col : skin}"/>
        <ellipse cx="${x + (x < 100 ? -3 : 3)}" cy="286" rx="17" ry="8" fill="${shoe}"/>
        <rect x="${x - 16}" y="281" width="32" height="4" rx="2" fill="#fff" opacity=".7"/></g>`;
    };
    let s = leg(84, lw[0], "av-leg-l") + leg(116, lw[1], "av-leg-r");
    if (c.bottom === "jeans")  s += `<rect x="64" y="224" width="72" height="20" rx="8" fill="${col}"/>`;
    if (c.bottom === "shorts") s += `<path d="M64 224 L136 224 L138 256 L104 256 L100 246 L96 256 L62 256 Z" fill="${col}"/>`;
    if (c.bottom === "skirt")  s += `<path d="M66 222 L134 222 L146 262 Q100 272 54 262 Z" fill="${col}"/>`;
    return s;
  }

  // ---------- Платные вещи ----------
  function outerwear(c) {
    if (c.outer === "leather") return `
      <path d="M60 162 Q62 146 84 143 L96 146 L92 232 L62 232 Z" fill="#2b2b33"/>
      <path d="M140 162 Q138 146 116 143 L104 146 L108 232 L138 232 Z" fill="#2b2b33"/>
      <path d="M84 143 L96 146 L90 170 Z M116 143 L104 146 L110 170 Z" fill="#45454f"/>
      <line x1="64" y1="156" x2="54" y2="212" stroke="#2b2b33" stroke-width="17" stroke-linecap="round"/>
      <line x1="136" y1="156" x2="146" y2="212" stroke="#2b2b33" stroke-width="17" stroke-linecap="round"/>
      <circle cx="96" cy="200" r="2" fill="#c9c9d1"/><circle cx="104" cy="200" r="2" fill="#c9c9d1"/>`;
    if (c.outer === "puffer") return `
      <path d="M58 164 Q60 142 86 140 L114 140 Q140 142 142 164 L140 236 L60 236 Z" fill="#ff8a35"/>
      ${[170, 192, 214].map(y => `<path d="M60 ${y} Q100 ${y + 7} 140 ${y}" stroke="#e46d1c" stroke-width="3" fill="none"/>`).join("")}
      <line x1="100" y1="142" x2="100" y2="236" stroke="#e46d1c" stroke-width="3"/>
      <line x1="64" y1="156" x2="53" y2="212" stroke="#ff8a35" stroke-width="20" stroke-linecap="round"/>
      <line x1="136" y1="156" x2="147" y2="212" stroke="#ff8a35" stroke-width="20" stroke-linecap="round"/>
      <rect x="82" y="132" width="36" height="16" rx="8" fill="#e46d1c"/>`;
    return "";
  }
  function hat(c) {
    if (c.hat === "beanie") return `
      <path d="M48 70 C48 22 152 22 152 70 Z" fill="#e8413a"/>
      <rect x="44" y="62" width="112" height="18" rx="9" fill="#c62f29"/>
      ${[60, 80, 100, 120, 140].map(x => `<line x1="${x}" y1="64" x2="${x}" y2="78" stroke="#a8241f" stroke-width="3"/>`).join("")}
      <circle cx="100" cy="22" r="13" fill="#ffffff"/>`;
    if (c.hat === "cap") return `
      <path d="M50 74 C50 26 150 26 150 74 Z" fill="#5aa9f0"/>
      <path d="M100 66 Q150 62 176 76 Q150 84 100 78 Z" fill="#3a8ad6"/>
      <circle cx="100" cy="30" r="5" fill="#3a8ad6"/>
      <path d="M86 52 L92 40 L98 52 L104 38 L110 52" stroke="#ff8a35" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (c.hat === "crown") return `
      <path d="M62 50 L70 18 L86 40 L100 8 L114 40 L130 18 L138 50 Z" fill="#ffc928" stroke="#e0a400" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="100" cy="30" r="5" fill="#ff8a35"/><circle cx="78" cy="38" r="4" fill="#5aa9f0"/><circle cx="122" cy="38" r="4" fill="#5aa9f0"/>
      <path d="M100 8 L96 -8 M100 8 L104 -8" stroke="#ff8a35" stroke-width="4" stroke-linecap="round"/>`;
    return "";
  }
  function glasses(c) {
    if (c.glasses !== "sunglass") return "";
    return `<rect x="66" y="82" width="30" height="20" rx="8" fill="#23263a"/><rect x="104" y="82" width="30" height="20" rx="8" fill="#23263a"/>
            <line x1="96" y1="90" x2="104" y2="90" stroke="#23263a" stroke-width="4"/>
            <line x1="70" y1="86" x2="78" y2="86" stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>
            <line x1="108" y1="86" x2="116" y2="86" stroke="#fff" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>`;
  }

  // ---------- Сборка ----------
  function svg(cfg, opts) {
    const c = Object.assign(defaults("m"), cfg || {});
    const pose = (opts && opts.pose) || "stand";
    const skin = SKIN[c.skin] || SKIN[1], hairCol = HAIRC[c.hairColor] || HAIRC[1];
    const [ex1, ex2] = earsX(c);
    const hideHairTop = c.hat === "beanie" || c.hat === "cap";
    const vb = opts && opts.view === "head" ? "36 -6 128 136" : "0 -14 200 314";
    return `<svg class="hb-avatar pose-${pose}" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="292" rx="52" ry="7" fill="#1e3c6e" opacity=".12"/>
      ${hairBack(c, hairCol)}
      ${legs(c, pose)}
      <rect x="89" y="128" width="22" height="22" rx="6" fill="${shade(skin, -0.08)}"/>
      ${torso(c, pose)}
      ${outerwear(c)}
      <circle cx="${ex1}" cy="94" r="10" fill="${skin}"/><circle cx="${ex2}" cy="94" r="10" fill="${skin}"/>
      <g class="av-head">
        ${headShape(c, skin)}
        <ellipse cx="72" cy="108" rx="9" ry="5.5" fill="#f07a5e" opacity=".35"/>
        <ellipse cx="128" cy="108" rx="9" ry="5.5" fill="#f07a5e" opacity=".35"/>
        <path d="M99 99 Q103 104 99 106" stroke="${shade(skin, -0.25)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        ${eyes(c, hairCol)}
        ${mouth(c)}
        ${hideHairTop ? (c.hair === "long" || c.hair === "bob" || c.hair === "pony" || c.hair === "curlylong" ? `<path d="M47 76 C46 90 47 100 48 104 L58 80 Z M153 76 C154 90 153 100 152 104 L142 80 Z" fill="${hairCol}"/>` : "") : hairFront(c, hairCol)}
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
    } else if (tab === "hair") {
      h += optionRow("Причёска", "hair", OPTIONS.hair, "head");
      h += swatchRow("Цвет волос", "hairColor", HAIRC);
    } else if (tab === "wear") {
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
