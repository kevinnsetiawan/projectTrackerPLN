@extends('layouts.app')

@section('title', $project->kode . ' - ' . $project->nama)
@section('page-title', 'Detail Proyek Konstruksi')

@section('content')
<div class="space-y-6">

    <!-- Top Project Header Card -->
    <div class="bg-white rounded-xl border border-pln-surface-strong p-5 sm:p-7 shadow-pln overflow-hidden">
        <!-- Top bar: kode/status kiri Â· aksi kanan -->
        <div class="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-wrap">
                <span class="font-mono text-xs font-black bg-pln-navy text-white px-3 py-1.5 rounded-lg shadow-xs">
                    {{ $project->kode }}
                </span>
                <span class="text-xs font-semibold px-2.5 py-1 bg-pln-lightcyan text-pln-blue-700 rounded-lg">
                    {{ $project->tipe }} â€¢ {{ $project->tegangan }}
                </span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border {{ $project->status_badge_class }}">
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ $project->status }}
                </span>
                <span class="text-xs text-slate-300">|</span>
                <a href="{{ route('progress.create', $project->id) }}" class="inline-flex items-center gap-1.5 bg-pln-cyan hover:bg-pln-cyan-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm transition">
                    <i data-lucide="trending-up" class="w-4 h-4"></i>
                    Input Progres
                </a>
                <a href="{{ route('reports.print-project', $project->id) }}" target="_blank" class="inline-flex items-center gap-1.5 bg-pln-surface hover:bg-pln-surface-muted text-pln-blue-800 text-xs font-bold px-3.5 py-2 rounded-lg transition">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    Cetak
                </a>
                <a href="{{ route('projects.edit', $project->id) }}" class="inline-flex items-center gap-1.5 bg-pln-surface hover:bg-pln-surface-muted text-pln-blue-800 text-xs font-bold px-3.5 py-2 rounded-lg transition">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                    Edit
                </a>
            </div>
        </div>

        <!-- Nama proyek -->
        <h2 class="mt-5 text-lg sm:text-2xl font-black text-pln-navy leading-snug">{{ $project->nama }}</h2>

        <!-- Meta strip -->
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="flex items-start gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-pln-lightcyan flex items-center justify-center flex-shrink-0">
                    <i data-lucide="map-pin" class="w-4 h-4 text-pln-cyan"></i>
                </div>
                <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Lokasi</div>
                    <div class="text-xs sm:text-sm font-semibold text-slate-700 truncate">{{ $project->lokasi }}</div>
                </div>
            </div>
            <div class="flex items-start gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-pln-lightcyan flex items-center justify-center flex-shrink-0">
                    <i data-lucide="network" class="w-4 h-4 text-pln-cyan"></i>
                </div>
                <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">UIP / UPP</div>
                    <div class="text-xs sm:text-sm font-semibold text-slate-700 truncate">{{ $project->uip }} â€” {{ $project->upp }}</div>
                </div>
            </div>
            <div class="flex items-start gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-pln-lightcyan flex items-center justify-center flex-shrink-0">
                    <i data-lucide="hard-hat" class="w-4 h-4 text-pln-cyan"></i>
                </div>
                <div class="min-w-0">
                    <div class="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Kontraktor</div>
                    <div class="text-xs sm:text-sm font-semibold text-slate-700 truncate">{{ $project->kontraktor }}</div>
                </div>
            </div>
        </div>

        <!-- 4 Quick KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-pln-surface-strong">
            <div class="bg-pln-surface p-3.5 sm:p-4 rounded-xl border border-pln-surface-strong">
                <div class="text-[10px] sm:text-[11px] font-extrabold text-pln-blue-700 uppercase tracking-wider">Rencana Kumulatif</div>
                <div class="text-xl sm:text-2xl font-black text-pln-navy mt-1">{{ $project->progres_rencana }}%</div>
            </div>
            <div class="bg-pln-surface p-3.5 sm:p-4 rounded-xl border border-pln-surface-strong">
                <div class="text-[10px] sm:text-[11px] font-extrabold text-pln-blue-700 uppercase tracking-wider">Realisasi Fisik</div>
                <div class="text-xl sm:text-2xl font-black text-pln-cyan mt-1">{{ $project->progres_realisasi }}%</div>
            </div>
            <div class="bg-pln-surface p-3.5 sm:p-4 rounded-xl border border-pln-surface-strong">
                <div class="text-[10px] sm:text-[11px] font-extrabold text-pln-blue-700 uppercase tracking-wider">Deviasi Jadwal</div>
                <div class="text-xl sm:text-2xl font-black mt-1 {{ $project->deviasi < 0 ? 'text-pln-red-600' : 'text-pln-green-600' }}">
                    {{ $project->deviasi > 0 ? '+' : '' }}{{ $project->deviasi }}%
                </div>
            </div>
            <div class="bg-pln-surface p-3.5 sm:p-4 rounded-xl border border-pln-surface-strong">
                <div class="text-[10px] sm:text-[11px] font-extrabold text-pln-blue-700 uppercase tracking-wider">Penyerapan Anggaran</div>
                <div class="text-xl sm:text-2xl font-black text-pln-yellow-600 mt-1">{{ $project->penyerapan_anggaran }}%</div>
            </div>
        </div>
    </div>

    <!-- Navigation Tabs (Horizontal Scrollable for Mobile) -->
    <div class="border-b border-pln-surface-strong overflow-x-auto">
        <nav class="flex space-x-6 text-xs sm:text-sm font-bold min-w-max" id="projectTabs">
            <button onclick="switchTab('kurvas')" id="tabBtn-kurvas" class="tab-btn pb-3.5 border-b-2 border-pln-cyan text-pln-cyan flex items-center gap-2">
                <i data-lucide="line-chart" class="w-4 h-4"></i>
                Kurva S & Milestones
            </button>
            <button onclick="switchTab('kendala')" id="tabBtn-kendala" class="tab-btn pb-3.5 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
                <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                Kendala & Mitigasi ({{ $project->kendalas->count() }})
            </button>
            <button onclick="switchTab('dokumentasi')" id="tabBtn-dokumentasi" class="tab-btn pb-3.5 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
                <i data-lucide="camera" class="w-4 h-4"></i>
                Dokumentasi Lapangan ({{ $project->dokumentasis->count() }})
            </button>
            <button onclick="switchTab('informasi')" id="tabBtn-informasi" class="tab-btn pb-3.5 border-b-2 border-transparent text-slate-500 hover:text-slate-700 flex items-center gap-2">
                <i data-lucide="info" class="w-4 h-4"></i>
                Info Kontrak & Teknis
            </button>
        </nav>
    </div>

    <!-- TAB 1: KURVA S & MILESTONES -->
    <div id="tabContent-kurvas" class="space-y-6">
        <!-- Kurva S Chart -->
        <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Kurva S Progres Pekerjaan (Rencana vs Realisasi)</h3>
                    <p class="text-xs text-slate-500">Visualisasi deviasi fisik mingguan proyek {{ $project->kode }}</p>
                </div>
                <a href="{{ route('progress.create', $project->id) }}" class="text-xs font-bold text-pln-cyan hover:underline flex items-center gap-1">
                    + Input Titik Kurva S Baru
                </a>
            </div>
            <div class="h-72 sm:h-80 relative">
                <canvas id="detailSCurveChart"></canvas>
            </div>
        </div>

        <!-- Milestones / Tahapan Utama Pekerjaan -->
        <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln overflow-hidden">
            <div class="p-5 sm:p-6 border-b border-pln-surface-strong flex items-center justify-between">
                <div>
                    <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Tahapan & Bobot Pekerjaan Utama (Milestones)</h3>
                    <p class="text-xs text-slate-500">Rincian bobot dan capaian fisik per paket pekerjaan</p>
                </div>
                <span class="text-xs font-bold text-pln-blue-700 bg-pln-surface px-3 py-1 rounded-lg">
                    Total Bobot: 100%
                </span>
            </div>

            <div class="divide-y divide-pln-surface-strong">
                @forelse($project->milestones as $m)
                <div class="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 hover:bg-pln-surface/60 transition">
                    <div class="space-y-1 md:w-1/3">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-full bg-pln-lightcyan text-pln-blue-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {{ $m->urutan ?? $loop->iteration }}
                            </span>
                            <h4 class="text-xs sm:text-sm font-bold text-pln-navy">{{ $m->nama }}</h4>
                        </div>
                        <div class="text-[11px] text-slate-500 ml-8">Bobot: <strong class="text-pln-blue-800">{{ $m->bobot }}%</strong></div>
                    </div>

                    <div class="md:w-1/3">
                        <div class="flex justify-between text-xs font-bold mb-1.5">
                            <span class="text-pln-navy">Realisasi: {{ $m->realisasi }}%</span>
                            <span class="text-slate-400">Rencana: {{ $m->rencana }}%</span>
                        </div>
                        <div class="w-full bg-pln-surface-muted h-2.5 rounded-full overflow-hidden">
                            <div class="h-full rounded-full {{ $m->status === 'Done' ? 'bg-pln-green-500' : 'bg-pln-cyan' }}" style="width: {{ $m->realisasi }}%;"></div>
                        </div>
                    </div>

                    <div class="md:w-1/4 flex items-center md:justify-end">
                        <span class="px-3 py-0.5 rounded-full text-xs font-bold {{ $m->status === 'Done' ? 'bg-pln-green-100 text-pln-green-800' : ($m->status === 'In Progress' ? 'bg-pln-cyan-100 text-pln-cyan-800' : 'bg-pln-surface text-pln-blue-700') }}">
                            {{ $m->status }}
                        </span>
                    </div>
                </div>
                @empty
                <div class="p-8 text-center text-slate-400 text-xs">Belum ada milestone yang tercatat.</div>
                @endforelse
            </div>
        </div>
    </div>

    <!-- TAB 2: KENDALA & MITIGASI -->
    <div id="tabContent-kendala" class="hidden space-y-6">
        <div class="bg-white rounded-xl border border-pln-surface-strong p-5 sm:p-6 shadow-pln">
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Pencatatan Isu & Kendala Lapangan</h3>
                    <p class="text-xs text-slate-500">Monitoring risiko perizinan, lahan, cuaca, utilitas, dan kontraktor</p>
                </div>
                <button onclick="document.getElementById('modalKendala').classList.remove('hidden')" class="inline-flex items-center gap-1.5 bg-pln-red-600 hover:bg-pln-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    Lapor Kendala
                </button>
            </div>

            <div class="space-y-4">
                @forelse($project->kendalas as $k)
                <div class="p-4 sm:p-5 rounded-xl border {{ $k->status === 'Open' ? 'border-pln-red-200 bg-pln-red-50/40' : ($k->status === 'In Review' ? 'border-pln-amber-200 bg-pln-amber-50/40' : 'border-pln-surface-strong bg-pln-surface/60') }}">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-mono text-[11px] font-bold text-pln-blue-700 bg-white px-2 py-0.5 rounded border border-pln-surface-strong">{{ $k->kode_kendala ?? 'K-00' }}</span>
                            <span class="text-xs font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-pln-surface-strong">{{ $k->kategori }}</span>
                            <span class="text-[11px] text-slate-400">Tgl Lapor: {{ $k->tgl_lapor ? $k->tgl_lapor->format('d M Y') : '-' }}</span>
                        </div>
                        <form method="POST" action="{{ route('kendala.update-status', $k->id) }}" class="flex items-center gap-2">
                            @csrf
                            @method('PATCH')
                            <select name="status" onchange="this.form.submit()" class="text-xs font-bold px-3 py-1.5 rounded-xl border bg-white cursor-pointer shadow-xs {{ $k->status === 'Resolved' ? 'text-pln-green-700 border-pln-green-300' : ($k->status === 'In Review' ? 'text-pln-amber-700 border-pln-amber-300' : 'text-pln-red-700 border-pln-red-300') }}">
                                <option value="Open" {{ $k->status === 'Open' ? 'selected' : '' }}>Open</option>
                                <option value="In Review" {{ $k->status === 'In Review' ? 'selected' : '' }}>In Review</option>
                                <option value="Resolved" {{ $k->status === 'Resolved' ? 'selected' : '' }}>Resolved</option>
                            </select>
                        </form>
                    </div>

                    <div class="mt-3 space-y-1.5 text-xs">
                        <div><strong class="text-pln-navy">Deskripsi:</strong> <span class="text-slate-700">{{ $k->deskripsi }}</span></div>
                        <div><strong class="text-pln-navy">Dampak:</strong> <span class="text-slate-600">{{ $k->dampak ?? '-' }}</span></div>
                        <div class="text-pln-green-900 bg-pln-green-50/80 p-3 rounded-xl mt-2 border border-pln-green-200">
                            <strong>Tindakan Mitigasi:</strong> {{ $k->tindakan_mitigasi ?? 'Belum ada rencana tindak lanjut' }}
                        </div>
                    </div>
                </div>
                @empty
                <div class="py-12 text-center text-slate-400 text-xs">
                    <i data-lucide="check-circle" class="w-10 h-10 text-pln-green-500 mx-auto mb-2"></i>
                    <div class="font-bold text-slate-700 text-sm">Tidak Ada Kendala Lapangan</div>
                    <div>Proyek berjalan lancar tanpa ada kendala aktif saat ini.</div>
                </div>
                @endforelse
            </div>
        </div>
    </div>

    <!-- TAB 3: DOKUMENTASI FOTO -->
    <div id="tabContent-dokumentasi" class="hidden space-y-6">
        <div class="bg-white rounded-xl border border-pln-surface-strong p-5 sm:p-6 shadow-pln">
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Galeri Dokumentasi Foto Fisik Lapangan</h3>
                    <p class="text-xs text-slate-500">Bukti visual progres konstruksi di lapangan</p>
                </div>
                <button onclick="document.getElementById('modalDokumentasi').classList.remove('hidden')" class="inline-flex items-center gap-1.5 bg-pln-cyan hover:bg-sky-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs">
                    <i data-lucide="upload" class="w-4 h-4"></i>
                    Unggah Foto
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                @forelse($project->dokumentasis as $doc)
                <div class="group bg-pln-surface rounded-xl border border-pln-surface-strong overflow-hidden shadow-xs hover:shadow-pln-hover transition flex flex-col justify-between">
                    <div class="relative h-48 overflow-hidden bg-pln-surface-muted">
                        <img src="{{ $doc->foto }}" alt="{{ $doc->judul }}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                        <span class="absolute top-3 right-3 px-2.5 py-0.5 bg-pln-navy/80 backdrop-blur-md text-white text-[10px] font-bold rounded-lg">
                            {{ $doc->tahap }}
                        </span>
                    </div>
                    <div class="p-4">
                        <h4 class="text-xs sm:text-sm font-bold text-pln-navy line-clamp-2">{{ $doc->judul }}</h4>
                        <div class="text-xs text-slate-400 mt-2 flex items-center justify-between">
                            <span class="flex items-center gap-1">
                                <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
                                {{ $doc->tgl ? $doc->tgl->format('d M Y') : '-' }}
                            </span>
                        </div>
                    </div>
                </div>
                @empty
                <div class="col-span-3 py-12 text-center text-slate-400 text-xs">
                    <i data-lucide="image" class="w-10 h-10 text-slate-300 mx-auto mb-2"></i>
                    <div class="font-bold text-slate-700 text-sm">Belum Ada Dokumentasi Foto</div>
                    <div>Klik tombol di atas untuk mengunggah foto progres konstruksi.</div>
                </div>
                @endforelse
            </div>
        </div>
    </div>

    <!-- TAB 4: INFO KONTRAK & TEKNIS -->
    <div id="tabContent-informasi" class="hidden space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Kontrak & Finansial -->
            <div class="bg-white rounded-xl border border-pln-surface-strong p-5 sm:p-6 shadow-pln space-y-4">
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy border-b border-pln-surface-strong pb-3">Data Kontrak & Finansial</h3>
                <div class="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Nomor Kontrak</span>
                        <strong class="text-slate-800 text-xs sm:text-sm">{{ $project->nomor_kontrak ?? '-' }}</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Nilai Kontrak (Pagu)</span>
                        <strong class="text-pln-yellow-600 text-xs sm:text-sm">{{ $project->formatted_nilai_kontrak }}</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Kontraktor Pelaksana</span>
                        <strong class="text-slate-800 text-xs sm:text-sm">{{ $project->kontraktor }}</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Penyerapan Anggaran</span>
                        <strong class="text-slate-800 text-xs sm:text-sm">{{ $project->penyerapan_anggaran }}%</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Tanggal Mulai</span>
                        <strong class="text-slate-800 text-xs sm:text-sm">{{ $project->tgl_mulai ? $project->tgl_mulai->format('d F Y') : '-' }}</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Target COD</span>
                        <strong class="text-pln-cyan text-xs sm:text-sm">{{ $project->target_cod ? $project->target_cod->format('d F Y') : '-' }}</strong>
                    </div>
                </div>
            </div>

            <!-- Teknis & Deskripsi Proyek -->
            <div class="bg-white rounded-xl border border-pln-surface-strong p-5 sm:p-6 shadow-pln space-y-4">
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy border-b border-pln-surface-strong pb-3">Informasi Teknis & Lokasi</h3>
                <div class="space-y-3 text-xs">
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Unit Induk & UPP</span>
                        <strong class="text-slate-800 text-xs sm:text-sm">{{ $project->uip }} â€” {{ $project->upp }}</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Koordinat Geografis (GPS)</span>
                        <strong class="font-mono text-pln-blue-700 text-xs sm:text-sm">{{ $project->latitude }}, {{ $project->longitude }}</strong>
                    </div>
                    <div>
                        <span class="text-pln-blue-700 font-extrabold uppercase block text-[10px]">Deskripsi Proyek</span>
                        <p class="text-slate-600 leading-relaxed mt-1">{{ $project->deskripsi ?? 'Tidak ada deskripsi rinci.' }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- MODAL LAPOR KENDALA -->
<div id="modalKendala" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
    <div class="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-pln-surface-strong">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Laporkan Kendala Lapangan</h3>
            <button onclick="document.getElementById('modalKendala').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <form method="POST" action="{{ route('kendala.store', $project->id) }}" class="space-y-4 text-xs">
            @csrf
            <div>
                <label class="block font-bold text-slate-700 mb-1">Kategori Kendala</label>
                <select name="kategori" required class="w-full px-3 py-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                    <option value="Lahan / Sosial">Lahan / Sosial</option>
                    <option value="Cuaca & Geoteknik">Cuaca & Geoteknik</option>
                    <option value="Material">Material & Supply Chain</option>
                    <option value="Vendor / Manpower">Vendor / Manpower</option>
                    <option value="Teknis / Utilitas">Teknis / Utilitas</option>
                    <option value="Regulasi / Perizinan">Regulasi / Perizinan</option>
                </select>
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Deskripsi Isu Lapangan</label>
                <textarea name="deskripsi" rows="3" required placeholder="Jelaskan kendala secara spesifik..." class="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan"></textarea>
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Dampak Terhadap Pekerjaan</label>
                <input type="text" name="dampak" placeholder="Contoh: Pekerjaan pondasi tertunda 2 minggu" class="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Rencana Tindakan Mitigasi</label>
                <textarea name="tindakan_mitigasi" rows="2" placeholder="Langkah mitigasi penyelesaian kendala..." class="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan"></textarea>
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Status Kendala</label>
                <select name="status" class="w-full px-3 py-2.5 border rounded-xl bg-white outline-none">
                    <option value="Open">Open</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-pln-surface-strong">
                <button type="button" onclick="document.getElementById('modalKendala').classList.add('hidden')" class="px-4 py-2 bg-pln-surface rounded-xl font-bold text-slate-600">Batal</button>
                <button type="submit" class="px-4 py-2 bg-pln-red-600 text-white rounded-xl font-bold hover:bg-pln-red-700 shadow-sm">Simpan Kendala</button>
            </div>
        </form>
    </div>
</div>

<!-- MODAL UNGGAH DOKUMENTASI -->
<div id="modalDokumentasi" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
    <div class="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-pln-surface-strong">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Unggah Foto Dokumentasi Lapangan</h3>
            <button onclick="document.getElementById('modalDokumentasi').classList.add('hidden')" class="text-slate-400 hover:text-slate-600 p-1">
                <i data-lucide="x" class="w-5 h-5"></i>
            </button>
        </div>
        <form method="POST" action="{{ route('dokumentasi.store', $project->id) }}" enctype="multipart/form-data" class="space-y-4 text-xs">
            @csrf
            <div>
                <label class="block font-bold text-slate-700 mb-1">Judul / Aktivitas Foto</label>
                <input type="text" name="judul" required placeholder="Contoh: Pemasangan Disconnecting Switch Bay 150kV" class="w-full px-3 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-pln-cyan">
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Tahap Konstruksi</label>
                <select name="tahap" required class="w-full px-3 py-2.5 border rounded-xl bg-white outline-none focus:ring-2 focus:ring-pln-cyan">
                    <option value="Sipil & Pondasi">Sipil & Pondasi</option>
                    <option value="Erection Tower / Struktur">Erection Tower / Struktur</option>
                    <option value="Elektromekanikal">Elektromekanikal</option>
                    <option value="Stringing / Penarikan Kabel">Stringing / Penarikan Kabel</option>
                    <option value="Testing & Commissioning">Testing & Commissioning</option>
                    <option value="Energize COD">Energize COD</option>
                </select>
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Unggah File Foto (Opsional)</label>
                <input type="file" name="foto_file" accept="image/*" class="w-full px-3 py-2 border rounded-xl outline-none">
            </div>
            <div>
                <label class="block font-bold text-slate-700 mb-1">Atau URL Foto (Opsional)</label>
                <input type="url" name="foto_url" placeholder="https://..." class="w-full px-3 py-2.5 border rounded-xl outline-none">
            </div>
            <div class="flex justify-end gap-2 pt-3 border-t border-pln-surface-strong">
                <button type="button" onclick="document.getElementById('modalDokumentasi').classList.add('hidden')" class="px-4 py-2 bg-pln-surface rounded-xl font-bold text-slate-600">Batal</button>
                <button type="submit" class="px-4 py-2 bg-pln-cyan text-white rounded-xl font-bold hover:bg-sky-600 shadow-sm">Unggah Dokumentasi</button>
            </div>
        </form>
    </div>
</div>
@endsection

@push('scripts')
<script>
    function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-pln-cyan', 'text-pln-cyan');
            btn.classList.add('border-transparent', 'text-slate-500');
        });
        document.getElementById('tabBtn-' + tabId).classList.add('border-pln-cyan', 'text-pln-cyan');
        document.getElementById('tabBtn-' + tabId).classList.remove('border-transparent', 'text-slate-500');

        ['kurvas', 'kendala', 'dokumentasi', 'informasi'].forEach(id => {
            document.getElementById('tabContent-' + id).classList.add('hidden');
        });
        document.getElementById('tabContent-' + tabId).classList.remove('hidden');
    }

    document.addEventListener("DOMContentLoaded", function () {
        const ctx = document.getElementById("detailSCurveChart");
        if (ctx) {
            new Chart(ctx, {
                type: "line",
                data: {
                    labels: {!! json_encode($scurveLabels) !!},
                    datasets: [
                        {
                            label: "Rencana (%)",
                            data: {!! json_encode($scurveRencana) !!},
                            borderColor: "#002B49",
                            backgroundColor: "transparent",
                            borderWidth: 2.5,
                            borderDash: [6, 4],
                            tension: 0.3,
                            pointRadius: 4,
                            pointBackgroundColor: "#002B49"
                        },
                        {
                            label: "Realisasi (%)",
                            data: {!! json_encode($scurveRealisasi) !!},
                            borderColor: "{{ $project->deviasi < -5 ? '#EF4444' : '#00A3E0' }}",
                            backgroundColor: "{{ $project->deviasi < -5 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 163, 224, 0.15)' }}",
                            fill: true,
                            borderWidth: 3.5,
                            tension: 0.3,
                            pointRadius: 5,
                            pointHoverRadius: 8,
                            pointBackgroundColor: "{{ $project->deviasi < -5 ? '#EF4444' : '#00A3E0' }}",
                            pointBorderColor: "#FFFFFF",
                            pointBorderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            ticks: { callback: v => v + '%' },
                            grid: { color: "rgba(0,0,0,0.05)" }
                        },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { position: "top", labels: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } }
                    }
                }
            });
        }
    });
</script>
@endpush
