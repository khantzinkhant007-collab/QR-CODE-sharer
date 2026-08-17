# PWA behavior

## Installability

The Vite PWA plugin generates the manifest and service worker during `npm run build`. The manifest defines standalone display, ScanSend names/colors, and verified PNG icons at 192×192, 512×512, and maskable 512×512. The icon source and reproducible generator live at `frontend/public/brand-mark.svg` and `frontend/scripts/generate-icons.mjs`.

Rebuild icons after changing the mark:

```powershell
Set-Location frontend
node scripts/generate-icons.mjs
```

Android browsers normally expose **Install app**. iPhone Safari uses Share → **Add to Home Screen** and does not always expose the same install prompt events.

## Caching contract

`generateSW` precaches only hashed frontend build assets, manifest/icons, and the offline navigation shell. The Workbox configuration intentionally has an empty `runtimeCaching` array and denies `/api/*` and `/d/*` from SPA navigation fallback.

Therefore the service worker must never cache:

- multipart upload requests or upload responses;
- sender status/delete responses containing private state;
- recipient token pages;
- downloaded uploaded objects;
- storage/object URLs.

Uploads and recipient downloads require a network connection. The UI uses `navigator.onLine` only as an early signal; real Axios/network errors remain authoritative.

## Update lifecycle

The service worker uses prompt-style registration. When a new version waits, the UI displays an update card. The user can reload into the new build or dismiss until later, avoiding an unexpected refresh during active work.

## Manual verification

1. Build and serve `frontend/dist` over HTTPS.
2. In browser DevTools → Application, verify manifest names/icons/display and service-worker scope.
3. Load the home page once, go offline, and confirm the shell/help/privacy routes open.
4. While offline, confirm upload is disabled and clearly labelled.
5. Inspect Cache Storage. It should contain compiled frontend assets only.
6. Upload, open a sender status page, and open/download a recipient file while online.
7. Reinspect caches and verify no `/api/`, `/d/`, management token, recipient token response, or uploaded media was added.
8. Change/build a new version and verify the update prompt appears.

## Platform limitations

- iOS may evict PWA/site storage under pressure and can suspend uploads in background.
- Install/update UI differs across browser versions.
- PWA installation does not make uploads/downloads offline-capable.
- Camera permission belongs to the exact origin; changing from localhost to LAN/tunnel origin requires a new permission decision.

