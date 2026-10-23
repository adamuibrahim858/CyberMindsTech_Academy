<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CertificatePayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'certificate_id',
        'enrolment_id',
        'coupon_id',
        'amount',
        'discount_amount',
        'final_amount',
        'currency',
        'paystack_reference',
        'central_reference',
        'paystack_transaction_id',
        'status',
        'paid_at',
        'channel',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'final_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function certificate(): BelongsTo
    {
        return $this->belongsTo(Certificate::class);
    }

    public function enrolment(): BelongsTo
    {
        return $this->belongsTo(Enrolment::class);
    }

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function isSuccessful(): bool
    {
        return $this->status === 'successful';
    }
}
