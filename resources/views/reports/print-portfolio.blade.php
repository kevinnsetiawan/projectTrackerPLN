<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laporan Rekapitulasi Portofolio Proyek Konstruksi PLN</title>
    <style>
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #1e293b;
            padding: 24px;
            max-width: 1100px;
            margin: 0 auto;
            background: #ffffff;
        }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #002B49;
            padding-bottom: 14px;
            margin-bottom: 20px;
        }
        .logo-pln {
            font-size: 24px;
            font-weight: 900;
            color: #002B49;
            letter-spacing: 1px;
        }
        .logo-tag {
            font-size: 11px;
            color: #00A3E0;
            font-weight: 700;
        }
        .report-title {
            font-size: 16px;
            font-weight: 800;
            color: #002B49;
            margin: 0 0 16px 0;
            text-transform: uppercase;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 24px;
        }
        th {
            background: #002B49;
            color: #ffffff;
            padding: 8px 6px;
            border: 1px solid #002B49;
            text-align: left;
        }
        td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .footer {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            text-align: center;
        }
        .sig-box { width: 220px; }
        .sig-space { height: 60px; }
        .btn-print {
            background: #00A3E0;
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12px;
            cursor: pointer;
        }
        @media print {
            body { padding: 0; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>

    <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" class="btn-print">Cetak / Simpan PDF</button>
    </div>

    <!-- Header -->
    <div class="header">
        <div>
            <div class="logo-pln">PT PLN (PERSERO)</div>
            <div class="logo-tag">Sistem Informasi Pemantauan Proyek Konstruksi (PLN Pro-Track)</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 11px; color: #64748b;">Tanggal Rekapitulasi: {{ date('d F Y') }}</div>
            <div style="font-size: 11px; font-weight: 700; color: #002B49;">Total Proyek: {{ count($projects) }} Paket</div>
        </div>
    </div>

    <h2 class="report-title">Rekapitulasi Progres Fisik & Finansial Proyek Konstruksi Ketenagalistrikan</h2>

    <!-- Table -->
    <table>
        <thead>
            <tr>
                <th style="width: 25px;" class="text-center">No</th>
                <th style="width: 80px;">Kode</th>
                <th>Nama Proyek & Lokasi</th>
                <th style="width: 110px;">Unit Induk (UIP)</th>
                <th style="width: 100px;">Kontraktor</th>
                <th style="width: 80px;" class="text-right">Pagu (Rp M)</th>
                <th style="width: 70px;" class="text-center">Target COD</th>
                <th style="width: 50px;" class="text-center">Ren (%)</th>
                <th style="width: 50px;" class="text-center">Real (%)</th>
                <th style="width: 50px;" class="text-center">Dev (%)</th>
                <th style="width: 70px;" class="text-center">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($projects as $p)
            <tr>
                <td class="text-center">{{ $loop->iteration }}</td>
                <td class="font-bold">{{ $p->kode }}</td>
                <td>
                    <div class="font-bold">{{ $p->nama }}</div>
                    <div style="color: #64748b; font-size: 10px;">{{ $p->lokasi }}</div>
                </td>
                <td>{{ explode('(', $p->uip)[0] }}</td>
                <td>{{ $p->kontraktor }}</td>
                <td class="text-right font-bold">{{ number_format($p->nilai_kontrak / 1000000000, 1, ',', '.') }}</td>
                <td class="text-center">{{ $p->target_cod ? $p->target_cod->format('d/m/y') : '-' }}</td>
                <td class="text-center">{{ $p->progres_rencana }}%</td>
                <td class="text-center font-bold" style="color: #00A3E0;">{{ $p->progres_realisasi }}%</td>
                <td class="text-center font-bold" style="color: {{ $p->deviasi < 0 ? '#ef4444' : '#10b981' }};">
                    {{ $p->deviasi > 0 ? '+' : '' }}{{ $p->deviasi }}%
                </td>
                <td class="text-center">{{ $p->status }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Signature Footer -->
    <div class="footer">
        <div class="sig-box">
            <div>Disiapkan Oleh,</div>
            <div style="font-weight: 700; margin-top: 4px;">Staff Pengendalian Proyek & Konstruksi</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
        </div>
        <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight: 700; margin-top: 4px;">Executive Vice President Konstruksi (EVP MPO)</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
        </div>
    </div>

</body>
</html>
