@extends('layouts.app')

@section('title', 'Update Progres Mingguan - ' . $project->kode)
@section('page-title', 'Input Progres Mingguan Lapangan')

@section('content')
<div class="max-w-4xl mx-auto space-y-6">

    <!-- Project Context Header -->
    <div class="bg-white rounded-xl border border-pln-surface-strong p-6 pln-card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <div class="flex items-center gap-2">
                <span class="font-mono text-sm font-bold text-pln-cyan bg-pln-lightcyan px-2.5 py-1 rounded-lg">{{ $project->kode }}</span>
                <span class="text-sm text-slate-500 font-semibold">{{ $project->tipe }}</span>
            </div>
            <h2 class="text-xl font-bold text-pln-navy mt-1.5">{{ $project->nama }}</h2>
            <div class="text-sm text-slate-500 mt-1">Kontraktor: <strong>{{ $project->kontraktor }}</strong> | Target COD: <strong>{{ $project->target_cod ? $project->target_cod->format('d M Y') : '-' }}</strong></div>
        </div>
        <a href="{{ route('projects.show', $project->id) }}" class="inline-flex items-center gap-1.5 text-sm font-bold text-pln-blue-800 bg-pln-surface hover:bg-pln-surface-muted px-4 py-2.5 rounded-xl transition">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Kembali ke Proyek
        </a>
    </div>

    <!-- Progress Form Card -->
    <div class="bg-white rounded-xl border border-pln-surface-strong p-6 sm:p-8 pln-card-shadow">
        <form method="POST" action="{{ route('progress.store', $project->id) }}" class="space-y-7 text-sm">
            @csrf

            <!-- Section 1: Titik Kurva S & Bobot Keseluruhan -->
            <div>
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">1</span>
                    Update Titik Kurva S & Capaian Kumulatif
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Periode / Label Minggu <span class="text-red-500">*</span></label>
                        <input type="text" name="minggu_label" value="{{ 'M-' . (count($project->scurves) + 1) . ' (' . date('M \'y') . ')' }}" required placeholder="Contoh: M-26 (Agu '24)" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan font-semibold">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Target Rencana (%) <span class="text-red-500">*</span></label>
                        <input type="number" step="0.1" name="progres_rencana" value="{{ old('progres_rencana', $project->progres_rencana) }}" required min="0" max="100" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan font-bold text-slate-800">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Realisasi Fisik Saat Ini (%) <span class="text-red-500">*</span></label>
                        <input type="number" step="0.1" name="progres_realisasi" value="{{ old('progres_realisasi', $project->progres_realisasi) }}" required min="0" max="100" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan font-bold text-pln-cyan">
                    </div>
                    <div>
                        <label class="block font-bold text-slate-700 mb-1.5">Penyerapan Anggaran Keuangan (%)</label>
                        <input type="number" step="0.1" name="penyerapan_anggaran" value="{{ old('penyerapan_anggaran', $project->penyerapan_anggaran) }}" min="0" max="100" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                    <div class="lg:col-span-2">
                        <label class="block font-bold text-slate-700 mb-1.5">Catatan Mingguan / Remark</label>
                        <input type="text" name="catatan" placeholder="Contoh: Selesai erection tower T.12 dan penarikan kawat bay 1" class="w-full px-3.5 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
                    </div>
                </div>
            </div>

            <!-- Section 2: Update Detail Capaian per Milestone -->
            <div class="pt-5 border-t border-pln-surface-strong">
                <h3 class="text-base font-bold text-pln-navy mb-5 flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-pln-cyan text-white text-sm font-black flex items-center justify-center">2</span>
                    Capaian Fisik per Tahapan Pekerjaan (Milestones)
                </h3>

                <div class="space-y-4">
                    @foreach($project->milestones as $m)
                    <div class="p-4 sm:p-5 bg-pln-surface rounded-xl border border-pln-surface-strong flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="sm:w-1/2">
                            <div class="font-bold text-slate-800 text-base">{{ $m->nama }}</div>
                            <div class="text-sm text-slate-500 mt-1">Bobot: <strong>{{ $m->bobot }}%</strong> | Rencana: {{ $m->rencana }}%</div>
                        </div>

                        <div class="flex items-center gap-3 sm:w-1/2 justify-end">
                            <div class="w-32">
                                <label class="block font-bold text-xs text-slate-500 uppercase mb-1">Realisasi (%)</label>
                                <input type="number" step="0.1" name="milestones[{{ $m->id }}][realisasi]" value="{{ $m->realisasi }}" min="0" max="100" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white outline-none font-bold text-slate-800">
                            </div>
                            <div class="w-36">
                                <label class="block font-bold text-xs text-slate-500 uppercase mb-1">Status</label>
                                <select name="milestones[{{ $m->id }}][status]" class="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white outline-none font-semibold">
                                    <option value="Pending" {{ $m->status == 'Pending' ? 'selected' : '' }}>Pending</option>
                                    <option value="In Progress" {{ $m->status == 'In Progress' ? 'selected' : '' }}>In Progress</option>
                                    <option value="Done" {{ $m->status == 'Done' ? 'selected' : '' }}>Done (100%)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    @endforeach
                </div>
            </div>

            <!-- Submit Action -->
            <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-pln-surface-strong">
                <a href="{{ route('projects.show', $project->id) }}" class="px-6 py-3 rounded-xl font-bold text-slate-600 bg-pln-surface hover:bg-pln-surface-muted transition text-center">
                    Batal
                </a>
                <button type="submit" class="px-6 py-3 rounded-xl font-bold text-white bg-pln-cyan hover:bg-pln-cyan-700 shadow-sm transition">
                    Simpan Laporan Mingguan
                </button>
            </div>
        </form>
    </div>

</div>
@endsection
