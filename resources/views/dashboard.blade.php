@extends('layouts.app')

@section('title', 'Executive Dashboard')
@section('page-title', 'Executive Dashboard & KPI')

@section('content')
<div class="space-y-6 sm:space-y-8">

    <!-- KPI Metric Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
        <!-- Total Proyek -->
        <div class="bg-white p-5 rounded-xl border border-pln-surface-strong shadow-pln hover:shadow-pln-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute top-0 left-0 right-0 h-1 bg-pln-navy"></div>
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Proyek</span>
                <div class="w-10 h-10 rounded-xl bg-pln-lightcyan flex items-center justify-center text-pln-blue group-hover:scale-105 transition">
                    <i data-lucide="layers" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="mt-4">
                <div class="text-3xl font-black text-pln-navy">{{ $totalProjects }}</div>
                <div class="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                    <span class="w-2 h-2 rounded-full bg-pln-cyan"></span>
                    <span><strong>{{ $statusCounts['In Progress'] }}</strong> Sedang Berjalan</span>
                </div>
            </div>
        </div>

        <!-- Rata-rata Progres Fisik -->
        <div class="bg-white p-5 rounded-xl border border-pln-surface-strong shadow-pln hover:shadow-pln-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute top-0 left-0 right-0 h-1 bg-pln-cyan"></div>
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Progres Fisik</span>
                <div class="w-10 h-10 rounded-xl bg-pln-lightcyan flex items-center justify-center text-pln-cyan group-hover:scale-105 transition">
                    <i data-lucide="trending-up" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="mt-4">
                <div class="text-3xl font-black text-pln-navy">{{ $avgRealisasi }}%</div>
                <div class="text-xs text-slate-500 mt-1 font-medium">
                    Target Rencana: <strong class="text-slate-700">{{ $avgRencana }}%</strong>
                </div>
            </div>
        </div>

        <!-- Deviasi Portofolio -->
        <div class="bg-white p-5 rounded-xl border border-pln-surface-strong shadow-pln hover:shadow-pln-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute top-0 left-0 right-0 h-1 {{ $avgDeviasi >= 0 ? 'bg-pln-green-500' : 'bg-pln-red-500' }}"></div>
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Deviasi Progres</span>
                <div class="w-10 h-10 rounded-xl {{ $avgDeviasi >= 0 ? 'bg-pln-green-50 text-pln-green-600' : 'bg-pln-red-50 text-pln-red-600' }} flex items-center justify-center group-hover:scale-105 transition">
                    <i data-lucide="{{ $avgDeviasi >= 0 ? 'arrow-up-right' : 'arrow-down-right' }}" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="mt-4">
                <div class="text-3xl font-black {{ $avgDeviasi >= 0 ? 'text-pln-green-600' : 'text-pln-red-600' }}">
                    {{ $avgDeviasi > 0 ? '+' : '' }}{{ $avgDeviasi }}%
                </div>
                <div class="text-xs font-bold mt-1 {{ $avgDeviasi >= 0 ? 'text-pln-green-600' : 'text-pln-red-600' }}">
                    {{ $avgDeviasi >= 0 ? 'Ahead / On Track' : 'Terlambat / Delay' }}
                </div>
            </div>
        </div>

        <!-- Total Investasi / Pagu Kontrak -->
        <div class="bg-white p-5 rounded-xl border border-pln-surface-strong shadow-pln hover:shadow-pln-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute top-0 left-0 right-0 h-1 bg-pln-yellow-500"></div>
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Investasi</span>
                <div class="w-10 h-10 rounded-xl bg-pln-yellow-50 flex items-center justify-center text-pln-yellow-700 group-hover:scale-105 transition">
                    <i data-lucide="wallet" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="mt-4">
                <div class="text-2xl font-black text-pln-navy">Rp {{ number_format($totalNilaiKontrak / 1000000000, 1, ',', '.') }} M</div>
                <div class="text-xs text-slate-500 mt-1 font-medium">Total Pagu Kontrak</div>
            </div>
        </div>

        <!-- Penyerapan Anggaran -->
        <div class="bg-white p-5 rounded-xl border border-pln-surface-strong shadow-pln hover:shadow-pln-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute top-0 left-0 right-0 h-1 bg-pln-blue-500"></div>
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Penyerapan Dana</span>
                <div class="w-10 h-10 rounded-xl bg-pln-blue-50 flex items-center justify-center text-pln-blue-600 group-hover:scale-105 transition">
                    <i data-lucide="pie-chart" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="mt-4">
                <div class="text-3xl font-black text-pln-navy">{{ $avgPenyerapanPersen }}%</div>
                <div class="text-xs text-slate-500 mt-1 font-medium">Rp {{ number_format($totalPenyerapanRp / 1000000000, 1, ',', '.') }} M terserap</div>
            </div>
        </div>

        <!-- Kendala Aktif -->
        <div class="bg-white p-5 rounded-xl border border-pln-surface-strong shadow-pln hover:shadow-pln-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden group">
            <div class="absolute top-0 left-0 right-0 h-1 bg-pln-red-500"></div>
            <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Kendala Terbuka</span>
                <div class="w-10 h-10 rounded-xl bg-pln-red-50 flex items-center justify-center text-pln-red-600 group-hover:scale-105 transition">
                    <i data-lucide="alert-octagon" class="w-5 h-5"></i>
                </div>
            </div>
            <div class="mt-4">
                <div class="text-3xl font-black text-pln-red-600">{{ $openKendalas }}</div>
                <div class="text-xs text-slate-500 mt-1 font-medium">
                    <a href="{{ route('kendala.index') }}" class="text-pln-cyan hover:underline font-bold">Tinjau Isu &rarr;</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Row: Kurva S & Status Donut -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Kurva S Portofolio (2 Columns) -->
        <div class="lg:col-span-2 bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln">
            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Kurva S Portofolio Kumulatif Konstruksi</h3>
                    <p class="text-xs text-slate-500">Perbandingan Rencana Kumulatif vs Realisasi Fisik Seluruh Proyek PLN</p>
                </div>
                <span class="px-3 py-1 bg-pln-lightcyan text-pln-blue text-xs font-bold rounded-lg border border-pln-cyan/20">
                    YTD 2024
                </span>
            </div>
            <div class="h-72 sm:h-80 relative">
                <canvas id="portfolioSCurveChart"></canvas>
            </div>
        </div>

        <!-- Status Breakdown Donut (1 Column) -->
        <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln flex flex-col justify-between">
            <div>
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy mb-1">Status Portofolio Proyek</h3>
                <p class="text-xs text-slate-500 mb-4">Sebaran tahapan status pelaksanaan proyek</p>
                <div class="h-52 sm:h-60 relative flex items-center justify-center">
                    <canvas id="statusChart"></canvas>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-pln-surface-strong text-xs">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-pln-cyan"></span>
                    <span class="text-slate-600">In Progress: <strong>{{ $statusCounts['In Progress'] }}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-pln-red-500"></span>
                    <span class="text-slate-600">Kritis/Delay: <strong>{{ $statusCounts['Critical'] }}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-pln-amber-500"></span>
                    <span class="text-slate-600">Testing: <strong>{{ $statusCounts['Testing'] }}</strong></span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-pln-green-500"></span>
                    <span class="text-slate-600">Energized: <strong>{{ $statusCounts['COD / Energized'] }}</strong></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Row: Distribusi Tipe & Unit Induk Pembangunan -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Tipe Konstruksi Bar Chart -->
        <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Sebaran Berdasarkan Tipe Konstruksi</h3>
                <span class="text-xs text-slate-400 font-medium">GI, SUTT, PLTS, SKTT</span>
            </div>
            <div class="h-60 sm:h-64 relative">
                <canvas id="typeChart"></canvas>
            </div>
        </div>

        <!-- Sebaran UIP Horizontal Bar Chart -->
        <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Sebaran per Unit Induk Pembangunan (UIP)</h3>
                <span class="text-xs text-slate-400 font-medium">Regional Se-Indonesia</span>
            </div>
            <div class="h-60 sm:h-64 relative">
                <canvas id="uipChart"></canvas>
            </div>
        </div>
    </div>

    <!-- Critical Projects Alert Section (If Any) -->
    @if($criticalProjects->count() > 0)
    <div class="bg-pln-red-50/80 border border-pln-red-200 rounded-xl p-5 sm:p-6 shadow-pln">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-pln-red-600 text-white flex items-center justify-center shadow-md">
                    <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-sm sm:text-base font-black text-pln-red-900">Perhatian Khusus: Proyek Kritis & Terlambat (Deviasi &lt; -5%)</h3>
                    <p class="text-xs text-pln-red-700">Dibutuhkan akselerasi dan mitigasi segera dari Direksi Pekerjaan</p>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full bg-pln-red-200 text-pln-red-900 font-bold text-xs">
                {{ $criticalProjects->count() }} Proyek Kritis
            </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @foreach($criticalProjects as $cp)
            <div class="bg-white p-4 rounded-xl border border-pln-red-200 shadow-xs flex flex-col justify-between hover:shadow-pln-hover transition">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-mono font-bold text-pln-blue-700 bg-pln-surface px-2 py-0.5 rounded-lg">{{ $cp->kode }}</span>
                        <span class="text-xs font-extrabold text-pln-red-600 bg-pln-red-50 border border-pln-red-200 px-2.5 py-0.5 rounded-full">Deviasi: {{ $cp->deviasi }}%</span>
                    </div>
                    <h4 class="text-sm font-bold text-pln-navy line-clamp-1">{{ $cp->nama }}</h4>
                    <p class="text-xs text-slate-500 mt-1">UIP: {{ $cp->uip }} | Kontraktor: {{ $cp->kontraktor }}</p>

                    <div class="mt-3">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="text-pln-navy font-bold">Realisasi: {{ $cp->progres_realisasi }}%</span>
                            <span class="text-slate-400 font-medium">Rencana: {{ $cp->progres_rencana }}%</span>
                        </div>
                        <div class="w-full bg-pln-surface-muted h-2 rounded-full overflow-hidden">
                            <div class="bg-pln-red-500 h-full rounded-full" style="width: {{ $cp->progres_realisasi }}%;"></div>
                        </div>
                    </div>
                </div>

                <div class="mt-4 pt-3 border-t border-pln-surface-strong flex items-center justify-between">
                    <span class="text-[11px] text-slate-500">Target COD: <strong>{{ $cp->target_cod ? $cp->target_cod->format('d M Y') : '-' }}</strong></span>
                    <a href="{{ route('projects.show', $cp->id) }}" class="text-xs font-bold text-pln-cyan hover:text-pln-blue flex items-center gap-1">
                        Tangani Kendala &rarr;
                    </a>
                </div>
            </div>
            @endforeach
        </div>
    </div>
    @endif

    <!-- Recent Projects Table -->
    <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-pln-surface-strong flex items-center justify-between flex-wrap gap-3">
            <div>
                <h3 class="text-sm sm:text-base font-extrabold text-pln-navy">Proyek Terbaru Diperbarui</h3>
                <p class="text-xs text-slate-500">Daftar progres terkini proyek konstruksi ketenagalistrikan</p>
            </div>
            <a href="{{ route('projects.index') }}" class="text-xs font-bold text-pln-cyan hover:text-pln-blue flex items-center gap-1">
                Lihat Semua Proyek ({{ $totalProjects }}) &rarr;
            </a>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
                <thead class="bg-pln-surface text-pln-blue-700 text-[11px] uppercase font-extrabold border-b border-pln-surface-strong">
                    <tr>
                        <th class="py-3.5 px-4 sm:px-6">Kode & Nama Proyek</th>
                        <th class="py-3.5 px-4">Tipe & Tegangan</th>
                        <th class="py-3.5 px-4">Unit Induk (UIP)</th>
                        <th class="py-3.5 px-4">Status</th>
                        <th class="py-3.5 px-4">Progres Fisik</th>
                        <th class="py-3.5 px-4">Deviasi</th>
                        <th class="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-pln-surface-strong">
                    @foreach($recentProjects as $p)
                    <tr class="hover:bg-pln-surface/60 transition group">
                        <td class="py-3.5 sm:py-4 px-4 sm:px-6">
                            <div class="font-mono text-[11px] font-bold text-pln-cyan">{{ $p->kode }}</div>
                            <a href="{{ route('projects.show', $p->id) }}" class="font-bold text-pln-navy hover:text-pln-cyan transition line-clamp-1">
                                {{ $p->nama }}
                            </a>
                            <div class="text-xs text-slate-400 mt-0.5">{{ $p->lokasi }}</div>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 whitespace-nowrap">
                            <span class="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-pln-surface text-slate-700">
                                {{ $p->tipe }}
                            </span>
                            <div class="text-[11px] text-slate-400 mt-0.5">{{ $p->tegangan }}</div>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {{ explode('(', $p->uip)[0] }}
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 whitespace-nowrap">
                            <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border {{ $p->status_badge_class }}">
                                {{ $p->status }}
                            </span>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4">
                            <div class="flex items-center gap-2 w-28 sm:w-32">
                                <div class="w-full bg-pln-surface-muted h-2 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full {{ $p->status === 'Critical' ? 'bg-red-500' : 'bg-pln-cyan' }}" style="width: {{ $p->progres_realisasi }}%;"></div>
                                </div>
                                <span class="text-xs font-bold text-slate-700">{{ $p->progres_realisasi }}%</span>
                            </div>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 whitespace-nowrap">
                            <span class="text-xs font-extrabold {{ $p->deviasi < 0 ? 'text-red-600' : 'text-emerald-600' }}">
                                {{ $p->deviasi > 0 ? '+' : '' }}{{ $p->deviasi }}%
                            </span>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <a href="{{ route('projects.show', $p->id) }}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-pln-navy bg-pln-surface hover:bg-pln-cyan hover:text-white rounded-xl transition shadow-2xs">
                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                Detail
                            </a>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>

</div>
@endsection

@push('scripts')
<script>
    document.addEventListener("DOMContentLoaded", function () {
        // Portfolio S-Curve Chart
        const sCtx = document.getElementById("portfolioSCurveChart");
        if (sCtx) {
            new Chart(sCtx, {
                type: "line",
                data: {
                    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
                    datasets: [
                        {
                            label: "Rencana Kumulatif (%)",
                            data: [12, 22, 35, 48, 60, 72, 81, 88, 93, 97, 99, 100],
                            borderColor: "#002B49",
                            backgroundColor: "transparent",
                            borderWidth: 2.5,
                            borderDash: [5, 5],
                            tension: 0.35,
                            pointRadius: 4,
                            pointBackgroundColor: "#002B49"
                        },
                        {
                            label: "Realisasi Kumulatif (%)",
                            data: [12, 23, 34, 46, 58, 70, 79, 83.8, null, null, null, null],
                            borderColor: "#00A3E0",
                            backgroundColor: "rgba(0, 163, 224, 0.12)",
                            fill: true,
                            borderWidth: 3.5,
                            tension: 0.35,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: "#00A3E0",
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
                            grid: { color: "rgba(0,0,0,0.04)" }
                        },
                        x: { grid: { display: false } }
                    },
                    plugins: {
                        legend: { position: "top", labels: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } }
                    }
                }
            });
        }

        // Status Doughnut Chart
        const stCtx = document.getElementById("statusChart");
        if (stCtx) {
            new Chart(stCtx, {
                type: "doughnut",
                data: {
                    labels: ["In Progress", "Kritis / Delay", "Testing", "Energized", "Planning"],
                    datasets: [{
                        data: [
                            {{ $statusCounts['In Progress'] }},
                            {{ $statusCounts['Critical'] }},
                            {{ $statusCounts['Testing'] }},
                            {{ $statusCounts['COD / Energized'] }},
                            {{ $statusCounts['Planning'] }}
                        ],
                        backgroundColor: ["#00A3E0", "#EF4444", "#F59E0B", "#10B981", "#002B49"],
                        borderWidth: 2,
                        borderColor: "#ffffff"
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "70%",
                    plugins: { legend: { display: false } }
                }
            });
        }

        // Type Bar Chart
        const tpCtx = document.getElementById("typeChart");
        if (tpCtx) {
            new Chart(tpCtx, {
                type: "bar",
                data: {
                    labels: {!! json_encode(array_map(fn($t) => str_replace([' (Transmisi)', ' (Ekstra Tinggi)'], '', $t), array_keys($tipeCounts))) !!},
                    datasets: [{
                        label: "Jumlah Proyek",
                        data: {!! json_encode(array_values($tipeCounts)) !!},
                        backgroundColor: "#002B49",
                        hoverBackgroundColor: "#00A3E0",
                        borderRadius: 8,
                        barThickness: 22
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(0,0,0,0.04)" } },
                        x: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // UIP Bar Chart
        const uipCtx = document.getElementById("uipChart");
        if (uipCtx) {
            new Chart(uipCtx, {
                type: "bar",
                data: {
                    labels: {!! json_encode(array_map(fn($u) => trim(explode('(', $u)[0]), array_keys($uipCounts))) !!},
                    datasets: [{
                        label: "Jumlah Proyek",
                        data: {!! json_encode(array_values($uipCounts)) !!},
                        backgroundColor: "#FFCC00",
                        hoverBackgroundColor: "#00A3E0",
                        borderRadius: 8,
                        barThickness: 16
                    }]
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(0,0,0,0.04)" } },
                        y: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    });
</script>
@endpush
