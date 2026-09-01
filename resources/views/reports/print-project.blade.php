<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Progres Proyek - {{ $project->kode }}</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            padding: 32px;
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #002B49;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .logo-pln {
            font-size: 26px;
            font-weight: 900;
            color: #002B49;
            letter-spacing: 1px;
        }
        .logo-tag {
            font-size: 12px;
            color: #00A3E0;
            font-weight: 700;
        }
        .report-title {
            font-size: 18px;
            font-weight: 800;
            color: #002B49;
            margin: 0 0 4px 0;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 20px 0;
        }
        .stat-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            background: #f8fafc;
        }
        .stat-card .val {
            font-size: 22px;
            font-weight: 800;
            color: #002B49;
        }
        .stat-card .lbl {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-top: 4px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
            font-size: 13px;
        }
        .info-item span {
            display: block;
            font-size: 10px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
        }
        .info-item strong {
            font-size: 13px;
            color: #0f172a;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            font-size: 12px;
        }
        th {
            background: #002B49;
            color: #ffffff;
            padding: 9px 8px;
            border: 1px solid #002B49;
            text-align: left;
        }
        td {
            padding: 8px;
            border: 1px solid #cbd5e1;
        }
        h3 {
            font-size: 15px;
            color: #002B49;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 24px;
            margin-bottom: 12px;
        }
        .footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            text-align: center;
        }
        .sig-box {
            width: 220px;
        }
        .sig-space {
            height: 70px;
        }
        .btn-print {
            background: #00A3E0;
            color: #fff;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>

    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" class="btn-print">Cetak / Simpan PDF</button>
    </div>

    <!-- Header -->
    <div class="header">
        <div>
            <div class="logo-pln">PT PLN (PERSERO)</div>
            <div class="logo-tag">Sistem Informasi Pemantauan Proyek Konstruksi (PLN Pro-Track)</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b;">Tanggal Cetak: {{ date('d F Y') }}</div>
            <div style="font-weight: 700; color: #002B49; margin-top: 4px;">{{ $project->uip }}</div>
        </div>
    </div>

    <h2 class="report-title">{{ $project->nama }}</h2>
    <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">
        Kode: <strong>{{ $project->kode }}</strong> | Nomor Kontrak: <strong>{{ $project->nomor_kontrak ?? '-' }}</strong> | Status: <strong>{{ $project->status }}</strong>
    </div>

    <!-- Stats -->
    <div class="stat-grid">
        <div class="stat-card">
            <div class="val">{{ $project->progres_rencana }}%</div>
            <div class="lbl">Rencana Fisik</div>
        </div>
        <div class="stat-card">
            <div class="val" style="color: #00A3E0;">{{ $project->progres_realisasi }}%</div>
            <div class="lbl">Realisasi Fisik</div>
        </div>
        <div class="stat-card">
            <div class="val" style="color: {{ $project->deviasi < 0 ? '#ef4444' : '#10b981' }};">
                {{ $project->deviasi > 0 ? '+' : '' }}{{ $project->deviasi }}%
            </div>
            <div class="lbl">Deviasi Jadwal</div>
        </div>
        <div class="stat-card">
            <div class="val" style="color: #d97706;">{{ $project->penyerapan_anggaran }}%</div>
            <div class="lbl">Penyerapan Dana</div>
        </div>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">
        <div class="info-item">
            <span>Tipe & Tegangan</span>
            <strong>{{ $project->tipe }} - {{ $project->tegangan }}</strong>
        </div>
        <div class="info-item">
            <span>Pelaksana / Kontraktor</span>
            <strong>{{ $project->kontraktor }}</strong>
        </div>
        <div class="info-item">
            <span>Nilai Kontrak (Pagu)</span>
            <strong>{{ $project->formatted_nilai_kontrak }}</strong>
        </div>
        <div class="info-item">
            <span>Target COD (Energize)</span>
            <strong>{{ $project->target_cod ? $project->target_cod->format('d F Y') : '-' }}</strong>
        </div>
        <div class="info-item" style="grid-column: span 2;">
            <span>Lokasi Proyek & UPP</span>
            <strong>{{ $project->lokasi }} ({{ $project->upp }})</strong>
        </div>
    </div>

    <!-- Milestones Table -->
    <h3>Tahapan Utama Pekerjaan (Milestones)</h3>
    <table>
        <thead>
            <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>Deskripsi Tahapan Konstruksi</th>
                <th style="width: 70px; text-align: center;">Bobot</th>
                <th style="width: 70px; text-align: center;">Rencana</th>
                <th style="width: 70px; text-align: center;">Realisasi</th>
                <th style="width: 90px; text-align: center;">Status</th>
            </tr>
        </thead>
        <tbody>
            @forelse($project->milestones as $m)
            <tr>
                <td style="text-align: center;">{{ $loop->iteration }}</td>
                <td><strong>{{ $m->nama }}</strong></td>
                <td style="text-align: center;">{{ $m->bobot }}%</td>
                <td style="text-align: center;">{{ $m->rencana }}%</td>
                <td style="text-align: center;"><strong>{{ $m->realisasi }}%</strong></td>
                <td style="text-align: center;">{{ $m->status }}</td>
            </tr>
            @empty
            <tr><td colspan="6" style="text-align: center; color: #64748b;">Belum ada milestone.</td></tr>
            @endforelse
        </tbody>
    </table>

    <!-- Issues List -->
    <h3>Rekapitulasi Kendala & Mitigasi Lapangan</h3>
    @forelse($project->kendalas as $k)
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px 14px; margin-bottom: 10px; border-radius: 4px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #991b1b;">[{{ $k->kategori }}] - Status: {{ $k->status }}</strong>
            <span style="color: #64748b;">Tgl: {{ $k->tgl_lapor ? $k->tgl_lapor->format('d/m/Y') : '-' }}</span>
        </div>
        <p style="margin: 3px 0;"><strong>Kendala:</strong> {{ $k->deskripsi }}</p>
        <p style="margin: 3px 0; color: #065f46;"><strong>Tindakan Mitigasi:</strong> {{ $k->tindakan_mitigasi ?? '-' }}</p>
    </div>
    @empty
    <p style="color: #64748b; font-style: italic; font-size: 12px;">Tidak ada kendala aktif yang dilaporkan.</p>
    @endforelse

    <!-- Signature Footer -->
    <div class="footer">
        <div class="sig-box">
            <div>Disiapkan Oleh,</div>
            <div style="font-weight: 700; margin-top: 4px;">Direksi Pekerjaan / Pengawas Lapangan</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
        </div>
        <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight: 700; margin-top: 4px;">Manager UPP / Senior Manager UIP</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
        </div>
    </div>

</body>
</html>
