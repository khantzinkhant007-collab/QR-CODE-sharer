<?php

use App\Http\Controllers\Api\ManagementUploadController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/uploads', [UploadController::class, 'store'])->middleware('throttle:uploads');
    Route::get('/uploads/{id}', [ManagementUploadController::class, 'show'])->middleware('throttle:60,1');
    Route::delete('/uploads/{id}', [ManagementUploadController::class, 'destroy'])->middleware('throttle:30,1');
});
