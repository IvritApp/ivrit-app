// =====================================================
// places.js — «ЖИВЫЕ МЕСТА» для квестов уровней 3–10
//   Как маколет (store.js): заходишь внутрь, ходишь по 3 частям места (свайп или кнопки),
//   нажимаешь на предметы из списка; хозяин места разговаривает с тобой.
//   const st = createPlace(viewEl, { place: "apartment", gender, profile })
//   API — такой же, как у createStore: say, hide, look, current, views, onPick, pick, shake, food, wrap, destroy
//   + viewNames (названия частей), hostName (кто говорит), itemIcon(kind, size) (значки для «Моего заказа»)
//   Новое место = запись в PLACES ниже (фон, вход, хозяин, предметы).
// =====================================================
(function () {
  const VW = 360, VH = 440, NV = 3, W = 1080;
  const FOCUS = [180, 540, 900];
  const ink = "#2b2f3a";
  const HL = (x, y, rx, ry, o) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o || .4}"/>`;
  const SHD = (x, y, rx, ry, o) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o || .12}"/>`;

  // ---------- Общий пол и стены ----------
  function planks(y0, y1, c1, c2) {
    let s = `<rect x="0" y="${y0}" width="${W}" height="${y1 - y0}" fill="${c1}"/>`;
    for (let y = y0 + 12; y < y1; y += 14) s += `<path d="M0,${y} L${W},${y}" stroke="${c2}" stroke-width="1.2" opacity=".6"/>`;
    for (let i = 0; i < 40; i++) { const y = y0 + 6 + (i % 4) * 14, x = (i * 97) % W; s += `<path d="M${x},${y - 6} L${x},${y + 6}" stroke="${c2}" stroke-width="1" opacity=".5"/>`; }
    return s;
  }
  // проём между комнатами
  const doorway = (x) => `<rect x="${x - 10}" y="60" width="20" height="332" fill="#000" opacity=".06"/><rect x="${x - 3}" y="60" width="6" height="332" fill="#fff" opacity=".5"/>`;

  // =====================================================
  // ПРЕДМЕТЫ. Каждый рисуется в своей коробке (vb: [ширина, высота]).
  // Одна и та же картинка — и в комнате (большая), и значком в «Моём заказе».
  // =====================================================
  const ART = {
    // --- квартира ---
    bed: { vb: [190, 120], svg: () => `${SHD(95, 116, 92, 5)}
      <rect x="4" y="10" width="20" height="104" rx="5" fill="#8a5a36"/><rect x="166" y="46" width="20" height="68" rx="5" fill="#8a5a36"/>
      <rect x="18" y="56" width="154" height="36" rx="6" fill="#f4f6fa"/>
      <path d="M60,52 L172,52 L172,92 L60,92Z" fill="#5aa9f0"/><path d="M60,52 Q116,44 172,52 L172,62 Q116,56 60,62Z" fill="#7fc0f5"/>
      ${[80, 104, 128, 152].map(x => `<circle cx="${x}" cy="76" r="3" fill="#fff" opacity=".55"/>`).join("")}
      <rect x="26" y="40" width="40" height="22" rx="10" fill="#fff"/><rect x="28" y="42" width="36" height="6" rx="3" fill="#e9eef5"/>
      <rect x="18" y="90" width="154" height="16" rx="4" fill="#a87442"/><rect x="24" y="104" width="10" height="12" fill="#6b4426"/><rect x="156" y="104" width="10" height="12" fill="#6b4426"/>` },
    window: { vb: [120, 120], svg: () => `
      <rect x="0" y="0" width="120" height="112" rx="4" fill="#fff"/>
      <rect x="8" y="8" width="104" height="96" fill="#9fd3f5"/><circle cx="88" cy="30" r="12" fill="#ffd54f"/>
      <path d="M8,84 Q30,66 52,80 Q74,62 112,78 L112,104 L8,104Z" fill="#c9e8b0"/>
      <rect x="20" y="58" width="14" height="30" fill="#e9dcc6"/><rect x="40" y="48" width="18" height="40" fill="#f2e6d0"/><rect x="64" y="62" width="14" height="26" fill="#e9dcc6"/>
      <rect x="57" y="8" width="6" height="96" fill="#fff"/><rect x="8" y="53" width="104" height="5" fill="#fff"/>
      <path d="M-6,-2 L22,-2 Q14,56 26,114 L-6,114Z" fill="#e8913a" opacity=".9"/><path d="M126,-2 L98,-2 Q106,56 94,114 L126,114Z" fill="#e8913a" opacity=".9"/>
      <rect x="-10" y="-6" width="140" height="6" rx="3" fill="#8a5a36"/><rect x="-4" y="110" width="128" height="8" rx="2" fill="#f4f0e8"/>` },
    table: { vb: [150, 80], svg: () => `${SHD(75, 77, 70, 4)}
      <rect x="0" y="10" width="150" height="12" rx="3" fill="#b98a58"/><rect x="0" y="8" width="150" height="5" rx="2" fill="#d2a571"/>
      <rect x="12" y="22" width="9" height="56" fill="#8a5a36"/><rect x="129" y="22" width="9" height="56" fill="#8a5a36"/>
      <rect x="30" y="-4" width="26" height="14" rx="3" fill="#fff"/><path d="M33,-4 L53,-4" stroke="#e9eef5" stroke-width="3"/>
      <path d="M96,10 L98,-14 Q104,-20 110,-14 L112,10Z" fill="#7fc0f5" opacity=".7"/><path d="M104,-16 Q99,-30 92,-28 M104,-16 Q110,-32 117,-27" stroke="#3f8f4c" stroke-width="2" fill="none"/>
      <circle cx="92" cy="-28" r="4" fill="#ff8a35"/><circle cx="117" cy="-27" r="4" fill="#e8413a"/>` },
    fridge: { vb: [92, 230], svg: () => `${SHD(46, 228, 44, 4)}
      <rect x="0" y="0" width="92" height="226" rx="10" fill="#eef2f6"/><rect x="0" y="0" width="92" height="226" rx="10" fill="none" stroke="#c8d0d8" stroke-width="3"/>
      <path d="M2,84 L90,84" stroke="#c8d0d8" stroke-width="3"/><rect x="74" y="24" width="7" height="44" rx="3.5" fill="#aeb6be"/><rect x="74" y="98" width="7" height="60" rx="3.5" fill="#aeb6be"/>
      <rect x="14" y="16" width="26" height="20" rx="2" fill="#fff" transform="rotate(-6 27 26)"/><circle cx="27" cy="18" r="3" fill="#e8413a"/>
      <rect x="18" y="104" width="16" height="16" rx="3" fill="#ffd54f"/><rect x="40" y="120" width="14" height="14" rx="7" fill="#5aa9f0"/>
      ${HL(18, 60, 6, 24, .5)}` },
    balcony: { vb: [112, 300], svg: () => `
      <rect x="0" y="0" width="112" height="300" rx="3" fill="#fff"/><rect x="8" y="8" width="96" height="292" fill="#a9dcf7"/>
      <circle cx="80" cy="44" r="14" fill="#ffd54f" opacity=".9"/>
      <path d="M8,150 Q40,128 70,146 Q90,134 104,144 L104,170 L8,170Z" fill="#9cd08a"/>
      <rect x="8" y="196" width="96" height="6" fill="#5b6470"/>${[16, 32, 48, 64, 80, 96].map(x => `<rect x="${x}" y="200" width="3" height="58" fill="#5b6470"/>`).join("")}
      <rect x="8" y="256" width="96" height="44" fill="#d9c9ab"/>
      <rect x="20" y="222" width="22" height="34" rx="3" fill="#c96f39"/><path d="M31,222 Q16,196 24,186 M31,222 Q34,190 44,184 M31,222 Q48,206 52,196" stroke="#3f8f4c" stroke-width="4" fill="none" stroke-linecap="round"/>
      <rect x="54" y="8" width="4" height="292" fill="#fff"/><rect x="40" y="140" width="5" height="26" rx="2.5" fill="#aeb6be"/>
      ${HL(30, 70, 8, 40, .45)}${HL(84, 110, 6, 30, .35)}` },
    key: { vb: [60, 40], svg: () => `<circle cx="14" cy="20" r="12" fill="#f2b632"/><circle cx="14" cy="20" r="5" fill="#fff"/>
      <rect x="24" y="16" width="32" height="8" rx="3" fill="#f2b632"/><rect x="44" y="24" width="6" height="9" fill="#f2b632"/><rect x="34" y="24" width="5" height="7" fill="#f2b632"/>${HL(10, 13, 4, 2, .6)}` },
    // ложные (их нет в списке)
    wardrobe: { vb: [120, 240], svg: () => `${SHD(60, 238, 58, 4)}<rect x="0" y="0" width="120" height="236" rx="4" fill="#c99a63"/>
      <rect x="6" y="8" width="52" height="220" rx="2" fill="#d6ab76"/><rect x="62" y="8" width="52" height="220" rx="2" fill="#d6ab76"/>
      <rect x="48" y="100" width="5" height="26" rx="2.5" fill="#7a5230"/><rect x="67" y="100" width="5" height="26" rx="2.5" fill="#7a5230"/>
      <rect x="-4" y="-4" width="128" height="8" rx="3" fill="#a87442"/>` },
    lamp: { vb: [70, 120], svg: () => `${SHD(35, 118, 32, 3)}<rect x="0" y="62" width="70" height="56" rx="4" fill="#a87442"/><rect x="6" y="74" width="58" height="16" rx="2" fill="#c99a63"/><circle cx="35" cy="82" r="2.5" fill="#6b4426"/>
      <rect x="32" y="22" width="6" height="40" fill="#5b6470"/><path d="M14,26 L56,26 L46,0 L24,0Z" fill="#ffe08a"/><path d="M24,0 L46,0 L48,6 L22,6Z" fill="#fff" opacity=".4"/>` },
    sofa: { vb: [150, 90], svg: () => `${SHD(75, 88, 72, 4)}<rect x="10" y="10" width="130" height="44" rx="12" fill="#7fae5a"/>
      <rect x="0" y="40" width="150" height="40" rx="10" fill="#6c9a4a"/><rect x="0" y="30" width="24" height="50" rx="10" fill="#7fae5a"/><rect x="126" y="30" width="24" height="50" rx="10" fill="#7fae5a"/>
      <rect x="28" y="34" width="44" height="18" rx="7" fill="#8fbe6a"/><rect x="78" y="34" width="44" height="18" rx="7" fill="#8fbe6a"/>
      <rect x="12" y="78" width="8" height="10" fill="#5b3a22"/><rect x="130" y="78" width="8" height="10" fill="#5b3a22"/><rect x="52" y="24" width="24" height="20" rx="5" fill="#ffd54f" transform="rotate(-10 64 34)"/>` },
    tv: { vb: [110, 110], svg: () => `<rect x="0" y="0" width="110" height="66" rx="5" fill="#2b2f3a"/><rect x="5" y="5" width="100" height="56" rx="2" fill="#4a6c8c"/>
      <path d="M5,48 Q35,30 60,44 Q80,34 105,42 L105,61 L5,61Z" fill="#5f8fb4"/>${HL(28, 20, 16, 5, .25)}
      <rect x="0" y="80" width="110" height="30" rx="3" fill="#a87442"/><rect x="50" y="66" width="10" height="14" fill="#2b2f3a"/>` },
    stove: { vb: [86, 100], svg: () => `<rect x="0" y="0" width="86" height="100" rx="4" fill="#e3e8ee"/><rect x="0" y="0" width="86" height="16" rx="4" fill="#3b4352"/>
      ${[14, 32, 54, 72].map(x => `<circle cx="${x}" cy="8" r="4" fill="#c8d0d8"/>`).join("")}<rect x="8" y="28" width="70" height="56" rx="4" fill="#3b4352"/><rect x="14" y="34" width="58" height="10" rx="2" fill="#5b6470"/>
      <rect x="20" y="-18" width="40" height="18" rx="4" fill="#5b6470"/><rect x="16" y="-20" width="48" height="5" rx="2" fill="#7b8592"/>` },
    sink: { vb: [90, 60], svg: () => `<rect x="0" y="18" width="90" height="42" rx="3" fill="#cfd8e0"/><rect x="10" y="22" width="70" height="20" rx="8" fill="#aeb9c4"/>
      <path d="M45,20 L45,2 Q45,-6 54,-6 L60,-6" stroke="#8d969f" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="34" y="12" width="22" height="6" rx="3" fill="#8d969f"/>` },
    chair: { vb: [60, 100], svg: () => `${SHD(30, 98, 26, 3)}<rect x="8" y="0" width="44" height="52" rx="6" fill="#c99a63"/><rect x="14" y="6" width="32" height="40" rx="4" fill="#d6ab76"/>
      <rect x="0" y="50" width="60" height="12" rx="3" fill="#b98a58"/><rect x="4" y="62" width="7" height="36" fill="#8a5a36"/><rect x="49" y="62" width="7" height="36" fill="#8a5a36"/>` },
    plant: { vb: [60, 110], svg: () => `${SHD(30, 108, 24, 3)}<path d="M14,70 L46,70 L42,106 L18,106Z" fill="#c96f39"/><rect x="12" y="66" width="36" height="8" rx="2" fill="#dc8550"/>
      <path d="M30,68 Q6,40 12,18 Q24,40 30,68 Q34,30 48,8 Q46,44 30,68 Q52,52 58,34 Q54,60 30,68" fill="#4f9d5d"/>` },
  };

  // ---------- Подарки в конце квеста (вместо PNG) ----------
  const GIFTS = {
    "gift-key": () => `<svg viewBox="0 0 120 120" width="100%" height="100%">
      <ellipse cx="60" cy="110" rx="40" ry="6" fill="#000" opacity=".1"/>
      <path d="M78,20 L104,20 L104,52 L78,52Z" fill="#fff" stroke="#e1d6c4" stroke-width="2" transform="rotate(12 91 36)"/>
      <text x="91" y="41" text-anchor="middle" font-size="11" font-weight="700" fill="#3a8ad6" font-family="Arial" transform="rotate(12 91 36)">דירה</text>
      <path d="M70,40 Q78,34 84,30" stroke="#c9a06a" stroke-width="2" fill="none"/>
      <circle cx="40" cy="60" r="26" fill="#f2b632"/><circle cx="40" cy="60" r="11" fill="#fff"/><circle cx="40" cy="60" r="26" fill="none" stroke="#d99a1e" stroke-width="3"/>
      <rect x="62" y="52" width="48" height="16" rx="5" fill="#f2b632"/><rect x="94" y="66" width="10" height="16" rx="2" fill="#f2b632"/><rect x="78" y="66" width="8" height="12" rx="2" fill="#f2b632"/>
      ${HL(30, 46, 9, 4, .6)}</svg>`,
  };
  window.placeGift = (img) => (GIFTS[img] ? GIFTS[img]() : "");

  // =====================================================
  // МЕСТА
  // =====================================================
  const PLACES = {
    apartment: {
      viewNames: ["Спальня", "Гостиная", "Кухня"],
      sky: "#e9e4dc",
      basket: "🔎",
      hostName: "Хозяин квартиры",
      // хозяин: пожилой мужчина с седыми волосами и бородой
      host: { view: 1, x: 470, y: 148, cfg: { head: "round", skin: 1, eyes: "round", mouth: "smile", hair: "short", hairColor: 5, top: "shirt", topColor: 2,
              bottom: "jeans", bottomColor: 4, gender: "m", body: "base", beard: "short", payot: "none", headwear: "none" } },
      goodsAt: [414, 52],
      bg: () => `
        <!-- стены трёх комнат -->
        <rect x="0" y="0" width="360" height="392" fill="#dfe9f4"/><rect x="360" y="0" width="360" height="392" fill="#f4e7d4"/><rect x="720" y="0" width="360" height="392" fill="#e4efdf"/>
        <rect x="0" y="0" width="${W}" height="18" fill="#fff" opacity=".55"/><rect x="0" y="380" width="${W}" height="12" fill="#fff" opacity=".6"/>
        <!-- обои: спальня — точки, гостиная — полоски, кухня — плитка -->
        ${Array.from({ length: 60 }, (_, i) => `<circle cx="${18 + (i % 10) * 36}" cy="${40 + Math.floor(i / 10) * 56}" r="2.2" fill="#c3d4e6"/>`).join("")}
        ${Array.from({ length: 12 }, (_, i) => `<rect x="${372 + i * 30}" y="18" width="10" height="362" fill="#ead9c0" opacity=".7"/>`).join("")}
        ${Array.from({ length: 9 }, (_, c) => Array.from({ length: 3 }, (_, r) => `<rect x="${724 + c * 40}" y="${150 + r * 30}" width="38" height="28" fill="#fff" opacity=".55"/>`).join("")).join("")}
        ${planks(392, 440, "#c99a63", "#a87442")}
        ${doorway(360)}${doorway(720)}
        <!-- спальня: картина и тумбочка -->
        <rect x="150" y="70" width="0" height="0"/>
        <!-- гостиная: картина с Иерусалимом -->
        <rect x="380" y="64" width="84" height="60" rx="3" fill="#a87442"/><rect x="386" y="70" width="72" height="48" fill="#ffe7b0"/>
        <path d="M386,108 L404,92 L416,100 L430,84 L446,98 L458,92 L458,118 L386,118Z" fill="#d9a35a"/><circle cx="430" cy="82" r="7" fill="#f2b632"/>
        <!-- лампа под потолком в гостиной -->
        <path d="M540,0 L540,40" stroke="#5b6470" stroke-width="2"/><path d="M516,40 L564,40 L556,58 L524,58Z" fill="#ffd54f"/>
        <!-- кухня: шкафчики сверху -->
        <rect x="730" y="40" width="210" height="74" rx="3" fill="#7fae5a"/>${[0, 1, 2].map(i => `<rect x="${736 + i * 68}" y="46" width="62" height="62" rx="2" fill="#8fbe6a"/><rect x="${762 + i * 68}" y="96" width="10" height="4" rx="2" fill="#5b6470"/>`).join("")}
        <rect x="730" y="246" width="210" height="10" fill="#e9e1d2"/><rect x="730" y="256" width="210" height="124" fill="#7fae5a"/>
        ${[0, 1, 2].map(i => `<rect x="${736 + i * 68}" y="262" width="62" height="112" rx="2" fill="#8fbe6a"/><rect x="${762 + i * 68}" y="270" width="10" height="4" rx="2" fill="#5b6470"/>`).join("")}`,
      spots: [
        { kind: "wardrobe", view: 0, x: 14, y: 152, w: 112, h: 236 },
        { kind: "window", view: 0, x: 196, y: 64, w: 120, h: 120 },
        { kind: "lamp", view: 0, x: 128, y: 300, w: 46, h: 82 },
        { kind: "bed", view: 0, x: 178, y: 272, w: 180, h: 118 },
        { kind: "tv", view: 1, x: 378, y: 240, w: 90, h: 90 },
        { kind: "sofa", view: 1, x: 382, y: 312, w: 130, h: 78 },
        { kind: "balcony", view: 1, x: 604, y: 84, w: 104, h: 300 },
        { kind: "plant", view: 1, x: 556, y: 300, w: 48, h: 88 },
        { kind: "stove", view: 2, x: 806, y: 182, w: 64, h: 74 },
        { kind: "sink", view: 2, x: 742, y: 196, w: 60, h: 40 },
        { kind: "table", view: 2, x: 772, y: 316, w: 140, h: 75 },
        { kind: "chair", view: 2, x: 742, y: 314, w: 44, h: 74 },
        { kind: "fridge", view: 2, x: 966, y: 160, w: 92, h: 230 },
      ],
      // вход: подъезд и дверь квартиры
      facade: () => `<svg viewBox="0 0 360 440" width="360" height="440">
        <rect width="360" height="440" fill="#e9e4dc"/>${Array.from({ length: 11 }, (_, i) => `<path d="M0,${i * 40} L360,${i * 40}" stroke="#ddd5c8" stroke-width="2"/>`).join("")}
        <rect y="392" width="360" height="48" fill="#b9b1a3"/>
        <rect x="104" y="96" width="152" height="296" rx="4" fill="#6b4426"/>
        <rect class="mk-door-l" x="110" y="102" width="70" height="290" fill="#8a5a36" stroke="#5b3a22" stroke-width="2"/>
        <rect class="mk-door-r" x="180" y="102" width="70" height="290" fill="#8a5a36" stroke="#5b3a22" stroke-width="2"/>
        <rect x="150" y="60" width="60" height="26" rx="4" fill="#fff"/><text x="180" y="79" text-anchor="middle" font-size="17" font-weight="700" fill="#3a8ad6" font-family="Arial">5</text>
        <rect x="272" y="220" width="22" height="34" rx="4" fill="#3b4352"/><circle cx="283" cy="236" r="5" fill="#ffd54f"/>
        <rect x="140" y="392" width="80" height="10" rx="3" fill="#a3402f"/><text x="180" y="400" text-anchor="middle" font-size="7" fill="#fff" font-family="Arial">ברוכים הבאים</text>
        <rect x="20" y="300" width="40" height="92" rx="3" fill="#c96f39"/><path d="M40,300 Q16,250 24,230 M40,300 Q44,240 58,222" stroke="#3f8f4c" stroke-width="6" fill="none" stroke-linecap="round"/>
      </svg>`,
    },
  };
  window.PLACES = PLACES;

  // ---------- Значок предмета (для «Моего заказа», полёта и т. п.) ----------
  function icon(kind, size) {
    const a = ART[kind];
    if (!a) return `<span style="font-size:${size * .7}px">⭐</span>`;
    const [w, h] = a.vb;
    return `<svg viewBox="${-w * .08} ${-h * .12} ${w * 1.16} ${h * 1.2}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" overflow="visible">${a.svg()}</svg>`;
  }
  window.placeItemIcon = icon;

  function spotHTML(s, i) {
    const a = ART[s.kind];
    if (!a) return "";
    const [w, h] = a.vb;
    return `<g class="mk-spot pl-spot" data-i="${i}" data-kind="${s.kind}" transform="translate(${s.x},${s.y})">
      <rect class="mk-hit" x="-4" y="-6" width="${s.w + 8}" height="${s.h + 10}" fill="transparent"/>
      <g class="mk-units"><svg width="${s.w}" height="${s.h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" overflow="visible">${a.svg()}</svg></g></g>`;
  }

  // =====================================================
  // ДВИЖОК
  // =====================================================
  function createPlace(view, opts) {
    opts = opts || {};
    const P = PLACES[opts.place];
    let dead = false, cur = P.host.view;
    const root = document.createElement("div");
    root.className = "hs-stage mk-stage pl-stage pl-" + opts.place;
    root.style.setProperty("--pl-sky", P.sky || "#bfe0f5");
    root.innerHTML = `<div class="mk-world"></div><div class="mk-basket" hidden><span>${P.basket || "🧺"}</span><b>0</b></div>`;
    view.appendChild(root);
    const world = root.querySelector(".mk-world");
    world.innerHTML = `<svg class="mk-world-svg" viewBox="0 0 ${W} 440" width="${W}" height="440">${P.bg()}${P.spots.map(spotHTML).join("")}</svg>`;
    // хозяин места
    const host = document.createElement("div");
    host.className = "mk-seller pl-host";
    host.style.left = P.host.x + "px"; host.style.top = P.host.y + "px";
    let sv = "";
    try { if (window.HirbisAvatar) sv = HirbisAvatar.svg(HirbisAvatar.sanitize(Object.assign(HirbisAvatar.defaults(P.host.cfg.gender), P.host.cfg)), { pose: "stand" }); } catch (e) {}
    host.innerHTML = sv;
    world.appendChild(host);
    if (P.front) world.insertAdjacentHTML("beforeend", `<svg class="mk-over" viewBox="0 0 ${W} 440" width="${W}" height="440">${P.front()}</svg>`);
    const goods = document.createElement("div"); goods.className = "mk-goods"; world.appendChild(goods);
    goods.style.transformOrigin = `${P.host.x + 60}px ${P.host.y + 120}px`;
    const basket = root.querySelector(".mk-basket");
    const meA = document.createElement("div"); meA.className = "mk-anchor me"; root.appendChild(meA);
    const frA = document.createElement("div"); frA.className = "mk-anchor fr"; root.appendChild(frA);
    const who = { seller: host, me: meA, friend: frA };

    // Вход: двери открываются, шаг внутрь
    const intro = document.createElement("div");
    intro.className = "mk-intro"; intro.innerHTML = P.facade();
    root.appendChild(intro);
    const introMs = 3600;
    setTimeout(() => intro.classList.add("open"), 400);
    setTimeout(() => intro.classList.add("walk"), 1700);
    setTimeout(() => { intro.remove(); host.classList.add("wave"); setTimeout(() => host.classList.remove("wave"), 1800); }, introMs);

    let bubble = null, anchor = null, top = false, sc = 1;
    function fit() {
      const w = view.clientWidth, h = view.clientHeight;
      sc = Math.max(w / VW, Math.min(h / VH, w / VW * 1.3));
      const x = Math.min(0, Math.max(w - W * sc, -FOCUS[cur] * sc + w / 2));
      const y = h >= VH * sc ? h - VH * sc : (h - VH * sc) / 2;
      world.style.transform = `translate(${x}px, ${y}px) scale(${sc})`;
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

    const api = { onPick: null };
    world.addEventListener("click", (e) => {
      const g = e.target.closest(".mk-spot");
      if (!g || dead) return;
      e.stopPropagation();
      if (api.onPick) api.onPick(g.dataset.kind, g);
    });
    let sx = null;
    root.addEventListener("pointerdown", e => { sx = e.clientX; });
    root.addEventListener("pointerup", e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 60 && api.onSwipe) api.onSwipe(dx < 0 ? 1 : -1);
    });

    function shake(g) { g.classList.remove("mk-no"); void g.getBBox(); g.classList.add("mk-no"); }
    let found = 0;
    function pick(g) {
      // предмет найден: зелёная галочка + значок летит в счётчик
      const s = P.spots[+g.dataset.i];
      g.insertAdjacentHTML("beforeend", `<g class="pl-check" transform="translate(${s.w - 6},${-2})"><circle r="15" fill="#3cae5c" stroke="#fff" stroke-width="3"/><path d="M-7,0 L-2,5 L8,-6" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`);
      g.classList.add("pl-got");
      const r = g.getBoundingClientRect(), vr = root.getBoundingClientRect();
      const size = Math.min(70, Math.max(40, r.width * .5));
      const fly = document.createElement("div");
      fly.className = "mk-fly";
      fly.innerHTML = icon(g.dataset.kind, size);
      fly.style.left = (r.left - vr.left + r.width / 2 - size / 2) + "px"; fly.style.top = (r.top - vr.top + r.height / 2 - size / 2) + "px";
      root.appendChild(fly);
      basket.hidden = false;
      const br = basket.getBoundingClientRect(), fr = fly.getBoundingClientRect();
      fly.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${(br.left - fr.left) * .5}px, ${(br.top - fr.top) * .5 - 60}px) scale(1.1)`, opacity: 1, offset: .5 },
        { transform: `translate(${br.left - fr.left}px, ${br.top - fr.top}px) scale(.35)`, opacity: .2 }
      ], { duration: 800, easing: "ease-in-out" }).onfinish = () => {
        fly.remove(); found++;
        basket.querySelector("b").textContent = found;
        basket.classList.remove("bump"); void basket.offsetWidth; basket.classList.add("bump");
      };
    }
    // После поиска: найденное собирается на табличке «Найдено» рядом с хозяином
    let board = null;
    function food(kind) {
      const [gx, gy] = P.goodsAt;
      if (!board) {
        board = document.createElement("div");
        board.className = "pl-board";
        board.style.left = gx + "px"; board.style.top = gy + "px";
        board.innerHTML = `<b>${P.boardTitle || "Найдено"}</b><div class="pl-board-row"></div>`;
        goods.appendChild(board);
      }
      const el = document.createElement("div");
      el.className = "mk-good pl-good";
      el.innerHTML = icon(kind, 34);
      board.querySelector(".pl-board-row").appendChild(el);
      el.animate([{ transform: "translate(0, 120px) scale(.4)", opacity: 0 }, { transform: "translate(0, -14px) scale(1.15)", opacity: 1, offset: .6 }, { transform: "none" }],
        { duration: 700, easing: "ease-out", fill: "both" });
      host.classList.remove("mk-scan"); void host.offsetWidth; host.classList.add("mk-scan");
    }
    // Финал: хозяин протягивает подарок (ключ, билет…)
    function wrap(img, cb) {
      if (cur !== P.host.view) look(P.host.view);
      if (board) board.classList.add("pl-board-out");
      setTimeout(() => {
        const b = document.createElement("div");
        b.className = "pl-gift";
        b.style.left = (P.host.x + 10) + "px"; b.style.top = (P.host.y + 96) + "px";
        b.innerHTML = GIFTS[img] ? GIFTS[img]() : `<img src="assets/${img}.png" alt="" style="width:100%;height:100%;object-fit:contain">`;
        goods.appendChild(b);
      }, 900);
      setTimeout(() => goods.classList.add("give"), 2200);
      setTimeout(() => { if (cb) cb(); }, 3600);
    }

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
      b.classList.remove("show"); host.classList.remove("talk");
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
      if (speaker === "seller") { if (cur !== P.host.view) look(P.host.view); host.classList.add("talk"); }
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
    return Object.assign(api, { say, hide, destroy, fit, root, food, wrap, look, pick, shake, introMs,
      current: () => cur, views: NV, viewNames: P.viewNames, hostName: P.hostName, itemIcon: icon });
  }
  window.createPlace = createPlace;
})();
