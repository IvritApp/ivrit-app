#!/bin/bash
# Установка общей страницы проверки для знатоков на сервер Hirbis.
# Запуск на сервере из папки, где лежат check_api.py и check/index.html:  bash setup-check.sh
set -e
cd "$(dirname "$0")"

echo "== 1. nginx =="
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx

echo "== 2. файлы =="
mkdir -p /opt/hirbis-check /var/lib/hirbis-check /var/www/hirbis/check
cp check_api.py /opt/hirbis-check/check_api.py
cp check/index.html /var/www/hirbis/check/index.html
chown -R www-data:www-data /var/lib/hirbis-check

echo "== 3. ключ доступа (создаётся один раз) =="
if [ ! -f /etc/hirbis-check.key ]; then
  openssl rand -hex 8 > /etc/hirbis-check.key
fi
chown root:www-data /etc/hirbis-check.key
chmod 640 /etc/hirbis-check.key

echo "== 4. служба =="
cat > /etc/systemd/system/hirbis-check.service <<'EOF'
[Unit]
Description=Hirbis — общие отметки знатоков
After=network.target

[Service]
User=www-data
ExecStart=/usr/bin/python3 /opt/hirbis-check/check_api.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now hirbis-check
systemctl restart hirbis-check

echo "== 5. nginx-сайт =="
cat > /etc/nginx/sites-available/hirbis <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/hirbis;
    client_max_body_size 256k;

    location = / { default_type text/plain; return 200 "Hirbis server OK\n"; }
    location /check/ { try_files $uri $uri/ /check/index.html; add_header Cache-Control "no-cache"; }
    location /api/ { proxy_pass http://127.0.0.1:8081; proxy_set_header Host $host; }
}
EOF
ln -sf /etc/nginx/sites-available/hirbis /etc/nginx/sites-enabled/hirbis
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

sleep 1
echo "== 6. проверка =="
curl -s "http://127.0.0.1/api/marks?k=$(cat /etc/hirbis-check.key)&list=a1-full" | head -c 200; echo
echo
echo "ГОТОВО. Ссылка для знатоков:"
echo "http://89.23.99.107/check/?k=$(cat /etc/hirbis-check.key)"
