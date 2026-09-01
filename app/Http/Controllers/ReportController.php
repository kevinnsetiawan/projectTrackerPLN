<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::with(['kendalas', 'milestones']);

        if ($request->filled('uip') && $request->uip !== 'all') {
            $query->where('uip', $request->uip);
        }

        if ($request->filled('tipe') && $request->tipe !== 'all') {
            $query->where('tipe', $request->tipe);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $projects = $query->orderBy('status', 'asc')->get();

        $allUip = Project::select('uip')->distinct()->pluck('uip');
        $allTipe = Project::ALL_TIPE;

        return view('reports.index', compact('projects', 'allUip', 'allTipe'));
    }

    public function printProject($id)
    {
        $project = Project::with(['milestones', 'scurves', 'kendalas', 'dokumentasis'])->findOrFail($id);

        return view('reports.print-project', compact('project'));
    }

    public function printPortfolio(Request $request)
    {
        $query = Project::with(['kendalas', 'milestones']);

        if ($request->filled('uip') && $request->uip !== 'all') {
            $query->where('uip', $request->uip);
        }

        if ($request->filled('tipe') && $request->tipe !== 'all') {
            $query->where('tipe', $request->tipe);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $projects = $query->get();

        return view('reports.print-portfolio', compact('projects'));
    }

    public function exportCsv(Request $request)
    {
        $fileName = 'PLN_ProTrack_Laporan_Konstruksi_'.date('Y-m-d').'.csv';
        $projects = Project::all();

        $headers = [
            'Content-type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => "attachment; filename=$fileName",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = [
            'ID Proyek', 'Kode', 'Nama Proyek', 'Tipe', 'Tegangan', 'UIP', 'UPP',
            'Lokasi', 'Kontraktor', 'Nomor Kontrak', 'Nilai Kontrak (Rp)', 'Tgl Mulai',
            'Target COD', 'Status', 'Progres Rencana (%)', 'Progres Realisasi (%)',
            'Deviasi (%)', 'Penyerapan Anggaran (%)',
        ];

        $callback = function () use ($projects, $columns) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF"); // UTF-8 BOM
            fputcsv($file, $columns);

            foreach ($projects as $p) {
                fputcsv($file, [
                    $p->id,
                    $p->kode,
                    $p->nama,
                    $p->tipe,
                    $p->tegangan,
                    $p->uip,
                    $p->upp,
                    $p->lokasi,
                    $p->kontraktor,
                    $p->nomor_kontrak,
                    $p->nilai_kontrak,
                    $p->tgl_mulai ? $p->tgl_mulai->format('Y-m-d') : '',
                    $p->target_cod ? $p->target_cod->format('Y-m-d') : '',
                    $p->status,
                    $p->progres_rencana,
                    $p->progres_realisasi,
                    $p->deviasi,
                    $p->penyerapan_anggaran,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
