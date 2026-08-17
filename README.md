# ScanSend

ScanSend is a mobile-first React PWA and Laravel API for sharing photos or videos through short-lived QR download links. The QR contains only a random download URL. File bytes live in private filesystem or S3-compatible object storage; MySQL stores metadata, private object paths, SHA-256 digests, counters, and **hashes** of two independent access tokens.

The receiving person needs only a normal phone camera and browser—no ScanSend account or app.

## What is included

- React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router, TanStack Query, Axios, Dexie IndexedDB, `qrcode`, and `vite-plugin-pwa`.
- Live rear-camera preview with capture/retake/confirm and `<input capture="environment">` fallback.
- Image/video selection, object-URL preview, 100 MB client/server default limit, four expiration choices, and one-download mode.
- True Axios upload progress, byte counts, speed, ETA, abort, retry, offline state, and navigation protection.
- Local high-resolution QR generation, copy/share/save actions, live expiration countdown, status polling, and sender deletion.
- English and Japanese interface, dark mode, responsive navigation, keyboard focus, touch targets, and ARIA live feedback.
- Installable PWA with 192/512/maskable icons, offline application shell, update prompt, and strict service-worker exclusions.
- Laravel 13 upload, recipient, download, management, and purge flows with private local/S3 storage.
- PHPUnit, Vitest/Testing Library, Playwright, formatting, lint, production build, and GitHub Actions workflows.

## Architecture

```text
Browser PWA ── multipart bytes ──> Laravel API ── stream ──> private Storage
     │                                  │                         │
     │                                  └── metadata + hashes ──> MySQL
     │
     ├── IndexedDB: sender metadata + raw management token only
     └── QR: absolute public download URL only

Recipient camera ──> /d/{downloadToken} ──> guarded streamed download
```

Files stay outside MySQL because databases are poor large-object delivery systems: database backups grow unnecessarily, streaming is harder, and object storage cannot scale independently. The database keeps only the metadata and private storage pointer needed to authorize and purge each file.

See [architecture](docs/architecture.md), [API](docs/api.md), [security](docs/security.md), [PWA behavior](docs/pwa.md), [deployment](docs/deployment.md), and the [manual test plan](docs/manual-test-plan.md).

## Repository structure

```text
.
├── frontend/                 React/TypeScript PWA
├── backend/                  Laravel API and Blade recipient pages
├── docs/                     Architecture, API, security, operations, tests
├── .github/workflows/        Credential-free CI
├── docker-compose.yml        Optional MySQL 8.4 service
├── .env.docker.example       Compose variable template
└── README.md
```

## Requirements

- PHP 8.3 or newer with `fileinfo`, `mbstring`, PDO MySQL, and PDO SQLite for tests
- Composer 2
- Node.js 24 and npm 11 (current lockfile toolchain)
- MySQL 8.0+ / 8.4, or Docker with Compose
- HTTPS for production and for live `getUserMedia` camera access outside `localhost`

The current development machine has PHP 8.4, Node 24, npm 11, and MySQL 8.4. Docker was not installed, so Compose configuration was created but not executed here.

## Windows setup

From PowerShell in the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env

Set-Location backend
composer install
php artisan key:generate
Set-Location ..\frontend
npm ci
Set-Location ..
```

Edit `backend\.env` with a real local database password and edit `frontend\.env` if the API is not at `http://localhost:8000`. Never commit either `.env` file.

### MySQL already installed

Create a dedicated local database and user. Replace both placeholders before running:

```powershell
mysql -u root -p -e "CREATE DATABASE scansend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'scansend'@'localhost' IDENTIFIED BY '<strong-local-password>'; GRANT ALL PRIVILEGES ON scansend.* TO 'scansend'@'localhost'; FLUSH PRIVILEGES;"
```

Set these values in `backend\.env`:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=scansend
DB_USERNAME=scansend
DB_PASSWORD=<strong-local-password>
```

Then migrate:

```powershell
Set-Location backend
php artisan migrate
```

### MySQL with Docker Compose

Docker is optional and was not available on the development machine. On a machine with Docker Desktop:

```powershell
Copy-Item .env.docker.example .env
# Replace both passwords inside the root .env file.
docker compose up -d mysql
docker compose ps
```

Use the same `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` values in `backend\.env`. Stop with `docker compose down`; add `-v` only if you intentionally want to erase the database volume.

## Run locally

Use three PowerShell windows.

**MySQL** (if using Docker):

```powershell
docker compose up -d mysql
```

**Laravel:**

```powershell
Set-Location "C:\Sites\QR SHARER\backend"
php artisan migrate
php artisan serve --host=0.0.0.0 --port=8000
```

**React PWA:**

```powershell
Set-Location "C:\Sites\QR SHARER\frontend"
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173`. The recipient Blade page is served by Laravel at `http://localhost:8000/d/{token}`.

## Environment variables

Important backend settings:

| Variable | Purpose | Development default |
|---|---|---|
| `APP_URL` | Laravel origin | `http://localhost:8000` |
| `FRONTEND_URL` | sole allowed browser CORS origin | `http://localhost:5173` |
| `PUBLIC_DOWNLOAD_BASE_URL` | base encoded into new QR links | `http://localhost:8000` |
| `UPLOAD_MAX_MB` | Laravel validation limit | `100` |
| `DEFAULT_EXPIRATION_MINUTES` | documented/default lifetime | `1440` |
| `FILESYSTEM_DISK` / `SCAN_STORAGE_DISK` | private `local` or `s3` disk | `local` |
| `UPLOAD_RATE_LIMIT_PER_MINUTE` | per-IP upload throttle | `10` |

Frontend settings are `VITE_API_BASE_URL` and `VITE_UPLOAD_MAX_MB`. Vite values are public build configuration—never place secrets in them.

## Test from Android or iPhone

1. Find the computer LAN IPv4 address with `ipconfig` (example `192.168.1.42`).
2. Put `VITE_API_BASE_URL=http://192.168.1.42:8000` in `frontend\.env`.
3. Put `APP_URL` and `PUBLIC_DOWNLOAD_BASE_URL` at `http://192.168.1.42:8000`, and `FRONTEND_URL=http://192.168.1.42:5173` in `backend\.env`.
4. Restart both dev servers with `--host=0.0.0.0` and allow ports 5173/8000 through the private-network firewall if prompted.
5. Open `http://192.168.1.42:5173` on the phone while it is on the same Wi-Fi.

An HTTP LAN address is **not a secure context**, so live `getUserMedia` may be blocked; the capture input fallback remains available. Use an HTTPS development tunnel or HTTPS test deployment to verify the full live-camera experience. A QR containing `localhost` points back to the scanning phone and cannot reach the computer.

On iPhone Safari, test the Share button, **Add to Home Screen**, Japanese filenames, MOV/HEIC selection, and a file download. iOS may suspend an upload when Safari backgrounds or the screen locks.

## Public deployment: Vercel frontend + public Laravel API

`localhost` always means the device opening the URL. A QR code intended for other people must therefore contain the HTTPS origin of a publicly deployed Laravel API.

Deploy this application as three durable parts:

1. Deploy `frontend/` to Vercel. Use the Vite preset, `npm run build`, and `dist` as the output directory. `frontend/vercel.json` supplies the SPA fallback for routes such as `/history`.
2. Deploy `backend/` to a PHP/Laravel host with a public HTTPS origin, for example `https://api.scansend.example`.
3. Connect the backend to MySQL and private S3-compatible object storage. Do not use `SCAN_STORAGE_DISK=local` on ephemeral/serverless infrastructure.

Set these variables on the Laravel host, replacing the example origins with the real deployment URLs:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.scansend.example
PUBLIC_DOWNLOAD_BASE_URL=https://api.scansend.example
FRONTEND_URL=https://scansend.vercel.app
SCAN_STORAGE_DISK=s3
FILESYSTEM_DISK=s3
```

Also set the production database, `APP_KEY`, and `AWS_*` object-storage credentials. Run `php artisan migrate --force` and configure the Laravel scheduler after deploying the API.

Set this Vercel environment variable before building the frontend:

```dotenv
VITE_API_BASE_URL=https://api.scansend.example
```

Deploy the backend first, then the frontend. Confirm that `https://api.scansend.example/up` responds successfully and create a new upload. New QR codes will contain `https://api.scansend.example/d/{token}`. QR codes created earlier still contain `localhost` and must be regenerated.

The current application accepts files up to 100 MB and sends them through Laravel. Vercel Functions have a much smaller request-body limit and an ephemeral filesystem, so the existing Laravel upload/download implementation should not be placed in a Vercel Function without first redesigning it for direct client-to-object-storage uploads.

## PWA installation

- Android Chrome/Edge: browser menu → **Install app**.
- iPhone Safari: Share → **Add to Home Screen**.

The generated service worker precaches only built static assets and the navigation shell. It has no API runtime cache, and `/api/*` plus `/d/*` are denied from the navigation fallback. Uploads and downloads always require internet access.

## Private storage

With `SCAN_STORAGE_DISK=local`, files are under `backend/storage/app/private/uploads/`; no public symlink is used. Laravel streams authorized downloads.

For S3-compatible storage, set `SCAN_STORAGE_DISK=s3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_BUCKET`, and, when needed, `AWS_ENDPOINT` plus `AWS_USE_PATH_STYLE_ENDPOINT=true`. Keep the bucket private and block public access.

## Upload-size configuration

All layers must accept the same or larger limit:

- Frontend: `VITE_UPLOAD_MAX_MB=100` (early warning only).
- Laravel: `UPLOAD_MAX_MB=100` (authoritative app validation).
- PHP: `upload_max_filesize=100M` and `post_max_size=105M` or higher.
- Nginx: `client_max_body_size 105m;`.
- Apache: configure `LimitRequestBody` high enough or leave it unset, while retaining PHP limits.

Restart PHP/web services after changing their configuration. An upstream rejection may return 413 before Laravel can format the error.

## Expiration scheduler

Run the Laravel scheduler every minute; it invokes `uploads:purge-expired` approximately every 15 minutes:

```cron
* * * * * cd /var/www/scansend/backend && php artisan schedule:run >> /dev/null 2>&1
```

On Windows, create a Task Scheduler job that runs every minute:

```text
C:\php\php.exe "C:\Sites\QR SHARER\backend\artisan" schedule:run
```

Manual and dry-run commands:

```powershell
php artisan uploads:purge-expired --dry-run
php artisan uploads:purge-expired
```

## Verification commands

```powershell
Set-Location backend
php artisan test
.\vendor\bin\pint --test
php artisan route:list

Set-Location ..\frontend
npm run typecheck
npm run lint
npm test
npm run build
npm run e2e
```

## Production checklist

- Use one HTTPS domain when possible; otherwise set one exact CORS origin.
- Set `APP_ENV=production`, `APP_DEBUG=false`, a new `APP_KEY`, strong DB credentials, and private S3 credentials in a secret manager.
- Configure trusted proxies, HSTS at the edge, CSP headers, request/body limits, and access-log token redaction for `/d/*`.
- Run migrations during a controlled release and run the scheduler continuously.
- Use private object storage lifecycle defense-in-depth and verify deletion permissions.
- Add authentication or device challenges, quotas, CAPTCHA, abuse reporting/moderation, and malware scanning before a public anonymous launch.
- Back up metadata without copying expired file objects indefinitely; test restore and purge behavior.
- Monitor storage failures, 413/429 rates, purge failures, missing objects, and unusual download volume without logging raw tokens.

## Known browser limitations

- Browser uploads are not resumable in v1 and may stop when a mobile browser closes, backgrounds, or locks.
- iOS/Android differ in HEIC, MOV, WebM, MIME reporting, camera constraints, Web Share files, and PWA installation UI.
- Clipboard/share actions require a user gesture and may fall back to copy or PNG download.
- Live camera preview requires `localhost` or HTTPS; capture input behavior is controlled by the browser and device.
- IndexedDB clearing removes local management access. The raw management token cannot be recovered from the server because only its hash is stored.
- The QR bitmap remains readable forever, but the URL it contains becomes unusable after expiration, deletion, or its download limit.

No deployment, GitHub push, analytics, payment, account system, or public storage link is included.
