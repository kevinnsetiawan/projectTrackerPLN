<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::with(['kendalas', 'milestones']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('kode', 'like', "%{$search}%")
                    ->orWhere('lokasi', 'like', "%{$search}%")
                    ->orWhere('kontraktor', 'like', "%{$search}%");
            });
        }

        foreach (['uip', 'tipe', 'status'] as $filter) {
            if ($request->filled($filter) && $request->{$filter} !== 'all') {
                $query->where($filter, $request->{$filter});
            }
        }

        $projects = $query->orderBy('status', 'asc')->orderByDesc('updated_at')->paginate(10)->withQueryString();

        $allUip = Project::select('uip')->distinct()->pluck('uip');
        $allTipe = Project::ALL_TIPE;

        return view('projects.index', compact('projects', 'allUip', 'allTipe'));
    }

    public function show(Project $project)
    {
        $project->load(['milestones', 'scurves', 'kendalas', 'dokumentasis']);

        $scurveLabels = $project->scurves->pluck('minggu')->toArray();
        $scurveRencana = $project->scurves->pluck('rencana')->toArray();
        $scurveRealisasi = $project->scurves->pluck('realisasi')->toArray();

        return view('projects.show', compact('project', 'scurveLabels', 'scurveRencana', 'scurveRealisasi'));
    }

    public function create()
    {
        return view('projects.create', ['allUip' => Project::ALL_UIP, 'allTipe' => Project::ALL_TIPE]);
    }

    public function store(StoreProjectRequest $request)
    {
        $validated = $request->validated();

        $rencana = $validated['progres_rencana'] ?? 0;
        $realisasi = $validated['progres_realisasi'] ?? 0;
        $validated['deviasi'] = round($realisasi - $rencana, 1);
        $validated['status'] = Project::deriveStatus($rencana, $realisasi);

        $project = Project::create($validated);

        foreach (Project::defaultMilestones($realisasi) as $m) {
            $project->milestones()->create($m);
        }

        foreach (Project::defaultSCurvePoints($rencana, $realisasi) as $point) {
            $project->scurves()->create($point);
        }

        return redirect()->route('projects.show', $project->id)->with('success', "Proyek {$project->nama} berhasil ditambahkan!");
    }

    public function edit(Project $project)
    {
        return view('projects.edit', [
            'project' => $project,
            'allUip' => Project::ALL_UIP,
            'allTipe' => Project::ALL_TIPE,
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $validated = $request->validated();
        $validated['deviasi'] = round($validated['progres_realisasi'] - $validated['progres_rencana'], 1);

        $project->update($validated);

        return redirect()->route('projects.show', $project->id)->with('success', "Data proyek {$project->kode} berhasil diperbarui!");
    }

    public function destroy(Project $project)
    {
        $nama = $project->nama;
        $project->delete();

        return redirect()->route('projects.index')->with('success', "Proyek {$nama} berhasil dihapus.");
    }
}
