<?php

namespace App\Http\Controllers;

use App\Models\Dokumentasi;
use App\Models\Project;
use Illuminate\Http\Request;

class DokumentasiController extends Controller
{
    public function store(Request $request, $projectId)
    {
        $project = Project::findOrFail($projectId);

        $request->validate([
            'judul' => 'required|string|max:255',
            'tahap' => 'required|string',
            'tgl' => 'nullable|date',
            'foto_file' => 'nullable|image|max:10240', // Max 10MB
            'foto_url' => 'nullable|url',
            'keterangan' => 'nullable|string',
        ]);

        $fotoPath = 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80';

        if ($request->hasFile('foto_file')) {
            $path = $request->file('foto_file')->store('dokumentasi', 'public');
            $fotoPath = asset('storage/' . $path);
        } elseif ($request->filled('foto_url')) {
            $fotoPath = $request->foto_url;
        }

        $project->dokumentasis()->create([
            'judul' => $request->judul,
            'tahap' => $request->tahap,
            'foto' => $fotoPath,
            'tgl' => $request->tgl ?? now()->toDateString(),
            'keterangan' => $request->keterangan,
        ]);

        return redirect()->route('projects.show', $project->id)->with('success', 'Dokumentasi foto berhasil ditambahkan.');
    }
}
