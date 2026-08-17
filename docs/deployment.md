# Deployment guide

This repository does not deploy automatically. CI verifies code only and requires no production credentials.

## Recommended topology

Prefer one HTTPS origin:

```text
https://scansend.example/        -> frontend static build
https://scansend.example/api/*   -> Laravel public/index.php
https://scansend.example/d/*     -> Laravel public/index.php
```

One origin removes most CORS complexity. If frontend and API differ, set one exact `FRONTEND_URL`, update the frontend CSP `connect-src`, and never use wildcard production CORS.

## Build

```bash
cd backend
composer install --no-dev --classmap-authoritative --no-interaction
php artisan config:cache
php artisan route:cache
php artisan view:cache

cd ../frontend
npm ci
npm run build
```

Point the PHP web root at `backend/public` only. Serve `frontend/dist` as static assets with SPA fallback to `index.html`, excluding `/api/*` and `/d/*` from that fallback.

## Laravel environment

Set production values through the platform secret manager:

```dotenv
APP_NAME=ScanSend
APP_ENV=production
APP_DEBUG=false
APP_URL=https://scansend.example
FRONTEND_URL=https://scansend.example
PUBLIC_DOWNLOAD_BASE_URL=https://scansend.example
DB_CONNECTION=mysql
DB_HOST=<private-db-host>
DB_PORT=3306
DB_DATABASE=scansend
DB_USERNAME=<least-privilege-user>
DB_PASSWORD=<secret>
UPLOAD_MAX_MB=100
SCAN_STORAGE_DISK=s3
FILESYSTEM_DISK=s3
```

Generate `APP_KEY` once with `php artisan key:generate --show`, store it securely, and do not rotate without understanding encrypted application data impact.

## S3-compatible private object storage

```dotenv
AWS_ACCESS_KEY_ID=<secret>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_DEFAULT_REGION=ap-northeast-1
AWS_BUCKET=<private-bucket>
AWS_ENDPOINT=https://<provider-endpoint>
AWS_URL=
AWS_USE_PATH_STYLE_ENDPOINT=false
```

Use a bucket policy that denies public access and credentials limited to the ScanSend prefix and required get/put/delete operations. Enable server-side encryption and consider lifecycle deletion as defense-in-depth after the maximum application retention plus a small safety window.

## Database and scheduler

```bash
php artisan migrate --force
php artisan uploads:purge-expired --dry-run
```

Run `php artisan schedule:run` every minute through cron or the platform scheduler. Alert on non-zero purge exits. With multiple app nodes, keep Laravel's `withoutOverlapping` lock in a shared cache store.

## Web/PHP limits

Set PHP `upload_max_filesize=100M` and `post_max_size` slightly higher. Set Nginx `client_max_body_size 105m` or the equivalent proxy/CDN/load-balancer limit. Align idle/request timeouts with expected mobile 100 MB upload duration without making denial-of-service limits unbounded.

## Release sequence

1. Back up metadata and verify storage access.
2. Build immutable backend/frontend artifacts.
3. Run automated checks and dependency/security scans.
4. Apply migrations in a controlled release.
5. Deploy backend and static frontend with environment secrets.
6. Run health, upload, QR, recipient, one-download, delete, and purge smoke tests.
7. Verify response headers/CSP and service-worker cache contents.
8. Monitor errors, object count/bytes, egress, throttles, and purge backlog.

## Rollback

Application rollback must preserve migration compatibility. Do not restore expired file objects from a broad backup without reapplying retention rules. A frontend rollback may leave a newer service worker cached; deploy a new version that explicitly supersedes it rather than deleting users' browser data.

