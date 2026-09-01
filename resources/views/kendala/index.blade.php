@extends('layouts.app')

@section('title', 'Monitoring Kendala')
@section('page-title', 'Pusat Monitoring Kendala & Mitigasi Risiko')

@section('content')
<div class="space-y-6">

    <!-- KPI Metric Cards for Issues -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div class="bg-white p-5 rounded-xl border border-red-200/80 shadow-pln flex items-center justify-between relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
            <div>
                <span class="text-xs sm:text-sm font-extrabold text-red-600 uppercase tracking-wider">Kendala Terbuka (Open)</span>
                <div class="text-3xl font-black text-red-600 mt-1">{{ $openCount }}</div>
                <div class="text-sm text-slate-500 mt-0.5 font-medium">Memerlukan mitigasi segera</div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-red-100/70 text-red-600 flex items-center justify-center">
                <i data-lucide="alert-circle" class="w-6 h-6"></i>
            </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-amber-200/80 shadow-pln flex items-center justify-between relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
            <div>
                <span class="text-xs sm:text-sm font-extrabold text-amber-600 uppercase tracking-wider">Dalam Penanganan</span>
                <div class="text-3xl font-black text-amber-600 mt-1">{{ $inReviewCount }}</div>
                <div class="text-sm text-slate-500 mt-0.5 font-medium">Sedang dalam proses tindak lanjut</div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center">
                <i data-lucide="clock" class="w-6 h-6"></i>
            </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-emerald-200/80 shadow-pln flex items-center justify-between relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
            <div>
                <span class="text-xs sm:text-sm font-extrabold text-emerald-600 uppercase tracking-wider">Terselesaikan (Resolved)</span>
                <div class="text-3xl font-black text-emerald-600 mt-1">{{ $resolvedCount }}</div>
                <div class="text-sm text-slate-500 mt-0.5 font-medium">Berhasil dimitigasi</div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center">
                <i data-lucide="check-circle-2" class="w-6 h-6"></i>
            </div>
        </div>
    </div>

    <!-- Filter & Search Card -->
    <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln">
        <form method="GET" action="{{ route('kendala.index') }}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4">
            <div class="sm:col-span-2">
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Cari Deskripsi / Proyek</label>
                <div class="relative">
                    <input type="text" name="search" value="{{ request('search') }}" placeholder="Cari masalah, dampak, solusi, nama proyek..." 
                        class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-pln-cyan outline-none bg-white transition">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                </div>
            </div>

            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Kategori Kendala</label>
                <select name="kategori" onchange="this.form.submit()" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-pln-cyan font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Kategori</option>
                    @foreach($kategoris as $k)
                        <option value="{{ $k }}" {{ request('kategori') == $k ? 'selected' : '' }}>{{ $k }}</option>
                    @endforeach
                </select>
            </div>

            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Status Kendala</label>
                <select name="status" onchange="this.form.submit()" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-pln-cyan font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Status</option>
                    <option value="Open" {{ request('status') == 'Open' ? 'selected' : '' }}>Open</option>
                    <option value="In Review" {{ request('status') == 'In Review' ? 'selected' : '' }}>In Review</option>
                    <option value="Resolved" {{ request('status') == 'Resolved' ? 'selected' : '' }}>Resolved</option>
                </select>
            </div>
        </form>
    </div>

    <!-- Kendala List Card -->
    <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-pln-surface-strong flex items-center justify-between flex-wrap gap-2">
            <div>
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Daftar Rekapitulasi Isu Proyek</h3>
                <p class="text-xs text-slate-500">Semua catatan kendala lapangan beserta rekomendasi mitigasi</p>
            </div>
            <span class="text-xs font-bold text-slate-600 bg-pln-surface px-3 py-1 rounded-lg">
                Total: {{ $kendalas->total() }} Catatan
            </span>
        </div>

        <div class="divide-y divide-pln-surface-strong">
            @forelse($kendalas as $k)
            <div class="p-5 sm:p-6 hover:bg-pln-surface/60 transition">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                    <!-- Project and Issue Code -->
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-pln-navy text-white">{{ $k->project->kode }}</span>
                            <a href="{{ route('projects.show', $k->project->id) }}" class="font-black text-sm text-pln-navy hover:text-pln-cyan transition">
                                {{ $k->project->nama }}
                            </a>
                            <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pln-surface text-slate-700 border border-pln-surface-strong">
                                {{ $k->kategori }}
                            </span>
                        </div>
                        <div class="text-xs text-slate-400 mt-1">UIP: {{ $k->project->uip }} | Tgl Lapor: {{ $k->tgl_lapor ? $k->tgl_lapor->format('d M Y') : '-' }}</div>
                    </div>

                    <!-- Status Changer -->
                    <form method="POST" action="{{ route('kendala.update-status', $k->id) }}" class="flex items-center gap-2">
                        @csrf
                        @method('PATCH')
                        <select name="status" onchange="this.form.submit()" class="text-xs font-bold px-3 py-1.5 rounded-xl border bg-white cursor-pointer shadow-2xs {{ $k->status === 'Resolved' ? 'text-emerald-700 border-emerald-300' : ($k->status === 'In Review' ? 'text-amber-700 border-amber-300' : 'text-red-700 border-red-300') }}">
                            <option value="Open" {{ $k->status === 'Open' ? 'selected' : '' }}>Status: Open</option>
                            <option value="In Review" {{ $k->status === 'In Review' ? 'selected' : '' }}>Status: In Review</option>
                            <option value="Resolved" {{ $k->status === 'Resolved' ? 'selected' : '' }}>Status: Resolved</option>
                        </select>
                    </form>
                </div>

                <!-- Description & Actions -->
                <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
                    <div class="bg-pln-surface p-3.5 sm:p-4 rounded-xl border border-pln-surface-strong">
                        <strong class="text-slate-800 block mb-1">Deskripsi Kendala:</strong>
                        <p class="text-slate-700 leading-relaxed">{{ $k->deskripsi }}</p>
                    </div>
                    <div class="bg-pln-surface p-3.5 sm:p-4 rounded-xl border border-pln-surface-strong">
                        <strong class="text-slate-800 block mb-1">Dampak Terhadap Schedule:</strong>
                        <p class="text-slate-600 leading-relaxed">{{ $k->dampak ?? '-' }}</p>
                    </div>
                    <div class="bg-pln-green-50/80 p-3.5 sm:p-4 rounded-xl border border-pln-green-200">
                        <strong class="text-pln-green-900 block mb-1">Tindakan Mitigasi Lapangan:</strong>
                        <p class="text-pln-green-800 leading-relaxed">{{ $k->tindakan_mitigasi ?? '-' }}</p>
                    </div>
                </div>
            </div>
            @empty
            <div class="py-12 text-center text-slate-400">
                <i data-lucide="check-circle" class="w-10 h-10 text-emerald-500 mx-auto mb-2"></i>
                <div class="font-bold text-slate-700">Tidak ada kendala aktif</div>
                <div class="text-xs text-slate-500 mt-1">Semua pekerjaan konstruksi berjalan normal.</div>
            </div>
            @endforelse
        </div>

        @if($kendalas->hasPages())
        <div class="p-4 border-t border-pln-surface-strong">
            {{ $kendalas->links() }}
        </div>
        @endif
    </div>

</div>
@endsection
