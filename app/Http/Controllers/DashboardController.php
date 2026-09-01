<?php

namespace App\Http\Controllers;

use App\Models\Kendala;
use App\Models\Project;

class DashboardController extends Controller
{
    public function index()
    {
        $projects = Project::with(['kendalas', 'scurves'])->get();
        $totalProjects = $projects->count();

        $statusCounts = [
            'In Progress' => $projects->where('status', 'In Progress')->count(),
            'Critical' => $projects->where('status', 'Critical')->count(),
            'Testing' => $projects->where('status', 'Testing')->count(),
            'COD / Energized' => $projects->where('status', 'COD / Energized')->count(),
            'Planning' => $projects->where('status', 'Planning')->count(),
        ];

        $avgRencana = $totalProjects > 0 ? round($projects->avg('progres_rencana'), 1) : 0;
        $avgRealisasi = $totalProjects > 0 ? round($projects->avg('progres_realisasi'), 1) : 0;
        $avgDeviasi = round($avgRealisasi - $avgRencana, 1);

        $totalNilaiKontrak = $projects->sum('nilai_kontrak');
        $totalPenyerapanRp = $projects->sum(function ($p) {
            return ($p->nilai_kontrak * $p->penyerapan_anggaran) / 100;
        });
        $avgPenyerapanPersen = $totalNilaiKontrak > 0 ? round(($totalPenyerapanRp / $totalNilaiKontrak) * 100, 1) : 0;

        $openKendalas = Kendala::where('status', '!=', 'Resolved')->count();
        $criticalProjects = Project::where('status', 'Critical')->orWhere('deviasi', '<', -5)->get();
        $recentProjects = Project::latest('updated_at')->take(5)->get();

        // UIP Distribution
        $uipCounts = Project::selectRaw('uip, count(*) as count')
            ->groupBy('uip')
            ->pluck('count', 'uip')
            ->toArray();

        // Tipe Distribution
        $tipeCounts = Project::selectRaw('tipe, count(*) as count')
            ->groupBy('tipe')
            ->pluck('count', 'tipe')
            ->toArray();

        return view('dashboard', compact(
            'totalProjects',
            'statusCounts',
            'avgRencana',
            'avgRealisasi',
            'avgDeviasi',
            'totalNilaiKontrak',
            'totalPenyerapanRp',
            'avgPenyerapanPersen',
            'openKendalas',
            'criticalProjects',
            'recentProjects',
            'uipCounts',
            'tipeCounts',
            'projects'
        ));
    }
}
