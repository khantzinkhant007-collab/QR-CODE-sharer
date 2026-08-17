<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title>Link unavailable · ScanSend</title>
    <link rel="stylesheet" href="/download.css">
</head>
<body>
<main class="card">
    <a class="brand" href="{{ config('scansend.frontend_url') }}" rel="noreferrer">ScanSend</a>
    <div class="icon unavailable" aria-hidden="true">×</div>
    <p class="eyebrow">Download unavailable</p>
    <h1>
        @if ($reason === 'expired') This link has expired.
        @elseif ($reason === 'deleted') The sender deleted this file.
        @elseif ($reason === 'download_limit') The download limit has been reached.
        @else The private file is no longer available.
        @endif
    </h1>
    <p class="note">Ask the sender to create a new ScanSend link if you still need the file.</p>
</main>
</body>
</html>

