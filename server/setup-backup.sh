#!/bin/bash
# Installs the daily database backup (04:00 Moscow time) as the systemd timer "hirbis-backup".
# Run on the server: bash /root/setup-backup.sh   (backup_db.py must be in /root/ next to this file)
set -e
install -m 755 /root/backup_db.py /opt/hirbis/backup_db.py

cat > /etc/systemd/system/hirbis-backup.service <<'EOF'
[Unit]
Description=Hirbis: daily database backup

[Service]
Type=oneshot
ExecStart=/usr/bin/python3 /opt/hirbis/backup_db.py
EOF

cat > /etc/systemd/system/hirbis-backup.timer <<'EOF'
[Unit]
Description=Hirbis: daily database backup at 04:00 Moscow

[Timer]
OnCalendar=*-*-* 04:00:00 Europe/Moscow
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now hirbis-backup.timer
# first backup right now, to see that it works
systemctl start hirbis-backup.service
journalctl -u hirbis-backup.service -n 5 --no-pager
systemctl list-timers hirbis-backup.timer --no-pager
echo "BACKUP OK"
