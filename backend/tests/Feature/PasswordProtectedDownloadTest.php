<?php

namespace Tests\Feature;

use App\Models\Upload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\CreatesUploads;
use Tests\TestCase;

class PasswordProtectedDownloadTest extends TestCase
{
    use CreatesUploads;
    use RefreshDatabase;

    private const PASSWORD = 'a long private passphrase';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config(['scansend.storage_disk' => 'local']);
    }

    public function test_upload_stores_only_a_hidden_password_hash(): void
    {
        $response = $this->postJson('/api/v1/uploads', [
            'file' => UploadedFile::fake()->image('private.jpg'),
            'expires_in_minutes' => 60,
            'password' => self::PASSWORD,
        ])->assertCreated()->assertJsonPath('data.password_protected', true);

        $upload = Upload::findOrFail($response->json('data.id'));
        $this->assertTrue(Hash::check(self::PASSWORD, $upload->password_hash));
        $this->assertArrayNotHasKey('password_hash', $upload->toArray());
        $this->assertStringNotContainsString(self::PASSWORD, $response->getContent());
        $this->assertStringNotContainsString($upload->password_hash, $response->getContent());
    }

    public function test_short_and_oversized_passwords_are_rejected_before_storage(): void
    {
        foreach (['short', str_repeat('a', 73), str_repeat('界', 25)] as $password) {
            $this->postJson('/api/v1/uploads', [
                'file' => UploadedFile::fake()->image('private.jpg'),
                'expires_in_minutes' => 60,
                'password' => $password,
            ])->assertUnprocessable()->assertJsonValidationErrors('password');
        }
        $this->assertDatabaseCount('uploads', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_locked_file_hides_metadata_and_blocks_direct_get_and_head(): void
    {
        ['upload' => $upload, 'downloadToken' => $token] = $this->protectedUpload();
        $this->get("/d/{$token}")->assertOk()->assertSeeText('Download password')
            ->assertDontSee($upload->original_name)->assertDontSee('image/jpeg')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->get("/d/{$token}/file")->assertForbidden();
        $this->head("/d/{$token}/file")->assertForbidden();
        $this->get("/d/{$token}/file?password=".urlencode(self::PASSWORD))->assertForbidden();
        $this->assertSame(0, $upload->fresh()->download_count);
    }

    public function test_wrong_password_never_unlocks_or_flashes_plaintext(): void
    {
        ['downloadToken' => $token] = $this->protectedUpload();
        $this->post("/d/{$token}/unlock", ['password' => 'wrong password'])
            ->assertRedirect("/d/{$token}")->assertSessionHasErrors('password')
            ->assertSessionMissing('_old_input.password');
        $this->get("/d/{$token}/file")->assertForbidden();
        $this->post("/d/{$token}/unlock", ['password' => str_repeat('x', 73)])
            ->assertSessionHasErrors('password')->assertSessionMissing('_old_input.password');
    }

    public function test_unlock_is_file_specific_short_lived_and_never_consumes_a_download(): void
    {
        ['upload' => $upload, 'downloadToken' => $token] = $this->protectedUpload();
        ['downloadToken' => $other] = $this->protectedUpload();
        $this->post("/d/{$token}/unlock", ['password' => self::PASSWORD])->assertRedirect("/d/{$token}");
        $this->get("/d/{$token}")->assertSeeText($upload->original_name);
        $this->head("/d/{$token}/file")->assertOk();
        $this->assertSame(0, $upload->fresh()->download_count);
        $this->get("/d/{$other}/file")->assertForbidden();
        $this->get("/d/{$token}/file")->assertOk()->assertStreamedContent('private-test-file');
        $this->travel(16)->minutes();
        $this->get("/d/{$token}/file")->assertForbidden();
        $this->get("/d/{$token}")->assertSeeText('Download password')->assertDontSee($upload->original_name);
    }

    public function test_a_new_session_must_unlock_again(): void
    {
        ['downloadToken' => $token] = $this->protectedUpload();
        $this->post("/d/{$token}/unlock", ['password' => self::PASSWORD])->assertRedirect();
        $this->flushSession();
        $this->get("/d/{$token}/file")->assertForbidden();
    }

    public function test_unlock_does_not_bypass_one_time_expiration_or_deletion_checks(): void
    {
        ['downloadToken' => $token] = $this->protectedUpload(['max_downloads' => 1]);
        $this->post("/d/{$token}/unlock", ['password' => self::PASSWORD])->assertRedirect();
        $this->get("/d/{$token}/file")->assertOk();
        $this->get("/d/{$token}/file")->assertGone();

        foreach ([['expires_at' => now()->subMinute()], ['status' => Upload::STATUS_DELETED]] as $overrides) {
            ['downloadToken' => $unavailable] = $this->protectedUpload($overrides);
            $this->post("/d/{$unavailable}/unlock", ['password' => self::PASSWORD])->assertGone();
        }
        ['upload' => $upload, 'downloadToken' => $revoked] = $this->protectedUpload();
        $this->post("/d/{$revoked}/unlock", ['password' => self::PASSWORD])->assertRedirect();
        $upload->update(['status' => Upload::STATUS_DELETED]);
        $this->get("/d/{$revoked}/file")->assertGone();
    }

    public function test_all_download_routes_share_an_ip_rate_limit_including_invalid_links(): void
    {
        config(['scansend.download_rate_limit_per_minute' => 2]);
        $this->get('/d/unknown')->assertNotFound();
        $this->head('/d/unknown/file')->assertNotFound();
        $this->get('/d/unknown/file')->assertTooManyRequests()->assertHeader('Retry-After');
    }

    public function test_password_attempts_are_limited_even_when_the_link_changes(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/d/unknown-'.$i.'/unlock', ['password' => 'wrong'])->assertNotFound();
        }
        ['downloadToken' => $token] = $this->protectedUpload();
        $this->post("/d/{$token}/unlock", ['password' => self::PASSWORD])
            ->assertTooManyRequests()->assertHeader('Retry-After');
        $this->travel(61)->seconds();
        $this->post("/d/{$token}/unlock", ['password' => self::PASSWORD])->assertRedirect();
    }

    public function test_password_attempts_are_also_limited_per_link_across_ips(): void
    {
        ['downloadToken' => $token] = $this->protectedUpload();
        for ($i = 1; $i <= 30; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.'.$i])
                ->post("/d/{$token}/unlock", ['password' => 'wrong'])->assertRedirect();
        }
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.31'])
            ->post("/d/{$token}/unlock", ['password' => self::PASSWORD])->assertTooManyRequests();
    }

    public function test_unlock_requires_csrf_outside_the_test_environment(): void
    {
        ['downloadToken' => $token] = $this->protectedUpload();
        $this->app->instance('env', 'local');
        $this->post("/d/{$token}/unlock", ['password' => self::PASSWORD])->assertStatus(419);
    }

    private function protectedUpload(array $overrides = []): array
    {
        return $this->createStoredUpload(array_merge(['password_hash' => Hash::make(self::PASSWORD)], $overrides));
    }
}
