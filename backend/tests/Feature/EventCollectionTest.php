<?php

namespace Tests\Feature;

use App\Models\CollectionFile;
use App\Models\EventCollection;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EventCollectionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config([
            'scansend.storage_disk' => 'local',
            'scansend.frontend_url' => 'https://scansend.example',
            'scansend.public_download_base_url' => 'https://api.scansend.example',
            'scansend.collection_max_files' => 200,
            'scansend.collection_max_mb' => 2048,
            'scansend.collection_max_days' => 30,
        ]);
    }

    private function createCollection(array $overrides = []): array
    {
        return $this->postJson('/api/v1/collections', array_merge([
            'title' => 'School festival',
            'description' => 'Our class memories',
            'expires_at' => now()->addDay()->toIso8601String(),
        ], $overrides))->assertCreated()->json('data');
    }

    private function upload(array $collection, ?UploadedFile $file = null)
    {
        return $this->postJson('/api/v1/collections/'.$collection['token'].'/files', [
            'file' => $file ?? UploadedFile::fake()->image('festival.jpg'),
        ]);
    }

    public function test_create_an_empty_collection_before_any_file_exists(): void
    {
        $data = $this->createCollection();
        $collection = EventCollection::query()->findOrFail($data['id']);
        $this->assertSame(0, $data['file_count']);
        $this->assertSame(0, $data['total_bytes']);
        $this->assertSame('https://scansend.example/events/'.$data['token'], $data['share_url']);
        $this->assertSame(hash('sha256', $data['token']), $collection->public_token_hash);
        $this->assertSame(hash('sha256', $data['management_token']), $collection->management_token_hash);
        $this->assertNotSame($data['token'], $data['management_token']);
        $this->assertDatabaseCount('collection_files', 0);
        $this->getJson('/api/v1/collections/'.$data['token'])
            ->assertOk()->assertJsonCount(0, 'files.data')->assertJsonMissingPath('data.management_token')
            ->assertDontSee($data['management_token'])->assertDontSee($collection->management_token_hash);
    }

    public function test_deadline_is_required_future_and_within_retention_limit(): void
    {
        foreach ([null, now()->subMinute()->toIso8601String(), now()->addDays(31)->toIso8601String(), 'not a date'] as $deadline) {
            $this->postJson('/api/v1/collections', ['title' => 'Event', 'expires_at' => $deadline])
                ->assertUnprocessable()->assertJsonValidationErrors('expires_at');
        }
        $this->assertDatabaseCount('event_collections', 0);
    }

    public function test_different_participants_can_add_files_without_changing_the_shared_qr(): void
    {
        $collection = $this->createCollection();
        $first = $this->upload($collection)->assertCreated()->json('data');
        $second = $this->upload($collection, UploadedFile::fake()->image('another.png'))->assertCreated()->json('data');
        $this->assertNotSame($first['id'], $second['id']);
        $gallery = $this->getJson('/api/v1/collections/'.$collection['token'])
            ->assertOk()->assertJsonPath('data.file_count', 2)->assertJsonCount(2, 'files.data')
            ->assertJsonPath('data.share_url', $collection['share_url'])->assertJsonMissingPath('files.data.0.storage_path');
        $this->assertGreaterThan(0, $gallery->json('data.total_bytes'));
        $this->assertStringStartsWith('https://api.scansend.example/api/v1/collections/', $first['download_url']);
        $stored = CollectionFile::query()->findOrFail($first['id']);
        Storage::disk('local')->assertExists($stored->storage_path);
        $gallery->assertDontSee($stored->sha256)->assertDontSee($stored->storage_path);
    }

    public function test_any_link_holder_can_download_but_files_are_scoped_to_the_collection(): void
    {
        $collection = $this->createCollection();
        $photo = UploadedFile::fake()->image('festival.jpg');
        $bytes = file_get_contents($photo->getRealPath());
        $file = $this->upload($collection, $photo)->assertCreated()->json('data');
        $path = parse_url($file['download_url'], PHP_URL_PATH);
        $response = $this->get($path)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->assertSame($bytes, $response->streamedContent());
        $this->assertStringStartsWith('attachment;', $response->headers->get('Content-Disposition'));
        $preview = $this->get($path.'?preview=1')->assertOk();
        $this->assertStringStartsWith('inline;', $preview->headers->get('Content-Disposition'));
        $this->head($path)->assertOk();
        $another = $this->createCollection(['title' => 'Different event']);
        $this->get('/api/v1/collections/'.$another['token'].'/files/'.$file['id'].'/download')->assertNotFound();
    }

    public function test_invalid_tokens_and_wrong_file_types_are_rejected(): void
    {
        $this->getJson('/api/v1/collections/not-valid')->assertNotFound();
        $this->postJson('/api/v1/collections/not-valid/files', [])->assertNotFound();
        $collection = $this->createCollection();
        $this->upload($collection, UploadedFile::fake()->createWithContent('fake.jpg', '<script>bad()</script>'))
            ->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload($collection, UploadedFile::fake()->createWithContent('icon.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'))
            ->assertUnprocessable();
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_file_count_and_storage_quotas_are_enforced_without_orphans(): void
    {
        config(['scansend.collection_max_files' => 1]);
        $collection = $this->createCollection();
        $this->upload($collection)->assertCreated();
        $this->upload($collection)->assertUnprocessable();
        $this->assertDatabaseCount('collection_files', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles());
        $other = $this->createCollection();
        EventCollection::query()->findOrFail($other['id'])->update(['max_total_bytes' => 1]);
        $this->upload($other)->assertUnprocessable();
        $this->assertDatabaseCount('collection_files', 1);
    }

    public function test_oversized_files_are_rejected_before_storage(): void
    {
        config(['scansend.max_upload_kb' => 1]);
        $collection = $this->createCollection();
        $this->upload($collection, UploadedFile::fake()->create('large.jpg', 5, 'image/jpeg'))->assertUnprocessable();
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_database_failure_cleans_up_the_uploaded_private_object(): void
    {
        $collection = $this->createCollection();
        DB::statement("CREATE TRIGGER reject_collection_file BEFORE INSERT ON collection_files BEGIN SELECT RAISE(FAIL, 'forced failure'); END");
        $this->upload($collection)->assertServerError();
        $this->assertSame([], Storage::disk('local')->allFiles());
        $this->assertDatabaseCount('collection_files', 0);
        $this->assertSame(0, EventCollection::query()->findOrFail($collection['id'])->file_count);
    }

    public function test_only_creator_can_change_deadline_remove_files_or_close(): void
    {
        $collection = $this->createCollection();
        $file = $this->upload($collection)->assertCreated()->json('data');
        $base = '/api/v1/collections/'.$collection['token'];
        $deadline = now()->addDays(2)->toIso8601String();
        $this->patchJson($base, ['expires_at' => $deadline])->assertNotFound();
        $this->deleteJson($base.'/files/'.$file['id'])->assertNotFound();
        $this->deleteJson($base, [], ['X-Management-Token' => $collection['token']])->assertNotFound();
        $headers = ['X-Management-Token' => $collection['management_token']];
        $this->patchJson($base, ['expires_at' => $deadline], $headers)->assertOk()->assertJsonPath('data.share_url', $collection['share_url']);
        $stored = CollectionFile::query()->findOrFail($file['id']);
        $this->deleteJson($base.'/files/'.$file['id'], [], $headers)->assertOk();
        Storage::disk('local')->assertMissing($stored->storage_path);
        $this->getJson($base)->assertJsonPath('data.file_count', 0)->assertJsonPath('data.total_bytes', 0);
        $this->deleteJson($base, [], $headers)->assertOk()->assertJsonPath('data.status', 'closed');
        $this->getJson($base)->assertGone();
        $this->upload($collection)->assertGone();
    }

    public function test_expiration_blocks_gallery_uploads_downloads_head_and_reopening(): void
    {
        $collection = $this->createCollection(['expires_at' => now()->addMinutes(5)->toIso8601String()]);
        $file = $this->upload($collection)->assertCreated()->json('data');
        $this->travel(6)->minutes();
        $base = '/api/v1/collections/'.$collection['token'];
        $this->getJson($base)->assertGone();
        $this->upload($collection)->assertGone();
        $this->get(parse_url($file['download_url'], PHP_URL_PATH))->assertGone();
        $this->head(parse_url($file['download_url'], PHP_URL_PATH))->assertGone();
        $this->patchJson($base, ['expires_at' => now()->addDay()->toIso8601String()], ['X-Management-Token' => $collection['management_token']])->assertGone();
    }

    public function test_scheduled_cleanup_purges_only_expired_or_closed_collection_files(): void
    {
        $expired = $this->createCollection(['expires_at' => now()->addMinutes(5)->toIso8601String()]);
        $active = $this->createCollection();
        $closed = $this->createCollection();
        foreach ([$expired, $active, $closed] as $collection) {
            $this->upload($collection)->assertCreated();
        }
        $this->deleteJson('/api/v1/collections/'.$closed['token'], [], ['X-Management-Token' => $closed['management_token']])->assertOk();
        $this->travel(6)->minutes();
        $this->artisan('collections:purge-expired --dry-run')->expectsOutputToContain('Collections: 2')->assertSuccessful();
        $this->assertDatabaseCount('collection_files', 3);
        $this->artisan('collections:purge-expired')->expectsOutputToContain('Collections: 2; failed: 0')->assertSuccessful();
        $this->assertDatabaseCount('collection_files', 1);
        $this->assertCount(1, Storage::disk('local')->allFiles());
        $this->assertNotNull(EventCollection::query()->findOrFail($expired['id'])->purged_at);
        $this->assertSame(1, EventCollection::query()->findOrFail($active['id'])->file_count);
    }

    public function test_gallery_is_paginated_and_creation_is_rate_limited(): void
    {
        $collection = $this->createCollection();
        $file = $this->upload($collection)->assertCreated()->json('data');
        $stored = CollectionFile::query()->findOrFail($file['id']);
        for ($index = 0; $index < 24; $index++) {
            $stored->replicate()->fill(['storage_path' => 'test-only/'.$index])->save();
        }
        $this->getJson('/api/v1/collections/'.$collection['token'])->assertJsonCount(24, 'files.data')->assertJsonPath('files.last_page', 2);
        $this->getJson('/api/v1/collections/'.$collection['token'].'?page=2')->assertJsonCount(1, 'files.data');
        $this->getJson('/api/v1/collections/'.$collection['token'].'?page=0')->assertUnprocessable();
        for ($index = 0; $index < 9; $index++) {
            $this->postJson('/api/v1/collections', [])->assertUnprocessable();
        }
        $this->postJson('/api/v1/collections', [])->assertTooManyRequests();
    }
}
