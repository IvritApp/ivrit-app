#!/usr/bin/env python3
# =====================================================
# Hirbis — ИГРОКИ: аккаунты и прогресс на сервере
#
# Кто ты — узнаём из Telegram (initData). Подделать нельзя: Telegram подписывает
# эти данные ключом бота, а сервер проверяет подпись (ключ лежит в /etc/hirbis/bot.token).
# Аккаунт привязан к Telegram ID. В будущем приложении (iOS/Android) вход «через Telegram»
# откроет тот же аккаунт — прогресс не пропадёт.
#
# Запросы (POST, тело — JSON, всегда с полем initData):
#   /hapi/sync          {ver, state|null}      → сохранить прогресс или получить свежий с сервера
#   /hapi/reset         {}                     → «Начать сначала» (стереть прогресс)
#   /hapi/handle        {handle}               → сменить ник
#   /hapi/admin/get     {handle}               → (только админ) все данные игрока
#   /hapi/admin/set     {handle, ...}          → (только админ) изменить серию, заморозки, очки, бан
#
# Команды на сервере:
#   python3 players_api.py make-admin <ник>    → дать права админа
#   python3 players_api.py list                → список игроков
# Только стандартный Python. Слушает 127.0.0.1:8082, снаружи — через nginx (https).
# =====================================================
import hashlib, hmac, json, os, random, re, sqlite3, sys, threading, time
from datetime import datetime, timedelta, timezone
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qsl

DB = os.environ.get("PLAYERS_DB", "/var/lib/hirbis/players.db")
TOKEN_FILE = os.environ.get("BOT_TOKEN_FILE", "/etc/hirbis/bot.token")
ORIGINS = {"https://ivritapp.github.io", "http://localhost:8765"}
MSK = timezone(timedelta(hours=3))
INITDATA_MAX_AGE = 7 * 86400          # initData старше недели не принимаем
LOCK = threading.Lock()
HANDLE_RE = re.compile(r"^[a-z0-9_]{3,32}$")


def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS players (
        tg_id INTEGER PRIMARY KEY, handle TEXT UNIQUE, name TEXT, tg_username TEXT,
        created REAL, last_seen REAL, ver INTEGER DEFAULT 0, state TEXT DEFAULT '{}',
        banned_until REAL DEFAULT 0, ban_reason TEXT DEFAULT '', admin INTEGER DEFAULT 0, consent REAL DEFAULT 0)""")
    c.execute("CREATE TABLE IF NOT EXISTS admin_log (at REAL, admin TEXT, target TEXT, what TEXT)")
    return c


def token():
    try:
        with open(TOKEN_FILE) as f:
            return f.read().strip()
    except OSError:
        return ""


def check_init_data(init_data):
    """Проверяем подпись Telegram. Возвращает словарь user или None."""
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


def new_handle(c, tg_username):
    u = (tg_username or "").lower()
    if HANDLE_RE.match(u) and not c.execute("SELECT 1 FROM players WHERE handle=?", (u,)).fetchone():
        return u
    while True:
        h = "player" + str(random.randint(10000, 99999))
        if not c.execute("SELECT 1 FROM players WHERE handle=?", (h,)).fetchone():
            return h


def today_msk(shift=0):
    return datetime.now(MSK) + timedelta(days=shift)


def player_public(r, full=False):
    st = json.loads(r["state"] or "{}")
    def js(k, d):
        try:
            return json.loads(st[k]) if k in st else d
        except Exception:
            return d
    streak = js("streak", {})
    points = sum(int(js(k, 0) or 0) for k in st if k.startswith("points_"))
    d = today_msk()
    out = {
        "handle": r["handle"], "name": r["name"], "tg_username": r["tg_username"], "tg_id": r["tg_id"],
        "created": r["created"], "last_seen": r["last_seen"], "ver": r["ver"],
        "banned_until": r["banned_until"], "ban_reason": r["ban_reason"], "admin": bool(r["admin"]),
        "profile": js("profile", None),
        "streak": {"count": streak.get("count", 0), "best": streak.get("best", 0),
                   "freezes": streak.get("freezes", 1), "last": streak.get("last")},
        "points_total": points, "points_today": int(js(f"points_{d.year}-{d.month}-{d.day}", 0) or 0),
        "done": len(js("done", [])), "perfect": len(js("perfect", [])), "medals": js("medals", {}),
    }
    if full:
        out["state_keys"] = sorted(st.keys())
    return out


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
            h = str(p.get("handle", "")).strip().lstrip("@").lower()
            if not HANDLE_RE.match(h):
                return 200, {"ok": False, "error": "3–32 символа: латиница, цифры и _"}
            other = c.execute("SELECT tg_id FROM players WHERE handle=?", (h,)).fetchone()
            return 200, {"ok": not other or other["tg_id"] == uid, "error": "" if not other or other["tg_id"] == uid else "Этот ник уже занят"}
        name = " ".join(x for x in [user.get("first_name"), user.get("last_name")] if x)[:60]
        r = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()
        if not r:
            c.execute("INSERT INTO players (tg_id, handle, name, tg_username, created, last_seen, ver, state) VALUES (?,?,?,?,?,?,0,'{}')",
                      (uid, new_handle(c, user.get("username")), name, user.get("username") or "", now, now))
            r = c.execute("SELECT * FROM players WHERE tg_id=?", (uid,)).fetchone()
        else:
            c.execute("UPDATE players SET name=?, tg_username=?, last_seen=? WHERE tg_id=?", (name, user.get("username") or "", now, uid))
        me = {"handle": r["handle"], "admin": bool(r["admin"]), "tg_id": uid}

        if r["banned_until"] and r["banned_until"] > now and not r["admin"]:
            return 200, dict(me, banned={"until": r["banned_until"], "reason": r["ban_reason"]})

        if route == "/hapi/sync":
            if p.get("consent"):
                c.execute("UPDATE players SET consent=? WHERE tg_id=? AND consent=0", (now, uid))
            ver = int(p.get("ver") or 0)
            state = p.get("state")
            if r["ver"] == 0 and isinstance(state, dict):          # первый раз: берём прогресс с телефона
                return 200, dict(me, ver=self.save(c, uid, state, 0))
            if ver != r["ver"]:                                    # на сервере новее (другое устройство или админ)
                return 200, dict(me, ver=r["ver"], state=json.loads(r["state"] or "{}"))
            if isinstance(state, dict):
                return 200, dict(me, ver=self.save(c, uid, state, r["ver"]))
            return 200, dict(me, ver=r["ver"])

        if route == "/hapi/reset":
            return 200, dict(me, ver=self.save(c, uid, {}, r["ver"]), state={})

        if route == "/hapi/handle":
            h = str(p.get("handle", "")).strip().lstrip("@").lower()
            if not HANDLE_RE.match(h):
                return 200, dict(me, error="Ник: 3–32 символа, латиница, цифры и _")
            other = c.execute("SELECT tg_id FROM players WHERE handle=?", (h,)).fetchone()
            if other and other["tg_id"] != uid:
                return 200, dict(me, error="Этот ник уже занят")
            c.execute("UPDATE players SET handle=? WHERE tg_id=?", (h, uid))
            return 200, dict(me, handle=h)

        if route.startswith("/hapi/admin/"):
            if not r["admin"]:
                return 403, {"error": "нет прав"}
            h = str(p.get("handle", "")).strip().lstrip("@").lower()
            t = c.execute("SELECT * FROM players WHERE handle=?", (h,)).fetchone()
            if not t:
                return 200, {"error": f"Игрок @{h} не найден"}
            if route == "/hapi/admin/get":
                return 200, {"player": player_public(t, full=True)}
            if route == "/hapi/admin/set":
                what = self.admin_set(c, t, p)
                c.execute("INSERT INTO admin_log VALUES (?,?,?,?)", (now, r["handle"], h, json.dumps(what, ensure_ascii=False)))
                t = c.execute("SELECT * FROM players WHERE tg_id=?", (t["tg_id"],)).fetchone()
                return 200, {"player": player_public(t, full=True), "done": what}
        return 404, {"error": "not found"}

    def save(self, c, uid, state, ver):
        clean = {str(k)[:60]: str(v)[:50_000] for k, v in list(state.items())[:500]}
        c.execute("UPDATE players SET state=?, ver=? WHERE tg_id=?", (json.dumps(clean, ensure_ascii=False), ver + 1, uid))
        return ver + 1

    def admin_set(self, c, t, p):
        st = json.loads(t["state"] or "{}")
        what = {}
        def getj(k, d):
            try:
                return json.loads(st[k]) if k in st else d
            except Exception:
                return d
        s = p.get("streak")
        if isinstance(s, dict):
            cur = getj("streak", {})
            cur.setdefault("count", 0); cur.setdefault("best", 0); cur.setdefault("freezes", 1)
            cur.setdefault("frozen", []); cur.setdefault("days", []); cur.setdefault("last", None)
            for k in ("count", "best", "freezes"):
                if k in s and s[k] is not None:
                    cur[k] = max(0, min(100000, int(s[k])))
                    what["streak." + k] = cur[k]
            if "count" in s:
                # серия «жива»: последний день — вчера (сегодня можно продолжить), а если сегодня уже играл — сегодня
                td = today_msk(); y = today_msk(-1)
                ts, ys = f"{td.year}-{td.month:02d}-{td.day:02d}", f"{y.year}-{y.month:02d}-{y.day:02d}"
                cur["last"] = (ts if ts in cur["days"] else ys) if cur["count"] > 0 else None
                cur["best"] = max(cur["best"], cur["count"])
            st["streak"] = json.dumps(cur, ensure_ascii=False)
        if p.get("addPoints"):
            d = today_msk(); k = f"points_{d.year}-{d.month}-{d.day}"
            st[k] = json.dumps(max(0, int(getj(k, 0) or 0) + int(p["addPoints"])))
            what["addPoints"] = int(p["addPoints"])
        if p.get("resetProgress"):
            keep = {k: v for k, v in st.items() if k in ("profile", "settings")}
            st = keep
            what["resetProgress"] = True
        if "ban" in p:
            b = p["ban"]
            if b is None:
                c.execute("UPDATE players SET banned_until=0, ban_reason='' WHERE tg_id=?", (t["tg_id"],))
                what["unban"] = True
            else:
                days = float(b.get("days") or 0)
                until = time.time() + days * 86400 if days > 0 else 4102444800  # 0 = навсегда (до 2100 г.)
                c.execute("UPDATE players SET banned_until=?, ban_reason=? WHERE tg_id=?", (until, str(b.get("reason", ""))[:200], t["tg_id"]))
                what["ban"] = {"days": days, "reason": b.get("reason", "")}
        if any(k != "ban" and k != "unban" for k in what):
            c.execute("UPDATE players SET state=?, ver=ver+1 WHERE tg_id=?", (json.dumps(st, ensure_ascii=False), t["tg_id"]))
        return what

    def log_message(self, *args):
        pass


def cli():
    c = db()
    if sys.argv[1] == "make-admin" and len(sys.argv) > 2:
        h = sys.argv[2].lstrip("@").lower()
        n = c.execute("UPDATE players SET admin=1 WHERE handle=?", (h,)).rowcount
        c.commit()
        print("Готово: @%s теперь админ" % h if n else "Игрок @%s не найден. Сначала открой приложение в Telegram." % h)
    elif sys.argv[1] == "list":
        for r in c.execute("SELECT handle, name, tg_username, admin, last_seen FROM players ORDER BY last_seen DESC"):
            print(f"@{r['handle']:16} {r['name'] or '':20} tg:@{r['tg_username'] or '-':16} {'АДМИН' if r['admin'] else ''} {datetime.fromtimestamp(r['last_seen'], MSK):%d.%m %H:%M}")
    c.close()


if __name__ == "__main__":
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    if len(sys.argv) > 1:
        cli()
    else:
        db().close()
        ThreadingHTTPServer(("127.0.0.1", int(os.environ.get("PORT", "8082"))), Handler).serve_forever()
