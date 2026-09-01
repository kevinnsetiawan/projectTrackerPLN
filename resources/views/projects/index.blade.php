@extends('layouts.app')

@section('title', 'Daftar Proyek')
@section('page-title', 'Daftar & Monitoring Proyek')

@section('content')
<div class="space-y-6">

    <!-- Filters & Search Bar Card -->
    <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln">
        <form method="GET" action="{{ route('projects.index') }}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <!-- Search -->
            <div class="sm:col-span-2">
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Pencarian Proyek</label>
                <div class="relative">
                    <input type="text" name="search" value="{{ request('search') }}" placeholder="Cari nama, kode, kontraktor, lokasi..."
                        class="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-pln-cyan focus:border-pln-cyan outline-none transition bg-white">
                    <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                </div>
            </div>

            <!-- Filter UIP -->
            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Unit Induk (UIP)</label>
                <select name="uip" onchange="this.form.submit()" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-pln-cyan focus:border-pln-cyan outline-none bg-white font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Unit Induk (UIP)</option>
                    @foreach($allUip as $uip)
                        <option value="{{ $uip }}" {{ request('uip') == $uip ? 'selected' : '' }}>{{ $uip }}</option>
                    @endforeach
                </select>
            </div>

            <!-- Filter Tipe -->
            <div>
                <label class="block text-sm font-bold text-slate-700 mb-1.5">Tipe Konstruksi</label>
                <select name="tipe" onchange="this.form.submit()" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-pln-cyan focus:border-pln-cyan outline-none bg-white font-medium text-slate-700 cursor-pointer">
                    <option value="all">Semua Tipe Pekerjaan</option>
                    @foreach($allTipe as $tipe)
                        <option value="{{ $tipe }}" {{ request('tipe') == $tipe ? 'selected' : '' }}>{{ $tipe }}</option>
                    @endforeach
                </select>
            </div>

            <!-- Filter Status & Submit -->
            <div class="flex items-end gap-2">
                <div class="flex-1">
                    <label class="block text-sm font-bold text-slate-700 mb-1.5">Status Proyek</label>
                    <select name="status" onchange="this.form.submit()" class="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-pln-cyan focus:border-pln-cyan outline-none bg-white font-medium text-slate-700 cursor-pointer">
                        <option value="all">Semua Status</option>
                        <option value="In Progress" {{ request('status') == 'In Progress' ? 'selected' : '' }}>In Progress</option>
                        <option value="Critical" {{ request('status') == 'Critical' ? 'selected' : '' }}>Kritis / Terlambat</option>
                        <option value="Testing" {{ request('status') == 'Testing' ? 'selected' : '' }}>Testing & Comm.</option>
                        <option value="COD / Energized" {{ request('status') == 'COD / Energized' ? 'selected' : '' }}>COD / Energized</option>
                        <option value="Planning" {{ request('status') == 'Planning' ? 'selected' : '' }}>Planning</option>
                    </select>
                </div>
                <a href="{{ route('projects.index') }}" class="p-2.5 text-slate-400 hover:text-slate-700 bg-pln-surface rounded-xl hover:bg-pln-surface-muted transition" title="Reset Filter">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </a>
            </div>
        </form>
    </div>

    <!-- Section Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
            <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Portofolio Proyek Konstruksi</h3>
            <p class="text-xs text-slate-500">Menampilkan {{ $projects->total() }} proyek terdaftar</p>
        </div>
        <div class="flex items-center gap-2.5">
            <a href="{{ route('reports.export-csv') }}" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-pln-surface-muted border border-pln-surface-strong transition">
                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                Export CSV
            </a>
            <a href="{{ route('projects.create') }}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-pln-cyan hover:bg-sky-600 shadow-sm transition">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                Tambah Proyek
            </a>
        </div>
    </div>

    <!-- Projects Card Grid -->
    @forelse($projects as $p)
    <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln overflow-hidden                   
           hover:shadow-pln-hover transition-all duration-200">
        <div class="p-5 sm:p-6">
            <!-- Top row: kode + badge + actions -->
            <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-[11px] font-bold text-pln-cyan bg-pln-lightcyan px-2 py-1 rounded-lg">{{ $p->kode }}</span>
                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border {{ $p->status_badge_class }}">
                        {{ $p->status }}
                    </span>
                </div>
                <a href="{{ route('projects.show', $p->id) }}" class="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-pln-navy bg-pln-surface hover:bg-pln-cyan hover:text-white rounded-xl transition" title="Lihat detail">
                    Detail
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                </a>
            </div>

            <!-- Title + location -->
            <a href="{{ route('projects.show', $p->id) }}" class="block font-extrabold text-pln-navy hover:text-pln-cyan transition text-sm sm:text-base leading-snug">
                {{ $p->nama }}
            </a>
            <div class="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-400"></i>
                {{ $p->lokasi }}
            </div>

            <!-- Meta chips: tipe, tegangan, uip -->
            <div class="flex items-center gap-2 flex-wrap mt-3 text-[11px] text-slate-600">
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pln-surface font-semibold">
                    <i data-lucide="hard-hat" class="w-3 h-3 text-pln-cyan"></i>{{ $p->tipe }}
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pln-surface font-semibold">
                    <i data-lucide="zap" class="w-3 h-3 text-amber-500"></i>{{ $p->tegangan }}
                </span>
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-pln-surface font-semibold">
                    <i data-lucide="building-2" class="w-3 h-3 text-slate-400"></i>{{ explode('(', $p->uip)[0] }}
                </span>
            </div>

            <!-- Footer stats -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 pt-4 border-t border-dashed border-pln-surface-strong">
                <!-- Progres -->
                <div>
                    <div class="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Progres Realisasi</div>
                    <div class="flex justify-between items-baseline mb-1.5">
                        <span class="text-lg font-extrabold text-pln-navy">{{ $p->progres_realisasi }}%</span>
                        <span class="text-[11px] text-slate-400">Ren: {{ $p->progres_rencana }}%</span>
                    </div>
                    <div class="w-full bg-pln-surface-muted h-2 rounded-full overflow-hidden">
                        <div class="h-full rounded-full {{ $p->status === 'Critical' ? 'bg-red-500' : ($p->status === 'COD / Energized' ? 'bg-emerald-500' : 'bg-pln-cyan') }}"
                             style="width: {{ $p->progres_realisasi }}%;"></div>
                    </div>
                </div>

                <!-- Deviasi -->
                <div>
                    <div class="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Deviasi</div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-lg font-extrabold {{ $p->deviasi < 0 ? 'text-red-600' : 'text-emerald-600' }}">
                            {{ $p->deviasi > 0 ? '+' : '' }}{{ $p->deviasi }}%
                        </span>
                        @if($p->deviasi < 0)
                            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg">
                                <i data-lucide="trending-down" class="w-3 h-3"></i>Terlambat
                            </span>
                        @else
                            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                <i data-lucide="trending-up" class="w-3 h-3"></i>On Track
                            </span>
                        @endif
                    </div>
                </div>

                <!-- Kontraktor & Nilai -->
                <div>
                    <div class="text-[11px] font-bold text-slate-500 uppercase mb-1.5">Kontraktor & Nilai</div>
                    <div class="text-xs font-semibold text-slate-700 line-clamp-1" title="{{ $p->kontraktor }}">{{ $p->kontraktor }}</div>
                    <div class="text-sm font-extrabold text-amber-600">{{ $p->nilai_milyar }}</div>
                </div>
            </div>

            <!-- COD & action row -->
            <div class="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t                
                border-pln-surface-strong">
                <div class="flex items-center gap-4 text-[11px] text-slate-500">
                    <span class="inline-flex items-center gap-1">
                        <i data-lucide="flag" class="w-3.5 h-3.5 text-pln-cyan"></i>
                        COD: {{ $p->target_cod ? $p->target_cod->format('d M Y') : '-' }}
                    </span>
                    <span class="inline-flex items-center gap-1">
                        <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
                        Mulai: {{ $p->tgl_mulai ? $p->tgl_mulai->format('d/m/y') : '-' }}
                    </span>
                </div>
                <a href="{{ route('progress.create', $p->id) }}" class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-pln-cyan bg-pln-lightcyan hover:bg-pln-cyan hover:text-white transition">
                    <i data-lucide="trending-up" class="w-3.5 h-3.5"></i>
                    Update Progres
                </a>
            </div>
        </div>
    </div>
    @empty
    <div class="bg-white rounded-xl border border-dashed border-pln-surface-strong shadow-pln py-16 text-center">
        <i data-lucide="inbox" class="w-12 h-12 mx-auto text-slate-300 mb-3"></i>
        <div class="font-bold text-slate-600">Tidak ada proyek yang sesuai dengan filter</div>
        <div class="text-xs mt-1 text-slate-400">Coba sesuaikan kata kunci pencarian atau reset filter.</div>
        <a href="{{ route('projects.index') }}" class="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold text-pln-cyan bg-pln-lightcyan hover:bg-pln-cyan hover:text-white rounded-xl transition">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Filter
        </a>
    </div>
    @endforelse

    @if($projects->hasPages())
    <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln p-4">
        {{ $projects->links() }}
    </div>
    @endif

</div>
@endsection
