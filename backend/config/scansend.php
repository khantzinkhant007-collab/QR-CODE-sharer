<?php

$allowedMimeTypes = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env('UPLOAD_ALLOWED_MIME_TYPES', 'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm'))
)));

return [
    'storage_disk' => env('SCAN_STORAGE_DISK', env('FILESYSTEM_DISK', 'local')),
    'max_upload_mb' => (int) env('UPLOAD_MAX_MB', 100),
    'max_upload_kb' => (int) env('UPLOAD_MAX_MB', 100) * 1024,
    'allowed_mime_types' => $allowedMimeTypes,
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
    'purge_batch_size' => (int) env('UPLOAD_PURGE_BATCH_SIZE', 100),
];
