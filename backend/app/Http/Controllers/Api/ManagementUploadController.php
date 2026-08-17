<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Upload;
use App\Support\SecureToken;
use App\Support\UploadResponseData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ManagementUploadController extends Controller
{
    public function show(Request $request, string $id): JsonResponse
    {
        $upload = $this->authorizedUpload($request, $id);

        return response()->json([
            'data' => [
                ...UploadResponseData::make($upload),
                'file_exists' => $upload->status === Upload::STATUS_ACTIVE
                    && Storage::disk($upload->storage_disk)->exists($upload->storage_path),
            ],
        ]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $token = $this->managementToken($request);

        $upload = DB::transaction(function () use ($id, $token): Upload {
            $upload = Upload::query()->whereKey($id)->lockForUpdate()->firstOrFail();
            $this->assertAuthorized($upload, $token);

            if ($upload->status === Upload::STATUS_DELETED) {
                return $upload;
            }

            $disk = Storage::disk($upload->storage_disk);
            if ($disk->exists($upload->storage_path) && ! $disk->delete($upload->storage_path)) {
                abort(503, 'The private file could not be deleted. Please retry.');
            }

            $upload->forceFill([
                'status' => Upload::STATUS_DELETED,
                'purged_at' => now(),
            ])->save();

            return $upload;
        }, 3);

        return response()->json([
            'data' => UploadResponseData::make($upload),
        ]);
    }

    private function authorizedUpload(Request $request, string $id): Upload
    {
        $upload = Upload::query()->findOrFail($id);
        $this->assertAuthorized($upload, $this->managementToken($request));

        return $upload;
    }

    private function managementToken(Request $request): string
    {
        $token = $request->header('X-Management-Token');
        if (! is_string($token) || strlen($token) < 20) {
            abort(404);
        }

        return $token;
    }

    private function assertAuthorized(Upload $upload, string $token): void
    {
        if (! hash_equals($upload->management_token_hash, SecureToken::hash($token))) {
            abort(404);
        }
    }
}
