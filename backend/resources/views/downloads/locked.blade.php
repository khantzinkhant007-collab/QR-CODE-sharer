<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title>Password required · ScanSend</title>
    <link rel="stylesheet" href="/download.css">
</head>
<body>
<main class="card">
    <a class="brand" href="{{ config('scansend.frontend_url') }}" rel="noreferrer">ScanSend</a>
    <div class="icon" aria-hidden="true">&#128274;</div>
    <p class="eyebrow">Password-protected file</p>
    <h1>A little extra privacy.</h1>
    <p class="note">Enter the password shared by the sender to view and download this file. Access lasts 15 minutes in this browser, or until the link becomes unavailable.</p>
    <form class="unlock-form" method="post" action="{{ route('downloads.unlock', ['downloadToken' => request()->route('downloadToken')], false) }}">
        @csrf
        <label for="password">Download password</label>
        <input id="password" name="password" type="password" required maxlength="72" autocomplete="current-password" aria-describedby="password-error" @if($errors->has('password')) aria-invalid="true" @endif>
        <p id="password-error" class="form-error" role="alert">{{ $errors->first('password') }}</p>
        <button class="button" type="submit">Unlock file</button>
    </form>
    <p class="note">Don't have the password? Ask the sender. It cannot be recovered from the QR code.</p>
</main>
</body>
</html>
