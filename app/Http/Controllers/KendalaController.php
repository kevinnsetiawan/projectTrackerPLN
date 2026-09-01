<?php

namespace App\Http\Controllers;

use App\Models\Kendala;
use App\Models\Project;
use Illuminate\Http\Request;

class KendalaController extends Controller
{
    public function index(Request $request)
    {
        $query = Kendala::with('project');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('kategori') && $request->kategori !== 'all') {
            $query->where('kategori', $request->kategori);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('deskripsi', 'like', "%{$search}%")
                  ->orWhere('dampak', 'like', "%{$search}%")
                  ->orWhere('tindakan_mitigasi', 'like', "%{$search}%")
                  ->orWhereHas('project', function ($pq) use ($search) {
                      $pq->where('nama', 'like', "%{$search}%")->orWhere('kode', 'like', "%{$search}%");
                  });
            });
        }

        $kendalas = $query->orderByRaw("CASE WHEN status = 'Open' THEN 1 WHEN status = 'In Review' THEN 2 ELSE 3 END")
                          ->orderByDesc('tgl_lapor')
                          ->paginate(15)
                          ->withQueryString();

        $openCount = Kendala::where('status', 'Open')->count();
        $inReviewCount = Kendala::where('status', 'In Review')->count();
        $resolvedCount = Kendala::where('status', 'Resolved')->count();

        $kategoris = [
            'Lahan / Sosial',
            'Cuaca & Geoteknik',
            'Material',
            'Vendor / Manpower',
            'Teknis / Utilitas',
            'Regulasi / Perizinan'
        ];

        return view('kendala.index', compact('kendalas', 'openCount', 'inReviewCount', 'resolvedCount', 'kategoris'));
    }

    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'kategori' => 'required|string',
            'deskripsi' => 'required|string',
            'dampak' => 'nullable|string',
            'tindakan_mitigasi' => 'nullable|string',
            'status' => 'required|string',
            'tgl_lapor' => 'nullable|date',
        ]);

        $maxNum = Kendala::where('project_id', $project->id)->count() + 1;
        $validated['kode_kendala'] = 'K-' . str_pad($maxNum, 2, '0', STR_PAD_LEFT);
        $validated['tgl_lapor'] = $validated['tgl_lapor'] ?? now()->toDateString();

        $project->kendalas()->create($validated);

        if ($validated['status'] === 'Open' && $project->status === 'In Progress' && $project->deviasi < 0) {
            $project->update(['status' => 'Critical']);
        }

        return redirect()->route('projects.show', $project->id)->with('success', 'Kendala lapangan berhasil dilaporkan.');
    }

    public function updateStatus(Request $request, $id)
    {
        $kendala = Kendala::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:Open,In Review,Resolved',
        ]);

        $kendala->update([
            'status' => $validated['status'],
            'tgl_selesai' => $validated['status'] === 'Resolved' ? now()->toDateString() : null,
        ]);

        return back()->with('success', "Status kendala {$kendala->kode_kendala} diperbarui menjadi {$validated['status']}.");
    }
}
