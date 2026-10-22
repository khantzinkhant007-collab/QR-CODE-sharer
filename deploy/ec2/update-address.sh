#!/usr/bin/env bash
set -euo pipefail
test "$(id -u)" -eq 0
public_ip="${1:?Pass the new public IPv4 address}"
frontend_archive="${2:?Pass the rebuilt frontend archive}"
python3 - "$public_ip" <<'PY'
import ipaddress, sys
assert isinstance(ipaddress.ip_address(sys.argv[1]), ipaddress.IPv4Address)
PY
test -f "$frontend_archive"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup="/var/backups/scansend/address-$stamp"
install -d -m 0700 "$backup"
install -m 0600 /var/www/scansend/shared/.env "$backup/backend.env"
cp -p /etc/nginx/sites-available/scansend "$backup/nginx.conf"
python3 - "$public_ip" <<'PY'
from pathlib import Path
import sys
env = Path('/var/www/scansend/shared/.env')
lines = env.read_text().splitlines()
old_origin = next(line.split('=', 1)[1] for line in lines if line.startswith('APP_URL='))
old_ip = old_origin.removeprefix('https://').rstrip('/')
nginx = Path('/etc/nginx/sites-available/scansend')
nginx.write_text(nginx.read_text().replace(old_ip, sys.argv[1]))
PY
nginx -t
systemctl reload nginx
/opt/scansend-certbot/bin/certbot certonly --non-interactive --agree-tos \
    --register-unsafely-without-email --preferred-profile shortlived \
    --webroot --webroot-path /var/www/acme --ip-address "$public_ip" \
    --cert-name scansend-ip --force-renewal
python3 - "$public_ip" <<'PY'
from pathlib import Path
import sys
env = Path('/var/www/scansend/shared/.env')
keys = {'APP_URL', 'FRONTEND_URL', 'PUBLIC_DOWNLOAD_BASE_URL'}
lines = [line.split('=', 1)[0] + '=https://' + sys.argv[1] if line.split('=', 1)[0] in keys else line for line in env.read_text().splitlines()]
env.write_text('\n'.join(lines) + '\n')
PY
chown root:www-data /var/www/scansend/shared/.env
chmod 0640 /var/www/scansend/shared/.env
stage="$(mktemp -d /var/www/scansend/address-stage.XXXXXX)"
tar -xzf "$frontend_archive" -C "$stage"
test -f "$stage/frontend/dist/index.html"
chown -R root:www-data "$stage/frontend/dist"
chmod -R u=rwX,g=rX,o= "$stage/frontend/dist"
mv /var/www/scansend/current/frontend/dist "$backup/frontend-dist"
mv "$stage/frontend/dist" /var/www/scansend/current/frontend/dist
rmdir "$stage/frontend" "$stage"
cd /var/www/scansend/current/backend
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan view:cache
nginx -t
systemctl reload nginx
systemctl reload php8.5-fpm
systemctl start scansend-scheduler.timer scansend-certbot.timer
systemctl start scansend-scheduler.service
echo "ADDRESS UPDATED: https://$public_ip"
