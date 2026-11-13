#!/bin/bash
# Установка «Игроков» (аккаунты и прогресс) на сервер Hirbis + HTTPS.
# Запуск на сервере из папки, где лежит players_api.py:  bash setup-players.sh
set -e
cd "$(dirname "$0")"
DOMAIN=89-23-99-107.sslip.io

echo "== 1. файлы =="
mkdir -p /opt/hirbis /var/lib/hirbis /etc/hirbis
cp players_api.py /opt/hirbis/players_api.py
chown -R www-data:www-data /var/lib/hirbis
touch /etc/hirbis/bot.token
chown root:www-data /etc/hirbis /etc/hirbis/bot.token
chmod 750 /etc/hirbis; chmod 640 /etc/hirbis/bot.token

echo "== 2. служба hirbis-players =="
cat > /etc/systemd/system/hirbis-players.service <<'EOS'
[Unit]
Description=Hirbis — игроки и прогресс
After=network.target

[Service]
User=www-data
ExecStart=/usr/bin/python3 /opt/hirbis/players_api.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOS
systemctl daemon-reload
systemctl enable --now hirbis-players
systemctl restart hirbis-players

echo "== 3. nginx: адрес $DOMAIN и /hapi/ =="
CONF=/etc/nginx/sites-available/hirbis
sed -i "s/server_name _;/server_name $DOMAIN _;/" $CONF
grep -q "location /hapi/" $CONF || sed -i 's#    location /api/ {#    location /hapi/ { proxy_pass http://127.0.0.1:8082; proxy_set_header Host $host; client_max_body_size 512k; }\n    location /api/ {#' $CONF
nginx -t && systemctl reload nginx

echo "== 4. HTTPS-сертификат (Let's Encrypt, бесплатно) =="
DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
  echo "!!! Сертификат не получен — пришли этот вывод в чат"
nginx -t && systemctl reload nginx

echo "== 5. проверка =="
sleep 1
curl -s https://$DOMAIN/hapi; echo
echo "Если выше {\"ok\": true, \"token\": false} — всё стоит, осталось положить ключ бота."
