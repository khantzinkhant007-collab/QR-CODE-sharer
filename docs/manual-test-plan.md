# Manual test plan

Record browser/OS versions, frontend/backend commit, network type, storage disk, and the observed database/object state. Use disposable test files with no sensitive content.

## Preparation

1. Configure a non-production MySQL database and private local or test bucket storage.
2. Run `php artisan migrate`, Laravel on port 8000, and the frontend on port 5173.
3. For another device, configure `VITE_API_BASE_URL`, `APP_URL`, `FRONTEND_URL`, and `PUBLIC_DOWNLOAD_BASE_URL` with a reachable LAN or HTTPS tunnel origin. Restart both servers.
4. Confirm PHP and reverse-proxy limits exceed the configured 2 GiB application limit.
5. Open browser DevTools network/application panels and clear old ScanSend site data.

## 1. Android Chrome camera

- Open the HTTPS PWA, tap **Take Photo**, allow only camera permission, and confirm rear-facing preview when the device supports it.
- Capture, retake, capture again, and confirm.
- Verify the preview, generated JPEG filename/MIME/size, and that the camera indicator stops after confirmation/cancel/navigation.
- Deny permission and verify the capture-input fallback remains usable.

## 2. iPhone Safari camera

- Repeat capture/retake/confirm on HTTPS Safari.
- Verify the fallback uses the device camera picker when live preview is denied/unavailable.
- Close the modal and verify the camera indicator turns off.

## 3. Existing photo

- Choose JPEG, PNG, WebP, and—where available—HEIC.
- Verify only per-file picker access is requested, image preview uses a blob URL, metadata is correct, and change/remove revokes the old preview.

## 4. Existing large video

- Choose MP4, MOV, and WebM across supported devices.
- Verify the video element uses metadata loading, remains responsive, and no Base64 file value appears in DevTools/memory/requests.
- Test one file just below the limit and one above it. The above-limit file must show a warning before any API request.

## 5. Cancel upload

- Start a throttled large upload, observe percent/bytes/speed/ETA, then tap **Cancel upload**.
- Verify the request is aborted, no success navigation occurs, the UI offers retry, and no upload metadata/private object remains server-side.

## 6. Network interruption and retry

- Start a throttled upload, disable network, and verify a network/offline error without false success.
- Restore network, tap retry, and verify a new request succeeds.
- Attempt navigation during active upload and confirm the guard. Keep the page and verify locking/backgrounding warning text.

## 7. Generate/save/share QR

- Upload a photo with 24-hour expiration.
- Verify QR appears only after a `201`, is 1024px PNG, has a quiet zone and level-M settings, and its decoded content is exactly the absolute download URL.
- Save PNG, copy link, share link, and share QR image where Web Share file support exists. Verify fallbacks.
- Confirm the QR contains no file bytes, storage path, bucket, or management token.

## 8. Scan from another phone

- Scan the QR with the normal camera on another device.
- Confirm it opens the Laravel `/d/{token}` browser page with no account/app request.
- Verify the QR does not contain `localhost`; repeat with a valid HTTPS test domain.

## 9. iPhone Safari download

- Open a valid recipient page, inspect filename/type/size/expiration, and download.
- Test spaces and Japanese filename characters. Confirm attachment/download behavior and that potentially unsafe content is not rendered inline.

## 10. Expired QR

- Create a short-lived test record or set `expires_at` in the test database to the past.
- Confirm page and file endpoints return 410 with the expired message and no bytes.
- Run the purge command and verify the physical object is removed and metadata becomes expired/purged.

## 11. One-download QR twice

- Upload with one-download enabled.
- Open two clients and attempt near-simultaneous downloads; only one should receive bytes on MySQL/InnoDB.
- A second sequential request must return 410. A HEAD request before the GET must not consume the count.

## 12. Delete from sender history

- From history/result, delete the remote upload with confirmation.
- Verify the physical object is gone, metadata is deleted, and the recipient link returns the deleted 410 page.
- Repeat deletion to verify practical idempotence.
- Separately choose **Remove from this device** and verify it removes IndexedDB history without calling DELETE.

## 13. Japanese filenames

- Upload `夏休み 写真 ２０２６.jpg` and `旅行の動画.mov`.
- Verify correct display, escaped HTML, safe attachment filename, database metadata, and random storage key unrelated to the original path.
- Try names containing directory separators/control-like characters and verify no path traversal.

## 14. Android PWA installation

- Build/serve over HTTPS, open Chrome menu, and install.
- Verify name, icon, standalone display, theme color, responsive layout, camera permission, and launch route.

## 15. iPhone Add to Home Screen

- In Safari tap Share → **Add to Home Screen**.
- Launch the icon and verify standalone layout, safe-area/touch behavior, theme, and navigation.

## 16. Service-worker privacy

- Inspect Cache Storage after visiting static routes online and then offline.
- Confirm only hashed frontend assets, icons/manifest, and offline shell exist.
- Exercise POST `/api/*`, management GET/DELETE, `/d/*`, and file download, then confirm none appear in cache.
- Search cache names/entries for raw management/download tokens and uploaded filenames/bytes; expect none.
- Build a new version and verify the update prompt rather than an unexpected reload.

## 17. MySQL metadata only

Run:

```sql
DESCRIBE uploads;
SELECT id, original_name, storage_disk, storage_path, mime_type, size_bytes,
       sha256, download_token_hash, management_token_hash, expires_at,
       max_downloads, download_count, status
FROM uploads ORDER BY created_at DESC LIMIT 5;
```

Confirm there is no BLOB/file-content column, token fields are 64-character hashes, and raw tokens from the browser do not equal stored values.

## 18. Private physical file

- For local disk, inspect `backend/storage/app/private/uploads/`; confirm a random name exists and no equivalent file is under `public/`.
- Request the storage path directly through the web server and confirm it is unreachable.
- For S3, confirm the object is private, public access is blocked, and Laravel can stream/delete through its credentials.

## 19. Cleanup command

- Prepare expired, active, already-missing, and simulated deletion-failure records.
- Run `php artisan uploads:purge-expired --dry-run`; verify no changes.
- Run `php artisan uploads:purge-expired`; verify useful totals, active files preserved, missing objects tolerated, and one failure does not stop later records.
- Verify no raw token is printed or logged.

## Additional security/accessibility checks

- Upload SVG, HTML, JavaScript, executable, ZIP, renamed extension, invalid expiration, and invalid `max_downloads`; expect rejection.
- Exceed the upload rate limit and expect 429.
- Use absent/wrong management tokens and expect indistinguishable 404 responses.
- Check CSP, no-store, no-referrer, nosniff, frame denial, and exact CORS origin.
- Keyboard through every control, confirm visible focus and sensible order, zoom to 200%, use a screen reader for upload progress/errors, and test light/dark contrast.
- Confirm no raw management tokens appear in URLs, console logs, analytics, or service-worker caches.
