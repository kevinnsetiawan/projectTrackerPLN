@extends('layouts.app')

@section('title', 'Laporan Eksekutif')
@section('page-title', 'Pusat Laporan & Rekapitulasi')

@section('content')
<div class="space-y-6">

    <!-- Header Action Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        <!-- Cetak Portofolio -->
        <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln flex flex-col justify-between hover:shadow-pln-hover transition">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-pln-lightcyan text-pln-cyan flex items-center justify-center flex-shrink-0">
                    <i data-lucide="printer" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-base sm:text-lg font-black text-pln-navy">Cetak Laporan Rekapitulasi Portofolio</h3>
                    <p class="text-sm text-slate-500 mt-1 leading-relaxed">Hasilkan dokumen cetak resmi PDF / Print untuk seluruh proyek PLN berdasarkan filter wilayah UIP & status saat ini.</p>
                </div>
            </div>
            <div class="mt-6 pt-4 border-t border-pln-surface-strong flex items-center justify-end gap-3 flex-wrap">
                <a href="{{ route('reports.export-csv') }}" class="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-pln-surface hover:bg-pln-surface-muted transition flex items-center gap-1.5">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    Unduh CSV
                </a>
                <a href="{{ route('reports.print-portfolio') }}" target="_blank" class="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-pln-navy hover:bg-slate-800 shadow-sm transition flex items-center gap-1.5">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    Format Cetak PDF &rarr;
                </a>
            </div>
        </div>

        <!-- Ekspor Data Proyek -->
        <div class="bg-white p-5 sm:p-6 rounded-xl border border-pln-surface-strong shadow-pln flex flex-col justify-between hover:shadow-pln-hover transition">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="file-spreadsheet" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-base sm:text-lg font-black text-pln-navy">Ekspor Spreadsheet Excel (.CSV)</h3>
                    <p class="text-sm text-slate-500 mt-1 leading-relaxed">Unduh seluruh data master proyek, deviasi progres, nilai kontrak, kontraktor, dan tanggal target COD ke dalam format spreadsheet.</p>
                </div>
            </div>
            <div class="mt-6 pt-4 border-t border-pln-surface-strong flex justify-end">
                <a href="{{ route('reports.export-csv') }}" class="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition flex items-center gap-1.5">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    Download Spreadsheet (.CSV)
                </a>
            </div>
        </div>
    </div>

    <!-- Table of Individual Project Reports -->
    <div class="bg-white rounded-xl border border-pln-surface-strong shadow-pln overflow-hidden">
        <div class="p-5 sm:p-6 border-b border-pln-surface-strong flex items-center justify-between">
            <div>
                <h3 class="text-sm sm:text-base font-black text-pln-navy">Pilih Proyek untuk Dicetak Individu</h3>
                <p class="text-xs text-slate-500">Laporan individu mencakup Kurva S, Tahapan Milestone, Isu Kendala, dan Lembar Pengesahan</p>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs sm:text-sm">
                <thead class="bg-pln-surface text-slate-400 text-[11px] uppercase font-extrabold border-b border-pln-surface-strong">
                    <tr>
                        <th class="py-3.5 px-4 sm:px-6">Kode & Nama Proyek</th>
                        <th class="py-3.5 px-4">Unit Induk (UIP)</th>
                        <th class="py-3.5 px-4">Status</th>
                        <th class="py-3.5 px-4">Progres Realisasi</th>
                        <th class="py-3.5 px-4">Nilai Kontrak</th>
                        <th class="py-3.5 px-4 sm:px-6 text-right">Opsi Cetak</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-pln-surface-strong">
                    @foreach($projects as $p)
                    <tr class="hover:bg-pln-surface/60 transition">
                        <td class="py-3.5 sm:py-4 px-4 sm:px-6">
                            <div class="font-mono text-[11px] font-bold text-pln-cyan">{{ $p->kode }}</div>
                            <div class="font-bold text-pln-navy text-xs sm:text-sm mt-0.5">{{ $p->nama }}</div>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                            {{ explode('(', $p->uip)[0] }}
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 whitespace-nowrap">
                            <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border {{ $p->status_badge_class }}">
                                {{ $p->status }}
                            </span>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 whitespace-nowrap">
                            <div class="text-xs font-bold text-slate-800">{{ $p->progres_realisasi }}%</div>
                            <div class="text-[11px] font-semibold {{ $p->deviasi < 0 ? 'text-red-600' : 'text-emerald-600' }}">Dev: {{ $p->deviasi > 0 ? '+' : '' }}{{ $p->deviasi }}%</div>
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 text-xs font-bold text-amber-600 whitespace-nowrap">
                            {{ $p->nilai_milyar }}
                        </td>
                        <td class="py-3.5 sm:py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <a href="{{ route('reports.print-project', $p->id) }}" target="_blank" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-pln-navy text-white hover:bg-pln-cyan transition shadow-2xs">
                                <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                                Cetak PDF
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
