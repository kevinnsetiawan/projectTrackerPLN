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
        Schema::create('s_curves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('minggu'); // e.g. "M-1 (Jan '24)"
            $table->decimal('rencana', 5, 2)->default(0);
            $table->decimal('realisasi', 5, 2)->nullable(); // null jika belum tiba waktunya
            $table->integer('urutan')->default(0);
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('s_curves');
    }
};
