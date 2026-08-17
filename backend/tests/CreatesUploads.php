<?php

namespace Tests;

use App\Models\Upload;
use App\Support\SecureToken;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait CreatesUploads
{
    protected function createStoredUpload(array $overrides = []): array
    {
        $downloadToken = $overrides['download_token'] ?? SecureToken::generate();
        $managementToken = $overrides['management_token'] ?? SecureToken::generate();
        unset($overrides['download_token'], $overrides['management_token']);

        $path = $overrides['storage_path'] ?? 'uploads/tests/'.Str::lower((string) Str::ulid()).'.jpg';
        Storage::disk('local')->put($path, 'private-test-file');

        $upload = Upload::query()->create(array_merge([
            'original_name' => '写真 sample.jpg',
            'storage_disk' => 'local',
            'storage_path' => $path,
            'mime_type' => 'image/jpeg',
            'extension' => 'jpg',
            'size_bytes' => 17,
            'sha256' => hash('sha256', 'private-test-file'),
            'download_token_hash' => SecureToken::hash($downloadToken),
            'management_token_hash' => SecureToken::hash($managementToken),
            'expires_at' => now()->addHour(),
            'max_downloads' => null,
            'download_count' => 0,
            'status' => Upload::STATUS_ACTIVE,
        ], $overrides));

        return compact('upload', 'downloadToken', 'managementToken');
    }
}
