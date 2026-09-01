<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SCurve extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'rencana' => 'float',
        'realisasi' => 'float',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
