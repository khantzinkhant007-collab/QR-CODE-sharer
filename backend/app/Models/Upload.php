<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class Upload extends Model
{
    use HasUlids;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_DELETED = 'deleted';

    public const STATUS_EXPIRED = 'expired';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'original_name',
        'storage_disk',
        'storage_path',
        'mime_type',
        'extension',
        'size_bytes',
        'sha256',
        'download_token_hash',
        'management_token_hash',
        'password_hash',
        'expires_at',
        'max_downloads',
        'download_count',
        'status',
        'purged_at',
    ];

    protected $hidden = [
        'password_hash',
        'storage_disk',
        'storage_path',
        'sha256',
        'download_token_hash',
        'management_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'download_count' => 'integer',
            'max_downloads' => 'integer',
            'expires_at' => 'immutable_datetime',
            'purged_at' => 'immutable_datetime',
        ];
    }

    public function effectiveStatus(): string
    {
        if ($this->status === self::STATUS_ACTIVE && $this->expires_at->isPast()) {
            return self::STATUS_EXPIRED;
        }

        return $this->status;
    }

    public function downloadLimitReached(): bool
    {
        return $this->max_downloads !== null && $this->download_count >= $this->max_downloads;
    }
}
