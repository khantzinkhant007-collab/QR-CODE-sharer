# API reference

The machine-readable contract is [OpenAPI 3.1](openapi.yaml). Development base URL: `http://localhost:8000`.

All API responses use `Cache-Control: no-store`. Production requests must use HTTPS. Raw management tokens never belong in URLs, query strings, logs, or analytics.

## Create upload

`POST /api/v1/uploads` with `multipart/form-data`:

| Field | Required | Value |
|---|---:|---|
| `file` | yes | One allowed image/video binary, default maximum 2 GiB |
| `expires_in_minutes` | yes | `10`, `60`, `1440`, or `10080` |
| `max_downloads` | no | omit/null for unlimited-until-expiration, or `1` |

The server detects MIME using file contents and stores the file privately before returning `201`. The response includes one-time raw `management_token` and a public `download_url`, but never a disk name, object key, filesystem path, bucket, or token hash.

Validation returns `422`, an app/edge size rejection may return `413`, upload throttling returns `429`, and storage/database failure returns `5xx`. Clients must not report success before receiving `201`.

## Sender status

`GET /api/v1/uploads/{id}` requires:

```http
X-Management-Token: <raw sender management token>
```

It returns status, expiration, current/max downloads, metadata, and `file_exists`. A missing ID, missing token, and wrong token all return `404` to reduce enumeration signals.

## Sender deletion

`DELETE /api/v1/uploads/{id}` uses the same header. It deletes the physical object, marks metadata deleted, and is idempotent for a previously deleted record authenticated by the same token. The QR then shows a terminal `410` page.

## Recipient page

`GET /d/{downloadToken}` hashes the URL token, renders metadata only, and never previews uploaded content. Invalid tokens return `404`; expired, deleted, missing, and download-limit states return a friendly `410` response.

## Recipient file

`GET /d/{downloadToken}/file` revalidates all rules inside a row-locked transaction, increments the count, and streams an attachment with safe Unicode filename handling. `HEAD` validates and returns metadata without incrementing. Responses use no-store, no-referrer, anti-sniffing, and anti-framing headers.

## Example create response

```json
{
  "data": {
    "id": "01JEXAMPLEULID",
    "original_name": "holiday-video.mp4",
    "mime_type": "video/mp4",
    "size_bytes": 52428800,
    "download_url": "https://files.example.com/d/random-download-token",
    "expires_at": "2026-08-18T12:00:00Z",
    "max_downloads": 1,
    "download_count": 0,
    "status": "active",
    "management_token": "separate-random-management-token"
  }
}
```
