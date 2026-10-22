#!/usr/bin/env bash
set -euo pipefail
release="${1:?Pass the absolute release directory}"
case "$release" in /var/www/scansend/releases/*) ;; *) exit 1;; esac
test -f "$release/backend/artisan"
test -f "$release/frontend/dist/index.html"
test -d "$release/backend/vendor"
ln -sfn /var/www/scansend/shared/.env "$release/backend/.env"
if [ -d "$release/backend/storage" ] && [ ! -L "$release/backend/storage" ]; then
    mv "$release/backend/storage" "$release/backend/storage-template"
fi
ln -sfn /var/www/scansend/shared/storage "$release/backend/storage"
chown -R root:www-data "$release"
chmod -R u=rwX,g=rX,o= "$release"
chown -R www-data:www-data "$release/backend/bootstrap/cache"
cd "$release/backend"
sudo -u www-data php artisan package:discover
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache
sudo -u www-data php artisan uploads:purge-expired --dry-run
if [ -L /var/www/scansend/current ]; then
    readlink /var/www/scansend/current > /var/backups/scansend/previous-release
fi
ln -sfn "$release" /var/www/scansend/current
install -m 0644 "$release/deploy/ec2/nginx.conf" /etc/nginx/sites-available/scansend
ln -sfn /etc/nginx/sites-available/scansend /etc/nginx/sites-enabled/scansend
nginx -t
systemctl reload nginx
systemctl reload php8.5-fpm
cat > /etc/systemd/system/scansend-scheduler.service <<'EOF'
[Unit]
Description=ScanSend expiration scheduler
After=mysql.service
[Service]
Type=oneshot
User=www-data
Group=www-data
WorkingDirectory=/var/www/scansend/current/backend
ExecStart=/usr/bin/php artisan schedule:run
EOF
cat > /etc/systemd/system/scansend-scheduler.timer <<'EOF'
[Unit]
Description=Run ScanSend scheduler every minute
[Timer]
OnCalendar=*-*-* *:*:00
Persistent=true
[Install]
WantedBy=timers.target
EOF
cat > /etc/systemd/system/scansend-certbot.service <<'EOF'
[Unit]
Description=Renew ScanSend short-lived IP certificate
Wants=network-online.target nginx.service
After=network-online.target nginx.service
[Service]
Type=oneshot
ExecStart=/opt/scansend-certbot/bin/certbot renew --quiet --no-random-sleep-on-renew --deploy-hook "/usr/bin/systemctl reload nginx"
[Install]
WantedBy=multi-user.target
EOF
cat > /etc/systemd/system/scansend-certbot.timer <<'EOF'
[Unit]
Description=Check ScanSend IP certificate renewal twice daily
[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=1h
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now scansend-scheduler.timer scansend-certbot.timer
systemctl enable scansend-certbot.service
systemctl start scansend-scheduler.service
echo "ACTIVE: $release"
