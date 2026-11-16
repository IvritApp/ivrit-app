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
# Logs:  journalctl -u hirbis-bot -n 30 --no-pager
# =====================================================
import json, os, sqlite3, sys, time, urllib.error, urllib.request

DB = os.environ.get("PLAYERS_DB", "/var/lib/hirbis/players.db")
TOKEN_FILE = os.environ.get("BOT_TOKEN_FILE", "/etc/hirbis/bot.token")
APP_URL = os.environ.get("HIRBIS_APP_URL", "https://ivritapp.github.io/ivrit-app/")

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
]


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
    req = urllib.request.Request(f"https://api.telegram.org/bot{token}/{method}", data=body,
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


def handle(token, db, msg):
    chat = msg.get("chat") or {}
    if chat.get("type") != "private":            # in groups the bot stays silent
        return
    user = msg.get("from") or {}
    text = (msg.get("text") or "").strip()
    name = user.get("first_name") or ""
    if text.startswith("/start"):
        payload = text[6:].strip()                # /start <code> — for future invite links
        remember(db, user, payload)
        reply = start_text(name)
    elif text.startswith("/help"):
        reply = HELP_TEXT
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
    db.execute("""CREATE TABLE IF NOT EXISTS bot_started (
                    tg_id INTEGER PRIMARY KEY, first_at INTEGER, last_at INTEGER, payload TEXT, name TEXT)""")
    db.commit()
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
            res = api(token, "getUpdates", {"offset": offset, "timeout": 50, "allowed_updates": ["message"]}, timeout=65)
            for upd in res.get("result", []):
                offset = upd["update_id"] + 1
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
