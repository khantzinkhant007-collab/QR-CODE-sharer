<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:'.config('scansend.max_upload_kb')],
            'expires_in_minutes' => ['required', 'integer', Rule::in(config('scansend.expiration_minutes'))],
            'max_downloads' => ['nullable', 'integer', Rule::in([1])],
        ];
    }
}
