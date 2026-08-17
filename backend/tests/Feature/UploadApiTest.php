<?php

namespace Tests\Feature;

use App\Models\Upload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class UploadApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config([
            'scansend.storage_disk' => 'local',
            'scansend.public_download_base_url' => 'https://files.example.test',
        ]);
    }

    public function test_successful_photo_upload_stores_private_file_and_metadata(): void
    {
        $response = $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('休日 写真.jpg', 640, 480),
            'expires_in_minutes' => 1440,
            'max_downloads' => 1,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.original_name', '休日 写真.jpg')
            ->assertJsonPath('data.mime_type', 'image/jpeg')
            ->assertJsonPath('data.max_downloads', 1)
            ->assertJsonPath('data.download_count', 0);

        $data = $response->json('data');
        $upload = Upload::query()->findOrFail($data['id']);

        Storage::disk('local')->assertExists($upload->storage_path);
        $this->assertStringStartsWith('https://files.example.test/d/', $data['download_url']);
        $this->assertNotSame($data['management_token'], $upload->management_token_hash);
        $this->assertNotSame(basename($upload->storage_path), $upload->original_name);
        $this->assertNotContains('contents', Schema::getColumnListing('uploads'));
    }

    public function test_successful_video_upload_uses_server_detected_mime_type(): void
    {
        $mp4Header = "\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom";

        $response = $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->createWithContent('clip.mov', $mp4Header),
            'expires_in_minutes' => 60,
        ]);

        $response->assertCreated()->assertJsonPath('data.mime_type', 'video/quicktime');
    }

    public function test_unsupported_file_is_rejected(): void
    {
        $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->createWithContent('page.html', '<script>alert(1)</script>'),
            'expires_in_minutes' => 10,
        ])->assertUnprocessable()->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('uploads', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_oversized_file_is_rejected_before_storage(): void
    {
        config(['scansend.max_upload_kb' => 32]);

        $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->create('large.jpg', 33, 'image/jpeg'),
            'expires_in_minutes' => 10,
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_raw_tokens_are_never_stored(): void
    {
        $data = $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('token-test.png'),
            'expires_in_minutes' => 10,
        ])->assertCreated()->json('data');

        $downloadToken = str($data['download_url'])->afterLast('/')->toString();
        $upload = Upload::query()->findOrFail($data['id']);

        $this->assertSame(hash('sha256', $downloadToken), $upload->download_token_hash);
        $this->assertSame(hash('sha256', $data['management_token']), $upload->management_token_hash);
        $this->assertDatabaseMissing('uploads', ['download_token_hash' => $downloadToken]);
        $this->assertDatabaseMissing('uploads', ['management_token_hash' => $data['management_token']]);
    }

    public function test_storage_is_cleaned_when_database_creation_fails(): void
    {
        DB::statement("CREATE TRIGGER reject_upload BEFORE INSERT ON uploads BEGIN SELECT RAISE(FAIL, 'forced insert failure'); END");

        $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('cleanup.jpg'),
            'expires_in_minutes' => 10,
        ])->assertServerError();

        $this->assertDatabaseCount('uploads', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_storage_failure_never_creates_metadata(): void
    {
        Storage::shouldReceive('disk')
            ->once()
            ->with('local')
            ->andThrow(new RuntimeException('forced storage failure'));

        $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('storage-failure.jpg'),
            'expires_in_minutes' => 10,
        ])->assertServerError();

        $this->assertDatabaseCount('uploads', 0);
    }

    public function test_upload_endpoint_is_rate_limited(): void
    {
        config(['scansend.upload_rate_limit_per_minute' => 2]);

        $this->postJson('/api/v1/uploads', [])->assertUnprocessable();
        $this->postJson('/api/v1/uploads', [])->assertUnprocessable();
        $this->postJson('/api/v1/uploads', [])->assertTooManyRequests();
    }
}
