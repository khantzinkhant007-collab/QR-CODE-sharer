<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUploadRequest;
use App\Models\Upload;
use App\Support\SecureToken;
use App\Support\UploadResponseData;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class UploadController extends Controller
{
    public function store(StoreUploadRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $mimeType = $file->getMimeType() ?: 'application/octet-stream';

        if (! in_array($mimeType, config('scansend.allowed_mime_types'), true)) {
            throw ValidationException::withMessages([
                'file' => ['This server does not allow the detected file type.'],
            ]);
        }

        $realPath = $file->getRealPath();
        $sha256 = $realPath ? hash_file('sha256', $realPath) : false;
        if ($sha256 === false) {
            abort(422, 'The uploaded file could not be read safely.');
        }

        $downloadToken = SecureToken::generate();
        $managementToken = SecureToken::generate();
        $disk = (string) config('scansend.storage_disk');
        $extension = config('scansend.extension_by_mime')[$mimeType] ?? null;
        $storageName = Str::lower((string) Str::ulid()).($extension ? '.'.$extension : '');
        $directory = 'uploads/'.now()->utc()->format('Y/m/d');
        $storagePath = null;

        try {
            $storagePath = Storage::disk($disk)->putFileAs(
                $directory,
                $file,
                $storageName,
                ['visibility' => 'private'],
            );

            if (! is_string($storagePath) || $storagePath === '') {
                throw new \RuntimeException('Private storage rejected the upload.');
            }

            $upload = Upload::query()->create([
                'original_name' => $this->safeOriginalName($file->getClientOriginalName()),
                'storage_disk' => $disk,
                'storage_path' => $storagePath,
                'mime_type' => $mimeType,
                'extension' => $extension,
                'size_bytes' => $file->getSize(),
                'sha256' => $sha256,
                'download_token_hash' => SecureToken::hash($downloadToken),
                'management_token_hash' => SecureToken::hash($managementToken),
                'password_hash' => $request->filled('password') ? Hash::make($request->input('password')) : null,
                'expires_at' => now()->addMinutes((int) $request->integer('expires_in_minutes')),
                'max_downloads' => $request->filled('max_downloads') ? $request->integer('max_downloads') : null,
                'download_count' => 0,
                'status' => Upload::STATUS_ACTIVE,
            ]);
        } catch (Throwable $exception) {
            if (is_string($storagePath) && $storagePath !== '') {
                try {
                    Storage::disk($disk)->delete($storagePath);
                } catch (Throwable) {
                    // The original exception is more useful. Orphan detection belongs in operations monitoring.
                }
            }

            throw $exception;
        }

        return response()->json([
            'data' => UploadResponseData::make($upload, $downloadToken, $managementToken),
        ], 201);
    }

    private function safeOriginalName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?: 'upload';

        return mb_substr($name, 0, 255) ?: 'upload';
    }
}
