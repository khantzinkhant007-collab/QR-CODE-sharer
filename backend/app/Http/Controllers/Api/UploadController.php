<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUploadRequest;
use App\Models\Upload;
use App\Support\SecureToken;
use App\Support\UploadResponseData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;
use ZipArchive;

class UploadController extends Controller
{
    public function store(StoreUploadRequest $request): JsonResponse
    {
        /** @var array<int, UploadedFile> $files */
        $files = $request->hasFile('files')
            ? array_values($request->file('files'))
            : [$request->file('file')];

        $allowedTypes = array_merge(config('scansend.allowed_mime_types'), config('scansend.attachment_mime_types'));
        $maxBytes = (int) config('scansend.max_upload_kb') * 1024;
        $totalBytes = 0;

        foreach ($files as $candidate) {
            $candidateMime = $candidate->getMimeType() ?: 'application/octet-stream';
            $unsafeName = preg_match('/\.(exe|com|msi|dll|scr|bat|cmd|ps1|sh|bash|vbs|vbe|js|mjs|cjs|jse|wsf|wsh|hta|html?|xhtml|svg|php\d*|phtml|phar|py|pl|rb|jar|apk|app|dmg|iso|lnk|url|docm|xlsm|pptm)(?:[.\s]|$)/i', $candidate->getClientOriginalName());

            if ($unsafeName || ! in_array($candidateMime, $allowedTypes, true)) {
                throw ValidationException::withMessages([
                    'file' => ['This server does not allow the detected file type.'],
                ]);
            }

            $totalBytes += (int) $candidate->getSize();
            if ($totalBytes > $maxBytes) {
                throw ValidationException::withMessages([
                    'file' => ['The combined size of selected files exceeds the maximum upload limit.'],
                ]);
            }
        }

        $tempZipPath = null;

        try {
            if (count($files) > 1) {
                $tempZipPath = $this->createBundleZip($files);
                $file = new UploadedFile(
                    $tempZipPath,
                    'scansend-'.count($files).'-files.zip',
                    'application/zip',
                    null,
                    true,
                );
                $mimeType = 'application/zip';
            } else {
                $file = $files[0];
                $mimeType = $file->getMimeType() ?: 'application/octet-stream';
            }

            $realPath = $file->getRealPath();
            $sha256 = $realPath ? hash_file('sha256', $realPath) : false;
            if ($sha256 === false) {
                abort(422, 'The uploaded file could not be read safely.');
            }

            $downloadToken = SecureToken::generate();
            $managementToken = SecureToken::generate();
            $disk = (string) config('scansend.storage_disk');
            $extension = config('scansend.extension_by_mime')[$mimeType] ?? 'bin';
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
        } finally {
            if (is_string($tempZipPath) && file_exists($tempZipPath)) {
                @unlink($tempZipPath);
            }
        }
    }

    /**
     * @param  array<int, UploadedFile>  $files
     */
    private function createBundleZip(array $files): string
    {
        $zipPath = tempnam(sys_get_temp_dir(), 'scansend-bundle-');
        if ($zipPath === false) {
            abort(500, 'Could not allocate temporary bundle storage.');
        }

        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            @unlink($zipPath);
            abort(500, 'Could not create bundle archive.');
        }

        $usedNames = [];
        foreach ($files as $item) {
            $realPath = $item->getRealPath();
            if (! $realPath) {
                $zip->close();
                @unlink($zipPath);
                abort(422, 'One of the uploaded files could not be read safely.');
            }
            $entryName = $this->uniqueEntryName($this->safeOriginalName($item->getClientOriginalName()), $usedNames);
            $zip->addFile($realPath, $entryName);
        }

        $zip->close();

        return $zipPath;
    }

    /**
     * @param  array<string, bool>  $usedNames
     */
    private function uniqueEntryName(string $name, array &$usedNames): string
    {
        $lower = mb_strtolower($name);
        if (! isset($usedNames[$lower])) {
            $usedNames[$lower] = true;

            return $name;
        }

        $dot = mb_strrpos($name, '.');
        $stem = $dot !== false && $dot > 0 ? mb_substr($name, 0, $dot) : $name;
        $ext = $dot !== false && $dot > 0 ? mb_substr($name, $dot) : '';
        $counter = 2;

        while (isset($usedNames[mb_strtolower($stem.' ('.$counter.')'.$ext)])) {
            $counter++;
        }

        $candidate = $stem.' ('.$counter.')'.$ext;
        $usedNames[mb_strtolower($candidate)] = true;

        return $candidate;
    }

    private function safeOriginalName(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?: 'upload';

        return mb_substr($name, 0, 255) ?: 'upload';
    }
}
