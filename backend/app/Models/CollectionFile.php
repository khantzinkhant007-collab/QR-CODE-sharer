<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class CollectionFile extends Model
{
    use HasUlids;

    protected $guarded = ['id'];

    protected $hidden = ['storage_disk', 'storage_path', 'sha256'];

    protected function casts(): array
    {
        return ['size_bytes' => 'integer'];
    }
}
