<?php

namespace Tests\Feature;

use App\Models\Upload;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentUploadTest extends TestCase
{
    use RefreshDatabase;

    private array $fixtures = [];

    private function actualFile(string $name, string $contents): UploadedFile
    {
        // Laravel's fake overrides getMimeType() using the extension. Wrap its temp file
        // to exercise real fileinfo detection, while keeping the temp resource alive.
        $file = UploadedFile::fake()->createWithContent($name, $contents);
        $this->fixtures[] = $file;

        return new UploadedFile($file->getRealPath(), $name, 'text/plain', null, true);
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config(['scansend.storage_disk' => 'local']);
    }

    public function test_pdf_upload_and_download_preserve_bytes_and_use_attachment_headers(): void
    {
        $bytes = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n";
        $data = $this->postJson('/api/v1/uploads', [
            'file' => $this->actualFile('class-handout.pdf', $bytes),
            'expires_in_minutes' => 10,
        ])->assertCreated()->assertJsonPath('data.mime_type', 'application/pdf')->json('data');

        $upload = Upload::findOrFail($data['id']);
        $this->assertSame($bytes, Storage::disk('local')->get($upload->storage_path));
        $this->assertStringEndsWith('.bin', $upload->storage_path);
        $token = basename($data['download_url']);
        $response = $this->get('/d/'.$token.'/file')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('class-handout.pdf', $response->headers->get('Content-Disposition'));
        $this->assertSame($bytes, $response->streamedContent());
    }

    public function test_text_and_csv_attachments_are_supported(): void
    {
        foreach (['notes.txt', 'attendance.csv'] as $name) {
            $this->postJson('/api/v1/uploads', [
                'file' => $this->actualFile($name, "Name,Present\nStudent,Yes\n"),
                'expires_in_minutes' => 10,
            ])->assertCreated()->assertJsonPath('data.original_name', $name);
        }
    }

    public function test_archives_are_download_only_and_remain_in_private_storage(): void
    {
        $zipPath = tempnam(sys_get_temp_dir(), 'scansend-zip');
        $zip = new \ZipArchive;
        $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('notes.txt', 'Test attachment');
        $zip->close();
        try {
            $this->postJson('/api/v1/uploads', [
                'file' => new UploadedFile($zipPath, 'notes.zip', null, null, true),
                'expires_in_minutes' => 10,
            ])->assertCreated()->assertJsonPath('data.mime_type', 'application/zip');
        } finally {
            if (file_exists($zipPath)) {
                unlink($zipPath);
            }
        }
    }

    public function test_executable_script_and_macro_names_are_rejected_even_if_contents_are_plain_text(): void
    {
        foreach (['program.exe', 'script.js', 'invoice.php.jpg', 'page.html', 'vector.svg', 'macro.docm'] as $name) {
            $this->postJson('/api/v1/uploads', [
                'file' => $this->actualFile($name, 'Harmless-looking plain text'),
                'expires_in_minutes' => 10,
            ])->assertUnprocessable()->assertJsonValidationErrors('file');
        }
        $this->assertDatabaseCount('uploads', 0);
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_an_unknown_binary_renamed_as_text_does_not_bypass_server_mime_detection(): void
    {
        $this->postJson('/api/v1/uploads', [
            'file' => $this->actualFile('notes.txt', "\x00\x01\x02\x03\xff\xfe\x00\x01\x02\x03\x00"),
            'expires_in_minutes' => 10,
        ])->assertUnprocessable()->assertJsonValidationErrors('file');
    }
}
