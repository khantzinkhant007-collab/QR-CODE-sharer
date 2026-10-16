<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventCollection extends Model
{
    use HasUlids;

    protected $guarded = ['id'];

    protected $hidden = ['public_token_hash', 'management_token_hash'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'immutable_datetime',
            'closed_at' => 'immutable_datetime',
            'purged_at' => 'immutable_datetime',
            'file_count' => 'integer',
            'total_bytes' => 'integer',
            'max_files' => 'integer',
            'max_total_bytes' => 'integer',
        ];
    }

    public function files(): HasMany
    {
        return $this->hasMany(CollectionFile::class);
    }

    public function status(): string
    {
        if ($this->closed_at !== null) {
            return 'closed';
        }

        return $this->expires_at->lessThanOrEqualTo(now()) ? 'expired' : 'active';
    }
}
