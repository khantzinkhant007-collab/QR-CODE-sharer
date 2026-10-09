<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title>Download {{ $upload->original_name }} · ScanSend</title>
    <link rel="stylesheet" href="/download.css">
</head>
<body>
<main class="card">
    <a class="brand" href="{{ config('scansend.frontend_url') }}" rel="noreferrer">ScanSend</a>
    <div class="icon" aria-hidden="true">↓</div>
    <p class="eyebrow">A file was shared with you</p>
    <h1>{{ $upload->original_name }}</h1>
    <dl>
        <div><dt>Type</dt><dd>{{ $upload->mime_type }}</dd></div>
        <div><dt>Size</dt><dd>{{ Number::fileSize($upload->size_bytes, precision: 1) }}</dd></div>
        <div><dt>Available until</dt><dd>{{ $upload->expires_at->utc()->format('Y-m-d H:i') }} UTC</dd></div>
    </dl>
    <a class="button" href="{{ route('downloads.file', ['downloadToken' => request()->route('downloadToken')], false) }}">Download file</a>
    <p class="note">No app or account is required. The file is delivered as a download and is not previewed here.</p>
</main>
</body>
</html>

