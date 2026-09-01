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
        Schema::create('kendalas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('kode_kendala')->nullable();
            $table->string('kategori'); // Lahan / Sosial, Cuaca & Geoteknik, Material, Vendor / Manpower, Teknis / Utilitas, Regulasi / Perizinan
            $table->text('deskripsi');
            $table->text('dampak')->nullable();
            $table->text('tindakan_mitigasi')->nullable();
            $table->enum('status', ['Open', 'In Review', 'Resolved'])->default('Open');
            $table->date('tgl_lapor')->nullable();
            $table->date('tgl_selesai')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kendalas');
    }
};
