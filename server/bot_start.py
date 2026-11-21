#!/usr/bin/env python3
# =====================================================
# Hirbis — the bot itself: answers "Start" (/start) and any message
# with a greeting and a button that opens the Mini App.
#
# Runs all the time as the systemd service hirbis-bot (installed by setup-bot.sh).
# Works by "long polling": asks Telegram for new messages every ~50 s, no webhook needed.
# On every start it also sets up the bot profile once:
#   - the "Open" button next to the message field (menu button),
#   - the command list (/start, /help),
#   - the text people see in an empty chat before pressing Start.
#
# Who pressed Start is saved in players.db (table bot_started) — only these
# people can receive messages from the bot (streak reminder etc.).
#
# PAYMENTS (Hirbis Plus, 21.11): the app gets an invoice link from players_api.py (/hapi/plus/invoice);
# Telegram asks the bot "may I take the money?" (pre_checkout_query) — we check the payload and say yes
# within 10 s; after "successful_payment" we add 30 days to the table plus (same players.db) and say thanks.
#
# Logs:  journalctl -u hirbis-bot -n 30 --no-pager
# =====================================================
import json, os, sqlite3, sys, time, urllib.error, urllib.request

DB = os.environ.get("PLAYERS_DB", "/var/lib/hirbis/players.db")
TOKEN_FILE = os.environ.get("BOT_TOKEN_FILE", "/etc/hirbis/bot.token")
APP_URL = os.environ.get("HIRBIS_APP_URL", "https://ivritapp.github.io/ivrit-app/")
# From a server in Russia api.telegram.org may be blocked — then put the address of our proxy abroad
# into /etc/hirbis/tg_api (one line, e.g. https://tg.example.com) or the env var HIRBIS_TG_API.
def _tg_api():
    try:
        with open("/etc/hirbis/tg_api") as f:
            v = f.read().strip()
            if v:
                return v.rstrip("/")
    except Exception:
        pass
    return os.environ.get("HIRBIS_TG_API", "https://api.telegram.org").rstrip("/")
TG_API = _tg_api()

BUTTON = "🐦 Учить иврит"
MENU_TEXT = "Учить"

DESCRIPTION = (
    "Разговорный иврит для русскоязычных 🇮🇱\n\n"
    "Короткие уроки-игры по 3 минуты, живые сцены в Израиле и удод Хибри. "
    "Ты прилетаешь в Израиль, тебя встречает друг, и каждый уровень продолжает историю.\n\n"
    "Нажми «Старт» 👇"
)
SHORT_DESCRIPTION = "Разговорный иврит для русскоязычных: уроки-игры, живые сцены и удод Хибри 🐦"

COMMANDS = [
    {"command": "start", "description": "Открыть приложение"},
    {"command": "help", "description": "Как это работает"},
    {"command": "paysupport", "description": "Помощь с оплатой"},
]


def pay_support_text():
    """Who to write to about payments: one line in /etc/hirbis/support (e.g. @username). The owner sets it himself."""
    try:
        with open("/etc/hirbis/support") as f:
            who = f.read().strip()
    except Exception:
        who = ""
    return ("Помощь с оплатой Hirbis Plus 💳\n\n"
            "Если звёзды списались, а подписка не включилась, или нужен возврат — "
            + (f"напиши {who}" if who else "напиши нам в этот чат") +
            ", укажи свой ник в Hirbis и дату оплаты. Ответим в течение 24 часов.")


def start_text(name):
    hello = f"Шалом, {name}! 👋" if name else "Шалом! 👋"
    return (f"{hello}\n\n"
            "Я Хибри, удод из Израиля. Научу тебя говорить на иврите, "
            "не зубрёжкой, а как в жизни: шаурма, квартира, автобус, рынок.\n\n"
            "🎯 Уроки по 3 минуты\n"
            "🗣 В сценах ты говоришь сам\n"
            "🔥 Серия дней и награды\n\n"
            "Жми кнопку, и ялла! 👇")


HELP_TEXT = ("Как это работает:\n\n"
             "1. Нажми «🐦 Учить иврит» под этим сообщением или кнопку «Учить» слева от поля ввода.\n"
             "2. Проходи уроки уровня, потом квест: живая сцена, где ты говоришь сам.\n"
             "3. Заходи каждый день, чтобы не потерять серию 🔥\n\n"
             "Прогресс сохраняется сам и привязан к твоему Telegram.")


def api(token, method, payload=None, timeout=20):
    body = json.dumps(payload or {}).encode()
    req = urllib.request.Request(f"{TG_API}/bot{token}/{method}", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def app_button():
    return {"inline_keyboard": [[{"text": BUTTON, "web_app": {"url": APP_URL}}]]}


def setup_profile(token):
    """Menu button, commands and descriptions. Safe to repeat on every start."""
    steps = [
        ("setChatMenuButton", {"menu_button": {"type": "web_app", "text": MENU_TEXT, "web_app": {"url": APP_URL}}}),
        ("setMyCommands", {"commands": COMMANDS}),
        ("setMyDescription", {"description": DESCRIPTION}),
        ("setMyShortDescription", {"short_description": SHORT_DESCRIPTION}),
    ]
    for method, payload in steps:
        try:
            ok = api(token, method, payload).get("ok")
            print(f"{method}: {'ok' if ok else 'не получилось'}", flush=True)
        except Exception as e:
            print(f"{method}: ошибка {str(e)[:80]}", flush=True)


def remember(db, user, payload):
    """Save who pressed Start (the bot may write only to them)."""
    try:
        now = int(time.time())
        db.execute("""INSERT INTO bot_started (tg_id, first_at, last_at, payload, name) VALUES (?, ?, ?, ?, ?)
                      ON CONFLICT(tg_id) DO UPDATE SET last_at=excluded.last_at, name=excluded.name""",
                   (user.get("id"), now, now, payload[:64], (user.get("first_name") or "")[:64]))
        db.commit()
    except Exception as e:
        print("не записал в базу:", str(e)[:80], flush=True)


# ---------- payments: Hirbis Plus ----------
def ensure_tables(db):
    db.execute("""CREATE TABLE IF NOT EXISTS bot_started (
                    tg_id INTEGER PRIMARY KEY, first_at INTEGER, last_at INTEGER, payload TEXT, name TEXT)""")
    # same tables as players_api.py
    db.execute("CREATE TABLE IF NOT EXISTS plus (tg_id INTEGER PRIMARY KEY, until REAL)")
    db.execute("""CREATE TABLE IF NOT EXISTS promos (code TEXT PRIMARY KEY, kind TEXT, value INTEGER, max_uses INTEGER DEFAULT 0,
        used INTEGER DEFAULT 0, expires REAL DEFAULT 0, created REAL, by TEXT, note TEXT DEFAULT '')""")
    db.execute("CREATE TABLE IF NOT EXISTS promo_uses (code TEXT, tg_id INTEGER, at REAL, PRIMARY KEY (code, tg_id))")
    db.execute("""CREATE TABLE IF NOT EXISTS payments (charge_id TEXT PRIMARY KEY, tg_id INTEGER, stars INTEGER, days INTEGER,
        code TEXT DEFAULT '', at REAL)""")
    db.execute("""CREATE TABLE IF NOT EXISTS wallets (tg_id INTEGER PRIMARY KEY, bur INTEGER DEFAULT 0, gems INTEGER DEFAULT 0,
        counted INTEGER DEFAULT 0, lessons INTEGER DEFAULT 0, quests INTEGER DEFAULT 0, daily TEXT DEFAULT '',
        nick_coupons INTEGER DEFAULT 0)""")
    db.execute("CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, tg_id INTEGER, at REAL, cur TEXT, delta INTEGER, why TEXT)")
    db.commit()


GEM_PACKS = {50: 100, 150: 350, 400: 1000}       # ⭐ → 💎 (same as players_api.py GEM_PACKS)


def parse_payload(s):
    """Plus: {u, p, d, c}. Gems: {t:"gems", u, p, g}."""
    try:
        p = json.loads(s or "{}")
        if p.get("t") == "gems":
            return {"t": "gems", "u": int(p["u"]), "p": int(p["p"]), "g": int(p["g"]), "d": 0, "c": ""}
        return {"t": "plus", "u": int(p["u"]), "p": int(p["p"]), "d": int(p["d"]), "c": str(p.get("c") or "")}
    except Exception:
        return None


def promo_ok(db, code, uid):
    if not code:
        return True
    r = db.execute("SELECT expires, max_uses, used FROM promos WHERE code=?", (code,)).fetchone()
    if not r or (r[0] and r[0] < time.time()) or (r[1] and r[2] >= r[1]):
        return False
    return not db.execute("SELECT 1 FROM promo_uses WHERE code=? AND tg_id=?", (code, uid)).fetchone()


def pre_checkout(token, db, q):
    """Telegram asks: may we charge? Answer within 10 seconds."""
    p = parse_payload(q.get("invoice_payload"))
    uid = (q.get("from") or {}).get("id")
    good = (p is not None and p["u"] == uid and q.get("currency") == "XTR" and q.get("total_amount") == p["p"]
            and ((p["t"] == "plus" and 1 <= p["d"] <= 366 and promo_ok(db, p["c"], uid))
                 or (p["t"] == "gems" and GEM_PACKS.get(p["p"]) == p["g"])))
    ans = {"pre_checkout_query_id": q.get("id"), "ok": bool(good)}
    if not good:
        ans["error_message"] = "Не получилось оформить подписку. Открой Hirbis и попробуй ещё раз 🙏"
    api(token, "answerPreCheckoutQuery", ans)
    print("оплата: проверка", "ok" if good else "ОТКАЗ", uid, flush=True)


def paid(token, db, msg):
    """Money received: add days of Hirbis Plus (once per payment)."""
    sp = msg["successful_payment"]
    uid = (msg.get("from") or {}).get("id")
    p = parse_payload(sp.get("invoice_payload")) or {"t": "plus", "u": uid, "p": sp.get("total_amount"), "d": 30, "c": ""}
    charge = sp.get("telegram_payment_charge_id") or ""
    now = time.time()
    cur = db.execute("INSERT OR IGNORE INTO payments VALUES (?,?,?,?,?,?)",
                     (charge, uid, sp.get("total_amount"), p["d"], p["c"] if p["t"] == "plus" else f"gems:{p['g']}", now))
    if cur.rowcount == 0:                        # this payment was already counted
        db.rollback()                            # close the transaction, or the database stays locked for players_api
        return
    if p["t"] == "gems":                         # 💎 хибриллианты (the wallet exists: the invoice is made by /hapi/eco/gems_invoice)
        w = db.execute("UPDATE wallets SET gems=gems+? WHERE tg_id=?", (p["g"], uid))
        if w.rowcount == 0:
            print("оплата 💎: нет кошелька у", uid, flush=True)
        db.execute("INSERT INTO ledger (tg_id, at, cur, delta, why) VALUES (?,?,?,?,?)", (uid, now, "gems", p["g"], "stars:" + charge[:40]))
        db.commit()
        print("оплата: получено", sp.get("total_amount"), "⭐ →", p["g"], "💎 от", uid, flush=True)
        api(token, "sendMessage", {"chat_id": msg["chat"]["id"], "reply_markup": app_button(),
                                   "text": f"Спасибо! 💎 +{p['g']} хибриллиантов уже в Hirbis. Загляни в магазин 🛒"})
        return
    row = db.execute("SELECT until FROM plus WHERE tg_id=?", (uid,)).fetchone()
    until = max(now, float(row[0]) if row and row[0] else 0) + p["d"] * 86400
    db.execute("INSERT INTO plus (tg_id, until) VALUES (?, ?) ON CONFLICT(tg_id) DO UPDATE SET until=excluded.until", (uid, until))
    if p["c"]:
        db.execute("INSERT OR IGNORE INTO promo_uses VALUES (?,?,?)", (p["c"], uid, now))
        db.execute("UPDATE promos SET used=used+1 WHERE code=?", (p["c"],))
    db.commit()
    print("оплата: получено", sp.get("total_amount"), "⭐ от", uid, flush=True)
    day = time.strftime("%d.%m.%Y", time.gmtime(until + 3 * 3600))
    api(token, "sendMessage", {"chat_id": msg["chat"]["id"], "reply_markup": app_button(),
                               "text": f"Спасибо! ✨ Hirbis Plus включён до {day}.\nСердечки теперь бесконечные ❤️ Учись сколько хочешь!"})


def handle(token, db, msg):
    chat = msg.get("chat") or {}
    if chat.get("type") != "private":            # in groups the bot stays silent
        return
    if msg.get("successful_payment"):
        return paid(token, db, msg)
    user = msg.get("from") or {}
    text = (msg.get("text") or "").strip()
    name = user.get("first_name") or ""
    if text.startswith("/start"):
        payload = text[6:].strip()                # /start <code> — for future invite links
        remember(db, user, payload)
        reply = start_text(name)
    elif text.startswith("/help"):
        reply = HELP_TEXT
    elif text.startswith("/paysupport"):         # Telegram requires this command for bots that sell for Stars
        reply = pay_support_text()
    else:
        reply = "Учиться удобнее в приложении 🙂 Жми кнопку 👇"
    api(token, "sendMessage", {"chat_id": chat.get("id"), "text": reply, "reply_markup": app_button()})


def main():
    try:
        with open(TOKEN_FILE) as f:
            token = f.read().strip()
    except Exception:
        token = ""
    if not token:
        print("Нет ключа бота (/etc/hirbis/bot.token)", flush=True)
        return 1
    db = sqlite3.connect(DB, timeout=10)
    ensure_tables(db)
    # Long polling does not work while a webhook is set — remove it (we never use webhooks)
    try:
        api(token, "deleteWebhook", {"drop_pending_updates": False})
    except Exception as e:
        print("deleteWebhook:", str(e)[:80], flush=True)
    setup_profile(token)
    if "--setup-only" in sys.argv:
        return 0
    print("Бот запущен, жду сообщений…", flush=True)
    offset = 0
    while True:
        try:
            res = api(token, "getUpdates", {"offset": offset, "timeout": 50, "allowed_updates": ["message", "pre_checkout_query"]}, timeout=65)
            for upd in res.get("result", []):
                offset = upd["update_id"] + 1
                if "pre_checkout_query" in upd:
                    try:
                        pre_checkout(token, db, upd["pre_checkout_query"])
                    except Exception as e:
                        print("ошибка проверки оплаты:", str(e)[:120], flush=True)
                if "message" in upd:
                    try:
                        handle(token, db, upd["message"])
                    except urllib.error.HTTPError as e:   # 403 — the user blocked the bot
                        print("не ответил:", f"HTTP {e.code}", flush=True)
                    except Exception as e:
                        print("ошибка в сообщении:", str(e)[:120], flush=True)
        except urllib.error.HTTPError as e:
            print("Telegram ответил", e.code, flush=True)
            time.sleep(10 if e.code != 409 else 30)      # 409 — the bot is already running somewhere else
        except Exception as e:
            print("нет связи:", str(e)[:80], flush=True)
            time.sleep(5)


if __name__ == "__main__":
    sys.exit(main())
