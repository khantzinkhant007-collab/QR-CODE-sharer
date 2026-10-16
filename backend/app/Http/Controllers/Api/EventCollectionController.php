<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectionFile;
use App\Models\EventCollection;
use App\Support\SecureToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class EventCollectionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $values = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'expires_at' => $this->expiryRules(),
        ]);
        $publicToken = SecureToken::generate();
        $managementToken = SecureToken::generate();
        $collection = EventCollection::query()->create([
            ...$values,
            'public_token_hash' => SecureToken::hash($publicToken),
            'management_token_hash' => SecureToken::hash($managementToken),
            'max_files' => (int) config('scansend.collection_max_files'),
            'max_total_bytes' => (int) config('scansend.collection_max_mb') * 1024 * 1024,
        ])->refresh();

        return response()->json(['data' => [
            ...$this->data($collection, $publicToken),
            'token' => $publicToken,
            'management_token' => $managementToken,
        ]], 201);
    }

    public function show(Request $request, string $collectionToken): JsonResponse
    {
        $collection = $this->find($collectionToken);
        $this->assertOpen($collection);
        $request->validate(['page' => ['sometimes', 'integer', 'min:1', 'max:100000']]);
        $files = $collection->files()->orderByDesc('id')->paginate(24);

        return response()->json([
            'data' => $this->data($collection, $collectionToken),
            'files' => [
                'data' => $files->map(fn (CollectionFile $file): array => $this->fileData($file, $collectionToken))->all(),
                'current_page' => $files->currentPage(),
                'last_page' => $files->lastPage(),
                'total' => $files->total(),
            ],
        ]);
    }

    public function upload(Request $request, string $collectionToken): JsonResponse
    {
        $collection = $this->find($collectionToken);
        $this->assertOpen($collection);
        $request->validate(['file' => ['required', 'file', 'max:'.config('scansend.max_upload_kb')]]);
        $file = $request->file('file');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath()) ?: 'application/octet-stream';
        if (! in_array($mime, config('scansend.allowed_mime_types'), true)) {
            throw ValidationException::withMessages(['file' => ['Choose a supported photo or video.']]);
        }
        $size = $file->getSize();
        $this->assertCapacity($collection, $size);
        $sha256 = hash_file('sha256', $file->getRealPath());
        abort_if($sha256 === false, 422, 'The file could not be read safely.');
        $disk = (string) config('scansend.storage_disk');
        $extension = config('scansend.extension_by_mime')[$mime] ?? 'bin';
        $path = null;

        try {
            $path = Storage::disk($disk)->putFileAs(
                'collections/'.$collection->id,
                $file,
                Str::lower((string) Str::ulid()).'.'.$extension,
                ['visibility' => 'private'],
            );
            if (! is_string($path) || $path === '') {
                throw new \RuntimeException('Private storage rejected the upload.');
            }
            $stored = DB::transaction(function () use ($collection, $file, $size, $disk, $path, $mime, $sha256): CollectionFile {
                // Serialize quota checks and recheck expiry after the bytes arrive.
                $locked = EventCollection::query()->whereKey($collection->id)->lockForUpdate()->firstOrFail();
                $this->assertOpen($locked);
                $this->assertCapacity($locked, $size);
                $name = basename(str_replace('\\', '/', $file->getClientOriginalName()));
                $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?: 'upload';
                $stored = $locked->files()->create([
                    'original_name' => mb_substr($name, 0, 255),
                    'storage_disk' => $disk,
                    'storage_path' => $path,
                    'mime_type' => $mime,
                    'size_bytes' => $size,
                    'sha256' => $sha256,
                ]);
                $locked->forceFill(['file_count' => $locked->file_count + 1, 'total_bytes' => $locked->total_bytes + $size])->save();

                return $stored;
            }, 3);
        } catch (Throwable $exception) {
            if (is_string($path) && $path !== '') {
                try {
                    if (! Storage::disk($disk)->delete($path)) {
                        report(new \RuntimeException('Collection upload cleanup returned false; check orphaned private objects.'));
                    }
                } catch (Throwable) {
                    report(new \RuntimeException('Collection upload cleanup failed; check orphaned private objects.'));
                }
            }
            throw $exception;
        }

        return response()->json(['data' => $this->fileData($stored, $collectionToken)], 201);
    }

    public function download(Request $request, string $collectionToken, string $fileId)
    {
        $collection = $this->find($collectionToken);
        $this->assertOpen($collection);
        $file = $collection->files()->whereKey($fileId)->firstOrFail();
        $disk = Storage::disk($file->storage_disk);
        abort_unless($disk->exists($file->storage_path), 404);
        // Only browser-safe raster images may be shown inline. No SVG/HTML.
        $preview = $request->boolean('preview') && in_array($file->mime_type, ['image/jpeg', 'image/png', 'image/webp'], true);
        $headers = [
            'Content-Type' => $file->mime_type,
            'Content-Length' => (string) $file->size_bytes,
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ];
        if ($request->isMethod('HEAD')) {
            return response('', 200, $headers);
        }

        return response()->streamDownload(function () use ($disk, $file): void {
            $stream = $disk->readStream($file->storage_path);
            if (is_resource($stream)) {
                try {
                    fpassthru($stream);
                } finally {
                    fclose($stream);
                }
            }
        }, $file->original_name, $headers, $preview ? 'inline' : 'attachment');
    }

    public function update(Request $request, string $collectionToken): JsonResponse
    {
        $values = $request->validate(['expires_at' => $this->expiryRules()]);
        $collection = DB::transaction(function () use ($request, $collectionToken, $values): EventCollection {
            $collection = $this->find($collectionToken, true);
            $this->assertOwner($request, $collection);
            $this->assertOpen($collection);
            $collection->update($values);

            return $collection;
        }, 3);

        return response()->json(['data' => $this->data($collection, $collectionToken)]);
    }

    public function close(Request $request, string $collectionToken): JsonResponse
    {
        $collection = DB::transaction(function () use ($request, $collectionToken): EventCollection {
            $collection = $this->find($collectionToken, true);
            $this->assertOwner($request, $collection);
            $collection->forceFill(['closed_at' => $collection->closed_at ?? now()])->save();

            return $collection;
        }, 3);

        return response()->json(['data' => $this->data($collection, $collectionToken)]);
    }

    public function destroyFile(Request $request, string $collectionToken, string $fileId): JsonResponse
    {
        DB::transaction(function () use ($request, $collectionToken, $fileId): void {
            $collection = $this->find($collectionToken, true);
            $this->assertOwner($request, $collection);
            $file = $collection->files()->whereKey($fileId)->firstOrFail();
            $disk = Storage::disk($file->storage_disk);
            if ($disk->exists($file->storage_path) && ! $disk->delete($file->storage_path)) {
                abort(503, 'The file could not be removed. Please retry.');
            }
            $collection->forceFill([
                'file_count' => max(0, $collection->file_count - 1),
                'total_bytes' => max(0, $collection->total_bytes - $file->size_bytes),
            ])->save();
            $file->delete();
        }, 3);

        return response()->json(['message' => 'File removed.']);
    }

    private function find(string $token, bool $lock = false): EventCollection
    {
        abort_unless(preg_match('/^[A-Za-z0-9_-]{43}$/D', $token), 404);
        $query = EventCollection::query()->where('public_token_hash', SecureToken::hash($token));

        return ($lock ? $query->lockForUpdate() : $query)->firstOrFail();
    }

    private function assertOwner(Request $request, EventCollection $collection): void
    {
        $token = $request->header('X-Management-Token');
        abort_unless(is_string($token) && hash_equals($collection->management_token_hash, SecureToken::hash($token)), 404);
    }

    private function assertOpen(EventCollection $collection): void
    {
        abort_unless($collection->status() === 'active', 410, 'This event collection has expired or was closed by its creator.');
    }

    private function assertCapacity(EventCollection $collection, int $size): void
    {
        if ($collection->file_count >= $collection->max_files || $collection->total_bytes + $size > $collection->max_total_bytes) {
            throw ValidationException::withMessages(['file' => ['This collection has reached its file or storage limit. Ask the creator to remove files.']]);
        }
    }

    private function expiryRules(): array
    {
        return ['required', 'date', 'after:now', 'before_or_equal:'.now()->addDays((int) config('scansend.collection_max_days'))->toIso8601String()];
    }

    private function data(EventCollection $collection, string $token): array
    {
        return [
            'id' => $collection->id,
            'title' => $collection->title,
            'description' => $collection->description,
            'expires_at' => $collection->expires_at->toIso8601String(),
            'status' => $collection->status(),
            'file_count' => $collection->file_count,
            'total_bytes' => $collection->total_bytes,
            'max_files' => $collection->max_files,
            'max_total_bytes' => $collection->max_total_bytes,
            'max_file_bytes' => (int) config('scansend.max_upload_mb') * 1024 * 1024,
            'share_url' => config('scansend.frontend_url').'/events/'.$token,
        ];
    }

    private function fileData(CollectionFile $file, string $token): array
    {
        $url = config('scansend.public_download_base_url').'/api/v1/collections/'.$token.'/files/'.$file->id.'/download';

        return [
            'id' => $file->id,
            'original_name' => $file->original_name,
            'mime_type' => $file->mime_type,
            'size_bytes' => $file->size_bytes,
            'created_at' => $file->created_at->toIso8601String(),
            'download_url' => $url,
            'preview_url' => $file->size_bytes <= (int) config('scansend.collection_preview_max_mb') * 1024 * 1024
                && in_array($file->mime_type, ['image/jpeg', 'image/png', 'image/webp'], true) ? $url.'?preview=1' : null,
        ];
    }
}
