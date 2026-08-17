<?php

namespace Tests\Feature;

use App\Models\Upload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\CreatesUploads;
use Tests\TestCase;

class PurgeExpiredUploadsTest extends TestCase
{
    use CreatesUploads;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_cleanup_command_deletes_expired_files_and_handles_missing_files(): void
    {
        ['upload' => $expired] = $this->createStoredUpload(['expires_at' => now()->subMinute()]);
        ['upload' => $missing] = $this->createStoredUpload(['expires_at' => now()->subHour()]);
        ['upload' => $active] = $this->createStoredUpload(['expires_at' => now()->addHour()]);
        Storage::disk('local')->delete($missing->storage_path);

        $this->artisan('uploads:purge-expired')
            ->expectsOutputToContain('Candidates: 2')
            ->assertSuccessful();

        Storage::disk('local')->assertMissing($expired->storage_path);
        Storage::disk('local')->assertExists($active->storage_path);
        $this->assertSame(Upload::STATUS_EXPIRED, $expired->fresh()->status);
        $this->assertSame(Upload::STATUS_EXPIRED, $missing->fresh()->status);
        $this->assertSame(Upload::STATUS_ACTIVE, $active->fresh()->status);
    }
}
