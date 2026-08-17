<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uploads', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('original_name');
            $table->string('storage_disk', 64);
            $table->string('storage_path', 512)->unique();
            $table->string('mime_type', 191);
            $table->string('extension', 16)->nullable();
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->char('download_token_hash', 64)->unique();
            $table->char('management_token_hash', 64)->unique();
            $table->timestampTz('expires_at')->index();
            $table->unsignedInteger('max_downloads')->nullable();
            $table->unsignedInteger('download_count')->default(0);
            $table->string('status', 24)->default('active')->index();
            $table->timestampTz('purged_at')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uploads');
    }
};
