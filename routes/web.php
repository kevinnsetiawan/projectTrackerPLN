<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\KendalaController;
use App\Http\Controllers\DokumentasiController;
use App\Http\Controllers\GisController;
use App\Http\Controllers\ReportController;

// Dashboard
Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

// Projects
Route::resource('projects', ProjectController::class);

// Progress & S-Curve Reporting
Route::get('/projects/{project}/progress', [ProgressController::class, 'create'])->name('progress.create');
Route::post('/projects/{project}/progress', [ProgressController::class, 'store'])->name('progress.store');

// Kendala & Issue Management
Route::get('/kendala', [KendalaController::class, 'index'])->name('kendala.index');
Route::post('/projects/{project}/kendala', [KendalaController::class, 'store'])->name('kendala.store');
Route::patch('/kendala/{kendala}/status', [KendalaController::class, 'updateStatus'])->name('kendala.update-status');

// Dokumentasi Upload
Route::post('/projects/{project}/dokumentasi', [DokumentasiController::class, 'store'])->name('dokumentasi.store');

// GIS Map
Route::get('/gis', [GisController::class, 'index'])->name('gis.index');
Route::get('/api/gis/projects', [GisController::class, 'data'])->name('api.gis.projects');

// Reports & Export
Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
Route::get('/reports/print/{project}', [ReportController::class, 'printProject'])->name('reports.print-project');
Route::get('/reports/print-portfolio', [ReportController::class, 'printPortfolio'])->name('reports.print-portfolio');
Route::get('/reports/export-csv', [ReportController::class, 'exportCsv'])->name('reports.export-csv');
