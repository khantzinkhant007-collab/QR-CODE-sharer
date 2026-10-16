<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_collections', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('title', 120);
            $table->text('description')->nullable();
            $table->char('public_token_hash', 64)->unique();
            $table->char('management_token_hash', 64)->unique();
            $table->timestampTz('expires_at')->index();
            $table->timestampTz('closed_at')->nullable();
            $table->timestampTz('purged_at')->nullable();
            $table->unsignedInteger('file_count')->default(0);
            $table->unsignedBigInteger('total_bytes')->default(0);
            $table->unsignedInteger('max_files');
            $table->unsignedBigInteger('max_total_bytes');
            $table->timestampsTz();
        });

        Schema::create('collection_files', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->foreignUlid('event_collection_id')->constrained()->restrictOnDelete();
            $table->string('original_name');
            $table->string('storage_disk', 64);
            $table->string('storage_path', 512)->unique();
            $table->string('mime_type', 191);
            $table->unsignedBigInteger('size_bytes');
            $table->char('sha256', 64);
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_files');
        Schema::dropIfExists('event_collections');
    }
};
