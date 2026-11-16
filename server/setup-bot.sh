#!/bin/bash
# Установка бота Hirbis: ответ на «Старт», кнопка «Учить» у поля ввода, описание бота.
# Запуск на сервере из папки, где лежит bot_start.py:  bash setup-bot.sh
set -e
cd "$(dirname "$0")"
cp bot_start.py /opt/hirbis/bot_start.py

cat > /etc/systemd/system/hirbis-bot.service <<'EOS'
[Unit]
Description=Hirbis — бот Telegram (Старт и кнопка приложения)
After=network-online.target
Wants=network-online.target

[Service]
User=www-data
ExecStart=/usr/bin/python3 /opt/hirbis/bot_start.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOS

systemctl daemon-reload
systemctl enable hirbis-bot.service
systemctl restart hirbis-bot.service
sleep 4
echo "== бот =="
systemctl is-active hirbis-bot.service
journalctl -u hirbis-bot.service -n 12 --no-pager
