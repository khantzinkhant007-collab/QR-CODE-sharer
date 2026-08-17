<?php

use App\Http\Controllers\DownloadController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'ScanSend API',
        'status' => 'ok',
        'docs' => '/docs/api',
    ]);
});

Route::get('/d/{downloadToken}', [DownloadController::class, 'show'])->name('downloads.show');
Route::match(['GET', 'HEAD'], '/d/{downloadToken}/file', [DownloadController::class, 'file'])->name('downloads.file');
