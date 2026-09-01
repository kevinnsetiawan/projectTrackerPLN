<?php

namespace App\Http\Requests;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kode' => 'required|string|unique:projects,kode',
            'nama' => 'required|string|max:255',
            'tipe' => 'required|string|in:'.implode(',', Project::ALL_TIPE),
            'tegangan' => 'required|string',
            'uip' => 'required|string|in:'.implode(',', Project::ALL_UIP),
            'upp' => 'nullable|string',
            'lokasi' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'kontraktor' => 'required|string',
            'nomor_kontrak' => 'nullable|string',
            'nilai_kontrak' => 'required|numeric|min:0',
            'tgl_mulai' => 'nullable|date',
            'target_cod' => 'nullable|date',
            'progres_rencana' => 'nullable|numeric|min:0|max:100',
            'progres_realisasi' => 'nullable|numeric|min:0|max:100',
            'penyerapan_anggaran' => 'nullable|numeric|min:0|max:100',
            'deskripsi' => 'nullable|string',
        ];
    }
}
