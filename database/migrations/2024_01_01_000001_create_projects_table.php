<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique();
            $table->string('nama');
            $table->string('tipe'); // Gardu Induk (GI), SUTT, SUTET, SKTT, PLTS, dll.
            $table->string('tegangan')->default('150 kV');
            $table->string('uip'); // Unit Induk Pembangunan
            $table->string('upp')->nullable(); // Unit Pelaksana Proyek
            $table->string('lokasi');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('kontraktor');
            $table->string('nomor_kontrak')->nullable();
            $table->decimal('nilai_kontrak', 16, 2)->default(0);
            $table->date('tgl_mulai')->nullable();
            $table->date('target_cod')->nullable();
            $table->enum('status', ['Planning', 'In Progress', 'Critical', 'Testing', 'COD / Energized'])->default('In Progress');
            $table->decimal('progres_rencana', 5, 2)->default(0);
            $table->decimal('progres_realisasi', 5, 2)->default(0);
            $table->decimal('deviasi', 5, 2)->default(0);
            $table->decimal('penyerapan_anggaran', 5, 2)->default(0);
            $table->text('deskripsi')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
