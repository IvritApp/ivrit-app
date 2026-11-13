#!/usr/bin/env python3
# =====================================================
# Hirbis — ИГРОКИ: аккаунты, прогресс и ники на сервере
#
# Кто ты — узнаём из Telegram (initData). Подделать нельзя: Telegram подписывает
# эти данные ключом бота, а сервер проверяет подпись (ключ — /etc/hirbis/bot.token).
# Аккаунт привязан к Telegram ID → в будущем приложении вход «через Telegram» откроет тот же прогресс.
#
# НИКИ: у игрока до 3 ников (один — основной). Админ может дать любой лимит или «без ограничений».
# У админа ников без ограничений. Ник — отдельная запись (таблица handles) → потом можно сделать рынок ников.
#
# Запросы (POST, JSON, всегда с initData):
#   /hapi/sync {ver, state|null}   /hapi/reset   /hapi/check {handle}
#   /hapi/handle {handle}          — сменить основной ник (старый освобождается)
#   /hapi/nicks/add|main|remove {handle}
#   /hapi/admin/list {q}  /hapi/admin/get {handle}  /hapi/admin/set {handle, ...}  /hapi/admin/log {}
# Команды на сервере:
#   python3 players_api.py make-admin <ник>   |   remove-admin <ник>   |   list
# =====================================================
import hashlib, hmac, json, os, random, re, sqlite3, sys, threading, time
from datetime import datetime, timedelta, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qsl

DB = os.environ.get("PLAYERS_DB", "/var/lib/hirbis/players.db")
TOKEN_FILE = os.environ.get("BOT_TOKEN_FILE", "/etc/hirbis/bot.token")
ORIGINS = {"https://ivritapp.github.io", "http://localhost:8765"}
MSK = timezone(timedelta(hours=3))
INITDATA_MAX_AGE = 7 * 86400
DEFAULT_NICKS = 3
UNLIMITED = -1
LOCK = threading.Lock()
HANDLE_RE = re.compile(r"^[a-z0-9_]{3,32}$")
BAD_NICK = "Ник: 3–32 символа, латинские буквы, цифры и _"


def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS players (
        tg_id INTEGER PRIMARY KEY, handle TEXT UNIQUE, name TEXT, tg_username TEXT,
        created REAL, last_seen REAL, ver INTEGER DEFAULT 0, state TEXT DEFAULT '{}',
        banned_until REAL DEFAULT 0, ban_reason TEXT DEFAULT '', admin INTEGER DEFAULT 0, consent REAL DEFAULT 0)""")
    c.execute("CREATE TABLE IF NOT EXISTS admin_log (at REAL, admin TEXT, target TEXT, what TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS handles (handle TEXT PRIMARY KEY, tg_id INTEGER, created REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS friends (a INTEGER, b INTEGER, status TEXT, at REAL, PRIMARY KEY (a, b))")  # a → b: pending / ok
    cols = [r[1] for r in c.execute("PRAGMA table_info(players)")]
    if "nick_limit" not in cols:
        c.execute(f"ALTER TABLE players ADD COLUMN nick_limit INTEGER DEFAULT {DEFAULT_NICKS}")
    # перенос старых данных: основной ник каждого игрока → в таблицу ников
    c.execute("INSERT OR IGNORE INTO handles SELECT handle, tg_id, created FROM players WHERE handle IS NOT NULL")
    c.commit()
    return c


def token():
    try:
        with open(TOKEN_FILE) as f:
            return f.read().strip()
    except OSError:
        return ""


def check_init_data(init_data):
    tok = token()
    if not tok or not init_data:
        return None
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    got = pairs.pop("hash", "")
    dcs = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", tok.encode(), hashlib.sha256).digest()
    calc = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, got):
        return None
    try:
        if time.time() - int(pairs.get("auth_date", "0")) > INITDATA_MAX_AGE:
            return None
        return json.loads(pairs.get("user", "{}"))
    except Exception:
        return None


# ---------- ФИЛЬТР НЕПРИЛИЧНЫХ НИКОВ ----------
# Ники — латиница, поэтому русский мат ловим в латинской записи (hui, xuy, blyat…).
# Хитрости тоже ловим: цифры и _ внутри (6953gey478, 6g4e3y), цифры вместо букв (g3y, p1zda),
# повторы букв (geeeey). Мягкие слова (govno, dryan, dermo, zhopa, shit) — разрешены.
BAD_WORDS = [
    # русский мат и грубые оскорбления (латиницей)
    "hui", "huy", "huj", "xui", "xuy", "xuj", "xyu", "xyi", "khui", "khuy", "huesos", "huil", "hulі",
    "pizd", "pisd", "pizdec", "pezd",
    "ebat", "ebal", "eblan", "eban", "ebuch", "ebok", "ebny", "ebna", "yebat", "yebal", "yoban", "jeban", "uebo", "uebi", "dolboe", "zaeb", "vyeb", "naeb", "oteb", "poeb",
    "blya", "blyat", "blyad", "bliat", "bliad", "blyt",
    "suka", "cyka", "suchk", "suchar",
    "mudak", "mudil", "mudlo", "mudozv",
    "zalup", "gandon", "gondon", "shlyuh", "shluh", "shalav", "prostitut",
    "pidor", "pidar", "pidr", "pidaras", "pedik", "pederas",
    "chmo", "chmyr", "debil", "daun", "dauny", "ublyud", "ubludok", "vyrodok",
    "manda", "mandavosh", "dristn", "sperm", "drochi", "droch", "konchi", "trah", "seks", "porno", "porn",
    # ЛГБТ-слова (по решению владельца)
    "gay", "gey", "gei", "geii", "lgbt", "lgbtq", "lesbi", "lesb", "lezb", "lesbo", "gomik", "gomos", "gomoseks", "queer", "fag",
    # английские ругательства и пошлость
    "fuck", "fuk", "fck", "phuck", "bitch", "biatch", "cunt", "dick", "cock", "pussy", "penis", "vagina", "whore", "slut",
    "sex", "xxx", "nude", "naked", "boob", "tits", "dildo", "horny", "orgasm", "rape", "rapist", "bastard", "asshole", "motherf",
    # ненависть
    "nigg", "nigga", "nazi", "hitler", "heil", "sieg", "kkk", "isis",
]
# Слова, внутри которых «плохой» кусок случаен — их не трогаем
SAFE_WORDS = ["mandarin", "kommandar", "komanda", "command", "commander", "sukan", "issue", "hitlist", "dickens", "cocktail", "cockpit",
              "peacock", "hancock", "sussex", "essex", "middlesex", "geiger", "geisha", "begay", "sugay", "trahan",
              "sextet", "sexton", "dauntless", "debilit", "sergey", "sergei", "sergeev", "sergeich"]
LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "6": "b", "7": "t", "8": "b", "9": "g", "@": "a", "$": "s"})


def _squeeze(t):
    return re.sub(r"(.)\1+", r"\1", t)


def nick_is_bad(h):
    h = str(h or "").lower()
    letters_only = re.sub(r"[^a-z]", "", h)                          # 6953gey478 → gey ; 6g4e3y → gey
    leet = re.sub(r"[^a-z]", "", h.translate(LEET))                    # g3y → gey ; p1zda → pizda
    variants = {letters_only, leet, _squeeze(letters_only), _squeeze(leet)}
    for v in variants:
        clean = v
        for sw in SAFE_WORDS:
            clean = clean.replace(sw, "#")
        for w in BAD_WORDS:
            sw2 = _squeeze(w)
            if w in clean or (len(sw2) >= 3 and sw2 in clean):
                return True
    return False


BAD_NICK_JOKES = [
    "Ай-яй-яй, поганец 😏 Такой ник нельзя. Придумай другой!",
    "Плохой мальчик, да? 😼 Нет, такой ник не пройдёт.",
    "Хибри всё видел 👀 Давай без неприличных слов.",
    "Ого, смелый ник! Но нет 🙅 Придумай другой.",
    "Хибри покраснел 🙈 Такой ник нельзя.",
    "Мама бы не одобрила 😅 Попробуй другой ник.",
    "Не-не-не, хулиган 😄 С таким ником учитель иврита выгонит из класса.",
    "Хорошая попытка 😉 Но фильтр не обманешь.",
    "Цифрами не спрячешь 🕵️ Придумай нормальный ник.",
]
def bad_nick_msg():
    return random.choice(BAD_NICK_JOKES)


def norm(h):
    return str(h or "").strip().lstrip("@").lower()


def owner_of(c, h):
    r = c.execute("SELECT tg_id FROM handles WHERE handle=?", (h,)).fetchone()
    return r["tg_id"] if r else None


def nicks_of(c, uid):
    return [r["handle"] for r in c.execute("SELECT handle FROM handles WHERE tg_id=? ORDER BY created", (uid,))]


def limit_of(r):
    if r["admin"]:
        return UNLIMITED
    return r["nick_limit"] if r["nick_limit"] is not None else DEFAULT_NICKS


def new_handle(c, tg_username):
    u = norm(tg_username)
    if HANDLE_RE.match(u) and not nick_is_bad(u) and owner_of(c, u) is None:
        return u
    while True:
        h = "player" + str(random.randint(10000, 99999))
        if owner_of(c, h) is None:
            return h


def give_nick(c, uid, h, main=False):
    c.execute("INSERT OR REPLACE INTO handles VALUES (?,?,?)", (h, uid, time.time()))
    if main:
        c.execute("UPDATE players SET handle=? WHERE tg_id=?", (h, uid))


def take_nick(c, uid, h):
    """Забрать ник у игрока. Если он был основным — основным станет другой (или новый автоматический)."""
    c.execute("DELETE FROM handles WHERE handle=? AND tg_id=?", (h, uid))
    r = c.execute("SELECT handle FROM players WHERE tg_id=?", (uid,)).fetchone()
    if r and r["handle"] == h:
        rest = nicks_of(c, uid)
        if not rest:
            nh = new_handle(c, None); give_nick(c, uid, nh); rest = [nh]
        c.execute("UPDATE players SET handle=? WHERE tg_id=?", (rest[0], uid))


def today_msk(shift=0):
    return datetime.now(MSK) + timedelta(days=shift)


def player_public(c, r):
    st = json.loads(r["state"] or "{}")
    def js(k, d):
        try:
            return json.loads(st[k]) if k in st else d
        except Exception:
            return d
    streak = js("streak", {})
    points = sum(int(js(k, 0) or 0) for k in st if k.startswith("points_"))
    d = today_msk()
    return {
        "handle": r["handle"], "nicks": nicks_of(c, r["tg_id"]), "nick_limit": limit_of(r), "nick_limit_raw": r["nick_limit"],
        "name": r["name"], "tg_username": r["tg_username"], "tg_id": r["tg_id"],
        "created": r["created"], "last_seen": r["last_seen"], "ver": r["ver"], "consent": r["consent"],
        "banned_until": r["banned_until"], "ban_reason": r["ban_reason"], "admin": bool(r["admin"]),
        "profile": js("profile", None),
        "streak": {"count": streak.get("count", 0), "best": streak.get("best", 0),
                   "freezes": streak.get("freezes", 1), "last": streak.get("last")},
        "points_total": points, "points_today": int(js(f"points_{d.year}-{d.month}-{d.day}", 0) or 0),
        "done": len(js("done", [])), "perfect": len(js("perfect", [])), "medals": js("medals", {}),
        "quests": len([k for k in st if k.startswith("quest_q-")]),
    }


def streak_alive(streak):
    last = streak.get("last")
    y = today_msk(-1)
    return streak.get("count", 0) if last and last >= f"{y.year}-{y.month:02d}-{y.day:02d}" else 0


def profile_card(c, r, full=True):
    """Публичная страница игрока (видят все): без Telegram ID и личных данных."""
    st = json.loads(r["state"] or "{}")
    def js(k, d):
        try:
            return json.loads(st[k]) if k in st else d
        except Exception:
            return d
    prof = js("profile", {}) or {}
    streak = js("streak", {}) or {}
    out = {"handle": r["handle"], "name": prof.get("name") or (r["name"] or "").split(" ")[0], "gender": prof.get("gender"),
           "avatar": prof.get("avatar"), "streak": streak_alive(streak),
           "points": sum(int(js(k, 0) or 0) for k in st if k.startswith("points_")), "admin": bool(r["admin"])}
    if full:
        out.update({"nicks": nicks_of(c, r["tg_id"]), "best": streak.get("best", 0), "done": len(js("done", [])),
                    "perfect": len(js("perfect", [])), "medals": js("medals", {}), "created": r["created"],
                    "course": {"lang": "he", "title": "Иврит", "level": "A1"}})
    return out


def relation(c, me_id, other_id):
    if me_id == other_id:
        return "me"
    ab = c.execute("SELECT status FROM friends WHERE a=? AND b=?", (me_id, other_id)).fetchone()
    ba = c.execute("SELECT status FROM friends WHERE a=? AND b=?", (other_id, me_id)).fetchone()
    if (ab and ab["status"] == "ok") or (ba and ba["status"] == "ok"):
        return "friend"
    if ab:
        return "out"            # я отправил заявку
    if ba:
        return "in"             # мне прислали заявку
    return "none"


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        o = self.headers.get("Origin", "")
        if o in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", o)
            self.send_header("Vary", "Origin")

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        if self.path.rstrip("/") == "/hapi":
            return self.send_json(200, {"ok": True, "token": bool(token())})
        self.send_json(404, {"error": "not found"})

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        if n <= 0 or n > 400_000:
            return self.send_json(413, {"error": "too big"})
        try:
            p = json.loads(self.rfile.read(n))
        except Exception:
            return self.send_json(400, {"error": "bad json"})
        user = check_init_data(p.get("initData", ""))
        if not user or not user.get("id"):
            return self.send_json(401, {"error": "telegram check failed"})
        route = self.path.split("?")[0].rstrip("/")
        with LOCK:
            c = db()
            try:
                res = self.route(c, route, user, p)
                c.commit()
            finally:
                c.close()
        self.send_json(*res)

    # ---------- логика ----------
    def route(self, c, route, user, p):
        uid = int(user["id"])
        now = time.time()
        if route == "/hapi/check":                                 # свободен ли ник (аккаунт не создаём)
            h = norm(p.get("handle"))
            if not HANDLE_RE.match(h):
                return 200, {"ok": False, "error": BAD_NICK}
            if nick_is_bad(h):
                return 200, {"ok": False, "error": bad_nick_msg()}
            o = owner_of(c, h)
            return 200, {"ok": o is None or o == uid, "error": "" if o is None or o == uid else "Этот ник уже занят"}

        name = " ".join(x for x in [user.get("first_name"), user.get("last_name")] if x)[:60]
        r = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()
        if not r:
            h = new_handle(c, user.get("username"))
            c.execute("INSERT INTO players (tg_id, handle, name, tg_username, created, last_seen, ver, state) VALUES (?,?,?,?,?,?,0,'{}')",
                      (uid, h, name, user.get("username") or "", now, now))
            give_nick(c, uid, h)
        else:
            c.execute("UPDATE players SET name=?, tg_username=?, last_seen=? WHERE tg_id=?", (name, user.get("username") or "", now, uid))
        r = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()

        def me(**extra):
            rr = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()
            return dict({"handle": rr["handle"], "nicks": nicks_of(c, uid), "nick_limit": limit_of(rr),
                         "admin": bool(rr["admin"]), "tg_id": uid}, **extra)

        if r["banned_until"] and r["banned_until"] > now and not r["admin"]:
            return 200, me(banned={"until": r["banned_until"], "reason": r["ban_reason"]})

        if route == "/hapi/sync":
            if p.get("consent"):
                c.execute("UPDATE players SET consent=? WHERE tg_id=? AND consent=0", (now, uid))
            ver = int(p.get("ver") or 0)
            state = p.get("state")
            if r["ver"] == 0 and isinstance(state, dict):          # первый раз: берём прогресс с телефона
                return 200, me(ver=self.save(c, uid, state, 0))
            if ver != r["ver"]:                                    # на сервере новее (другое устройство или админ)
                return 200, me(ver=r["ver"], state=json.loads(r["state"] or "{}"))
            if isinstance(state, dict):
                return 200, me(ver=self.save(c, uid, state, r["ver"]))
            return 200, me(ver=r["ver"])

        if route == "/hapi/reset":
            return 200, me(ver=self.save(c, uid, {}, r["ver"]), state={})

        # ----- ники игрока -----
        if route in ("/hapi/handle", "/hapi/nicks/add", "/hapi/nicks/main", "/hapi/nicks/remove"):
            h = norm(p.get("handle"))
            if not HANDLE_RE.match(h):
                return 200, me(error=BAD_NICK)
            if nick_is_bad(h) and route != "/hapi/nicks/remove":
                return 200, me(error=bad_nick_msg())
            o = owner_of(c, h)
            mine = nicks_of(c, uid)
            if route == "/hapi/handle":                            # сменить основной ник
                if o is not None and o != uid:
                    return 200, me(error="Этот ник уже занят")
                old, lim = r["handle"], limit_of(r)
                if o is None and lim != UNLIMITED and len(mine) >= lim and old:
                    c.execute("DELETE FROM handles WHERE handle=? AND tg_id=?", (old, uid))   # лимит — старый освобождаем
                give_nick(c, uid, h, main=True)
                return 200, me()
            if route == "/hapi/nicks/add":
                if o == uid:
                    return 200, me(error="Этот ник уже твой")
                if o is not None:
                    return 200, me(error="Этот ник уже занят")
                lim = limit_of(r)
                if lim != UNLIMITED and len(mine) >= lim:
                    return 200, me(error=f"Можно не больше {lim} ников")
                give_nick(c, uid, h)
                return 200, me()
            if o != uid:
                return 200, me(error="Это не твой ник")
            if route == "/hapi/nicks/main":
                c.execute("UPDATE players SET handle=? WHERE tg_id=?", (h, uid))
                return 200, me()
            if route == "/hapi/nicks/remove":
                if len(mine) <= 1:
                    return 200, me(error="Нельзя удалить единственный ник")
                take_nick(c, uid, h)
                return 200, me()

        # ----- профиль и друзья -----
        if route == "/hapi/profile":
            o = owner_of(c, norm(p.get("handle"))) if p.get("handle") else uid
            t = c.execute("SELECT * FROM players WHERE tg_id=?", (o,)).fetchone() if o is not None else None
            if not t:
                return 200, {"error": "Такого ника нет"}
            return 200, {"profile": profile_card(c, t), "relation": relation(c, uid, t["tg_id"])}
        if route == "/hapi/friends/list":
            def cards(rows):
                out = []
                for x in rows:
                    t = c.execute("SELECT * FROM players WHERE tg_id=?", (x[0],)).fetchone()
                    if t:
                        out.append(profile_card(c, t, full=False))
                return out
            fr = c.execute("""SELECT CASE WHEN a=? THEN b ELSE a END FROM friends WHERE status='ok' AND (a=? OR b=?)""", (uid, uid, uid)).fetchall()
            inc = c.execute("SELECT a FROM friends WHERE b=? AND status='pending' ORDER BY at DESC", (uid,)).fetchall()
            out = c.execute("SELECT b FROM friends WHERE a=? AND status='pending' ORDER BY at DESC", (uid,)).fetchall()
            friends = sorted(cards(fr), key=lambda x: (-x["streak"], -x["points"]))
            return 200, {"me": profile_card(c, r, full=False), "friends": friends, "incoming": cards(inc), "outgoing": cards(out)}
        if route in ("/hapi/friends/add", "/hapi/friends/accept", "/hapi/friends/remove"):
            o = owner_of(c, norm(p.get("handle")))
            if o is None:
                return 200, {"error": "Такого ника нет"}
            if o == uid:
                return 200, {"error": "Это ты 🙂"}
            rel = relation(c, uid, o)
            if route == "/hapi/friends/remove":                    # отклонить / отменить / удалить из друзей
                c.execute("DELETE FROM friends WHERE (a=? AND b=?) OR (a=? AND b=?)", (uid, o, o, uid))
                return 200, {"relation": "none"}
            if rel == "friend":
                return 200, {"relation": "friend"}
            if rel == "in" or route == "/hapi/friends/accept":   # мне уже прислали заявку → дружим
                if rel != "in":
                    return 200, {"error": "Заявки нет", "relation": rel}
                c.execute("UPDATE friends SET status='ok', at=? WHERE a=? AND b=?", (now, o, uid))
                return 200, {"relation": "friend"}
            if rel == "none":
                cnt = c.execute("SELECT COUNT(*) FROM friends WHERE a=? AND status='pending' AND at>?", (uid, now - 86400)).fetchone()[0]
                if cnt >= 50:
                    return 200, {"error": "Слишком много заявок за сутки"}
                c.execute("INSERT OR REPLACE INTO friends VALUES (?,?,'pending',?)", (uid, o, now))
            return 200, {"relation": "out"}

        # ----- админ -----
        if route.startswith("/hapi/admin/"):
            if not r["admin"]:
                return 403, {"error": "нет прав"}
            if route == "/hapi/admin/list":
                q = "%" + norm(p.get("q")).replace("%", "") + "%"
                rows = c.execute("""SELECT DISTINCT p.* FROM players p LEFT JOIN handles h ON h.tg_id = p.tg_id
                    WHERE h.handle LIKE ? OR lower(p.name) LIKE ? OR lower(p.tg_username) LIKE ? OR CAST(p.tg_id AS TEXT) LIKE ?
                    ORDER BY p.last_seen DESC LIMIT 5000""", (q, q, q, q)).fetchall()
                total = c.execute("SELECT COUNT(*) FROM players").fetchone()[0]
                def brief(x):
                    pc = profile_card(c, x, full=True)
                    return {"handle": x["handle"], "name": x["name"], "game_name": pc["name"], "tg_username": x["tg_username"],
                            "created": x["created"], "last_seen": x["last_seen"], "admin": bool(x["admin"]),
                            "banned": (x["banned_until"] or 0) > now, "streak": pc["streak"], "done": pc["done"], "points": pc["points"]}
                return 200, {"total": total, "players": [brief(x) for x in rows]}
            if route == "/hapi/admin/log":
                rows = c.execute("SELECT * FROM admin_log ORDER BY at DESC LIMIT 100").fetchall()
                return 200, {"log": [dict(x) for x in rows]}
            h = norm(p.get("handle"))
            o = owner_of(c, h)
            t = c.execute("SELECT * FROM players WHERE tg_id=?", (o,)).fetchone() if o is not None else None
            if not t:
                return 200, {"error": f"Игрок @{h} не найден"}
            if route == "/hapi/admin/get":
                return 200, {"player": player_public(c, t)}
            if route == "/hapi/admin/set":
                what, err = self.admin_set(c, t, p, uid)
                if what:
                    c.execute("INSERT INTO admin_log VALUES (?,?,?,?)", (now, r["handle"], t["handle"], json.dumps(what, ensure_ascii=False)))
                t = c.execute("SELECT * FROM players WHERE tg_id=?", (t["tg_id"],)).fetchone()
                return 200, {"player": player_public(c, t), "done": what, "error": err}
        return 404, {"error": "not found"}

    def save(self, c, uid, state, ver):
        clean = {str(k)[:60]: str(v)[:50_000] for k, v in list(state.items())[:500]}
        c.execute("UPDATE players SET state=?, ver=? WHERE tg_id=?", (json.dumps(clean, ensure_ascii=False), ver + 1, uid))
        return ver + 1

    def admin_set(self, c, t, p, admin_uid):
        st = json.loads(t["state"] or "{}")
        tid = t["tg_id"]
        what, err, state_changed = {}, "", False
        def getj(k, d):
            try:
                return json.loads(st[k]) if k in st else d
            except Exception:
                return d
        # серия, заморозки
        s = p.get("streak")
        if isinstance(s, dict):
            cur = getj("streak", {})
            for k, v in (("count", 0), ("best", 0), ("freezes", 1), ("frozen", []), ("days", []), ("last", None)):
                cur.setdefault(k, v)
            for k in ("count", "best", "freezes"):
                if k in s and s[k] is not None:
                    cur[k] = max(0, min(100000, int(s[k])))
                    what["streak." + k] = cur[k]
            if "count" in s:
                td, y = today_msk(), today_msk(-1)
                ts, ys = f"{td.year}-{td.month:02d}-{td.day:02d}", f"{y.year}-{y.month:02d}-{y.day:02d}"
                cur["last"] = (ts if ts in cur["days"] else ys) if cur["count"] > 0 else None
                cur["best"] = max(cur["best"], cur["count"])
            st["streak"] = json.dumps(cur, ensure_ascii=False); state_changed = True
        if p.get("addPoints"):
            d = today_msk(); k = f"points_{d.year}-{d.month}-{d.day}"
            st[k] = json.dumps(max(0, int(getj(k, 0) or 0) + int(p["addPoints"])))
            what["addPoints"] = int(p["addPoints"]); state_changed = True
        # имя и пол в игре
        prof = p.get("profile")
        if isinstance(prof, dict):
            cur = getj("profile", {}) or {}
            if prof.get("name"):
                cur["name"] = str(prof["name"])[:20]; what["profile.name"] = cur["name"]
            if prof.get("gender") in ("m", "f"):
                cur["gender"] = prof["gender"]; what["profile.gender"] = cur["gender"]
            st["profile"] = json.dumps(cur, ensure_ascii=False); state_changed = True
        if p.get("resetProgress"):
            st = {k: v for k, v in st.items() if k in ("profile", "settings")}
            what["resetProgress"] = True; state_changed = True
        # ники
        n = p.get("nick")
        if isinstance(n, dict):
            h = norm(n.get("handle"))
            act = n.get("action")
            if not HANDLE_RE.match(h):
                err = BAD_NICK
            elif act == "add":
                o = owner_of(c, h)
                if o is not None and o != tid:
                    if n.get("force"):                         # забрать у другого и отдать этому
                        take_nick(c, o, h); give_nick(c, tid, h); what["nick.take_from_other"] = h
                    else:
                        err = f"@{h} уже у другого игрока. Нажми «Забрать и отдать», чтобы передать."
                else:
                    give_nick(c, tid, h); what["nick.add"] = h      # админ добавляет сверх лимита
            elif act == "main":
                if owner_of(c, h) == tid:
                    c.execute("UPDATE players SET handle=? WHERE tg_id=?", (h, tid)); what["nick.main"] = h
            elif act == "remove":
                if owner_of(c, h) == tid:
                    take_nick(c, tid, h); what["nick.remove"] = h
        if "nickLimit" in p:
            v = p["nickLimit"]
            v = UNLIMITED if v in (None, "inf", -1) else max(1, min(1000, int(v)))
            c.execute("UPDATE players SET nick_limit=? WHERE tg_id=?", (v, tid)); what["nickLimit"] = "∞" if v == UNLIMITED else v
        # бан
        if "ban" in p:
            b = p["ban"]
            if b is None:
                c.execute("UPDATE players SET banned_until=0, ban_reason='' WHERE tg_id=?", (tid,)); what["unban"] = True
            elif tid == admin_uid:
                err = "Себя заблокировать нельзя"
            else:
                days = float(b.get("days") or 0)
                until = time.time() + days * 86400 if days > 0 else 4102444800
                c.execute("UPDATE players SET banned_until=?, ban_reason=? WHERE tg_id=?", (until, str(b.get("reason", ""))[:200], tid))
                what["ban"] = {"days": days, "reason": b.get("reason", "")}
        # права админа
        if "admin" in p:
            if tid == admin_uid and not p["admin"]:
                err = "Снять права с самого себя нельзя"
            else:
                c.execute("UPDATE players SET admin=? WHERE tg_id=?", (1 if p["admin"] else 0, tid)); what["admin"] = bool(p["admin"])
        if state_changed:
            c.execute("UPDATE players SET state=?, ver=ver+1 WHERE tg_id=?", (json.dumps(st, ensure_ascii=False), tid))
        return what, err

    def log_message(self, *args):
        pass


def cli():
    c = db()
    cmd = sys.argv[1]
    if cmd in ("make-admin", "remove-admin") and len(sys.argv) > 2:
        h = norm(sys.argv[2])
        o = owner_of(c, h)
        if o is None:
            print("Игрок @%s не найден. Сначала открой приложение в Telegram (и согласись сохранять прогресс)." % h)
        else:
            c.execute("UPDATE players SET admin=? WHERE tg_id=?", (1 if cmd == "make-admin" else 0, o)); c.commit()
            print(("Готово: @%s теперь админ 👑" if cmd == "make-admin" else "Готово: @%s больше не админ") % h)
    elif cmd == "bad-nicks":                         # показать уже занятые неприличные ники
        rows = [r for r in c.execute("SELECT h.handle, p.name FROM handles h JOIN players p ON p.tg_id = h.tg_id") if nick_is_bad(r["handle"])]
        print("\n".join(f"@{r['handle']}  ({r['name']})" for r in rows) or "Неприличных ников нет 👍")
    elif cmd == "list":
        for r in c.execute("SELECT * FROM players ORDER BY last_seen DESC"):
            print(f"@{r['handle']:16} {r['name'] or '':20} tg:@{r['tg_username'] or '-':16} ники:{','.join(nicks_of(c, r['tg_id']))} {'АДМИН' if r['admin'] else ''} {datetime.fromtimestamp(r['last_seen'], MSK):%d.%m %H:%M}")
    c.close()


if __name__ == "__main__":
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    if len(sys.argv) > 1:
        cli()
    else:
        db().close()
        ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("PORT", "8082"))), Handler).serve_forever()
