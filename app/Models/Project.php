<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    public const ALL_TIPE = [
        'Gardu Induk (GI)',
        'GITET (Ekstra Tinggi)',
        'SUTT (Transmisi)',
        'SUTET (Transmisi 500 kV)',
        'SKTT (Kabel Tanah)',
        'Pembangkit EBT (PLTS)',
        'Pembangkit (PLTA/PLTU)',
        'Jaringan Distribusi (JTM/JTR)',
    ];

    public const ALL_UIP = [
        'UIP JBB (Jawa Bagian Barat)',
        'UIP JBT (Jawa Bagian Tengah)',
        'UIP JBTB (Jawa Bagian Timur & Bali)',
        'UIP SUMBAGUT (Sumatera Bagian Utara)',
        'UIP SUMBAGTENG (Sumatera Bagian Tengah)',
        'UIP SUMBAGSEL (Sumatera Bagian Selatan)',
        'UIP KALIMANTAN',
        'UIP SULAWESI',
        'UIP MALUKU PAPUA',
        'UIP NUSA TENGGARA',
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'nilai_kontrak' => 'float',
        'progres_rencana' => 'float',
        'progres_realisasi' => 'float',
        'deviasi' => 'float',
        'penyerapan_anggaran' => 'float',
        'latitude' => 'float',
        'longitude' => 'float',
        'tgl_mulai' => 'date',
        'target_cod' => 'date',
    ];

    public function milestones()
    {
        return $this->hasMany(Milestone::class)->orderBy('urutan')->orderBy('id');
    }

    public function scurves()
    {
        return $this->hasMany(SCurve::class)->orderBy('urutan')->orderBy('id');
    }

    public function kendalas()
    {
        return $this->hasMany(Kendala::class)->orderByDesc('id');
    }

    public function dokumentasis()
    {
        return $this->hasMany(Dokumentasi::class)->orderByDesc('id');
    }

    public function getFormattedNilaiKontrakAttribute()
    {
        return 'Rp '.number_format($this->nilai_kontrak, 0, ',', '.');
    }

    public function getNilaiMilyarAttribute()
    {
        return 'Rp '.number_format($this->nilai_kontrak / 1000000000, 1, ',', '.').' M';
    }

    public function getStatusBadgeClassAttribute()
    {
        return match ($this->status) {
            'COD / Energized' => 'bg-emerald-100 text-emerald-800 border-emerald-300',
            'Testing' => 'bg-amber-100 text-amber-800 border-amber-300',
            'Critical' => 'bg-red-100 text-red-800 border-red-300',
            'Planning' => 'bg-slate-100 text-slate-800 border-slate-300',
            default => 'bg-cyan-100 text-cyan-800 border-cyan-300',
        };
    }

    /**
     * Derive project status from physical progress and schedule deviation.
     *
     * Single source of truth used both when a project is created and when
     * weekly progress is recorded, ensuring status rules never diverge.
     */
    public static function deriveStatus(float $rencana, float $realisasi, ?string $currentStatus = null): string
    {
        $deviasi = round($realisasi - $rencana, 1);
        $base = $currentStatus ?: 'In Progress';

        if ($realisasi >= 100) {
            return 'COD / Energized';
        }

        if ($deviasi < -5.0) {
            return ($realisasi > 0 && $base !== 'Planning') || $base === 'Critical'
                ? 'Critical'
                : $base;
        }

        if ($base === 'Critical') {
            return 'In Progress';
        }

        if ($base === 'In Progress' && $realisasi >= 95) {
            return 'Testing';
        }

        return $base;
    }

    /**
     * Default milestone structure created for a new project based on initial physical progress.
     */
    public static function defaultMilestones(float $realisasi): array
    {
        return [
            [
                'nama' => 'Perizinan, Amdal & Pembebasan Lahan / ROW',
                'bobot' => 15, 'rencana' => 100,
                'realisasi' => ($realisasi > 20 ? 100 : $realisasi * 4),
                'status' => ($realisasi >= 25 ? 'Done' : 'In Progress'),
                'urutan' => 1,
            ],
            [
                'nama' => 'Pekerjaan Sipil, Pondasi & Struktur',
                'bobot' => 30, 'rencana' => 80,
                'realisasi' => ($realisasi > 50 ? 100 : $realisasi * 1.5),
                'status' => ($realisasi >= 60 ? 'Done' : 'In Progress'),
                'urutan' => 2,
            ],
            [
                'nama' => 'Pengadaan, Erection & Instalasi Peralatan',
                'bobot' => 35, 'rencana' => 60,
                'realisasi' => ($realisasi > 80 ? 100 : $realisasi),
                'status' => ($realisasi >= 90 ? 'Done' : 'In Progress'),
                'urutan' => 3,
            ],
            [
                'nama' => 'Testing, Individual Test & Commissioning',
                'bobot' => 15, 'rencana' => 20,
                'realisasi' => ($realisasi >= 95 ? 80 : 0),
                'status' => ($realisasi >= 95 ? 'In Progress' : 'Pending'),
                'urutan' => 4,
            ],
            [
                'nama' => 'Energize & Commercial Operation Date (COD)',
                'bobot' => 5, 'rencana' => 0,
                'realisasi' => ($realisasi >= 100 ? 100 : 0),
                'status' => ($realisasi >= 100 ? 'Done' : 'Pending'),
                'urutan' => 5,
            ],
        ];
    }

    /**
     * Initial S-Curve points created for a new project.
     */
    public static function defaultSCurvePoints(float $rencana, float $realisasi): array
    {
        return [
            ['minggu' => 'Bulan 1', 'rencana' => 15.0, 'realisasi' => min(15.0, $realisasi), 'urutan' => 1],
            ['minggu' => 'Bulan 3', 'rencana' => 40.0, 'realisasi' => min(40.0, $realisasi), 'urutan' => 2],
            ['minggu' => 'Bulan 6 (Saat Ini)', 'rencana' => $rencana, 'realisasi' => $realisasi, 'urutan' => 3],
            ['minggu' => 'Target Akhir (COD)', 'rencana' => 100.0, 'realisasi' => null, 'urutan' => 4],
        ];
    }
}
