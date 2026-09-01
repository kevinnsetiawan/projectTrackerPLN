<?php

namespace App\Http\Controllers;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\SCurve;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function create($projectId)
    {
        $project = Project::with(['milestones', 'scurves'])->findOrFail($projectId);

        return view('progress.create', compact('project'));
    }

    public function store(Request $request, $projectId)
    {
        $project = Project::with('milestones')->findOrFail($projectId);

        $validated = $request->validate([
            'minggu_label' => 'required|string',
            'progres_rencana' => 'required|numeric|min:0|max:100',
            'progres_realisasi' => 'required|numeric|min:0|max:100',
            'penyerapan_anggaran' => 'nullable|numeric|min:0|max:100',
            'catatan' => 'nullable|string',
            'milestones' => 'nullable|array',
            'milestones.*.realisasi' => 'nullable|numeric|min:0|max:100',
            'milestones.*.status' => 'nullable|string',
        ]);

        // Update Project master progress
        $rencana = $validated['progres_rencana'];
        $realisasi = $validated['progres_realisasi'];
        $deviasi = round($realisasi - $rencana, 1);
        $status = Project::deriveStatus($rencana, $realisasi, $project->status);

        $projectUpdate = [
            'progres_rencana' => $rencana,
            'progres_realisasi' => $realisasi,
            'deviasi' => $deviasi,
            'status' => $status,
        ];

        if (isset($validated['penyerapan_anggaran'])) {
            $projectUpdate['penyerapan_anggaran'] = $validated['penyerapan_anggaran'];
        }

        $project->update($projectUpdate);

        // Add or update S-Curve entry
        $existingSCurve = SCurve::where('project_id', $project->id)
            ->where('minggu', $validated['minggu_label'])
            ->first();

        if ($existingSCurve) {
            $existingSCurve->update([
                'rencana' => $rencana,
                'realisasi' => $realisasi,
                'catatan' => $validated['catatan'] ?? null,
            ]);
        } else {
            $maxUrutan = SCurve::where('project_id', $project->id)->max('urutan') ?? 0;
            SCurve::create([
                'project_id' => $project->id,
                'minggu' => $validated['minggu_label'],
                'rencana' => $rencana,
                'realisasi' => $realisasi,
                'catatan' => $validated['catatan'] ?? null,
                'urutan' => $maxUrutan + 1,
            ]);
        }

        // Update Milestones if provided
        if (isset($validated['milestones'])) {
            foreach ($validated['milestones'] as $milestoneId => $mData) {
                $milestone = Milestone::where('project_id', $project->id)->find($milestoneId);
                if ($milestone) {
                    $milestone->update([
                        'realisasi' => $mData['realisasi'] ?? $milestone->realisasi,
                        'status' => $mData['status'] ?? $milestone->status,
                    ]);
                }
            }
        }

        return redirect()->route('projects.show', $project->id)->with('success', "Progres mingguan ({$validated['minggu_label']}) berhasil disimpan!");
    }
}
