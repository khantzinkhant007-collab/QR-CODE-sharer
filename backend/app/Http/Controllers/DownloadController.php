<?php

namespace App\Http\Controllers;

use App\Models\Upload;
use App\Support\SecureToken;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DownloadController extends Controller
{
    public function show(string $downloadToken)
    {
        $upload = $this->find($downloadToken);

        if ($reason = $this->unavailableReason($upload)) {
            return response()->view('downloads.unavailable', [
                'upload' => $upload,
                'reason' => $reason,
            ], 410);
        }

        return response()->view('downloads.show', ['upload' => $upload]);
    }

    public function file(Request $request, string $downloadToken): StreamedResponse|Response
    {
        $tokenHash = SecureToken::hash($downloadToken);

        $upload = DB::transaction(function () use ($tokenHash, $request): Upload {
            $upload = Upload::query()
                ->where('download_token_hash', $tokenHash)
                ->lockForUpdate()
                ->firstOrFail();

            if ($this->unavailableReason($upload) !== null) {
                abort(410, 'This download is no longer available.');
            }

            if (! $request->isMethod('HEAD')) {
                $upload->download_count++;
                $upload->save();
            }

            return $upload;
        }, 3);

        $headers = [
            'Cache-Control' => 'no-store, private',
            'Content-Type' => $upload->mime_type,
            'Content-Length' => (string) $upload->size_bytes,
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($request->isMethod('HEAD')) {
            return response('', 200, $headers);
        }

        $disk = Storage::disk($upload->storage_disk);

        return response()->streamDownload(
            function () use ($disk, $upload): void {
                $stream = $disk->readStream($upload->storage_path);
                if (! is_resource($stream)) {
                    return;
                }

                fpassthru($stream);
                fclose($stream);
            },
            $upload->original_name,
            $headers,
            'attachment',
        );
    }

    private function find(string $downloadToken): Upload
    {
        return Upload::query()
            ->where('download_token_hash', SecureToken::hash($downloadToken))
            ->firstOrFail();
    }

    private function unavailableReason(Upload $upload): ?string
    {
        if ($upload->status === Upload::STATUS_DELETED) {
            return 'deleted';
        }

        if ($upload->expires_at->isPast() || $upload->status === Upload::STATUS_EXPIRED) {
            return 'expired';
        }

        if ($upload->downloadLimitReached()) {
            return 'download_limit';
        }

        if (! $this->disk($upload)->exists($upload->storage_path)) {
            return 'missing';
        }

        return null;
    }

    private function disk(Upload $upload): Filesystem
    {
        return Storage::disk($upload->storage_disk);
    }
}
