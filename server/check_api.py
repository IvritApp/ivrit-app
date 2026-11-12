#!/usr/bin/env python3
# =====================================================
# Hirbis — общие отметки знатоков (страница /check/)
#   GET  /api/marks?k=КЛЮЧ&list=a1-full&since=время  → отметки, изменённые после since
#   POST /api/mark?k=КЛЮЧ   {list, by, items:[{id, m:{s,w,fix,note}}]}  → сохранить
# Только стандартный Python (sqlite3 + http.server). Слушает 127.0.0.1:8081, снаружи — через nginx.
# Ключ доступа: /etc/hirbis-check.key (создаёт setup.sh).
# =====================================================
import json, os, sqlite3, threading, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DB = os.environ.get("CHECK_DB", "/var/lib/hirbis-check/marks.db")
with open(os.environ.get("CHECK_KEY_FILE", "/etc/hirbis-check.key")) as f:
    KEY = f.read().strip()
LOCK = threading.Lock()


def db():
    c = sqlite3.connect(DB)
    c.execute("CREATE TABLE IF NOT EXISTS marks (list TEXT, id INTEGER, data TEXT, by TEXT, at REAL, PRIMARY KEY (list, id))")
    return c


def clip(v, n=500):
    return str(v)[:n] if v is not None else ""


class Handler(BaseHTTPRequestHandler):
    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def ok_key(self, q):
        return q.get("k", [""])[0] == KEY

    def do_GET(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path != "/api/marks":
            return self.send_json(404, {"error": "not found"})
        if not self.ok_key(q):
            return self.send_json(403, {"error": "bad key"})
        lst = clip(q.get("list", [""])[0], 40)
        try:
            since = float(q.get("since", ["0"])[0] or 0)
        except ValueError:
            since = 0
        with LOCK:
            c = db()
            rows = c.execute("SELECT id, data, by, at FROM marks WHERE list = ? AND at > ?", (lst, since)).fetchall()
            c.close()
        marks = {}
        for i, d, by, at in rows:
            m = json.loads(d); m["by"] = by; m["at"] = at
            marks[str(i)] = m
        self.send_json(200, {"now": time.time(), "marks": marks})

    def do_POST(self):
        u = urlparse(self.path); q = parse_qs(u.query)
        if u.path != "/api/mark":
            return self.send_json(404, {"error": "not found"})
        if not self.ok_key(q):
            return self.send_json(403, {"error": "bad key"})
        n = int(self.headers.get("Content-Length", 0) or 0)
        if n <= 0 or n > 200_000:
            return self.send_json(413, {"error": "too big"})
        try:
            p = json.loads(self.rfile.read(n))
            lst = clip(p.get("list"), 40)
            by = clip(p.get("by"), 40)
            items = p.get("items", [])[:1000]
        except Exception:
            return self.send_json(400, {"error": "bad json"})
        now = time.time()
        with LOCK:
            c = db()
            for it in items:
                try:
                    m = it.get("m") or {}
                    clean = {}
                    if m.get("s") in ("ok", "bad", "doubt"):
                        clean["s"] = m["s"]
                    if isinstance(m.get("w"), list):
                        clean["w"] = [clip(x, 40) for x in m["w"][:10]]
                    for k in ("fix", "note"):
                        if m.get(k):
                            clean[k] = clip(m[k])
                    c.execute("INSERT OR REPLACE INTO marks VALUES (?, ?, ?, ?, ?)",
                              (lst, int(it["id"]), json.dumps(clean, ensure_ascii=False), clip(m.get("by") or by, 40), now))
                    now += 0.000001
                except Exception:
                    continue
            c.commit(); c.close()
        self.send_json(200, {"ok": True, "now": time.time()})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    db().close()
    ThreadingHTTPServer(("127.0.0.1", 8081), Handler).serve_forever()
