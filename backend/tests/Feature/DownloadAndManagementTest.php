<?php

namespace Tests\Feature;

use App\Models\Upload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\CreatesUploads;
use Tests\TestCase;

class DownloadAndManagementTest extends TestCase
{
    use CreatesUploads;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_valid_download_page_and_file_work_without_an_account(): void
    {
        ['upload' => $upload, 'downloadToken' => $token] = $this->createStoredUpload();

        $this->get("/d/{$token}")
            ->assertOk()
            ->assertSeeText($upload->original_name)
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('Referrer-Policy', 'no-referrer');

        $this->get("/d/{$token}/file")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');

        $this->assertSame(1, $upload->fresh()->download_count);
    }

    public function test_invalid_download_token_returns_404(): void
    {
        $this->get('/d/not-a-valid-token')->assertNotFound();
    }

    public function test_expired_link_returns_attractive_410_page(): void
    {
        ['downloadToken' => $token] = $this->createStoredUpload([
            'expires_at' => now()->subMinute(),
        ]);

        $this->get("/d/{$token}")->assertStatus(410)->assertSeeText('This link has expired.');
        $this->get("/d/{$token}/file")->assertStatus(410);
    }

    public function test_one_download_is_enforced_under_a_database_lock(): void
    {
        ['upload' => $upload, 'downloadToken' => $token] = $this->createStoredUpload([
            'max_downloads' => 1,
        ]);

        $this->get("/d/{$token}/file")->assertOk();
        $this->get("/d/{$token}/file")->assertStatus(410);
        $this->assertSame(1, $upload->fresh()->download_count);
    }

    public function test_head_request_does_not_consume_a_download(): void
    {
        ['upload' => $upload, 'downloadToken' => $token] = $this->createStoredUpload([
            'max_downloads' => 1,
        ]);

        $this->head("/d/{$token}/file")->assertOk();
        $this->assertSame(0, $upload->fresh()->download_count);
    }

    public function test_management_token_authorizes_status_and_physical_deletion(): void
    {
        ['upload' => $upload, 'downloadToken' => $downloadToken, 'managementToken' => $managementToken] = $this->createStoredUpload();

        $this->getJson("/api/v1/uploads/{$upload->id}")
            ->assertNotFound();

        $this->withHeader('X-Management-Token', $managementToken)
            ->getJson("/api/v1/uploads/{$upload->id}")
            ->assertOk()
            ->assertJsonPath('data.file_exists', true);

        $this->withHeader('X-Management-Token', $managementToken)
            ->deleteJson("/api/v1/uploads/{$upload->id}")
            ->assertOk()
            ->assertJsonPath('data.status', Upload::STATUS_DELETED);

        Storage::disk('local')->assertMissing($upload->storage_path);
        $this->get("/d/{$downloadToken}")->assertStatus(410)->assertSeeText('The sender deleted this file.');

        $this->withHeader('X-Management-Token', $managementToken)
            ->deleteJson("/api/v1/uploads/{$upload->id}")
            ->assertOk();
    }

    public function test_wrong_management_token_cannot_read_or_delete_upload(): void
    {
        ['upload' => $upload] = $this->createStoredUpload();

        $this->withHeader('X-Management-Token', str_repeat('x', 43))
            ->getJson("/api/v1/uploads/{$upload->id}")
            ->assertNotFound();

        $this->withHeader('X-Management-Token', str_repeat('x', 43))
            ->deleteJson("/api/v1/uploads/{$upload->id}")
            ->assertNotFound();

        Storage::disk('local')->assertExists($upload->storage_path);
    }
}
