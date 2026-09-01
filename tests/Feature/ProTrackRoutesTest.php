<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProTrackRoutesTest extends TestCase
{
    public function test_dashboard_is_accessible(): void
    {
        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertSee('Executive Dashboard');
        $response->assertSee('PRO-TRACK');
    }

    public function test_projects_index_is_accessible(): void
    {
        $response = $this->get('/projects');
        $response->assertStatus(200);
        $response->assertSee('Daftar & Monitoring Proyek');
    }

    public function test_project_detail_is_accessible(): void
    {
        $response = $this->get('/projects/1');
        $response->assertStatus(200);
        $response->assertSee('GI-150-SRP');
        $response->assertSee('Kurva S');
    }

    public function test_project_create_page_is_accessible(): void
    {
        $response = $this->get('/projects/create');
        $response->assertStatus(200);
        $response->assertSee('Pendaftaran Proyek');
    }

    public function test_gis_map_is_accessible(): void
    {
        $response = $this->get('/gis');
        $response->assertStatus(200);
        $response->assertSee('Peta Geografis (GIS)');
    }

    public function test_gis_api_returns_json(): void
    {
        $response = $this->get('/api/gis/projects');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            '*' => ['id', 'kode', 'nama', 'tipe', 'lat', 'lng', 'status']
        ]);
    }

    public function test_kendala_index_is_accessible(): void
    {
        $response = $this->get('/kendala');
        $response->assertStatus(200);
        $response->assertSee('Pusat Monitoring Kendala');
    }

    public function test_reports_index_is_accessible(): void
    {
        $response = $this->get('/reports');
        $response->assertStatus(200);
        $response->assertSee('Pusat Laporan');
    }

    public function test_print_project_is_accessible(): void
    {
        $response = $this->get('/reports/print/1');
        $response->assertStatus(200);
        $response->assertSee('PT PLN (PERSERO)');
    }

    public function test_print_portfolio_is_accessible(): void
    {
        $response = $this->get('/reports/print-portfolio');
        $response->assertStatus(200);
        $response->assertSee('Rekapitulasi Progres Fisik');
    }
}
