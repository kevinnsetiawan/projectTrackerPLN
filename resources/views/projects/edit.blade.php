@extends('layouts.app')

@section('title', 'Edit Proyek - ' . $project->kode)
@section('page-title', 'Edit Data Proyek')

@section('content')
<div class="max-w-4xl mx-auto space-y-6">

    <div class="bg-white rounded-xl border border-pln-surface-strong p-6 sm:p-8 pln-card-shadow">
        <div class="border-b border-pln-surface-strong pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-pln-navy">Perbarui Data Proyek ({{ $project->kode }})</h2>
                <p class="text-sm text-slate-500 mt-1">Ubah data kontrak, status, target waktu, atau parameter teknis</p>
            </div>
            <a href="{{ route('projects.show', $project->id) }}" class="inline-flex items-center gap-1.5 text-sm font-bold text-pln-blue-800 bg-pln-surface hover:bg-pln-surface-muted px-4 py-2.5 rounded-xl transition">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Batal & Kembali ke Detail
            </a>
        </div>

        <form method="POST" action="{{ route('projects.update', $project->id) }}" id="project-update-form" class="space-y-7 text-sm">
            @csrf
            @method('PUT')

            <!-- Identitas & Tipe Proyek -->
            <div>
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">1</span>
                    Identitas & Klasifikasi Proyek
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Kode Proyek</label>
                        <input type="text" name="kode" value="{{ old('kode', $project->kode) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan font-mono">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Nama Lengkap Proyek</label>
                        <input type="text" name="nama" value="{{ old('nama', $project->nama) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Tipe Konstruksi</label>
                        <select name="tipe" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                            @foreach($allTipe as $tipe)
                                <option value="{{ $tipe }}" {{ $project->tipe == $tipe ? 'selected' : '' }}>{{ $tipe }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Level Tegangan</label>
                        <input type="text" name="tegangan" value="{{ old('tegangan', $project->tegangan) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                </div>
            </div>

            <!-- Unit & Lokasi -->
            <div class="pt-5 border-t border-pln-surface-strong">
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">2</span>
                    Unit Pengelola & Lokasi Lapangan
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Unit Induk Pembangunan (UIP)</label>
                        <select name="uip" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                            @foreach($allUip as $uip)
                                <option value="{{ $uip }}" {{ $project->uip == $uip ? 'selected' : '' }}>{{ $uip }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Unit Pelaksana Proyek (UPP)</label>
                        <input type="text" name="upp" value="{{ old('upp', $project->upp) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1.5">Alamat / Lokasi Proyek</label>
                        <input type="text" name="lokasi" value="{{ old('lokasi', $project->lokasi) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Latitude (GPS)</label>
                        <input type="number" step="any" name="latitude" value="{{ old('latitude', $project->latitude) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Longitude (GPS)</label>
                        <input type="number" step="any" name="longitude" value="{{ old('longitude', $project->longitude) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                </div>
            </div>

            <!-- Kontrak & Progress -->
            <div class="pt-5 border-t border-pln-surface-strong">
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">3</span>
                    Kontrak & Status Pelaksanaan
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Pelaksana / Kontraktor</label>
                        <input type="text" name="kontraktor" value="{{ old('kontraktor', $project->kontraktor) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Nomor Kontrak</label>
                        <input type="text" name="nomor_kontrak" value="{{ old('nomor_kontrak', $project->nomor_kontrak) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Nilai Kontrak (Rp)</label>
                        <input type="number" name="nilai_kontrak" value="{{ old('nilai_kontrak', $project->nilai_kontrak) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan font-semibold">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Status Proyek</label>
                        <select name="status" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan font-bold">
                            <option value="Planning" {{ $project->status == 'Planning' ? 'selected' : '' }}>Planning</option>
                            <option value="In Progress" {{ $project->status == 'In Progress' ? 'selected' : '' }}>In Progress</option>
                            <option value="Critical" {{ $project->status == 'Critical' ? 'selected' : '' }}>Critical / Delay</option>
                            <option value="Testing" {{ $project->status == 'Testing' ? 'selected' : '' }}>Testing & Commissioning</option>
                            <option value="COD / Energized" {{ $project->status == 'COD / Energized' ? 'selected' : '' }}>COD / Energized</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Tanggal Mulai Kontrak</label>
                        <input type="date" name="tgl_mulai" value="{{ old('tgl_mulai', $project->tgl_mulai ? $project->tgl_mulai->format('Y-m-d') : '') }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Target Energize (COD)</label>
                        <input type="date" name="target_cod" value="{{ old('target_cod', $project->target_cod ? $project->target_cod->format('Y-m-d') : '') }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Rencana Fisik (%)</label>
                        <input type="number" step="0.1" name="progres_rencana" value="{{ old('progres_rencana', $project->progres_rencana) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Realisasi Fisik (%)</label>
                        <input type="number" step="0.1" name="progres_realisasi" value="{{ old('progres_realisasi', $project->progres_realisasi) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Penyerapan Anggaran (%)</label>
                        <input type="number" step="0.1" name="penyerapan_anggaran" value="{{ old('penyerapan_anggaran', $project->penyerapan_anggaran) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1.5">Deskripsi Ruang Lingkup Proyek</label>
                        <textarea name="deskripsi" rows="3" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">{{ old('deskripsi', $project->deskripsi) }}</textarea>
                    </div>
                </div>
            </div>
        </form>

        <!-- Action bar (diluar form utama) -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-pln-surface-strong mt-7">
            <form method="POST" action="{{ route('projects.destroy', $project->id) }}" onsubmit="return confirm('Apakah Anda yakin ingin menghapus proyek ini secara permanen?')">
                @csrf
                @method('DELETE')
                <button type="submit" class="w-full sm:w-auto px-4 py-3 text-sm font-bold text-pln-red-600 hover:bg-pln-red-50 rounded-xl transition">
                    <i data-lucide="trash-2" class="w-4 h-4 inline-block mr-1"></i> Hapus Proyek
                </button>
            </form>

            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <a href="{{ route('projects.show', $project->id) }}" class="px-6 py-3 rounded-xl font-bold text-slate-600 bg-pln-surface hover:bg-pln-surface-muted transition text-center">
                    Batal
                </a>
                <button type="submit" form="project-update-form" class="px-6 py-3 rounded-xl font-bold text-white bg-pln-cyan hover:bg-pln-cyan-700 shadow-sm transition">
                    Simpan Perubahan
                </button>
            </div>
        </div>
    </div>

</div>
@endsection
