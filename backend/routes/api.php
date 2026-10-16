<?php

use App\Http\Controllers\Api\EventCollectionController;
use App\Http\Controllers\Api\ManagementUploadController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/collections', [EventCollectionController::class, 'store'])->middleware('throttle:collection-creation');
    Route::get('/collections/{collectionToken}', [EventCollectionController::class, 'show'])->middleware('throttle:downloads');
    Route::post('/collections/{collectionToken}/files', [EventCollectionController::class, 'upload'])->middleware('throttle:uploads');
    Route::match(['GET', 'HEAD'], '/collections/{collectionToken}/files/{fileId}/download', [EventCollectionController::class, 'download'])->middleware('throttle:downloads');
    Route::patch('/collections/{collectionToken}', [EventCollectionController::class, 'update'])->middleware('throttle:30,1');
    Route::delete('/collections/{collectionToken}', [EventCollectionController::class, 'close'])->middleware('throttle:30,1');
    Route::delete('/collections/{collectionToken}/files/{fileId}', [EventCollectionController::class, 'destroyFile'])->middleware('throttle:30,1');
    Route::post('/uploads', [UploadController::class, 'store'])->middleware('throttle:uploads');
    Route::get('/uploads/{id}', [ManagementUploadController::class, 'show'])->middleware('throttle:60,1');
    Route::delete('/uploads/{id}', [ManagementUploadController::class, 'destroy'])->middleware('throttle:30,1');
});
