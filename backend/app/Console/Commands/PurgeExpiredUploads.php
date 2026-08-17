<?php

namespace App\Console\Commands;

use App\Models\Upload;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

class PurgeExpiredUploads extends Command
{
    protected $signature = 'uploads:purge-expired {--dry-run : Report candidates without deleting files}';

    protected $description = 'Delete expired private files in safe batches and mark their metadata expired';

    public function handle(): int
    {
        $found = 0;
        $deleted = 0;
        $missing = 0;
        $failed = 0;
        $dryRun = (bool) $this->option('dry-run');

        Upload::query()
            ->where('status', Upload::STATUS_ACTIVE)
            ->where('expires_at', '<=', now())
            ->orderBy('id')
            ->chunkById((int) config('scansend.purge_batch_size'), function ($uploads) use (
                &$found,
                &$deleted,
                &$missing,
                &$failed,
                $dryRun,
            ): void {
                foreach ($uploads as $upload) {
                    $found++;

                    if ($dryRun) {
                        continue;
                    }

                    try {
                        $disk = Storage::disk($upload->storage_disk);
                        if ($disk->exists($upload->storage_path)) {
                            if (! $disk->delete($upload->storage_path)) {
                                throw new \RuntimeException('Storage returned false while deleting.');
                            }
                            $deleted++;
                        } else {
                            $missing++;
                        }

                        $upload->forceFill([
                            'status' => Upload::STATUS_EXPIRED,
                            'purged_at' => now(),
                        ])->save();
                    } catch (Throwable $exception) {
                        $failed++;
                        $this->error("Failed to purge upload {$upload->id}: {$exception->getMessage()}");
                    }
                }
            });

        $this->info("Candidates: {$found}; deleted: {$deleted}; already missing: {$missing}; failed: {$failed}");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
