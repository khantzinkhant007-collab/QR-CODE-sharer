<?php

namespace App\Support;

use App\Models\Upload;

final class UploadResponseData
{
    public static function make(
        Upload $upload,
        ?string $downloadToken = null,
        ?string $managementToken = null,
    ): array {
        $data = [
            'id' => $upload->id,
            'original_name' => $upload->original_name,
            'mime_type' => $upload->mime_type,
            'size_bytes' => $upload->size_bytes,
            'expires_at' => $upload->expires_at->utc()->toIso8601String(),
            'max_downloads' => $upload->max_downloads,
            'download_count' => $upload->download_count,
            'password_protected' => $upload->password_hash !== null,
            'status' => $upload->effectiveStatus(),
        ];

        if ($downloadToken !== null) {
            $data['download_url'] = config('scansend.public_download_base_url').'/d/'.$downloadToken;
        }

        if ($managementToken !== null) {
            $data['management_token'] = $managementToken;
        }

        return $data;
    }
}
