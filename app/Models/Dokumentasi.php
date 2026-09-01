<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dokumentasi extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'tgl' => 'date',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
