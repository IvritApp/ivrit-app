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
#   /hapi/chat/list {with|team, since}  /hapi/chat/send {with|team, text}  /hapi/chat/unread  /hapi/chat/report {id}
#   /hapi/team/me  /hapi/team/create {name, emoji}  /hapi/team/join {code}  /hapi/team/leave  /hapi/team/kick {handle}  /hapi/team/top
#   /hapi/plus/status  /hapi/plus/promo {code}  /hapi/plus/invoice {code?}   — подписка Hirbis Plus (∞ сердечек)
#   /hapi/admin/list {q}  /hapi/admin/get {handle}  /hapi/admin/set {handle, ...}  /hapi/admin/log {}
#   /hapi/admin/promo/list  /hapi/admin/promo/create {code?, kind, value, max_uses, days_valid, note}  /hapi/admin/promo/delete {code}
# HIRBIS PLUS (21.11): 50 ⭐ = 30 дней, разовая оплата (Telegram Stars, валюта XTR). Счёт создаёт этот сервер
# (createInvoiceLink), оплату принимает бот (bot_start.py: pre_checkout_query → successful_payment → таблица plus).
# Промокоды: kind "discount" (скидка value %, 100 % = бесплатно) или "days" (сразу value дней Plus). Один код — один раз на игрока.
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
PLUS_PRICE = 50               # ⭐ за PLUS_DAYS дней
PLUS_DAYS = 30
PROMO_RE = re.compile(r"^[A-Z0-9_-]{3,32}$")


def tg_api():
    """Адрес Telegram Bot API. Из Москвы api.telegram.org недоступен → посредник (Cloudflare Worker) в /etc/hirbis/tg_api.
    Переменная HIRBIS_TG_API важнее файла (так тесты подставляют поддельный Telegram)."""
    if os.environ.get("HIRBIS_TG_API"):
        return os.environ["HIRBIS_TG_API"].rstrip("/")
    try:
        with open("/etc/hirbis/tg_api") as f:
            v = f.read().strip()
            if v:
                return v.rstrip("/")
    except Exception:
        pass
    return os.environ.get("HIRBIS_TG_API", "https://api.telegram.org").rstrip("/")


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
    for col, typ in (("admin_pin", "TEXT DEFAULT ''"), ("pin_fail", "INTEGER DEFAULT 0"), ("pin_lock", "REAL DEFAULT 0"),
                     ("rec_phone", "TEXT DEFAULT ''"), ("rec_user", "TEXT DEFAULT ''"), ("rec_pass", "TEXT DEFAULT ''"),
                     ("rec_fail", "INTEGER DEFAULT 0"), ("rec_lock", "REAL DEFAULT 0")):
        if col not in cols:
            c.execute(f"ALTER TABLE players ADD COLUMN {col} {typ}")
    # чат (16.11): личные сообщения друзей (receiver) и командный чат (team_id); прочитанное — chat_read
    c.execute("""CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender INTEGER,
        receiver INTEGER DEFAULT 0, team_id INTEGER DEFAULT 0, text TEXT, at REAL)""")
    c.execute("CREATE INDEX IF NOT EXISTS msg_pair ON messages (receiver, sender)")
    c.execute("CREATE INDEX IF NOT EXISTS msg_team ON messages (team_id)")
    c.execute("CREATE TABLE IF NOT EXISTS chat_read (tg_id INTEGER, peer TEXT, last_id INTEGER, PRIMARY KEY (tg_id, peer))")
    c.execute("CREATE TABLE IF NOT EXISTS chat_reports (msg_id INTEGER, by_id INTEGER, at REAL, PRIMARY KEY (msg_id, by_id))")
    # команды (16.11): один игрок — одна команда; вход по коду
    c.execute("CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, emoji TEXT, code TEXT UNIQUE, owner INTEGER, created REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS team_members (tg_id INTEGER PRIMARY KEY, team_id INTEGER, joined REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS admin_sessions (token TEXT PRIMARY KEY, tg_id INTEGER, until REAL)")
    c.execute("CREATE TABLE IF NOT EXISTS rec_tries2 (tg_id INTEGER PRIMARY KEY, fails INTEGER, lock REAL, at REAL)")   # кто пытается восстановить
    # Hirbis Plus (21.11): до какого времени; промокоды; кто каким кодом пользовался; оплаты (charge_id — от Telegram)
    c.execute("CREATE TABLE IF NOT EXISTS plus (tg_id INTEGER PRIMARY KEY, until REAL)")
    c.execute("""CREATE TABLE IF NOT EXISTS promos (code TEXT PRIMARY KEY, kind TEXT, value INTEGER, max_uses INTEGER DEFAULT 0,
        used INTEGER DEFAULT 0, expires REAL DEFAULT 0, created REAL, by TEXT, note TEXT DEFAULT '')""")
    c.execute("CREATE TABLE IF NOT EXISTS promo_uses (code TEXT, tg_id INTEGER, at REAL, PRIMARY KEY (code, tg_id))")
    c.execute("""CREATE TABLE IF NOT EXISTS payments (charge_id TEXT PRIMARY KEY, tg_id INTEGER, stars INTEGER, days INTEGER,
        code TEXT DEFAULT '', at REAL)""")
    # экономика (21.11, claude-docs/ekonomika.md): 🥐 бурекасы и 💎 хибриллианты, сундуки, вещи, журнал операций
    c.execute("""CREATE TABLE IF NOT EXISTS wallets (tg_id INTEGER PRIMARY KEY, bur INTEGER DEFAULT 0, gems INTEGER DEFAULT 0,
        counted INTEGER DEFAULT 0, lessons INTEGER DEFAULT 0, quests INTEGER DEFAULT 0, daily TEXT DEFAULT '',
        nick_coupons INTEGER DEFAULT 0)""")
    c.execute("""CREATE TABLE IF NOT EXISTS chests (id INTEGER PRIMARY KEY AUTOINCREMENT, tg_id INTEGER, kind TEXT, src TEXT,
        at REAL, opened REAL DEFAULT 0, rarity TEXT DEFAULT '', reward TEXT DEFAULT '')""")
    c.execute("CREATE INDEX IF NOT EXISTS chests_user ON chests (tg_id, opened)")
    # 22.11 защита от накрутки: какие дни (🥐) и какие уроки/квесты (сундуки) уже засчитаны
    # миграция нужна, если таблицы eco_days ещё не было (а не по колонке ready: её может добавить и бот, если его перезапустят первым)
    first_eco = not c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='eco_days'").fetchone()
    c.execute("CREATE TABLE IF NOT EXISTS eco_days (tg_id INTEGER, day TEXT, pts INTEGER, PRIMARY KEY (tg_id, day))")
    c.execute("CREATE TABLE IF NOT EXISTS eco_done (tg_id INTEGER, key TEXT, PRIMARY KEY (tg_id, key))")
    wcols = [x[1] for x in c.execute("PRAGMA table_info(wallets)")]
    if "ready" not in wcols:                      # 1 = кошелёк заведён как надо; 0 = его создал бот при оплате 💎 (eco_row доделает)
        c.execute("ALTER TABLE wallets ADD COLUMN ready INTEGER DEFAULT 1")
    if first_eco:
        # кошельки, заведённые до защиты от накрутки: уже пройденное и сегодняшние/вчерашние очки — засчитаны (без сундуков задним числом)
        for (wid,) in c.execute("SELECT tg_id FROM wallets").fetchall():
            pr = c.execute("SELECT state FROM players WHERE tg_id=?", (wid,)).fetchone()
            st0 = json.loads((pr[0] if pr else "{}") or "{}")
            ls, qs = eco_progress(st0)
            for key in ["lesson:" + x for x in ls] + ["quest:" + x for x in qs]:
                c.execute("INSERT OR IGNORE INTO eco_done VALUES (?,?)", (wid, key))
            for sh in (0, -1):
                dk = day_key(sh)
                c.execute("INSERT OR IGNORE INTO eco_days VALUES (?,?,?)", (wid, dk, min(EARN_DAY_CAP, safe_int(st0.get("points_" + dk, "0")))))
    c.execute("CREATE TABLE IF NOT EXISTS inventory (tg_id INTEGER, item TEXT, at REAL, PRIMARY KEY (tg_id, item))")
    c.execute("CREATE TABLE IF NOT EXISTS equip (tg_id INTEGER PRIMARY KEY, frame TEXT DEFAULT '', color TEXT DEFAULT '', badge TEXT DEFAULT '')")
    c.execute("CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, tg_id INTEGER, at REAL, cur TEXT, delta INTEGER, why TEXT)")
    # уведомления игроку от администрации (22.11): mood — happy / sad / info
    c.execute("""CREATE TABLE IF NOT EXISTS notices (id INTEGER PRIMARY KEY AUTOINCREMENT, tg_id INTEGER, at REAL, text TEXT,
        note TEXT DEFAULT '', mood TEXT DEFAULT 'info', read INTEGER DEFAULT 0)""")
    c.execute("CREATE INDEX IF NOT EXISTS notices_user ON notices (tg_id, read)")
    # отзывы тестеров (22.11, бета): «💬 Написать отзыв» в приложении → вкладка «Отзывы» в админке + сообщение админам в Telegram
    c.execute("""CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, tg_id INTEGER, at REAL, text TEXT,
        place TEXT DEFAULT '', info TEXT DEFAULT '', done INTEGER DEFAULT 0)""")
    # ошибки приложения и события (22.11, бета): telemetry.js → /hapi/log → админка «🐞 Ошибки»
    # errors: одна строка на одинаковую ошибку (sig = текст + файл + строка), n — сколько раз, users — у скольких игроков
    c.execute("""CREATE TABLE IF NOT EXISTS errors (sig TEXT PRIMARY KEY, msg TEXT, src TEXT, info TEXT DEFAULT '',
        first REAL, last REAL, n INTEGER DEFAULT 1, last_tg INTEGER, done INTEGER DEFAULT 0)""")
    c.execute("CREATE TABLE IF NOT EXISTS errors_u (sig TEXT, tg_id INTEGER, PRIMARY KEY (sig, tg_id))")
    # events: сколько раз за день (x — урок/квест, например a1-1-3.p2), events_u — сколько разных игроков
    c.execute("CREATE TABLE IF NOT EXISTS events (day TEXT, name TEXT, x TEXT DEFAULT '', n INTEGER DEFAULT 0, PRIMARY KEY (day, name, x))")
    c.execute("CREATE TABLE IF NOT EXISTS events_u (day TEXT, name TEXT, tg_id INTEGER, PRIMARY KEY (day, name, tg_id))")
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


BAD_NICK_FIRST = "Хибри всё видел 👀 Давай без неприличных слов."
BAD_NICK_JOKES = [
    "Ай-яй-яй, поганец 😏 Такой ник нельзя. Придумай другой!",
    "Плохой мальчик, да? 😼 Нет, такой ник не пройдёт.",
    "Ого, смелый ник! Но нет 🙅 Придумай другой.",
    "Хибри покраснел 🙈 Такой ник нельзя.",
    "Мама бы не одобрила 😅 Попробуй другой ник.",
    "Не-не-не, хулиган 😄 С таким ником учитель иврита выгонит из класса.",
    "Хорошая попытка 😉 Но фильтр не обманешь.",
    "Цифрами не спрячешь 🕵️ Придумай нормальный ник.",
]
BAD_TRIES = {}   # tg_id → {"last": ник, "msg": текст, "bag": [ещё не показанные], "n": попыток}


def bad_nick_msg(uid, nick):
    """1-я попытка — «Хибри всё видел», дальше шутки в случайном порядке без повторов, пока не покажем все.
    Тот же ник (проверка на лету при печати) — тот же ответ."""
    st = BAD_TRIES.setdefault(uid, {"last": None, "msg": None, "bag": [], "n": 0})
    if nick == st["last"] and st["msg"]:
        return st["msg"]
    if st["n"] == 0:
        msg = BAD_NICK_FIRST
    else:
        if not st["bag"]:
            st["bag"] = random.sample(BAD_NICK_JOKES, len(BAD_NICK_JOKES))
        msg = st["bag"].pop()
    st.update(last=nick, msg=msg, n=st["n"] + 1)
    if len(BAD_TRIES) > 10000:
        BAD_TRIES.clear()
    return msg


# ---------- ПАРОЛЬ АДМИНА (любой длины) ----------
# Храним не сам пароль, а «отпечаток» (pbkdf2 + соль). 5 ошибок → вход закрыт на 48 часов. Сессия — 12 часов.
PIN_FAILS, PIN_LOCK_SEC, SESSION_SEC = 5, 48 * 3600, 12 * 3600


def pin_hash(pin, salt=None):
    salt = salt or os.urandom(16).hex()
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt), 200_000).hex()


def pin_ok(pin, stored):
    try:
        salt, _ = stored.split("$", 1)
        return hmac.compare_digest(pin_hash(pin, salt), stored)
    except Exception:
        return False


def left_text(sec):
    mins = int(-(-sec // 60))                 # округляем вверх до минуты
    h, m = divmod(mins, 60)
    return (f"{h} ч" + (f" {m} мин" if m else "")) if h else f"{m} мин"


def norm_phone(x):
    d = re.sub(r"\D", "", str(x or ""))
    if len(d) == 11 and d[0] == "8":
        d = "7" + d[1:]                     # 8 900… → 7 900…
    return d


def session_ok(c, uid, token):
    if not token:
        return False
    r = c.execute("SELECT until FROM admin_sessions WHERE token=? AND tg_id=?", (str(token)[:80], uid)).fetchone()
    return bool(r and r["until"] > time.time())


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
    points = sum(safe_int(st[k]) for k in st if k.startswith("points_"))
    d = today_msk()
    return {
        "handle": r["handle"], "nicks": nicks_of(c, r["tg_id"]), "nick_limit": limit_of(r), "nick_limit_raw": r["nick_limit"],
        "name": r["name"], "tg_username": r["tg_username"], "tg_id": r["tg_id"],
        "created": r["created"], "last_seen": r["last_seen"], "ver": r["ver"], "consent": r["consent"],
        "banned_until": r["banned_until"], "ban_reason": r["ban_reason"], "admin": bool(r["admin"]),
        "profile": js("profile", None),
        "streak": {"count": streak.get("count", 0), "best": streak.get("best", 0),
                   "freezes": streak.get("freezes", 1), "last": streak.get("last")},
        "points_total": points, "points_today": safe_int(st.get(f"points_{d.year}-{d.month}-{d.day}", "0")),
        "done": len(js("done", [])), "perfect": len(js("perfect", [])), "medals": js("medals", {}),
        "quests": len([k for k in st if k.startswith("quest_q-")]),
        "plus_until": plus_until(c, r["tg_id"]),
        "eco": (lambda w: {"bur": w["bur"], "gems": w["gems"]} if w else None)(
            c.execute("SELECT bur, gems FROM wallets WHERE tg_id=?", (r["tg_id"],)).fetchone()),
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
    eq = c.execute("SELECT frame, color, badge FROM equip WHERE tg_id=?", (r["tg_id"],)).fetchone()
    out = {"handle": r["handle"], "name": prof.get("name") or (r["name"] or "").split(" ")[0], "gender": prof.get("gender"),
           "avatar": prof.get("avatar"), "streak": streak_alive(streak),
           "skin": {"frame": eq[0], "color": eq[1], "badge": eq[2]} if eq else {},
           "points": sum(safe_int(st[k]) for k in st if k.startswith("points_")), "admin": bool(r["admin"])}
    if full:
        out.update({"nicks": nicks_of(c, r["tg_id"]), "best": streak.get("best", 0), "done": len(js("done", [])),
                    "perfect": len(js("perfect", [])), "medals": js("medals", {}), "created": r["created"],
                    "course": {"lang": "he", "title": "Иврит", "level": "A1"}})
    return out


# ---------- чат и команды (16.11) ----------
MSG_MAX = 500                 # символов в сообщении
MSG_PER_MIN = 20              # сообщений в минуту с одного игрока
TEAM_MAX = 20                 # человек в команде
TEAM_EMOJI = ("🦁", "🐪", "🦊", "🐬", "🦉", "🐝", "🌵", "🍉", "🔥", "⭐", "🚀", "🕍")
# грубые слова в чате заменяем звёздочками (корни; ловит и формы)
#   (\b — только с начала слова, чтобы не задеть «небо», «хлеба» и т. п.)
CHAT_BAD = re.compile(r"\b(х[уy][йеёияю]\w*|пизд\w*|[её]б[аеиоуыё]\w*|\w*[её]бан\w*|бля\w*|муд[аио]к\w*|пид[оа]р\w*|fuck\w*|shit\w*|bitch\w*)", re.I)


def clean_text(t):
    t = re.sub(r"\s+", " ", str(t or "")).strip()[:MSG_MAX]
    return CHAT_BAD.sub(lambda m: "*" * len(m.group(0)), t)


def week_points(st):
    """Очки за текущую неделю (пн–вс, по Москве) из прогресса игрока (ключи points_Г-М-Д)."""
    d = today_msk()
    total = 0
    for i in range(d.weekday() + 1):
        x = d - timedelta(days=i)
        try:
            total += int(json.loads(st.get(f"points_{x.year}-{x.month}-{x.day}", "0")) or 0)
        except Exception:
            pass
    return total


def team_of(c, uid):
    m = c.execute("SELECT team_id FROM team_members WHERE tg_id=?", (uid,)).fetchone()
    return c.execute("SELECT * FROM teams WHERE id=?", (m[0],)).fetchone() if m else None


def team_card(c, t, uid=None):
    members = []
    for m in c.execute("SELECT tg_id, joined FROM team_members WHERE team_id=? ORDER BY joined", (t["id"],)).fetchall():
        pr = c.execute("SELECT * FROM players WHERE tg_id=?", (m[0],)).fetchone()
        if not pr:
            continue
        card = profile_card(c, pr, full=False)
        card["week"] = week_points(json.loads(pr["state"] or "{}"))
        card["owner"] = m[0] == t["owner"]
        card["me"] = m[0] == uid
        members.append(card)
    members.sort(key=lambda x: (-x["week"], -x["streak"]))
    return {"id": t["id"], "name": t["name"], "emoji": t["emoji"], "code": t["code"], "members": members,
            "week": sum(x["week"] for x in members), "max": TEAM_MAX, "i_own": t["owner"] == uid}


def new_team_code(c):
    abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"        # без похожих O/0, I/1
    while True:
        code = "".join(random.choice(abc) for _ in range(6))
        if not c.execute("SELECT 1 FROM teams WHERE code=?", (code,)).fetchone():
            return code


def unread_for(c, uid):
    """Непрочитанные: {"by": {ник: n}, "team": n, "total": n}."""
    reads = {r[0]: r[1] for r in c.execute("SELECT peer, last_id FROM chat_read WHERE tg_id=?", (uid,)).fetchall()}
    by, total = {}, 0
    for s, n, mx in c.execute("SELECT sender, COUNT(*), MAX(id) FROM messages WHERE receiver=? GROUP BY sender", (uid,)).fetchall():
        k = c.execute("SELECT COUNT(*) FROM messages WHERE receiver=? AND sender=? AND id>?", (uid, s, reads.get(f"u{s}", 0))).fetchone()[0]
        if k:
            h = c.execute("SELECT handle FROM players WHERE tg_id=?", (s,)).fetchone()
            if h:
                by[h[0]] = k
                total += k
    team = 0
    t = team_of(c, uid)
    if t:
        team = c.execute("SELECT COUNT(*) FROM messages WHERE team_id=? AND sender!=? AND id>?", (t["id"], uid, reads.get(f"t{t['id']}", 0))).fetchone()[0]
    return {"by": by, "team": team, "total": total + team}


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


# ---------- Hirbis Plus (21.11) ----------
def plus_until(c, uid):
    r = c.execute("SELECT until FROM plus WHERE tg_id=?", (uid,)).fetchone()
    return float(r[0]) if r and r[0] else 0.0


def grant_plus(c, uid, days):
    """Добавить дни Plus (к текущему сроку, если он ещё идёт). Возвращает новый срок."""
    until = max(time.time(), plus_until(c, uid)) + days * 86400
    c.execute("INSERT INTO plus (tg_id, until) VALUES (?, ?) ON CONFLICT(tg_id) DO UPDATE SET until=excluded.until", (uid, until))
    return until


def norm_code(x):
    return re.sub(r"\s+", "", str(x or "")).upper()[:32]


def promo_check(c, code, uid):
    """Можно ли этому игроку применить код. → (строка promos, ошибка)."""
    code = norm_code(code)
    pr = c.execute("SELECT * FROM promos WHERE code=?", (code,)).fetchone() if code else None
    if not pr:
        return None, "Такого промокода нет"
    if pr["expires"] and pr["expires"] < time.time():
        return None, "Срок промокода закончился"
    if pr["max_uses"] and pr["used"] >= pr["max_uses"]:
        return None, "Промокод уже использовали все"
    if c.execute("SELECT 1 FROM promo_uses WHERE code=? AND tg_id=?", (code, uid)).fetchone():
        return None, "Ты уже использовал этот промокод"
    return pr, ""


def promo_use(c, code, uid):
    c.execute("INSERT OR IGNORE INTO promo_uses VALUES (?,?,?)", (code, uid, time.time()))
    c.execute("UPDATE promos SET used=used+1 WHERE code=?", (code,))


def plus_price(pr):
    """Цена в ⭐ с учётом скидки промокода (минимум 1 ⭐, если скидка не 100 %)."""
    if not pr or pr["kind"] != "discount":
        return PLUS_PRICE
    return max(1, round(PLUS_PRICE * (100 - pr["value"]) / 100)) if pr["value"] < 100 else 0


def promo_public(pr):
    return {"code": pr["code"], "kind": pr["kind"], "value": pr["value"], "max_uses": pr["max_uses"], "used": pr["used"],
            "expires": pr["expires"], "created": pr["created"], "by": pr["by"], "note": pr["note"]}


def create_invoice_link(price, payload, title=None, desc=None):
    """Счёт Telegram Stars (XTR). provider_token для звёзд — пустой."""
    import urllib.request
    title = title or "Hirbis Plus · 30 дней"
    body = json.dumps({"title": title, "description": desc or "Бесконечные сердечки ❤️ на 30 дней. Учись без остановок!",
                       "payload": payload, "provider_token": "", "currency": "XTR",
                       "prices": [{"label": title, "amount": price}]}).encode()
    req = urllib.request.Request(f"{tg_api()}/bot{token()}/createInvoiceLink", data=body,      # User-Agent — иначе Cloudflare отвечает 403
                                 headers={"Content-Type": "application/json", "User-Agent": "HirbisBot/1.0"})
    with urllib.request.urlopen(req, timeout=12) as r:
        res = json.loads(r.read())
    return res.get("result") if res.get("ok") else None


# ---------- ЭКОНОМИКА (21.11): 🥐 бурекасы, 💎 хибриллианты, сундуки, магазин — claude-docs/ekonomika.md ----------
EARN_DAY_CAP = 1500                  # больше 1500 🥐 за день из очков не засчитываем (защита от накрутки)
CHEST_QUEUE_MAX = 30
MINIGAME_COST = {"wheel": 30}
RARITIES = ["rare", "super", "epic", "mythic", "legendary"]
UPGRADE = {"rare": 0.5, "super": 0.4, "epic": 0.3, "mythic": 0.4}      # шанс подняться на ступень выше → 50/30/14/3.6/2.4 %
CHEST_START = {"chest": "rare", "daily": "rare", "big": "epic", "welcome": "epic"}
GEM_PACKS = {"g100": {"stars": 50, "gems": 100}, "g350": {"stars": 150, "gems": 350}, "g1000": {"stars": 400, "gems": 1000}}
# каталог магазина: slot — куда «надевается» скин; cur — валюта; drop — может выпасть из сундука
CATALOG = {
    "chest":       {"name": "Сундук", "icon": "🎁", "cur": "bur", "price": 200, "kind": "chest"},
    "big_chest":   {"name": "Большой сундук", "icon": "🎁", "cur": "gems", "price": 40, "kind": "chest"},
    "freeze":      {"name": "Заморозка серии", "icon": "❄️", "cur": "bur", "price": 150, "kind": "perk"},
    "hearts":      {"name": "Полные сердечки", "icon": "❤️", "cur": "bur", "price": 300, "kind": "perk"},
    "nick_coupon": {"name": "Купон: редкий ник (3–4 знака)", "icon": "🏷", "cur": "gems", "price": 300, "kind": "nick"},
    "nick_slot":   {"name": "Ещё одно место под ник", "icon": "➕", "cur": "gems", "price": 100, "kind": "nick"},
    "frame_green":   {"name": "Изумрудная рамка", "icon": "🟢", "cur": "gems", "price": 50, "slot": "frame"},
    "frame_blue":    {"name": "Морская рамка", "icon": "🔵", "cur": "gems", "price": 80, "slot": "frame"},
    "frame_purple":  {"name": "Фиолетовая рамка", "icon": "🟣", "cur": "gems", "price": 120, "slot": "frame"},
    "frame_fire":    {"name": "Огненная рамка", "icon": "🔥", "cur": "gems", "price": 180, "slot": "frame"},
    "frame_gold":    {"name": "Золотая рамка", "icon": "🟡", "cur": "gems", "price": 250, "slot": "frame"},
    "color_blue":    {"name": "Синий ник", "icon": "🔷", "cur": "gems", "price": 30, "slot": "color"},
    "color_purple":  {"name": "Фиолетовый ник", "icon": "🟪", "cur": "gems", "price": 50, "slot": "color"},
    "color_red":     {"name": "Красный ник", "icon": "🟥", "cur": "gems", "price": 70, "slot": "color"},
    "color_gold":    {"name": "Золотой ник", "icon": "🟨", "cur": "gems", "price": 100, "slot": "color"},
    "badge_fire":    {"name": "Значок «Огонь»", "icon": "🔥", "cur": "gems", "price": 20, "slot": "badge"},
    "badge_cactus":  {"name": "Значок «Кактус»", "icon": "🌵", "cur": "gems", "price": 30, "slot": "badge"},
    "badge_owl":     {"name": "Значок «Сова»", "icon": "🦉", "cur": "gems", "price": 40, "slot": "badge"},
    "badge_rocket":  {"name": "Значок «Ракета»", "icon": "🚀", "cur": "gems", "price": 50, "slot": "badge"},
    "badge_gem":     {"name": "Значок «Бриллиант»", "icon": "💎", "cur": "gems", "price": 60, "slot": "badge"},
    "badge_hibri":   {"name": "Значок «Хибри»", "icon": "🐦", "cur": "gems", "price": 80, "slot": "badge"},
}
SKINS = [k for k, v in CATALOG.items() if v.get("slot")]
SHORT_NICK = 5                       # ники короче 5 знаков — только по купону (у админа без ограничений)


# ЗАЩИТА ОТ НАКРУТКИ (22.11, по критику): прогресс присылает телефон, поэтому
#  • 🥐 начисляем только за СЕГОДНЯ и ВЧЕРА (по Москве), не больше EARN_DAY_CAP за день, каждый день — один раз (таблица eco_days);
#  • сундук за урок — только за настоящие уроки главы A1 (a1-<уровень 1–10>-<урок 1–7>), каждый урок — один раз (eco_done);
#  • большой сундук за уровень — максимум 10 квестов;
#  • в день не больше LESSON_CHESTS_DAY сундуков за уроки и LEVEL_CHESTS_DAY за уровни (остальные придут на следующий день).
LESSON_RE = re.compile(r"^a1-(10|[1-9])-[1-7]$")
LESSON_CHESTS_DAY = 12
LEVEL_CHESTS_DAY = 3


def safe_int(v, d=0):
    try:
        return int(json.loads(v) if isinstance(v, str) else v or 0)
    except Exception:
        return d


APP_START = datetime(2026, 11, 9, tzinfo=MSK)          # раньше этой даты очков быть не может
START_CAP = 30000                                       # потолок стартовых 🥐 при заведении кошелька


def start_points(c, uid, st):
    """Очки из прогресса для стартового баланса: только настоящие даты (от запуска приложения или от регистрации − 7 дней
    до сегодня), каждый день один раз и не больше EARN_DAY_CAP, всего не больше START_CAP."""
    pr = c.execute("SELECT created FROM players WHERE tg_id=?", (uid,)).fetchone()
    first = max(APP_START, datetime.fromtimestamp((pr[0] if pr and pr[0] else time.time()) - 7 * 86400, MSK)).date()
    last = today_msk().date()
    days = {}
    for k, v in st.items():
        m = re.match(r"^points_(\d{4})-(\d{1,2})-(\d{1,2})$", k)
        if not m:
            continue
        try:
            dte = datetime(int(m[1]), int(m[2]), int(m[3])).date()
        except ValueError:
            continue
        if first <= dte <= last:
            days[dte] = max(days.get(dte, 0), max(0, min(EARN_DAY_CAP, safe_int(v))))
    return min(START_CAP, sum(days.values()))


def day_key(shift=0):
    d = today_msk(shift)
    return f"{d.year}-{d.month}-{d.day}"          # как в ключах прогресса points_Г-М-Д


def eco_row(c, uid, r=None):
    """Кошелёк игрока; при первом обращении (или если его создал бот при оплате — ready=0) заводим:
    бурекасы = очки (каждый день ≤ EARN_DAY_CAP) − потраченное в старом кошельке мини-игр; уже пройденные уроки и уровни
    отмечаем как «засчитанные» (сундуков задним числом нет) и дарим один приветственный сундук."""
    w = c.execute("SELECT * FROM wallets WHERE tg_id=?", (uid,)).fetchone()
    if w and w["ready"]:
        return w
    st = json.loads((r["state"] if r else None) or (c.execute("SELECT state FROM players WHERE tg_id=?", (uid,)).fetchone() or ["{}"])[0] or "{}")
    start = max(0, start_points(c, uid, st) - safe_int(st.get("wallet_spent", "0")))
    if w:
        c.execute("UPDATE wallets SET bur=bur+?, ready=1 WHERE tg_id=?", (start, uid))
    else:
        c.execute("INSERT INTO wallets (tg_id, bur, gems, ready) VALUES (?,?,0,1)", (uid, start))
    c.execute("INSERT INTO ledger (tg_id, at, cur, delta, why) VALUES (?,?,?,?,?)", (uid, time.time(), "bur", start, "start"))
    for sh in (0, -1):                                         # сегодня и вчера уже учтены в стартовых бурекасах
        dk = day_key(sh)
        c.execute("INSERT OR REPLACE INTO eco_days VALUES (?,?,?)", (uid, dk, min(EARN_DAY_CAP, safe_int(st.get("points_" + dk, "0")))))
    lessons, quests = eco_progress(st)
    for key in ["lesson:" + x for x in lessons] + ["quest:" + x for x in quests]:
        c.execute("INSERT OR IGNORE INTO eco_done VALUES (?,?)", (uid, key))
    c.execute("INSERT INTO chests (tg_id, kind, src, at) VALUES (?,?,?,?)", (uid, "welcome", "welcome", time.time()))
    return c.execute("SELECT * FROM wallets WHERE tg_id=?", (uid,)).fetchone()


def eco_progress(st):
    """Из прогресса: настоящие пройденные уроки главы A1 и пройденные квесты (не больше 10)."""
    try:
        done = json.loads(st.get("done", "[]")) or []
    except Exception:
        done = []
    lessons = sorted({x for x in done if isinstance(x, str) and LESSON_RE.match(x)})
    quests = sorted(k[len("quest_"):] for k in st if k.startswith("quest_q-") and len(k) < 40 and safe_int(st[k], 1))[:10]
    return lessons, quests


def eco_add(c, uid, cur, delta, why):
    if not delta:
        return
    col = "bur" if cur == "bur" else "gems"
    c.execute(f"UPDATE wallets SET {col}=MAX(0, {col}+?) WHERE tg_id=?", (int(delta), uid))
    c.execute("INSERT INTO ledger (tg_id, at, cur, delta, why) VALUES (?,?,?,?,?)", (uid, time.time(), col, int(delta), why[:60]))


def eco_chest_add(c, uid, kind, src):
    n = c.execute("SELECT COUNT(*) FROM chests WHERE tg_id=? AND opened=0", (uid,)).fetchone()[0]
    if n < CHEST_QUEUE_MAX:
        c.execute("INSERT INTO chests (tg_id, kind, src, at) VALUES (?,?,?,?)", (uid, kind, src, time.time()))
        return True
    return False


def eco_catch_up(c, uid, r):
    """Новые очки (сегодня/вчера) → бурекасы; новые настоящие уроки → сундук, новые уровни → большой сундук (с дневным пределом)."""
    eco_row(c, uid, r)
    st = json.loads(r["state"] or "{}")
    for sh in (0, -1):
        dk = day_key(sh)
        pts = min(EARN_DAY_CAP, max(0, safe_int(st.get("points_" + dk, "0"))))
        row = c.execute("SELECT pts FROM eco_days WHERE tg_id=? AND day=?", (uid, dk)).fetchone()
        got = row[0] if row else 0
        if pts > got:
            eco_add(c, uid, "bur", pts - got, "learn")
            c.execute("INSERT OR REPLACE INTO eco_days VALUES (?,?,?)", (uid, dk, pts))
    lessons, quests = eco_progress(st)
    since = time.time() - 86400
    for kind, src, keys, cap in (("chest", "lesson", ["lesson:" + x for x in lessons], LESSON_CHESTS_DAY),
                                 ("big", "level", ["quest:" + x for x in quests], LEVEL_CHESTS_DAY)):
        left = cap - c.execute("SELECT COUNT(*) FROM chests WHERE tg_id=? AND src=? AND at>?", (uid, src, since)).fetchone()[0]
        if src == "level" and c.execute("SELECT COUNT(*) FROM eco_done WHERE tg_id=? AND key LIKE 'quest:%'", (uid,)).fetchone()[0] >= 10:
            left = 0
        for key in keys:
            if left <= 0:
                break
            if c.execute("SELECT 1 FROM eco_done WHERE tg_id=? AND key=?", (uid, key)).fetchone():
                continue
            if not eco_chest_add(c, uid, kind, src):           # очередь сундуков полна — урок засчитаем позже
                break
            c.execute("INSERT INTO eco_done VALUES (?,?)", (uid, key))
            left -= 1


def eco_reset(c, uid):
    """Только когда АДМИН стёр прогресс игрока: сундуки за уроки можно получить заново (дневной предел мешает злоупотреблению).
    Игровое «Начать сначала» (/hapi/reset) это НЕ вызывает — иначе бесконечный фарм сундуков сбросами."""
    c.execute("DELETE FROM eco_done WHERE tg_id=?", (uid,))
    # eco_days НЕ чистим: иначе «сброс» снова давал бы 🥐 за сегодняшние очки (накрутка сбросами); завтра всё как обычно


def msk_day():
    d = today_msk()
    return f"{d.year}-{d.month:02d}-{d.day:02d}"


def eco_me(c, uid):
    w = c.execute("SELECT * FROM wallets WHERE tg_id=?", (uid,)).fetchone()
    eq = c.execute("SELECT * FROM equip WHERE tg_id=?", (uid,)).fetchone()
    chests = c.execute("SELECT id, kind, src, at FROM chests WHERE tg_id=? AND opened=0 ORDER BY id", (uid,)).fetchall()
    items = [x[0] for x in c.execute("SELECT item FROM inventory WHERE tg_id=? ORDER BY at", (uid,)).fetchall()]
    return {"bur": w["bur"], "gems": w["gems"], "nick_coupons": w["nick_coupons"], "daily_ready": w["daily"] != msk_day(),
            "chests": [dict(x) for x in chests], "inv": {"items": items, "equip": {"frame": eq["frame"] if eq else "",
            "color": eq["color"] if eq else "", "badge": eq["badge"] if eq else ""}},
            "catalog": CATALOG, "packs": GEM_PACKS, "minigame_cost": MINIGAME_COST}


def eco_reward(c, uid, rarity):
    """Награда по редкости. Скин, который уже есть (или кончились), → 💎 по его цене."""
    owned = {x[0] for x in c.execute("SELECT item FROM inventory WHERE tg_id=?", (uid,)).fetchall()}
    def skin(cheap):
        pool = [k for k in SKINS if (CATALOG[k]["price"] <= 80) == cheap and k not in owned]
        if not pool:
            return {"type": "gems", "amount": 40 if cheap else 120}
        k = random.choice(pool)
        return {"type": "skin", "item": {"id": k, "name": CATALOG[k]["name"], "icon": CATALOG[k]["icon"], "slot": CATALOG[k]["slot"]}}
    if rarity == "rare":
        return {"type": "bur", "amount": random.randint(20, 40)}
    if rarity == "super":
        return random.choice([{"type": "bur", "amount": random.randint(60, 100)}] * 3 + [{"type": "hearts"}])
    if rarity == "epic":
        return random.choice([{"type": "gems", "amount": random.randint(5, 10)}, {"type": "bur", "amount": 200}, {"type": "freeze"}])
    if rarity == "mythic":
        return random.choice([{"type": "gems", "amount": 25}, skin(True), {"type": "plus", "amount": 1}])
    return random.choice([{"type": "gems", "amount": 100}, skin(False), {"type": "nick_coupon"}, {"type": "plus", "amount": 3}])


def eco_give(c, uid, rw, why):
    """Выдать награду на сервере. hearts / freeze применяет телефон (это его данные)."""
    t = rw["type"]
    if t == "bur":
        eco_add(c, uid, "bur", rw["amount"], why)
    elif t == "gems":
        eco_add(c, uid, "gems", rw["amount"], why)
    elif t == "skin":
        c.execute("INSERT OR IGNORE INTO inventory VALUES (?,?,?)", (uid, rw["item"]["id"], time.time()))
    elif t == "plus":
        grant_plus(c, uid, rw["amount"])
    elif t == "nick_coupon":
        c.execute("UPDATE wallets SET nick_coupons=nick_coupons+1 WHERE tg_id=?", (uid,))


def short_nick_ok(c, uid, h, is_admin):
    """Ник короче SHORT_NICK знаков — только по купону (купон тратится). → ошибка или ''."""
    if len(h) >= SHORT_NICK or is_admin:
        return ""
    w = c.execute("SELECT nick_coupons FROM wallets WHERE tg_id=?", (uid,)).fetchone()
    if not w or w[0] <= 0:
        return f"Ники короче {SHORT_NICK} знаков — редкие 💎 Их даёт купон из магазина или сундука"
    c.execute("UPDATE wallets SET nick_coupons=nick_coupons-1 WHERE tg_id=?", (uid,))
    return ""


# ---------- ОШИБКИ ПРИЛОЖЕНИЯ И СОБЫТИЯ (22.11, бета; клиент — telemetry.js) ----------
# Ошибки JS склеиваются по «подписи» (текст + файл + строка), чтобы одна ошибка у ста игроков была одной строкой.
# События — только из списка EVENTS, с счётчиком за день (МСК) и числом разных игроков. Без текста от игрока.
EVENTS = {"app_open", "lesson_start", "lesson_end", "lesson_exit", "quest_start", "quest_end", "quest_exit",
          "hearts_out", "repeat_start", "feedback_open"}
EVENT_X_RE = re.compile(r"^[a-z0-9.\-]{0,24}$")
TLM_LIMIT = {}                    # tg_id → (час, сколько записей) — не больше 200 в час от одного игрока
TLM_DAYS = 30                     # ошибки и события старше — удаляются


def log_telemetry(c, uid, p, now):
    hour = int(now // 3600)
    h, cnt = TLM_LIMIT.get(uid, (hour, 0))
    if h != hour:
        cnt = 0
    errs = p.get("errors") if isinstance(p.get("errors"), list) else []
    evs = p.get("events") if isinstance(p.get("events"), list) else []
    errs, evs = errs[:10], evs[:40]
    if cnt + len(errs) + len(evs) > 200:
        return {"ok": True, "skipped": True}
    TLM_LIMIT[uid] = (hour, cnt + len(errs) + len(evs))
    for e in errs:
        if not isinstance(e, dict):
            continue
        msg = re.sub(r"\s+", " ", str(e.get("msg") or "")).strip()[:300]
        src = str(e.get("src") or "")[:160]
        if not msg:
            continue
        info = str(e.get("info") or "")[:600]
        sig = hashlib.sha1(f"{msg}|{src}".encode()).hexdigest()[:20]
        c.execute("""INSERT INTO errors (sig, msg, src, info, first, last, n, last_tg) VALUES (?,?,?,?,?,?,1,?)
            ON CONFLICT(sig) DO UPDATE SET n = n + 1, last = excluded.last, last_tg = excluded.last_tg, info = excluded.info, done = 0""",
                  (sig, msg, src, info, now, now, uid))
        c.execute("INSERT OR IGNORE INTO errors_u (sig, tg_id) VALUES (?,?)", (sig, uid))
    day = datetime.fromtimestamp(now, MSK).strftime("%Y-%m-%d")
    for e in evs:
        if not isinstance(e, dict):
            continue
        name, x = str(e.get("name") or ""), str(e.get("x") or "").lower()
        if name not in EVENTS or not EVENT_X_RE.match(x):
            continue
        c.execute("""INSERT INTO events (day, name, x, n) VALUES (?,?,?,1)
            ON CONFLICT(day, name, x) DO UPDATE SET n = n + 1""", (day, name, x))
        c.execute("INSERT OR IGNORE INTO events_u (day, name, tg_id) VALUES (?,?,?)", (day, name, uid))
    if random.random() < 0.02:    # иногда чистим старое
        old = now - TLM_DAYS * 86400
        oldday = datetime.fromtimestamp(old, MSK).strftime("%Y-%m-%d")
        c.execute("DELETE FROM errors_u WHERE sig IN (SELECT sig FROM errors WHERE last < ?)", (old,))
        c.execute("DELETE FROM errors WHERE last < ?", (old,))
        c.execute("DELETE FROM events WHERE day < ?", (oldday,))
        c.execute("DELETE FROM events_u WHERE day < ?", (oldday,))
    return {"ok": True}


def admin_telemetry(c, now):
    """Для админки: ошибки (новые сверху) и события за 7 дней (по дням + где чаще всего выходят из урока)."""
    rows = c.execute("""SELECT e.*, (SELECT COUNT(*) FROM errors_u u WHERE u.sig = e.sig) AS users,
        (SELECT handle FROM players WHERE tg_id = e.last_tg) AS handle FROM errors e ORDER BY e.done, e.last DESC LIMIT 100""").fetchall()
    errors = [{"sig": x["sig"], "msg": x["msg"], "src": x["src"], "info": x["info"], "first": x["first"], "last": x["last"],
               "n": x["n"], "users": x["users"], "handle": x["handle"], "done": bool(x["done"])} for x in rows]
    since = datetime.fromtimestamp(now - 6 * 86400, MSK).strftime("%Y-%m-%d")
    days = {}
    for x in c.execute("SELECT day, name, SUM(n) AS n FROM events WHERE day >= ? GROUP BY day, name", (since,)).fetchall():
        days.setdefault(x["day"], {})[x["name"]] = {"n": x["n"], "users": 0}
    for x in c.execute("SELECT day, name, COUNT(*) AS u FROM events_u WHERE day >= ? GROUP BY day, name", (since,)).fetchall():
        days.setdefault(x["day"], {}).setdefault(x["name"], {"n": 0, "users": 0})["users"] = x["u"]
    exits = [{"x": x["x"], "n": x["n"]} for x in c.execute("""SELECT x, SUM(n) AS n FROM events WHERE day >= ? AND name IN ('lesson_exit', 'quest_exit')
        AND x != '' GROUP BY x ORDER BY n DESC LIMIT 10""", (since,)).fetchall()]
    return {"errors": errors, "open": sum(1 for e in errors if not e["done"]),
            "days": [{"day": d, "ev": days[d]} for d in sorted(days, reverse=True)], "exits": exits}


# ---------- УВЕДОМЛЕНИЯ ИГРОКУ (22.11): «к сожалению, твой ник передан…», «подписку сняли» и т. п. ----------
# Хранятся в таблице notices; приходят в каждом ответе me() (поле notices — непрочитанные), телефон показывает окно «📬».
# Если игрок нажимал «Старт» у бота — то же сообщение уходит и в Telegram (в фоне, после ответа; через посредника tg_api).
TG_OUTBOX = []                    # (tg_id, text) — отправляется после ответа, без блокировки базы
TG_OUTBOX_LOCK = threading.Lock()


def notify(c, uid, text, mood="info", note=None):
    note = str(note or "").strip()[:300]
    c.execute("INSERT INTO notices (tg_id, at, text, note, mood, read) VALUES (?,?,?,?,?,0)", (uid, time.time(), text[:400], note, mood))
    try:
        started = c.execute("SELECT 1 FROM bot_started WHERE tg_id=?", (uid,)).fetchone()
    except sqlite3.OperationalError:              # таблицу создаёт бот; если бота ещё не было — не пишем
        started = None
    if started:
        with TG_OUTBOX_LOCK:
            TG_OUTBOX.append((uid, "📬 " + text + (f"\n\n💬 {note}" if note else "")))


def admin_notices(what):
    """Что сказать игроку по списку изменений админа. → [(текст, настроение)]"""
    out = []
    if "nick.take_from_other" in what:
        out.append((f"🎉 Тебе передали ник @{what['nick.take_from_other']}!", "happy"))
    if "nick.add" in what:
        out.append((f"🎁 Тебе выдали новый ник @{what['nick.add']}!", "happy"))
    if "nick.remove" in what:
        out.append((f"К сожалению, ник @{what['nick.remove']} у тебя забрали.", "sad"))
    if "nick.main" in what:
        out.append((f"Твой основной ник теперь @{what['nick.main']}.", "info"))
    if "plus.add_days" in what:
        d = what["plus.add_days"]
        out.append((f"✨ Тебе подарили Hirbis Plus на {d} {'день' if d % 10 == 1 and d % 100 != 11 else 'дня' if 2 <= d % 10 <= 4 and not 12 <= d % 100 <= 14 else 'дней'} — сердечки бесконечные!", "happy"))
    if "plus.remove" in what:
        out.append(("К сожалению, подписку Hirbis Plus сняли. Сердечки снова считаются.", "sad"))
    for key, icon, name in (("addBur", "🥐", "бурекасов"), ("addGems", "💎", "хибриллиантов")):
        if key in what:
            n = what[key]
            out.append((f"{icon} Тебе начислили +{n} {name}!", "happy") if n > 0 else (f"К сожалению, у тебя списали {-n} {name}.", "sad"))
    if "addPoints" in what:
        n = what["addPoints"]
        out.append((f"⭐ Тебе начислили +{n} очков!", "happy") if n > 0 else (f"У тебя списали {-n} очков.", "sad"))
    if any(k.startswith("streak.") for k in what):
        out.append(("🔥 Администрация поправила твою серию и заморозки.", "info"))
    if "resetProgress" in what:
        out.append(("К сожалению, твой прогресс был сброшен администрацией. Начнём заново — ты справишься! 💪", "sad"))
    if "unban" in what:
        out.append(("✅ Блокировка снята. С возвращением!", "happy"))
    if "admin" in what:
        out.append((("👑 Тебе выдали права администратора." if what["admin"] else "Права администратора сняты."), "info"))
    if "nickLimit" in what:
        out.append((f"🏷 Теперь у тебя может быть ников: {what['nickLimit']}.", "info"))
    return out


def tg_send_outbox():
    """Отправить накопленные уведомления в Telegram (вызывается после ответа клиенту)."""
    with TG_OUTBOX_LOCK:
        items = TG_OUTBOX[:]
        TG_OUTBOX.clear()
    if not items:
        return
    import urllib.request
    for uid, text in items:
        try:
            body = json.dumps({"chat_id": uid, "text": text,
                               "reply_markup": {"inline_keyboard": [[{"text": "🐦 Открыть Hirbis", "web_app": {"url": "https://ivritapp.github.io/ivrit-app/"}}]]}}).encode()
            req = urllib.request.Request(f"{tg_api()}/bot{token()}/sendMessage", data=body,
                                         headers={"Content-Type": "application/json", "User-Agent": "HirbisBot/1.0"})
            urllib.request.urlopen(req, timeout=10).read()
        except Exception:
            pass                                  # игрок заблокировал бота или нет связи — в приложении всё равно увидит


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
            except Exception as e:                # ошибка в обработке: ничего не сохраняем, отвечаем понятно (а не обрывом связи)
                c.rollback()
                print("ОШИБКА", route, type(e).__name__, str(e)[:200], file=sys.stderr, flush=True)
                res = (200, {"error": "Что-то пошло не так на сервере. Попробуй ещё раз 🙏"})
            finally:
                c.close()
        inv = res[1].pop("_invoice", None) if isinstance(res[1], dict) else None
        if inv:                                   # счёт создаём уже без блокировки базы (это запрос в Telegram)
            try:
                link = create_invoice_link(inv["price"], inv["payload"], inv.get("title"), inv.get("desc"))
            except Exception:
                link = None
            res = (200, {"link": link, "price": inv["price"]} if link else {"error": "Оплата сейчас недоступна. Попробуй позже 🙏"})
        self.send_json(*res)
        if TG_OUTBOX:                             # уведомления в Telegram — уже после ответа, в фоне
            threading.Thread(target=tg_send_outbox, daemon=True).start()

    # ---------- логика ----------
    def route(self, c, route, user, p):
        uid = int(user["id"])
        now = time.time()
        if route == "/hapi/recover":                               # потерял Telegram: вход в свой аккаунт
            return self.recover(c, uid, user, p, now)
        if route == "/hapi/check":                                 # свободен ли ник (аккаунт не создаём)
            h = norm(p.get("handle"))
            if not HANDLE_RE.match(h):
                return 200, {"ok": False, "error": BAD_NICK}
            if nick_is_bad(h):
                return 200, {"ok": False, "error": bad_nick_msg(uid, h)}
            if len(h) < SHORT_NICK:
                return 200, {"ok": False, "error": f"Ник — от {SHORT_NICK} знаков (короткие — редкие, их дают за 💎)"}
            o = owner_of(c, h)
            return 200, {"ok": o is None or o == uid, "error": "" if o is None or o == uid else "Этот ник уже занят"}

        name = " ".join(x for x in [user.get("first_name"), user.get("last_name")] if x)[:60]
        r = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()
        if not r and not (route == "/hapi/sync" and p.get("consent")):
            return 200, {"error": "no_consent"}                   # 152-ФЗ: аккаунт — только после согласия (его даёт /sync)
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
                         "admin": bool(rr["admin"]), "pin_set": bool(rr["admin"] and rr["admin_pin"]), "tg_id": uid,
                         "plus_until": plus_until(c, uid),
                         "notices": [dict(x) for x in c.execute("SELECT id, at, text, note, mood FROM notices WHERE tg_id=? AND read=0 ORDER BY id LIMIT 20", (uid,)).fetchall()]},
                        **extra)

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
            # eco_done НЕ чистим (по критику: иначе сброс → снова сундуки → бесконечный фарм); за те же уроки сундука второй раз нет
            return 200, me(ver=self.save(c, uid, {}, r["ver"]), state={})

        if route == "/hapi/feedback":                             # отзыв тестера (бета)
            text = re.sub(r"\s+", " ", str(p.get("text") or "")).strip()[:1500]
            if len(text) < 3:
                return 200, {"error": "Напиши хотя бы пару слов 🙂"}
            if c.execute("SELECT COUNT(*) FROM feedback WHERE tg_id=? AND at>?", (uid, now - 3600)).fetchone()[0] >= 10:
                return 200, {"error": "Спасибо! Ты уже много написал за этот час — продолжим чуть позже 🙏"}
            place, info = str(p.get("place") or "")[:60], str(p.get("info") or "")[:300]
            c.execute("INSERT INTO feedback (tg_id, at, text, place, info) VALUES (?,?,?,?,?)", (uid, now, text, place, info))
            for a in c.execute("SELECT tg_id FROM players WHERE admin=1").fetchall():       # админам — сразу в Telegram
                try:
                    started = c.execute("SELECT 1 FROM bot_started WHERE tg_id=?", (a[0],)).fetchone()
                except sqlite3.OperationalError:
                    started = None
                if started:
                    with TG_OUTBOX_LOCK:
                        TG_OUTBOX.append((a[0], f"📝 Отзыв от @{r['handle']}" + (f" ({place})" if place else "") + f":\n\n{text}"))
            return 200, {"ok": True}

        if route == "/hapi/log":                                  # ошибки приложения и события (telemetry.js)
            return 200, log_telemetry(c, uid, p, now)

        if route == "/hapi/notices/read":                         # игрок прочитал уведомления
            ids = [int(x) for x in (p.get("ids") or []) if str(x).isdigit()][:50]
            if ids:
                c.execute(f"UPDATE notices SET read=1 WHERE tg_id=? AND id IN ({','.join('?' * len(ids))})", (uid, *ids))
            return 200, me(ok=True)

        # ----- Hirbis Plus -----
        if route == "/hapi/plus/status":
            return 200, me(price=PLUS_PRICE, days=PLUS_DAYS, now=now)
        if route == "/hapi/plus/promo":                           # применить промокод
            pr, err = promo_check(c, p.get("code"), uid)
            if err:
                return 200, me(error=err)
            if pr["kind"] == "days" or plus_price(pr) == 0:
                days = pr["value"] if pr["kind"] == "days" else PLUS_DAYS
                grant_plus(c, uid, days)
                promo_use(c, pr["code"], uid)
                return 200, me(ok=True, granted=days, price=PLUS_PRICE, days=PLUS_DAYS)
            return 200, me(ok=True, code=pr["code"], discount=pr["value"], price=plus_price(pr), days=PLUS_DAYS)
        if route == "/hapi/plus/invoice":                         # ссылка на оплату звёздами (код — по желанию)
            pr = None
            if p.get("code"):
                pr, err = promo_check(c, p.get("code"), uid)
                if err:
                    return 200, {"error": err}
            price = plus_price(pr)
            if price <= 0:
                return 200, {"error": "С этим кодом платить не нужно — нажми «Применить»"}
            payload = json.dumps({"u": uid, "p": price, "d": PLUS_DAYS, "c": pr["code"] if pr else ""}, separators=(",", ":"))
            return 200, {"_invoice": {"price": price, "payload": payload}}

        # ----- экономика: 🥐 бурекасы, 💎 хибриллианты, сундуки, магазин -----
        if route.startswith("/hapi/eco/"):
            eco_catch_up(c, uid, r)
            w = c.execute("SELECT * FROM wallets WHERE tg_id=?", (uid,)).fetchone()
            if route == "/hapi/eco/me":
                return 200, me(eco=eco_me(c, uid))
            if route == "/hapi/eco/daily":                            # ежедневный сундук
                if w["daily"] == msk_day():
                    return 200, me(error="Сегодня сундук уже забран. Новый — завтра 🌙", eco=eco_me(c, uid))
                c.execute("UPDATE wallets SET daily=? WHERE tg_id=?", (msk_day(), uid))
                c.execute("INSERT INTO chests (tg_id, kind, src, at) VALUES (?,?,?,?)", (uid, "daily", "daily", now))
                return 200, me(ok=True, eco=eco_me(c, uid))
            if route == "/hapi/eco/open":                             # открыть сундук: редкость и награда решаются здесь
                ch = c.execute("SELECT * FROM chests WHERE id=? AND tg_id=? AND opened=0", (int(p.get("id") or 0), uid)).fetchone()
                if not ch:
                    return 200, me(error="Сундук не найден", eco=eco_me(c, uid))
                steps = [CHEST_START.get(ch["kind"], "rare")]
                while steps[-1] in UPGRADE and random.random() < UPGRADE[steps[-1]]:
                    steps.append(RARITIES[RARITIES.index(steps[-1]) + 1])
                rw = eco_reward(c, uid, steps[-1])
                eco_give(c, uid, rw, f"chest:{ch['kind']}:{steps[-1]}")
                c.execute("UPDATE chests SET opened=?, rarity=?, reward=? WHERE id=?", (now, steps[-1], json.dumps(rw, ensure_ascii=False), ch["id"]))
                return 200, me(ok=True, kind=ch["kind"], steps=steps, rarity=steps[-1], reward=rw, eco=eco_me(c, uid))
            if route == "/hapi/eco/buy":
                key = str(p.get("item") or "")
                it = CATALOG.get(key)
                if not it:
                    return 200, me(error="Такого товара нет", eco=eco_me(c, uid))
                if it.get("slot") and c.execute("SELECT 1 FROM inventory WHERE tg_id=? AND item=?", (uid, key)).fetchone():
                    return 200, me(error="Это уже твоё 🙂", eco=eco_me(c, uid))
                if key == "nick_slot" and r["nick_limit"] == UNLIMITED:
                    return 200, me(error="У тебя и так ников без ограничений 🙂", eco=eco_me(c, uid))
                have = w["bur"] if it["cur"] == "bur" else w["gems"]
                if have < it["price"]:
                    return 200, me(error="not_enough", need=it["price"] - have, cur=it["cur"], eco=eco_me(c, uid))
                eco_add(c, uid, it["cur"], -it["price"], "buy:" + key)
                give = {}
                if it.get("slot"):
                    c.execute("INSERT OR IGNORE INTO inventory VALUES (?,?,?)", (uid, key, now))
                elif key in ("chest", "big_chest"):
                    c.execute("INSERT INTO chests (tg_id, kind, src, at) VALUES (?,?,?,?)", (uid, "big" if key == "big_chest" else "chest", "shop", now))
                elif key == "nick_coupon":
                    c.execute("UPDATE wallets SET nick_coupons=nick_coupons+1 WHERE tg_id=?", (uid,))
                elif key == "nick_slot":
                    if r["nick_limit"] != UNLIMITED:
                        c.execute("UPDATE players SET nick_limit=? WHERE tg_id=?", (limit_of(r) + 1, uid))
                else:                                                  # freeze / hearts — применяет телефон
                    give = {"type": key}
                return 200, me(ok=True, item=key, apply=give, eco=eco_me(c, uid))
            if route == "/hapi/eco/equip":
                slot, key = str(p.get("slot") or ""), p.get("item") or ""
                if slot not in ("frame", "color", "badge"):
                    return 200, me(error="bad slot")
                if key and (CATALOG.get(key, {}).get("slot") != slot or not c.execute("SELECT 1 FROM inventory WHERE tg_id=? AND item=?", (uid, key)).fetchone()):
                    return 200, me(error="Этого скина у тебя нет", eco=eco_me(c, uid))
                c.execute("INSERT OR IGNORE INTO equip (tg_id) VALUES (?)", (uid,))
                c.execute(f"UPDATE equip SET {slot}=? WHERE tg_id=?", (key, uid))
                return 200, me(ok=True, eco=eco_me(c, uid))
            if route == "/hapi/eco/spend":                            # раунд мини-игры
                cost = MINIGAME_COST.get(str(p.get("game") or ""))
                if not cost:
                    return 200, me(error="Нет такой игры")
                if w["bur"] < cost:
                    return 200, me(error="not_enough", need=cost - w["bur"], cur="bur", eco=eco_me(c, uid))
                eco_add(c, uid, "bur", -cost, "game:" + str(p.get("game")))
                return 200, me(ok=True, eco=eco_me(c, uid))
            if route == "/hapi/eco/gems_invoice":                     # 💎 за ⭐
                pack = GEM_PACKS.get(str(p.get("pack") or ""))
                if not pack:
                    return 200, {"error": "Нет такого набора"}
                payload = json.dumps({"t": "gems", "u": uid, "p": pack["stars"], "g": pack["gems"]}, separators=(",", ":"))
                return 200, {"_invoice": {"price": pack["stars"], "payload": payload,
                                          "title": f"{pack['gems']} хибриллиантов 💎", "desc": "Хибриллианты для магазина Hirbis: скины, ники, сундуки."}}
            return 404, {"error": "not found"}

        # ----- ники игрока -----
        if route in ("/hapi/handle", "/hapi/nicks/add", "/hapi/nicks/main", "/hapi/nicks/remove"):
            h = norm(p.get("handle"))
            if not HANDLE_RE.match(h):
                return 200, me(error=BAD_NICK)
            if nick_is_bad(h) and route != "/hapi/nicks/remove":
                return 200, me(error=bad_nick_msg(uid, h))
            o = owner_of(c, h)
            mine = nicks_of(c, uid)
            if route == "/hapi/handle":                            # сменить основной ник
                if o is not None and o != uid:
                    return 200, me(error="Этот ник уже занят")
                old, lim = r["handle"], limit_of(r)
                if o is None:
                    e = short_nick_ok(c, uid, h, r["admin"])
                    if e:
                        return 200, me(error=e)
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
                e = short_nick_ok(c, uid, h, r["admin"])
                if e:
                    return 200, me(error=e)
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

        # ----- чат: личный (только друзья) и командный (только участники) -----
        if route == "/hapi/chat/unread":
            return 200, unread_for(c, uid)
        if route in ("/hapi/chat/list", "/hapi/chat/send", "/hapi/chat/report"):
            if route == "/hapi/chat/report":                        # пожаловаться на сообщение
                mid = int(p.get("id") or 0)
                m = c.execute("SELECT * FROM messages WHERE id=?", (mid,)).fetchone()
                if not m:
                    return 200, {"error": "Сообщение не найдено"}
                c.execute("INSERT OR IGNORE INTO chat_reports VALUES (?,?,?)", (mid, uid, now))
                c.execute("INSERT INTO admin_log VALUES (?,?,?,?)", (now, r["handle"], str(m["sender"]),
                          json.dumps({"chat_report": {"msg": mid, "text": m["text"][:200]}}, ensure_ascii=False)))
                return 200, {"ok": True}
            if p.get("team"):
                t = team_of(c, uid)
                if not t:
                    return 200, {"error": "Ты не в команде"}
                peer, where, args = f"t{t['id']}", "team_id=?", (t["id"],)
                to_id, team_id = 0, t["id"]
            else:
                o = owner_of(c, norm(p.get("with")))
                if o is None or o == uid:
                    return 200, {"error": "Такого ника нет"}
                if relation(c, uid, o) != "friend":
                    return 200, {"error": "Писать можно только друзьям"}
                peer, where, args = f"u{o}", "((sender=? AND receiver=?) OR (sender=? AND receiver=?))", (uid, o, o, uid)
                to_id, team_id = o, 0
            if route == "/hapi/chat/send":
                text = clean_text(p.get("text"))
                if not text:
                    return 200, {"error": "Пустое сообщение"}
                cnt = c.execute("SELECT COUNT(*) FROM messages WHERE sender=? AND at>?", (uid, now - 60)).fetchone()[0]
                if cnt >= MSG_PER_MIN:
                    return 200, {"error": "Слишком быстро — подожди минутку 🙂"}
                c.execute("INSERT INTO messages (sender, receiver, team_id, text, at) VALUES (?,?,?,?,?)", (uid, to_id, team_id, text, now))
            since = int(p.get("since") or 0)
            rows = c.execute(f"SELECT * FROM messages WHERE {where} AND id>? ORDER BY id DESC LIMIT 60", args + (since,)).fetchall()[::-1]
            who = {}
            def author(sid):
                if sid not in who:
                    pr = c.execute("SELECT * FROM players WHERE tg_id=?", (sid,)).fetchone()
                    who[sid] = profile_card(c, pr, full=False) if pr else {"handle": "?", "name": "?"}
                return who[sid]
            msgs = [{"id": m["id"], "me": m["sender"] == uid, "text": m["text"], "at": m["at"],
                     "from": {k: author(m["sender"]).get(k) for k in ("handle", "name", "gender", "avatar")}} for m in rows]
            if rows:
                c.execute("INSERT INTO chat_read VALUES (?,?,?) ON CONFLICT(tg_id, peer) DO UPDATE SET last_id=MAX(last_id, excluded.last_id)",
                          (uid, peer, rows[-1]["id"]))
            return 200, {"messages": msgs}

        # ----- команды -----
        if route == "/hapi/team/me":
            t = team_of(c, uid)
            return 200, {"team": team_card(c, t, uid) if t else None, "emoji": TEAM_EMOJI}
        if route == "/hapi/team/create":
            if team_of(c, uid):
                return 200, {"error": "Ты уже в команде — сначала выйди из неё"}
            name = re.sub(r"\s+", " ", str(p.get("name") or "")).strip()[:30]
            if len(name) < 2:
                return 200, {"error": "Название — хотя бы 2 буквы"}
            lat = re.sub(r"[^a-z0-9_]", "", name.lower())
            if CHAT_BAD.search(name) or (len(lat) >= 3 and nick_is_bad(lat)):
                return 200, {"error": "Придумай другое название 🙂"}
            emoji = p.get("emoji") if p.get("emoji") in TEAM_EMOJI else TEAM_EMOJI[0]
            cur = c.execute("INSERT INTO teams (name, emoji, code, owner, created) VALUES (?,?,?,?,?)", (name, emoji, new_team_code(c), uid, now))
            c.execute("INSERT INTO team_members VALUES (?,?,?)", (uid, cur.lastrowid, now))
            return 200, {"team": team_card(c, team_of(c, uid), uid)}
        if route == "/hapi/team/join":
            if team_of(c, uid):
                return 200, {"error": "Ты уже в команде — сначала выйди из неё"}
            t = c.execute("SELECT * FROM teams WHERE code=?", (str(p.get("code") or "").strip().upper()[:8],)).fetchone()
            if not t:
                return 200, {"error": "Команды с таким кодом нет"}
            if c.execute("SELECT COUNT(*) FROM team_members WHERE team_id=?", (t["id"],)).fetchone()[0] >= TEAM_MAX:
                return 200, {"error": f"В команде уже {TEAM_MAX} человек"}
            c.execute("INSERT INTO team_members VALUES (?,?,?)", (uid, t["id"], now))
            return 200, {"team": team_card(c, t, uid)}
        if route in ("/hapi/team/leave", "/hapi/team/kick"):
            t = team_of(c, uid)
            if not t:
                return 200, {"team": None}
            who_id = uid
            if route == "/hapi/team/kick":
                if t["owner"] != uid:
                    return 200, {"error": "Убирать из команды может только капитан"}
                who_id = owner_of(c, norm(p.get("handle")))
                if who_id is None or who_id == uid or not c.execute("SELECT 1 FROM team_members WHERE tg_id=? AND team_id=?", (who_id, t["id"])).fetchone():
                    return 200, {"error": "Этого игрока нет в команде"}
            c.execute("DELETE FROM team_members WHERE tg_id=?", (who_id,))
            left = c.execute("SELECT tg_id FROM team_members WHERE team_id=? ORDER BY joined", (t["id"],)).fetchall()
            if not left:                                             # ушёл последний — команды больше нет
                c.execute("DELETE FROM teams WHERE id=?", (t["id"],))
                c.execute("DELETE FROM messages WHERE team_id=?", (t["id"],))
            elif who_id == t["owner"]:                               # ушёл капитан — капитаном становится старший по стажу
                c.execute("UPDATE teams SET owner=? WHERE id=?", (left[0][0], t["id"]))
            t2 = team_of(c, uid)
            return 200, {"team": team_card(c, t2, uid) if t2 else None}
        if route == "/hapi/team/top":                                # рейтинг команд за неделю
            top = []
            for t in c.execute("SELECT * FROM teams").fetchall():
                ids = [m[0] for m in c.execute("SELECT tg_id FROM team_members WHERE team_id=?", (t["id"],)).fetchall()]
                week = 0
                for i in ids:
                    pr = c.execute("SELECT state FROM players WHERE tg_id=?", (i,)).fetchone()
                    if pr:
                        week += week_points(json.loads(pr[0] or "{}"))
                top.append({"id": t["id"], "name": t["name"], "emoji": t["emoji"], "size": len(ids), "week": week})
            top.sort(key=lambda x: -x["week"])
            mine = team_of(c, uid)
            return 200, {"top": top[:30], "place": next((i + 1 for i, x in enumerate(top) if mine and x["id"] == mine["id"]), None),
                         "my_id": mine["id"] if mine else None, "total": len(top)}

        # ----- админ -----
        if route.startswith("/hapi/admin/"):
            if not r["admin"]:
                return 403, {"error": "нет прав"}
            pin = str(p.get("pin") or "")
            if route == "/hapi/admin/pin/set":                         # задать / сменить пароль
                if not pin or len(pin) > 200:
                    return 200, {"error": "Введи пароль"}
                if r["admin_pin"] and not pin_ok(str(p.get("old") or ""), r["admin_pin"]):
                    return 200, {"error": "Старый пароль неверный"}
                c.execute("UPDATE players SET admin_pin=?, pin_fail=0, pin_lock=0 WHERE tg_id=?", (pin_hash(pin), uid))
                c.execute("DELETE FROM admin_sessions WHERE tg_id=?", (uid,))
                return 200, me(ok=True)
            if route == "/hapi/admin/login":                            # вход по паролю → сессия на 12 часов
                if not r["admin_pin"]:
                    return 200, {"error": "Сначала задай пароль"}
                if (r["pin_lock"] or 0) > now:
                    return 200, {"error": "Слишком много ошибок. Вход закрыт ещё " + left_text(r["pin_lock"] - now)}
                if not pin_ok(pin, r["admin_pin"]):
                    fails = (r["pin_fail"] or 0) + 1
                    lock = now + PIN_LOCK_SEC if fails >= PIN_FAILS else 0
                    c.execute("UPDATE players SET pin_fail=?, pin_lock=? WHERE tg_id=?", (0 if lock else fails, lock, uid))
                    return 200, {"error": "Неверный пароль" + (f". Осталось попыток: {PIN_FAILS - fails}" if not lock else ". Вход закрыт на 48 часов")}
                tok = os.urandom(24).hex()
                c.execute("UPDATE players SET pin_fail=0, pin_lock=0 WHERE tg_id=?", (uid,))
                c.execute("DELETE FROM admin_sessions WHERE until < ?", (now,))
                c.execute("INSERT INTO admin_sessions VALUES (?,?,?)", (tok, uid, now + SESSION_SEC))
                return 200, {"session": tok, "until": now + SESSION_SEC}
            if route == "/hapi/admin/recovery/get":
                if not session_ok(c, uid, p.get("session")):
                    return 200, {"error": "need_pin"}
                return 200, {"set": bool(r["rec_pass"]), "user": r["rec_user"], "phone_tail": ""}
            if route == "/hapi/admin/recovery/set":
                if not session_ok(c, uid, p.get("session")):
                    return 200, {"error": "need_pin"}
                ph, us, pw = norm_phone(p.get("phone")), norm(p.get("tg")), str(p.get("password") or "")
                if len(ph) < 10:
                    return 200, {"error": "Номер телефона: минимум 10 цифр"}
                if not us:
                    return 200, {"error": "Укажи свой юз в Telegram"}
                if len(pw) < 4:
                    return 200, {"error": "Пароль восстановления — хотя бы 4 символа"}
                c.execute("UPDATE players SET rec_phone=?, rec_user=?, rec_pass=?, rec_fail=0, rec_lock=0 WHERE tg_id=?",
                          (pin_hash(ph), us, pin_hash(pw), uid))
                return 200, {"ok": True, "set": True, "user": us}
            if route == "/hapi/admin/logout":
                c.execute("DELETE FROM admin_sessions WHERE token=?", (str(p.get("session") or ""),))
                return 200, {"ok": True}
            if not session_ok(c, uid, p.get("session")):              # всё остальное — только после входа по паролю
                return 200, {"error": "need_pin"}
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
            # отзывы тестеров
            if route == "/hapi/admin/feedback/list":
                rows = c.execute("""SELECT f.*, p.handle FROM feedback f LEFT JOIN players p ON p.tg_id = f.tg_id
                    ORDER BY f.done, f.id DESC LIMIT 300""").fetchall()
                return 200, {"feedback": [{"id": x["id"], "at": x["at"], "text": x["text"], "place": x["place"], "info": x["info"],
                                           "done": bool(x["done"]), "handle": x["handle"]} for x in rows],
                             "open": c.execute("SELECT COUNT(*) FROM feedback WHERE done=0").fetchone()[0]}
            if route == "/hapi/admin/feedback/done":
                c.execute("UPDATE feedback SET done=? WHERE id=?", (1 if p.get("done", True) else 0, int(p.get("id") or 0)))
                return 200, {"ok": True}
            # 🐞 ошибки приложения + события за 7 дней
            if route == "/hapi/admin/errors":
                return 200, admin_telemetry(c, now)
            if route == "/hapi/admin/errors/done":
                c.execute("UPDATE errors SET done=? WHERE sig=?", (1 if p.get("done", True) else 0, str(p.get("sig") or "")[:64]))
                return 200, {"ok": True}
            # промокоды Hirbis Plus
            if route == "/hapi/admin/promo/list":
                rows = c.execute("SELECT * FROM promos ORDER BY created DESC LIMIT 500").fetchall()
                return 200, {"promos": [promo_public(x) for x in rows], "price": PLUS_PRICE, "days": PLUS_DAYS}
            if route == "/hapi/admin/promo/create":
                code = norm_code(p.get("code")) or "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))
                kind = p.get("kind")
                try:
                    value, max_uses, days_valid = int(p.get("value") or 0), int(p.get("max_uses") or 0), float(p.get("days_valid") or 0)
                except (TypeError, ValueError):
                    return 200, {"error": "Числа введены неверно"}
                if not PROMO_RE.match(code):
                    return 200, {"error": "Код: 3–32 символа, латинские буквы, цифры, - и _"}
                if kind not in ("discount", "days"):
                    return 200, {"error": "Выбери вид промокода"}
                if kind == "discount" and not 1 <= value <= 100:
                    return 200, {"error": "Скидка — от 1 до 100 %"}
                if kind == "days" and not 1 <= value <= 3650:
                    return 200, {"error": "Дней — от 1 до 3650"}
                if c.execute("SELECT 1 FROM promos WHERE code=?", (code,)).fetchone():
                    return 200, {"error": f"Код {code} уже есть"}
                c.execute("INSERT INTO promos (code, kind, value, max_uses, used, expires, created, by, note) VALUES (?,?,?,?,0,?,?,?,?)",
                          (code, kind, value, max(0, max_uses), now + days_valid * 86400 if days_valid > 0 else 0, now, r["handle"],
                           str(p.get("note") or "")[:100]))
                c.execute("INSERT INTO admin_log VALUES (?,?,?,?)", (now, r["handle"], "", json.dumps({"promo.create": code, "kind": kind, "value": value}, ensure_ascii=False)))
                return 200, {"ok": True, "promo": promo_public(c.execute("SELECT * FROM promos WHERE code=?", (code,)).fetchone())}
            if route == "/hapi/admin/promo/delete":
                code = norm_code(p.get("code"))
                c.execute("DELETE FROM promos WHERE code=?", (code,))
                c.execute("INSERT INTO admin_log VALUES (?,?,?,?)", (now, r["handle"], "", json.dumps({"promo.delete": code})))
                return 200, {"ok": True}
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

    def recover(self, c, uid, user, p, now):
        """Перенос аккаунта (с восстановлением) на новый Telegram: телефон + старый юз + пароль. 5 ошибок с одного Telegram → он закрыт на 48 часов."""
        ph, us, pw = norm_phone(p.get("phone")), norm(p.get("tg")), str(p.get("password") or "")
        if not ph or not us or not pw:
            return 200, {"error": "Заполни все три поля"}
        # Блокируем только ТОГО, кто вводит неверные данные (его Telegram), а не владельца аккаунта.
        # Плюс общий предел на всех: не больше 30 ошибок в сутки (защита от перебора с кучи аккаунтов).
        t = c.execute("SELECT * FROM rec_tries2 WHERE tg_id=?", (uid,)).fetchone()
        if t and (t["lock"] or 0) > now:
            return 200, {"error": "Слишком много ошибок с этого Telegram. Попробуй через " + left_text(t["lock"] - now)}
        day_fails = c.execute("SELECT COALESCE(SUM(fails),0) FROM rec_tries2 WHERE at > ?", (now - 86400,)).fetchone()[0]
        if day_fails >= 30:
            return 200, {"error": "Восстановление временно недоступно. Попробуй завтра."}
        cands = c.execute("SELECT * FROM players WHERE rec_pass != ''").fetchall()
        hit = None
        for x in cands:
            if x["rec_user"] == us and pin_ok(ph, x["rec_phone"]) and pin_ok(pw, x["rec_pass"]):
                hit = x
                break
        if not hit:
            prev = (t["fails"] or 0) if t and (t["at"] or 0) > now - 86400 and not ((t["lock"] or 0) and t["lock"] <= now) else 0
            fails = prev + 1
            lock = now + PIN_LOCK_SEC if fails >= PIN_FAILS else 0
            c.execute("INSERT OR REPLACE INTO rec_tries2 VALUES (?,?,?,?)", (uid, fails, lock, now))
            return 200, {"error": "Данные не подходят" + (f". Осталось попыток: {PIN_FAILS - fails}" if not lock else ". С этого Telegram вход закрыт на 48 часов")}
        c.execute("DELETE FROM rec_tries2 WHERE tg_id=?", (uid,))
        old_id = hit["tg_id"]
        if old_id == uid:
            return 200, {"error": "Ты и так в своём аккаунте 🙂"}
        # новый (пустой) аккаунт этого Telegram удаляем, старый переносим на новый Telegram ID
        for h in nicks_of(c, uid):
            c.execute("DELETE FROM handles WHERE handle=?", (h,))
        c.execute("DELETE FROM friends WHERE a=? OR b=?", (uid, uid))
        c.execute("DELETE FROM team_members WHERE tg_id=?", (uid,))
        c.execute("DELETE FROM chat_read WHERE tg_id=?", (uid,))
        c.execute("DELETE FROM players WHERE tg_id=?", (uid,))
        c.execute("DELETE FROM admin_sessions WHERE tg_id=?", (old_id,))
        name = " ".join(x for x in [user.get("first_name"), user.get("last_name")] if x)[:60]
        c.execute("UPDATE players SET tg_id=?, name=?, tg_username=?, last_seen=?, rec_fail=0, rec_lock=0, banned_until=0 WHERE tg_id=?",
                  (uid, name, user.get("username") or "", now, old_id))
        c.execute("UPDATE handles SET tg_id=? WHERE tg_id=?", (uid, old_id))
        c.execute("UPDATE friends SET a=? WHERE a=?", (uid, old_id))
        c.execute("UPDATE friends SET b=? WHERE b=?", (uid, old_id))
        # чат и команда переезжают вместе с аккаунтом
        c.execute("UPDATE messages SET sender=? WHERE sender=?", (uid, old_id))
        c.execute("UPDATE messages SET receiver=? WHERE receiver=?", (uid, old_id))
        c.execute("UPDATE chat_read SET tg_id=? WHERE tg_id=?", (uid, old_id))
        c.execute("UPDATE chat_read SET peer=? WHERE peer=?", (f"u{uid}", f"u{old_id}"))
        c.execute("UPDATE team_members SET tg_id=? WHERE tg_id=?", (uid, old_id))
        c.execute("UPDATE teams SET owner=? WHERE owner=?", (uid, old_id))
        # подписка и промокоды тоже переезжают
        best = max(plus_until(c, uid), plus_until(c, old_id))
        c.execute("DELETE FROM plus WHERE tg_id IN (?, ?)", (uid, old_id))
        if best:
            c.execute("INSERT INTO plus VALUES (?, ?)", (uid, best))
        c.execute("UPDATE OR IGNORE promo_uses SET tg_id=? WHERE tg_id=?", (uid, old_id))
        # валюта, сундуки и вещи — тоже (у нового пустого аккаунта их стираем)
        for tb in ("wallets", "equip", "inventory", "chests", "eco_done", "eco_days"):
            c.execute(f"DELETE FROM {tb} WHERE tg_id=?", (uid,))
            c.execute(f"UPDATE {tb} SET tg_id=? WHERE tg_id=?", (uid, old_id))
        c.execute("UPDATE ledger SET tg_id=? WHERE tg_id=?", (uid, old_id))
        c.execute("INSERT INTO admin_log VALUES (?,?,?,?)", (now, hit["handle"], hit["handle"], json.dumps({"recover": {"from_tg": old_id, "to_tg": uid}})))
        r = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()
        return 200, {"ok": True, "handle": r["handle"], "ver": r["ver"]}

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
            eco_reset(c, tid)
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
                        notify(c, o, f"К сожалению, твой ник @{h} передан другому игроку. Твои остальные ники и весь прогресс на месте.", "sad",
                               p.get("note"))
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
        # Hirbis Plus: добавить дни (0 или меньше — снять подписку)
        if "plusDays" in p:
            try:
                days = int(p["plusDays"])
            except (TypeError, ValueError):
                days = 0
            if days > 0:
                grant_plus(c, tid, min(days, 3650)); what["plus.add_days"] = days
            else:
                c.execute("DELETE FROM plus WHERE tg_id=?", (tid,)); what["plus.remove"] = True
        # валюта: подарить / забрать 🥐 и 💎
        for key, cur in (("addBur", "bur"), ("addGems", "gems")):
            if p.get(key):
                try:
                    n = max(-1_000_000, min(1_000_000, int(p[key])))
                except (TypeError, ValueError):
                    n = 0
                if n:
                    eco_row(c, tid, t); eco_add(c, tid, cur, n, "admin"); what[key] = n
        # права админа
        if "admin" in p:
            if tid == admin_uid and not p["admin"]:
                err = "Снять права с самого себя нельзя"
            else:
                c.execute("UPDATE players SET admin=? WHERE tg_id=?", (1 if p["admin"] else 0, tid)); what["admin"] = bool(p["admin"])
        if state_changed:
            c.execute("UPDATE players SET state=?, ver=ver+1 WHERE tg_id=?", (json.dumps(st, ensure_ascii=False), tid))
        # уведомления игроку о том, что сделала администрация (в приложении + в Telegram, если он нажимал «Старт» у бота)
        for text, mood in admin_notices(what):
            # причина при передаче ника — для того, у кого забрали, а не для нового владельца
            notify(c, tid, text, mood, None if mood == "happy" and "передали ник" in text else p.get("note"))
        if not what and p.get("note") and p.get("noteOnly"):                       # просто сообщение от администрации
            notify(c, tid, "Сообщение от команды Hirbis:", "info", p.get("note"))
            what["note"] = str(p["note"])[:300]
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
    elif cmd == "reset-pin" and len(sys.argv) > 2:      # забыл пароль админа
        o = owner_of(c, norm(sys.argv[2]))
        if o is None:
            print("Игрок не найден")
        else:
            c.execute("UPDATE players SET admin_pin='', pin_fail=0, pin_lock=0 WHERE tg_id=?", (o,))
            c.execute("DELETE FROM admin_sessions WHERE tg_id=?", (o,)); c.commit()
            print("Пароль админа сброшен — задай новый в приложении")
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
