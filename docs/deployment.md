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

## Railway backend

Railway can deploy the Laravel application from this monorepo with Railpack:

1. Create a service from the GitHub repository and set its root directory to `/backend`.
2. Set the config-as-code path to `/backend/railway.json`.
3. Add a MySQL service and a private Storage Bucket in the same Railway project.
4. Map the MySQL and bucket credentials to Laravel's `DB_*` and `AWS_*` variables.
5. Generate a public Railway domain for the Laravel service.
6. Set `APP_URL` and `PUBLIC_DOWNLOAD_BASE_URL` to that domain and `FRONTEND_URL=https://qr-code-sharer.vercel.app`.
7. Set Vercel's `VITE_API_BASE_URL` to the same Railway domain and redeploy the frontend.

`backend/php.ini` raises PHP's application-server limits to the documented 2 GiB maximum. Railway currently limits a single HTTP request to 15 minutes, so reliable 2 GiB support still requires direct multipart browser-to-bucket uploads for slow connections.

## Laravel environment

### Password-protection rollout

Deploy the backend **before** the password-enabled frontend. Run `php artisan migrate --force` to add the nullable `uploads.password_hash` column, then refresh config/route/view caches. Existing links remain unprotected; users must create a new protected upload and revoke the old link if protection is required. Rolling the backend back after accepting protected uploads is unsafe: old controllers do not enforce the password gate.

Use a persistent server-side `SESSION_DRIVER=database` or `redis`, `SESSION_SECURE_COOKIE=true`, `SESSION_HTTP_ONLY=true`, and `SESSION_SAME_SITE=lax`. The existing sessions migration must be applied. Use a shared cache (`database` or Redis) for rate limits across instances. Do not use the array driver in production. Ensure the platform forwards cookies and does not cache `/d/*` responses.

Configure trusted proxies only for your actual ingress so `$request->ip()` reflects the client. Do not blindly trust arbitrary X-Forwarded-For headers. Shared NATs/proxy misconfiguration can cause users to share a throttle bucket. General download limits default to 120/minute/IP (`DOWNLOAD_RATE_LIMIT_PER_MINUTE`); password submissions are limited to 5/minute/IP plus 30/minute/link. Monitor 429s and abuse at the edge. Never record password bodies or raw download paths in access/request logs.

Smoke test a newly protected upload: an incognito browser sees no filename before unlocking, wrong passwords fail, a copied `/file` URL returns 403, and a correct password enables downloading. Confirm an unprotected existing link still works. The frontend refuses to share a "protected" link if an old server ignores the password and attempts to delete that unprotected upload.

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
UPLOAD_MAX_MB=2048
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

Set PHP `upload_max_filesize=2048M` and `post_max_size=2100M` or higher. Set Nginx `client_max_body_size 2100m` or the equivalent proxy/CDN/load-balancer limit. Align idle/request timeouts with the slowest supported 2 GiB upload without making denial-of-service limits unbounded. Confirm every upstream platform supports this request size; otherwise use direct multipart browser-to-private-object-storage uploads so the file bytes do not pass through the application server.

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
