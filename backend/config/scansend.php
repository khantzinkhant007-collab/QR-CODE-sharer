<?php

$allowedMimeTypes = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('UPLOAD_ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm'))
)));

return [
    'storage_disk' => env('SCAN_STORAGE_DISK', env('FILESYSTEM_DISK', 'local')),
    'max_upload_mb' => (int) env('UPLOAD_MAX_MB', 2048),
    'max_upload_kb' => (int) env('UPLOAD_MAX_MB', 2048) * 1024,
    'allowed_mime_types' => $allowedMimeTypes,
    // Single-file attachments only; collaborative event galleries keep the media allowlist above.
    'attachment_mime_types' => [
        'application/pdf', 'text/plain', 'text/csv', 'application/json', 'application/rtf', 'text/rtf',
        'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed',
        'application/x-rar', 'application/vnd.rar', 'application/gzip', 'application/x-gzip', 'application/x-tar',
        'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/ogg',
        'application/ogg', 'audio/flac', 'audio/x-flac', 'audio/aac', 'audio/x-aac',
    ],
    'extension_by_mime' => [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/heic' => 'heic',
        'image/heif' => 'heif',
        'video/mp4' => 'mp4',
        'video/quicktime' => 'mov',
        'video/webm' => 'webm',
    ],
    'expiration_minutes' => [10, 60, 1440, 10080],
    'default_expiration_minutes' => (int) env('DEFAULT_EXPIRATION_MINUTES', 1440),
    'public_download_base_url' => rtrim((string) env('PUBLIC_DOWNLOAD_BASE_URL', env('APP_URL', 'http://localhost:8000')), '/'),
    'frontend_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/'),
    'upload_rate_limit_per_minute' => (int) env('UPLOAD_RATE_LIMIT_PER_MINUTE', 10),
    'download_rate_limit_per_minute' => (int) env('DOWNLOAD_RATE_LIMIT_PER_MINUTE', 120),
    'purge_batch_size' => (int) env('UPLOAD_PURGE_BATCH_SIZE', 100),
    'collection_max_days' => (int) env('COLLECTION_MAX_DAYS', 30),
    'collection_max_files' => (int) env('COLLECTION_MAX_FILES', 200),
    'collection_max_mb' => (int) env('COLLECTION_MAX_MB', 2048),
    'collection_preview_max_mb' => (int) env('COLLECTION_PREVIEW_MAX_MB', 2),
];
