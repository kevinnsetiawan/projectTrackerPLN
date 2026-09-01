@extends('layouts.app')

@section('title', 'Tambah Proyek Baru')
@section('page-title', 'Pendaftaran Proyek Konstruksi Baru')

@section('content')
<div class="max-w-4xl mx-auto space-y-6">

    <div class="bg-white rounded-xl border border-pln-surface-strong p-6 sm:p-8 pln-card-shadow">
        <div class="border-b border-pln-surface-strong pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
                <h2 class="text-xl font-bold text-pln-navy">Formulir Master Data Proyek</h2>
                <p class="text-sm text-slate-500 mt-1">Lengkapi parameter data kontrak, lokasi teknis, dan target COD</p>
            </div>
            <a href="{{ route('projects.index') }}" class="inline-flex items-center gap-1.5 text-sm font-bold text-pln-blue-800 bg-pln-surface hover:bg-pln-surface-muted px-4 py-2.5 rounded-xl transition">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali ke Daftar
            </a>
        </div>

        <form method="POST" action="{{ route('projects.store') }}" class="space-y-7 text-sm">
            @csrf

            <!-- Section 1: Identitas & Tipe Proyek -->
            <div>
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">1</span>
                    Identitas & Klasifikasi Proyek
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Kode Proyek <span class="text-red-500">*</span></label>
                        <input type="text" name="kode" value="{{ old('kode') }}" required placeholder="Contoh: GI-150-BKS" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                        @error('kode') <span class="text-red-500 mt-1 block">{{ $message }}</span> @enderror
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Nama Lengkap Proyek <span class="text-red-500">*</span></label>
                        <input type="text" name="nama" value="{{ old('nama') }}" required placeholder="Contoh: Pembangunan Gardu Induk 150 kV Bekasi Timur" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                        @error('nama') <span class="text-red-500 mt-1 block">{{ $message }}</span> @enderror
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Tipe Konstruksi <span class="text-red-500">*</span></label>
                        <select name="tipe" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                            @foreach($allTipe as $tipe)
                                <option value="{{ $tipe }}">{{ $tipe }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Level Tegangan <span class="text-red-500">*</span></label>
                        <select name="tegangan" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                            <option value="500 kV">500 kV (Ekstra Tinggi / EHV)</option>
                            <option value="275 kV">275 kV (Transmisi Sumatera)</option>
                            <option value="150 kV" selected>150 kV (Tegangan Tinggi / HV)</option>
                            <option value="70 kV">70 kV</option>
                            <option value="20 kV">20 kV (Tegangan Menengah / Distribusi)</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Section 2: Wilayah & Lokasi Geografis -->
            <div class="pt-5 border-t border-pln-surface-strong">
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">2</span>
                    Unit Pengelola & Lokasi Lapangan
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Unit Induk Pembangunan (UIP) <span class="text-red-500">*</span></label>
                        <select name="uip" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                            @foreach($allUip as $uip)
                                <option value="{{ $uip }}">{{ $uip }}</option>
                            @endforeach
                        </select>
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Unit Pelaksana Proyek (UPP)</label>
                        <input type="text" name="upp" value="{{ old('upp') }}" placeholder="Contoh: UPP JBB 1" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1.5">Alamat / Lokasi Proyek <span class="text-red-500">*</span></label>
                        <input type="text" name="lokasi" value="{{ old('lokasi') }}" required placeholder="Kabupaten / Kota, Provinsi..." class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Latitude (GPS)</label>
                        <input type="number" step="any" name="latitude" value="{{ old('latitude', -6.2088) }}" placeholder="-6.2088" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Longitude (GPS)</label>
                        <input type="number" step="any" name="longitude" value="{{ old('longitude', 106.8456) }}" placeholder="106.8456" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                </div>
            </div>

            <!-- Section 3: Data Kontrak & Anggaran -->
            <div class="pt-5 border-t border-pln-surface-strong">
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">3</span>
                    Kontrak & Finansial
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Pelaksana / Kontraktor <span class="text-red-500">*</span></label>
                        <input type="text" name="kontraktor" value="{{ old('kontraktor') }}" required placeholder="Nama PT / Konsorsium Rekanan" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Nomor Kontrak</label>
                        <input type="text" name="nomor_kontrak" value="{{ old('nomor_kontrak') }}" placeholder="Contoh: 0122.PJ/KON.01/UIP-JBB/2024" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Nilai Kontrak (Rp) <span class="text-red-500">*</span></label>
                        <input type="number" name="nilai_kontrak" value="{{ old('nilai_kontrak', 50000000000) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan font-semibold">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Penyerapan Anggaran Saat Ini (%)</label>
                        <input type="number" step="0.1" name="penyerapan_anggaran" value="{{ old('penyerapan_anggaran', 0) }}" min="0" max="100" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Tanggal Mulai Kontrak</label>
                        <input type="date" name="tgl_mulai" value="{{ old('tgl_mulai', date('Y-m-d')) }}" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Target Energize (COD) <span class="text-red-500">*</span></label>
                        <input type="date" name="target_cod" value="{{ old('target_cod', date('Y-m-d', strtotime('+1 year'))) }}" required class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                </div>
            </div>

            <!-- Section 4: Baseline Progres -->
            <div class="pt-5 border-t border-pln-surface-strong">
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">4</span>
                    Baseline Progres Awal (%)
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Rencana Fisik Awal (%)</label>
                        <input type="number" step="0.1" name="progres_rencana" value="{{ old('progres_rencana', 10.0) }}" min="0" max="100" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Realisasi Fisik Awal (%)</label>
                        <input type="number" step="0.1" name="progres_realisasi" value="{{ old('progres_realisasi', 10.0) }}" min="0" max="100" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div class="sm:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1.5">Deskripsi & Ruang Lingkup Proyek</label>
                        <textarea name="deskripsi" rows="3" placeholder="Jelaskan spesifikasi teknis dan manfaat pembangunan..." class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">{{ old('deskripsi') }}</textarea>
                    </div>
                </div>
            </div>

            <!-- Submit Buttons -->
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-pln-surface-strong">
                <a href="{{ route('projects.index') }}" class="px-6 py-3 rounded-xl font-bold text-slate-600 bg-pln-surface hover:bg-pln-surface-muted transition text-center">
                    Batal
                </a>
                <button type="submit" class="px-6 py-3 rounded-xl font-bold text-white bg-pln-cyan hover:bg-pln-cyan-700 shadow-sm transition">
                    Simpan Proyek
                </button>
            </div>
        </form>
    </div>

</div>
@endsection
