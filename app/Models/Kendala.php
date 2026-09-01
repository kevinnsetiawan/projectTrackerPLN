<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Kendala extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'tgl_lapor' => 'date',
        'tgl_selesai' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
