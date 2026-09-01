/**
 * PLN Pro-Track - Reporting & Export System
 */

class ProTrackExport {
  // Export project list to CSV
  exportProjectsCSV(projects) {
    const headers = [
      "ID Proyek",
      "Kode",
      "Nama Proyek",
      "Tipe Konstruksi",
      "Tegangan",
      "Unit Induk (UIP)",
      "UPP",
      "Lokasi",
      "Kontraktor",
      "Nomor Kontrak",
      "Nilai Kontrak (Rp)",
      "Tgl Mulai",
      "Target COD",
      "Status",
      "Progres Rencana (%)",
      "Progres Realisasi (%)",
      "Deviasi (%)",
      "Penyerapan Anggaran (%)"
    ];

    const rows = projects.map(p => [
      `"${p.id}"`,
      `"${p.kode}"`,
      `"${(p.nama || '').replace(/"/g, '""')}"`,
      `"${p.tipe}"`,
      `"${p.tegangan}"`,
      `"${p.uip}"`,
      `"${p.upp}"`,
      `"${(p.lokasi || '').replace(/"/g, '""')}"`,
      `"${(p.kontraktor || '').replace(/"/g, '""')}"`,
      `"${p.nomorKontrak}"`,
      p.nilaiKontrak,
      `"${p.tglMulai}"`,
      `"${p.targetCOD}"`,
      `"${p.status}"`,
      p.progresRencana,
      p.progresRealisasi,
      p.deviasi,
      p.penyerapanAnggaran
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PLN_ProTrack_Laporan_Konstruksi_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Generate Print-Ready Report for a Single Project
  printProjectReport(project) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Harap izinkan popup di browser Anda untuk mencetak laporan.");
      return;
    }

    const formatRp = (val) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val || 0);

    const milestonesHtml = (project.milestones || []).map((m, idx) => `
      <tr>
        <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">${idx + 1}</td>
        <td style="padding:8px; border:1px solid #cbd5e1;"><strong>${m.nama}</strong></td>
        <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">${m.bobot}%</td>
        <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">${m.rencana}%</td>
        <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">${m.realisasi}%</td>
        <td style="text-align:center; padding:8px; border:1px solid #cbd5e1;">
          <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background:${m.status === 'Done' ? '#dcfce7; color:#15803d;' : m.status === 'In Progress' ? '#e0f2fe; color:#0369a1;' : '#f1f5f9; color:#475569;'}">
            ${m.status}
          </span>
        </td>
      </tr>
    `).join("");

    const kendalaHtml = (project.kendala || []).length > 0
      ? (project.kendala || []).map(k => `
        <div style="background:#fef2f2; border-left:4px solid #ef4444; padding:10px 14px; margin-bottom:10px; border-radius:4px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="color:#991b1b;">[${k.kategori}] - Status: ${k.status}</strong>
            <span style="font-size:12px; color:#64748b;">Tgl Lapor: ${k.tglLapor}</span>
          </div>
          <p style="margin:4px 0; font-size:13px; color:#1e293b;"><strong>Deskripsi:</strong> ${k.deskripsi}</p>
          <p style="margin:4px 0; font-size:13px; color:#1e293b;"><strong>Dampak:</strong> ${k.dampak}</p>
          <p style="margin:4px 0; font-size:13px; color:#065f46;"><strong>Tindakan Mitigasi:</strong> ${k.tindakanMitigasi}</p>
        </div>
      `).join("")
      : "<p style='color:#64748b; font-style:italic;'>Tidak ada kendala aktif yang dilaporkan.</p>";

    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Laporan Progres Proyek - ${project.kode}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 24px; max-width: 900px; margin: 0 auto; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #002B49; padding-bottom: 16px; margin-bottom: 24px; }
          .logo-box { display: flex; align-items: center; gap: 12px; }
          .logo-pln { font-size: 28px; font-weight: 800; color: #002B49; letter-spacing: 1px; }
          .logo-tag { font-size: 13px; color: #00A3E0; font-weight: 600; }
          .report-title { font-size: 20px; font-weight: 700; color: #002B49; margin: 0; }
          .grid-info { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .info-item { font-size: 13px; }
          .info-item span { color: #64748b; display: block; font-size: 11px; text-transform: uppercase; font-weight: 600; }
          .info-item strong { color: #0f172a; font-size: 14px; }
          .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
          .stat-card .val { font-size: 22px; font-weight: 700; color: #002B49; }
          .stat-card .lbl { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #002B49; color: #ffffff; padding: 10px 8px; border: 1px solid #002B49; font-weight: 600; }
          h3 { font-size: 16px; color: #002B49; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; text-align: center; }
          .sig-box { width: 220px; }
          .sig-space { height: 70px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background:#00A3E0; color:#fff; border:none; padding:10px 20px; border-radius:6px; font-weight:600; cursor:pointer;">Cetak / Simpan PDF</button>
        </div>

        <div class="header">
          <div class="logo-box">
            <div>
              <div class="logo-pln">PT PLN (PERSERO)</div>
              <div class="logo-tag">Sistem Pemantauan Proyek Konstruksi (PLN Pro-Track)</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#64748b;">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style="font-weight:700; color:#002B49; margin-top:4px;">${project.uip}</div>
          </div>
        </div>

        <h2 class="report-title">${project.nama}</h2>
        <p style="color:#64748b; font-size:13px; margin: 4px 0 16px 0;">Kode Proyek: <strong>${project.kode}</strong> | Nomor Kontrak: <strong>${project.nomorKontrak}</strong></p>

        <div class="stat-cards">
          <div class="stat-card">
            <div class="val">${project.progresRencana}%</div>
            <div class="lbl">RENCANA FISIK</div>
          </div>
          <div class="stat-card">
            <div class="val" style="color: ${project.deviasi < 0 ? '#ef4444' : '#00A3E0'};">${project.progresRealisasi}%</div>
            <div class="lbl">REALISASI FISIK</div>
          </div>
          <div class="stat-card">
            <div class="val" style="color: ${project.deviasi < 0 ? '#ef4444' : '#10b981'};">${project.deviasi > 0 ? '+' : ''}${project.deviasi}%</div>
            <div class="lbl">DEVIASI PROGRES</div>
          </div>
          <div class="stat-card">
            <div class="val">${project.penyerapanAnggaran}%</div>
            <div class="lbl">PENYERAPAN DANA</div>
          </div>
        </div>

        <div class="grid-info">
          <div class="info-item">
            <span>Tipe & Tegangan:</span>
            <strong>${project.tipe} - ${project.tegangan}</strong>
          </div>
          <div class="info-item">
            <span>Pelaksana / Kontraktor:</span>
            <strong>${project.kontraktor}</strong>
          </div>
          <div class="info-item">
            <span>Nilai Kontrak:</span>
            <strong>${formatRp(project.nilaiKontrak)}</strong>
          </div>
          <div class="info-item">
            <span>Target COD (Energize):</span>
            <strong>${project.targetCOD} (Mulai: ${project.tglMulai})</strong>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <span>Lokasi Pekerjaan:</span>
            <strong>${project.lokasi} (UPP: ${project.upp})</strong>
          </div>
        </div>

        <h3>Tahapan Pekerjaan Utama (Milestones)</h3>
        <table>
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th>Deskripsi Tahapan Pekerjaan</th>
              <th style="width:80px;">Bobot</th>
              <th style="width:90px;">Rencana</th>
              <th style="width:90px;">Realisasi</th>
              <th style="width:110px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${milestonesHtml}
          </tbody>
        </table>

        <h3>Daftar Kendala & Tindakan Mitigasi Lapangan</h3>
        ${kendalaHtml}

        <div class="footer">
          <div class="sig-box">
            <div>Disiapkan Oleh,</div>
            <div style="font-weight:600; margin-top:4px;">Direksi Pekerjaan / Pengawas Lapangan</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
          </div>
          <div class="sig-box">
            <div>Mengetahui,</div>
            <div style="font-weight:600; margin-top:4px;">Manager UPP / Senior Manager UIP</div>
            <div class="sig-space"></div>
            <div>( .................................................. )</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
}

window.proTrackExport = new ProTrackExport();
