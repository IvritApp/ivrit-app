#!/usr/bin/env python3
# =====================================================
# Hirbis — вечернее напоминание «Серия под угрозой» в Telegram.
# Запускается сам каждый день в 19:30 по Москве (таймер hirbis-remind, ставится setup-remind.sh).
#
# Кому пишет: игрок согласился хранить прогресс, не забанен, серия идёт (последний урок — вчера),
#             а сегодня урока ещё не было. Каждому — не больше одного сообщения в день.
# Кому НЕ пишет: у кого серии нет или урок сегодня уже пройден.
# Бот может написать только тому, кто хоть раз нажал у бота «Старт» — остальным Telegram
# не даёт писать (ошибка 403), скрипт таких просто пропускает.
#
# Проверить, ничего не отправляя:   python3 /opt/hirbis/streak_remind.py --dry-run
# Отправить только себе:            python3 /opt/hirbis/streak_remind.py --only <ник>
# =====================================================
import json, os, sqlite3, sys, time, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone

DB = os.environ.get("PLAYERS_DB", "/var/lib/hirbis/players.db")
TOKEN_FILE = os.environ.get("BOT_TOKEN_FILE", "/etc/hirbis/bot.token")
APP_URL = os.environ.get("HIRBIS_APP_URL", "https://ivritapp.github.io/ivrit-app/")
MSK = timezone(timedelta(hours=3))
# api.telegram.org may be blocked from a server in Russia — proxy address abroad goes into /etc/hirbis/tg_api
def _tg_api():
    if os.environ.get("HIRBIS_TG_API"):            # переменная важнее файла (тесты)
        return os.environ["HIRBIS_TG_API"].rstrip("/")
    try:
        with open("/etc/hirbis/tg_api") as f:
            v = f.read().strip()
            if v:
                return v.rstrip("/")
    except Exception:
        pass
    return os.environ.get("HIRBIS_TG_API", "https://api.telegram.org").rstrip("/")
TG_API = _tg_api()


def day(shift=0):
    d = datetime.now(MSK) + timedelta(days=shift)
    return f"{d.year}-{d.month:02d}-{d.day:02d}"


def days_word(n):
    a, b = n % 10, n % 100
    if a == 1 and b != 11:
        return "день"
    if 2 <= a <= 4 and not 12 <= b <= 14:
        return "дня"
    return "дней"


def text_for(name, count):
    hello = f"{name}, шалом!" if name else "Шалом!"
    return (f"🔥 {hello} Твоя серия — {count} {days_word(count)} — под угрозой.\n"
            f"Один короткий урок сегодня, и она останется с тобой. Хибри ждёт 🐦")


def at_risk(state_json, today, yesterday):
    """Серия жива (последний урок вчера), сегодня урока не было → вернуть длину серии, иначе 0."""
    try:
        st = json.loads(state_json or "{}")
        s = json.loads(st["streak"]) if "streak" in st else {}
    except Exception:
        return 0
    if not isinstance(s, dict):
        return 0
    count = int(s.get("count", 0) or 0)
    return count if count > 0 and s.get("last") == yesterday else 0


def send(token, chat_id, text):
    body = json.dumps({
        "chat_id": chat_id, "text": text,
        "reply_markup": {"inline_keyboard": [[{"text": "Пройти урок — 3 минуты", "web_app": {"url": APP_URL}}]]},
    }).encode()
    req = urllib.request.Request(f"{TG_API}/bot{token}/sendMessage", data=body,      # User-Agent — иначе Cloudflare отвечает 403
                                 headers={"Content-Type": "application/json", "User-Agent": "HirbisBot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()).get("ok", False), ""
    except urllib.error.HTTPError as e:           # 403 — человек не нажимал «Старт» или заблокировал бота
        return False, f"HTTP {e.code}"
    except Exception as e:
        return False, str(e)[:80]


def main():
    dry = "--dry-run" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1].lstrip("@").lower() if "--only" in sys.argv else None
    today, yesterday = day(), day(-1)
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("CREATE TABLE IF NOT EXISTS reminders (tg_id INTEGER, day TEXT, PRIMARY KEY (tg_id, day))")
    try:
        with open(TOKEN_FILE) as f:
            token = f.read().strip()
    except Exception:
        token = ""
    if not token and not dry:
        print("Нет ключа бота (/etc/hirbis/bot.token) — ничего не отправлено")
        return 1
    sent = skipped = failed = 0
    now = time.time()
    for r in c.execute("SELECT tg_id, handle, name, state, banned_until, consent FROM players").fetchall():
        if only and (r["handle"] or "").lower() != only:
            continue
        if not r["consent"] or (r["banned_until"] or 0) > now:
            continue
        count = at_risk(r["state"], today, yesterday)
        if not count and not only:
            continue
        if c.execute("SELECT 1 FROM reminders WHERE tg_id=? AND day=?", (r["tg_id"], today)).fetchone() and not only:
            skipped += 1
            continue
        text = text_for(r["name"], count or 1)
        if dry:
            print(f"[проверка] @{r['handle']}: {text.splitlines()[0]}")
            sent += 1
            continue
        ok, err = send(token, r["tg_id"], text)
        if ok:
            sent += 1
            c.execute("INSERT OR IGNORE INTO reminders VALUES (?, ?)", (r["tg_id"], today)); c.commit()
        else:
            failed += 1
            print(f"не отправлено @{r['handle']}: {err}")
        time.sleep(0.05)                          # не чаще 20 сообщений в секунду
    c.execute("DELETE FROM reminders WHERE day < ?", (day(-14),)); c.commit()
    print(f"{today}: {'нашлось' if dry else 'отправлено'} {sent}, уже получали сегодня {skipped}, не доставлено {failed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
