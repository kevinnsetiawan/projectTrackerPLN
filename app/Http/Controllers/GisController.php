<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class GisController extends Controller
{
    public function index()
    {
        $projects = Project::whereNotNull('latitude')->whereNotNull('longitude')->get();

        $allUip = Project::select('uip')->distinct()->pluck('uip');
        $allTipe = Project::ALL_TIPE;

        return view('gis.index', compact('projects', 'allUip', 'allTipe'));
    }

    public function data(Request $request)
    {
        $query = Project::whereNotNull('latitude')->whereNotNull('longitude');

        if ($request->filled('uip') && $request->uip !== 'all') {
            $query->where('uip', $request->uip);
        }

        if ($request->filled('tipe') && $request->tipe !== 'all') {
            $query->where('tipe', $request->tipe);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $projects = $query->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'kode' => $p->kode,
                'nama' => $p->nama,
                'tipe' => $p->tipe,
                'tegangan' => $p->tegangan,
                'uip' => $p->uip,
                'upp' => $p->upp,
                'lokasi' => $p->lokasi,
                'lat' => $p->latitude,
                'lng' => $p->longitude,
                'status' => $p->status,
                'progres_rencana' => $p->progres_rencana,
                'progres_realisasi' => $p->progres_realisasi,
                'deviasi' => $p->deviasi,
                'target_cod' => $p->target_cod ? $p->target_cod->format('d M Y') : '-',
                'url' => route('projects.show', $p->id),
            ];
        });

        return response()->json($projects);
    }
}
