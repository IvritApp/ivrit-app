#!/bin/bash
# Установка вечернего напоминания «Серия под угрозой» (каждый день в 19:30 по Москве).
# Запуск на сервере из папки, где лежит streak_remind.py:  bash setup-remind.sh
set -e
cd "$(dirname "$0")"
cp streak_remind.py /opt/hirbis/streak_remind.py

cat > /etc/systemd/system/hirbis-remind.service <<'EOS'
[Unit]
Description=Hirbis — напоминание о серии в Telegram

[Service]
Type=oneshot
User=www-data
ExecStart=/usr/bin/python3 /opt/hirbis/streak_remind.py
EOS

cat > /etc/systemd/system/hirbis-remind.timer <<'EOS'
[Unit]
Description=Hirbis — напоминание о серии каждый день в 19:30 по Москве

[Timer]
OnCalendar=*-*-* 19:30:00 Europe/Moscow
Persistent=false

[Install]
WantedBy=timers.target
EOS

systemctl daemon-reload
systemctl enable --now hirbis-remind.timer
echo "== таймер =="
systemctl list-timers hirbis-remind.timer --no-pager
echo "== проверка (ничего не отправляет) =="
sudo -u www-data python3 /opt/hirbis/streak_remind.py --dry-run
