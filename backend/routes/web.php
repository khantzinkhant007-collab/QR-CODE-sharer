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

Route::middleware('throttle:downloads')->group(function (): void {
    Route::get('/d/{downloadToken}', [DownloadController::class, 'show'])->name('downloads.show');
    Route::post('/d/{downloadToken}/unlock', [DownloadController::class, 'unlock'])
        ->middleware('throttle:download-passwords')->name('downloads.unlock');
    Route::match(['GET', 'HEAD'], '/d/{downloadToken}/file', [DownloadController::class, 'file'])->name('downloads.file');
});
