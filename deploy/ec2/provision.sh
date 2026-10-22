#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -eq 0
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y python3-venv php8.5-fpm php8.5-mysql php8.5-intl php8.5-mbstring php8.5-xml php8.5-curl php8.5-zip unzip
install -d -m 0755 /var/www/scansend/releases /var/www/scansend/shared/storage/app/private /var/www/scansend/shared/storage/framework/{cache/data,sessions,views} /var/www/scansend/shared/storage/logs /var/www/acme
install -d -m 0700 /var/backups/scansend
if [ ! -f /var/backups/scansend/nginx-before-deploy.tar.gz ]; then
    tar -czf /var/backups/scansend/nginx-before-deploy.tar.gz -C /etc nginx
    mysqldump --single-transaction --databases scansend | gzip > /var/backups/scansend/database-before-deploy.sql.gz
fi
if [ ! -f /var/www/scansend/shared/.env ]; then
    python3 - <<'PY'
import base64, os, secrets, subprocess
password = secrets.token_hex(32)
sql = "CREATE DATABASE IF NOT EXISTS scansend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'qrsharer_app'@'localhost' IDENTIFIED BY '" + password + "'; GRANT ALL PRIVILEGES ON scansend.* TO 'qrsharer_app'@'localhost';"
subprocess.run(['mysql'], input=sql, text=True, check=True)
values = {
    'APP_NAME': 'ScanSend', 'APP_ENV': 'production', 'APP_DEBUG': 'false',
    'APP_KEY': 'base64:' + base64.b64encode(os.urandom(32)).decode(),
    'APP_URL': 'https://15.168.129.246', 'FRONTEND_URL': 'https://15.168.129.246',
    'PUBLIC_DOWNLOAD_BASE_URL': 'https://15.168.129.246',
    'DB_CONNECTION': 'mysql', 'DB_HOST': '127.0.0.1', 'DB_PORT': '3306',
    'DB_DATABASE': 'scansend', 'DB_USERNAME': 'qrsharer_app', 'DB_PASSWORD': password,
    'SESSION_DRIVER': 'database', 'SESSION_SECURE_COOKIE': 'true',
    'SESSION_HTTP_ONLY': 'true', 'SESSION_SAME_SITE': 'lax',
    'CACHE_STORE': 'database', 'QUEUE_CONNECTION': 'database',
    'FILESYSTEM_DISK': 'local', 'SCAN_STORAGE_DISK': 'local',
    'AWS_DEFAULT_REGION': 'ap-northeast-3', 'UPLOAD_MAX_MB': '2048',
    'COLLECTION_MAX_DAYS': '30', 'COLLECTION_MAX_FILES': '200',
    'COLLECTION_MAX_MB': '2048', 'COLLECTION_PREVIEW_MAX_MB': '2',
    'LOG_CHANNEL': 'single', 'LOG_LEVEL': 'warning', 'MAIL_MAILER': 'log',
}
path = '/var/www/scansend/shared/.env'
fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o640)
with os.fdopen(fd, 'w') as f:
    f.write(''.join(f'{key}={value}\n' for key, value in values.items()))
PY
fi
chown root:www-data /var/www/scansend/shared/.env
chown -R www-data:www-data /var/www/scansend/shared/storage
find /var/www/scansend/shared/storage -type d -exec chmod 0750 {} +
find /var/www/scansend/shared/storage -type f -exec chmod 0640 {} +
cat > /etc/php/8.5/fpm/conf.d/99-scansend.ini <<'EOF'
upload_max_filesize=2048M
post_max_size=2100M
max_execution_time=1800
max_input_time=1800
memory_limit=256M
expose_php=Off
display_errors=Off
opcache.enable=1
EOF
cat > /etc/php/8.5/fpm/pool.d/zz-scansend.conf <<'EOF'
[www]
pm = ondemand
pm.max_children = 4
pm.process_idle_timeout = 20s
pm.max_requests = 500
request_terminate_timeout = 1800s
EOF
systemctl enable --now nginx mysql php8.5-fpm
systemctl restart php8.5-fpm
python3 -m venv /opt/scansend-certbot
/opt/scansend-certbot/bin/pip install --disable-pip-version-check 'certbot>=5.4'
cat > /etc/nginx/sites-available/scansend-acme <<'EOF'
server {
    listen 80;
    server_name 15.168.129.246;
    access_log off;
    location ^~ /.well-known/acme-challenge/ { root /var/www/acme; }
    location / { return 503; }
}
EOF
ln -sfn /etc/nginx/sites-available/scansend-acme /etc/nginx/sites-enabled/scansend
nginx -t
systemctl reload nginx
echo 'PROVISIONED: runtime, private storage, database credentials, ACME endpoint'
