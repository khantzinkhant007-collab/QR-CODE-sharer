<?php

namespace App\Console\Commands;

use App\Models\EventCollection;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class PurgeExpiredCollections extends Command
{
    protected $signature = 'collections:purge-expired {--dry-run : Report without deleting files}';

    protected $description = 'Remove private files from expired or closed event collections';

    public function handle(): int
    {
        $candidates = 0;
        $failed = 0;
        EventCollection::query()->whereNull('purged_at')
            ->where(fn ($query) => $query->where('expires_at', '<=', now())->orWhereNotNull('closed_at'))
            ->chunkById((int) config('scansend.purge_batch_size'), function ($collections) use (&$candidates, &$failed): void {
                foreach ($collections as $candidate) {
                    $candidates++;
                    if ($this->option('dry-run')) {
                        continue;
                    }
                    try {
                        DB::transaction(function () use ($candidate): void {
                            $collection = EventCollection::query()->whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                            // The owner might have extended the deadline since selection.
                            if ($collection->status() === 'active') {
                                return;
                            }
                            foreach ($collection->files()->lazyById(50) as $file) {
                                $disk = Storage::disk($file->storage_disk);
                                if ($disk->exists($file->storage_path) && ! $disk->delete($file->storage_path)) {
                                    throw new \RuntimeException('Storage could not delete a collection file.');
                                }
                                $file->delete();
                            }
                            $collection->forceFill(['purged_at' => now(), 'file_count' => 0, 'total_bytes' => 0])->save();
                        }, 3);
                    } catch (Throwable $exception) {
                        $failed++;
                        $this->error('Could not purge collection '.$candidate->id.'. Retry after checking storage.');
                        report($exception);
                    }
                }
            });
        $this->info("Collections: {$candidates}; failed: {$failed}");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
