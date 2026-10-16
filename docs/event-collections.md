# Event collections

Event collections are a second sharing mode; existing single-file transfers are unchanged.

## Participant flow

1. Open **Events** (`/events`), enter a title, optional description and a future deadline in the creator's local time.
2. Create the collection without selecting a file. Save/share its QR PNG or URL.
3. Anyone with `/events/{publicToken}` can view the collection, contribute supported photos/videos, and download individual files until the deadline. No account is required. Multiple selected files upload sequentially; successful items leave the upload queue, while unfinished items remain for manual retry.
4. New files appear on refresh or the 15-second gallery poll. The shared QR URL never changes as items are added.
5. After expiry or early closure, the API rejects new gallery, upload, preview, download and HEAD requests with 410. Already downloaded copies cannot be recalled; a transfer authorized before the deadline may finish afterward.

This is an **unlisted collaborative link**, not a private classroom membership system. A forwarded QR/link also permits access and uploads. Sharing must be limited to trusted participants, with consent for other people's photos. Contributors cannot edit, replace or delete other people's files. This release supports individual downloads, not a download-all ZIP.

## Creator access

The creation response contains an independent management token, stored only in this browser's IndexedDB `collections` table. It is not in the shared URL, QR or public gallery responses. The database stores SHA-256 token hashes only. Clearing browser storage loses creator access. There is no account-based recovery or cross-device management in this version.

Creator requests put this token in `X-Management-Token` and can remove any collection file, update the deadline while the collection is still active, or close it permanently. Removing a file reclaims its collection quota. Closed/expired collections cannot be reopened. Closing immediately disables access; scheduled cleanup removes the stored files later.

## API

| Method | Endpoint | Permission |
| --- | --- | --- |
| POST | `/api/v1/collections` | Public, creation rate limit |
| GET | `/api/v1/collections/{token}?page=1` | Collection link; 24 files per page |
| POST | `/api/v1/collections/{token}/files` | Collection link; one multipart `file` per request |
| GET / HEAD | `/api/v1/collections/{token}/files/{fileId}/download` | Collection link; checks parent expiry and file membership |
| PATCH | `/api/v1/collections/{token}` | Creator; JSON `expires_at` |
| DELETE | `/api/v1/collections/{token}/files/{fileId}` | Creator |
| DELETE | `/api/v1/collections/{token}` | Creator; permanently closes collection |

Creation JSON: `title` (1–120 characters), optional `description` (up to 1000), `expires_at` (ISO-8601 timestamp with timezone). The response's `share_url` uses `FRONTEND_URL`; media URLs use `PUBLIC_DOWNLOAD_BASE_URL`. The API response includes current storage/file counts and limits, but never storage paths, content hashes or management hashes.

## Storage and limits

Files go to the configured private local/S3 disk under `collections/{collectionId}`. Only server-detected allowed photo/video MIME types are accepted; SVG/HTML are rejected. Download responses are attachments; the gallery only requests inline JPEG/PNG/WebP images up to the configured preview limit. Larger files and unsupported browser preview formats remain downloadable without automatic image fetches.

```dotenv
COLLECTION_MAX_DAYS=30
COLLECTION_MAX_FILES=200
COLLECTION_MAX_MB=2048
COLLECTION_PREVIEW_MAX_MB=2
```

The total limit is **per collection**, not per participant; the existing `UPLOAD_MAX_MB` is the per-file upper limit, further constrained by remaining collection capacity. These are application limits, not a promise that a hosting plan accepts a 2 GiB request. Existing proxy, timeout, object-storage and large-upload limitations still apply. Collection creation is limited to 10/hour/IP; contributions share the existing upload rate limit; gallery/media use the existing download rate limit. Shared school Wi-Fi users can share an IP limit. Configure trusted ingress/rate limits for the deployment instead of disabling protection.

Quota checks and expiry are rechecked under a collection row lock when committing uploads, so concurrent contributions cannot both reserve the last slot. Objects are removed if their metadata transaction fails. File removal, deadline changes, closure and purge also take the parent lock. This is locally tested with SQLite, not a live multi-instance concurrency/load test.

There is no global storage/egress budget, malware scanner, uploader authentication or automatic abuse moderation in this version. Set infrastructure quotas, monitor usage, and restrict sharing before opening anonymous collections to an untrusted public audience. Download traffic is not bounded by the collection's stored-byte quota.

## Deployment

1. Deploy/migrate the backend before the new frontend: `php artisan migrate --force` creates `event_collections` and `collection_files`.
2. Keep `FRONTEND_URL` at the public frontend origin and `PUBLIC_DOWNLOAD_BASE_URL` at the public Laravel HTTPS origin. Keep API CORS restricted to that frontend; PATCH is needed for deadline changes. The frontend's CSP uses `VITE_API_BASE_URL` for API connections and gallery images.
3. Run `php artisan schedule:run` every minute. `collections:purge-expired` runs every 15 minutes alongside the existing upload purge. Test with `php artisan collections:purge-expired --dry-run`. Access expires immediately even when cleanup has not run.
4. Purge physically deletes expired/closed collection files and clears their file metadata. Failure returns a non-zero command exit and is retried on the next run. A missing object is safe to purge again. Lightweight collection metadata is retained for the unavailable-link response.
5. Do not rotate `APP_KEY`, drop old tables or reset the database. No public deployment is performed merely by editing this feature locally.

Local preview: frontend `http://127.0.0.1:5174`, backend `http://127.0.0.1:8011`, and a same-origin `/api` Vite development proxy. These addresses do not work on other people's phones. Use public HTTPS hosting for real events.
