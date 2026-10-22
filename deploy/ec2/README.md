# QR Sharer on the existing EC2 instance

Deployment date: 2026-10-19 (Japan time).

Final release: `20261019-02`. Post-update verification passed 43 backend tests (320 assertions), 60 frontend tests, frontend lint/build, and all nine groups of live browser checks. Both local dependency audits and the installed production backend audit reported zero known advisories. Both scheduled services completed with status 0; their timers and Nginx/PHP/MySQL were active. Test uploads were removed and closed test collections were purged; the private upload directory contained zero files at handover. The disk had approximately 25 GB free.

The live report is `outputs/aws-ec2/verification.json`; audit results are `backend-audit.json` and `frontend-audit.json` in that directory. `desktop.png`, `mobile.png`, and `qr-share.png` capture the deployed UI. The deployed `composer.lock` SHA-256 matched the local lockfile: `eab9d78df15c5f2aa1d288c91c4d9c4d272a39f65dec0a1874d109f8fa680e40`.

- Fixed URL (assigned 2026-10-22): https://15.168.129.246
- Name / ID: `QR_SHARER` / `i-0bd29283e93c84ccf`
- Selected Region: Osaka, `ap-northeast-3`
- Runtime: Ubuntu 26.04, Nginx, PHP 8.5 FPM, MySQL 8.4
- Root: `/var/www/scansend`; active release is the `current` symlink.
- Persistent configuration: `/var/www/scansend/shared/.env` (root owned, group readable by PHP).
- Private uploads and Laravel runtime data: `/var/www/scansend/shared/storage`.
- Database: `scansend`; dedicated application user `qrsharer_app`.

All resources are in Osaka. No additional EC2, RDS, S3, or load balancer was created. An Elastic IP was added on 2026-10-22 as described below. A TCP 22 rule restricted to the deploying computer's public IP was added; existing ingress rules were preserved. MySQL listens on loopback only. No local development secrets, databases, or uploaded files were copied to AWS. Existing Railway/Vercel data and URLs were not migrated.

## HTTPS and scheduled cleanup

The public IP uses a trusted Let's Encrypt IP certificate, issued with the `shortlived` profile. Certbot 5.8.0 is isolated in `/opt/scansend-certbot`. `scansend-certbot.timer` checks renewal twice daily and reloads Nginx after renewal. A staging issuance and simulated renewal succeeded. Certificate files are under `/etc/letsencrypt/live/scansend-ip/`.

`scansend-scheduler.timer` invokes Laravel every minute. Laravel purges expired uploads and closed/expired collection files every 15 minutes. Use `journalctl -u scansend-scheduler.service` and `journalctl -u scansend-certbot.service` for operational results.

## Redeploying

These files target this existing Ubuntu instance and its PHP 8.5 packages. Do not run `provision.sh` on an unrelated server: it prepares the database, saves the pre-deployment configuration, and temporarily serves an ACME validation endpoint. Normal updates only require a new release and `activate.sh`.

1. Run backend/frontend tests and dependency audits. Build `frontend` with `VITE_API_BASE_URL=https://15.168.129.246`.
2. Package `backend`, `frontend/dist`, and `deploy/ec2`, excluding every real `.env`, `vendor`, `node_modules`, backend `storage`, bootstrap caches, SQLite databases, logs, and development output. Keep `composer.lock`.
3. Upload and extract into a **new** `/var/www/scansend/releases/<release-id>` directory. Do not overwrite the live release.
4. In the extracted `backend`, create `bootstrap/cache`, then run `composer install --no-dev --no-scripts --classmap-authoritative --no-interaction --prefer-dist`. Scripts are deferred until production configuration and persistent storage are linked.
5. Run `sudo bash <release>/deploy/ec2/activate.sh <release>`. It links persistent state, discovers packages, migrates, caches Laravel configuration/routes/views, updates the active symlink and services, and verifies the Nginx configuration.
6. Run `node --use-system-ca frontend/scripts/verify-ec2.mjs` from the Windows project. It uses an isolated Edge browser, real public requests, and test files that it deletes afterward. Screenshots and the report go to `outputs/aws-ec2/`.

The Windows deployment key is a private, user-only copy at `~/.ssh/QR_SHARER_KEY.pem`. The AWS CLI profile is `khant`; its configured Region is Osaka. Do not copy AWS credentials or the SSH key into the application artifact.

## Operations and recovery

The instance was restarted on 2026-10-20 and AWS assigned `56.155.80.240`, replacing `15.152.115.149`. The backend URLs, frontend build, Nginx configuration and IP certificate were updated. `update-address.sh <new-ip> <frontend-archive>` handles the server-side address change after rebuilding the frontend for the new origin; the archive should contain `frontend/dist`. Existing database contents, private files, and `APP_KEY` are preserved. Original-address QR URLs cannot follow the address change.

The original Nginx configuration and pre-deployment database dump are root-only under `/var/backups/scansend`. These are on this same EC2 disk, so they are not an independent disaster-recovery backup. `previous-release` records the prior application release for rollback. Keep database migration compatibility when rolling back; never roll back to a version that bypasses password protection.

The shared `.env` and storage directory must survive releases. Never regenerate `APP_KEY` during redeploy. Do not publish `backend/storage`, use `storage:link`, or point the web root at the repository root.

## Fixed address added on 2026-10-22

The current public IPv4 is the Elastic IP **15.168.129.246**, allocation `eipalloc-04a721c94efe54026`, associated with QR_SHARER's primary interface `eni-02cd67e0d83834a98`. Keep this allocation and association to preserve the address across EC2 stop/start. Do not release it: AWS cannot guarantee recovery of a released address. The allocation is tagged `Name=QR_SHARER_STATIC_IP`.

The frontend, Laravel URL settings, Nginx configuration, and trusted IP certificate use `https://15.168.129.246`. Starting this same instance no longer requires an address rebuild. Previously shared links containing old IP addresses are not migrated. File and event expiration rules still apply.

Public IPv4 pricing at setup is USD 0.005/hour (approximately USD 3.65 per 730-hour month), including while the instance is stopped, before credits and tax. EC2 compute and EBS storage are separate. See `outputs/aws-ec2/elastic-ip-allocation.json` and `elastic-ip-result.json` for deployment records.

`scansend-certbot.service` is enabled at boot after networking and Nginx, as well as invoked by its twice-daily timer. After a long shutdown, allow startup and certificate renewal to complete before opening the site. If HTTPS still reports an expired certificate, connect to the instance and run `sudo systemctl start scansend-certbot.service`, then inspect `sudo journalctl -u scansend-certbot.service --no-pager -n 40`. The website is unavailable while EC2 is stopped even though its address remains reserved.

Uploads are on the encrypted 30 GB root EBS volume; space is shared with the operating system, MySQL, upload staging, and application releases. Terminating the instance deletes that volume. Monitor free space and AWS Settings → Billing. The project was on the active Free plan at deployment; available credits are not a guarantee that running costs are zero.

## Verification boundaries

The live check covers trusted HTTPS, redirect, health, desktop/mobile rendering, browser upload, QR rendering, exact download bytes, one-download enforcement, sender deletion, password/CSRF/session handling, event uploads/downloads, owner authorization, stable collection URL after a deadline update, closure, PWA assets, JavaScript errors, and blocking private configuration/PHP scripts.

Configured limits remain 2 GiB at the app/PHP/Nginx layers. A full 2 GiB transfer, load test, real phone camera session, physical QR scan, and independent backup restoration were not performed. The deployment uses small valid images for functional verification.
