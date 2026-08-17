# Security and privacy

## Implemented controls

- **Transport:** production is documented as HTTPS-only. Camera APIs also require HTTPS outside localhost.
- **Token separation:** download and management tokens are independently generated from 32 random bytes (256 bits) and Base64URL encoded.
- **Hash-only database:** only SHA-256 token hashes are persisted. Raw management tokens never appear in a URL; neither raw token is deliberately logged by application code.
- **Private storage:** local storage is rooted at `storage/app/private`; S3 visibility is private. There is no permanent public object URL or public storage symlink for uploads.
- **Strict upload policy:** size is configurable; MIME is detected server-side; only JPEG, PNG, WebP, HEIC/HEIF, MP4, QuickTime/MOV, and WebM are allowlisted. SVG, HTML, scripts, executables, and archives are excluded.
- **Random object names:** storage names are ULIDs plus server-selected extensions, independent of the untrusted original name. Original names are basename-normalized, control-character stripped, length-limited metadata.
- **Streaming:** upload storage, SHA-256 calculation, and downloads avoid loading a full large video into PHP/JavaScript memory.
- **Atomic count:** a database row lock serializes one-download claims. HEAD never consumes a count.
- **Lifecycle:** sender deletion removes physical bytes and marks metadata. A scheduled batched command purges expiration and tolerates already-missing objects.
- **Rate limiting:** upload creation is throttled per IP; sender endpoints have separate Laravel throttles.
- **Browser isolation:** sender management history lives in IndexedDB; no file content is stored there. Clearing browser data removes management access.
- **Response policy:** recipient and API responses use `no-store`, `no-referrer`, `nosniff`, frame denial, a restrictive CSP, and permissions policy.
- **CORS:** only the configured `FRONTEND_URL` is allowed; there is no production wildcard.
- **Service worker:** only static build assets/offline shell are precached. There are no runtime API caches and `/api/*` plus `/d/*` are excluded from navigation fallback.
- **Data minimization:** no accounts, social feed, payment, third-party analytics, or file BLOBs are present.

## CSRF and CORS

Versioned upload/management routes are stateless API routes and do not use cookie authentication, so CSRF tokens are not an authorization mechanism. The management capability is the explicit header token. Exact-origin CORS limits which browser origins can call the API; it is not a replacement for token validation.

If cookie authentication is added later, add Laravel Sanctum/session CSRF protections rather than reusing the current stateless assumptions.

## CSP deployment

The frontend includes a conservative CSP meta policy for static hosting and the backend emits a policy header for recipient pages. Prefer an edge/web-server response header in production so the policy also covers early responses and can add HSTS. Vite development needs inline style support for hot CSS; a production host can test removing `'unsafe-inline'` from `style-src` after confirming all style delivery is external.

Recommended additions at the TLS edge:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
Cross-Origin-Opener-Policy: same-origin
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
```

Enable HSTS only after every relevant subdomain is HTTPS.

## Log hygiene

Download tokens necessarily appear in `/d/{token}` paths and can reach reverse-proxy access logs. Configure path redaction or disable query/path logging for those routes, shorten log retention, and restrict operators. Never log `X-Management-Token`, form bodies, exception request dumps containing headers, or API create responses.

## Malware scanning hook

The upload controller is the deliberate future integration point. A production public service should place new uploads in a quarantine prefix/state, enqueue an asynchronous antivirus/object-scanner job, and expose/allow download only after a clean verdict. Failed/timeout verdicts should delete or quarantine bytes and update metadata without including tokens in job payload logs.

## Public-launch abuse plan

Anonymous 100 MB uploads can be abused. Before public launch, add:

1. Authentication, verified devices, CAPTCHA/device challenges, or a carefully scoped combination.
2. Per-user/device/IP daily byte and object quotas—not only request counts.
3. Bucket/account hard limits, cost alarms, egress limits, and denial-of-wallet monitoring.
4. Malware and content scanning with quarantine.
5. Abuse-report links, a takedown workflow, moderator access with audit logs, and legal/privacy contact details.
6. IP reputation and anomaly detection that does not expose raw tokens.
7. Terms, acceptable-use policy, retention statement, and jurisdiction-appropriate privacy disclosures.
8. Incident runbooks for leaked database/storage credentials, exposed logs, and scanner outages.

## Residual risks

- A bearer download URL is transferable until it expires or is deleted; anyone holding it has access.
- A sender who clears IndexedDB loses the raw management token permanently.
- GET count is committed before bytes finish streaming, so an interrupted first one-time download consumes the link. This conservative choice prevents concurrent bypass.
- File validation is allowlist-based but not malware/content analysis.
- The recipient token may appear in browser history and infrastructure logs; short lifetime and log redaction reduce exposure.
- Application-level rate limiting needs a shared cache (for example Redis) across multiple production instances.

