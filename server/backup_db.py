#!/usr/bin/env python3
"""Daily backup of the Hirbis databases (players + expert marks).

Uses SQLite's online backup API, so it is safe while the services are running.
Copies go to /var/backups/hirbis/<name>-YYYY-MM-DD.db; copies older than KEEP_DAYS are deleted.
After copying, each backup is opened and checked with "PRAGMA integrity_check".

Run by the systemd timer hirbis-backup (see setup-backup.sh), or by hand:
    python3 /opt/hirbis/backup_db.py          # make today's backup
    python3 /opt/hirbis/backup_db.py --list   # show existing backups
Restore (only by the owner, services stopped first):
    systemctl stop hirbis-players hirbis-bot
    cp /var/backups/hirbis/players-YYYY-MM-DD.db /var/lib/hirbis/players.db
    chown www-data:www-data /var/lib/hirbis/players.db
    systemctl start hirbis-players hirbis-bot
"""
import datetime
import glob
import os
import sqlite3
import sys

DEST = os.environ.get("HIRBIS_BACKUP_DIR", "/var/backups/hirbis")
KEEP_DAYS = int(os.environ.get("HIRBIS_BACKUP_KEEP", "14"))
DATABASES = {
    "players": os.environ.get("PLAYERS_DB", "/var/lib/hirbis/players.db"),
    "marks": os.environ.get("MARKS_DB", "/var/lib/hirbis-check/marks.db"),
}


def backup_one(name, path, today):
    """Copy one database with the online backup API and verify the copy."""
    if not os.path.exists(path):
        print(f"skip {name}: {path} not found")
        return True
    out = os.path.join(DEST, f"{name}-{today}.db")
    tmp = out + ".tmp"
    src = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=30)
    dst = sqlite3.connect(tmp)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()
    check = sqlite3.connect(tmp)
    try:
        ok = check.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    finally:
        check.close()
    if not ok:
        os.remove(tmp)
        print(f"!!! {name}: backup is damaged, kept the old ones")
        return False
    os.replace(tmp, out)
    os.chmod(out, 0o600)
    print(f"ok {name}: {out} ({os.path.getsize(out) // 1024} KB)")
    return True


def cleanup(today):
    """Delete backups older than KEEP_DAYS days."""
    limit = today - datetime.timedelta(days=KEEP_DAYS)
    for f in glob.glob(os.path.join(DEST, "*-????-??-??.db")):
        try:
            day = datetime.date.fromisoformat(f[-13:-3])
        except ValueError:
            continue
        if day < limit:
            os.remove(f)
            print(f"deleted old {os.path.basename(f)}")


def main():
    os.makedirs(DEST, mode=0o700, exist_ok=True)
    if "--list" in sys.argv:
        for f in sorted(glob.glob(os.path.join(DEST, "*.db"))):
            print(f"{os.path.basename(f)}  {os.path.getsize(f) // 1024} KB")
        return 0
    today = datetime.date.today()
    results = [backup_one(n, p, today.isoformat()) for n, p in DATABASES.items()]
    cleanup(today)
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
