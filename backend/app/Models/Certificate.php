<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Certificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'enrolment_id',
        'certificate_number',
        'verification_code',
        'issued_at',
        'status',
        'revoked_at',
        'revocation_reason',
        'revoked_by',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function enrolment(): BelongsTo
    {
        return $this->belongsTo(Enrolment::class);
    }

    public function revoker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CertificatePayment::class);
    }

    public function latestSuccessfulPayment(): HasOne
    {
        return $this->hasOne(CertificatePayment::class)
            ->where('status', 'successful')
            ->latest('id');
    }

    public function isValid(): bool
    {
        return $this->status === 'valid';
    }

    public function isRevoked(): bool
    {
        return $this->status === 'revoked';
    }

    /**
     * Determine if payment is required for this certificate.
     */
    public function requiresPayment(): bool
    {
        $price = (float) ($this->enrolment?->course?->certificate_price ?? 0);
        if ($price <= 0) {
            return false;
        }

        return ! $this->isPaid();
    }

    /**
     * Determine if this certificate is already paid / unlocked.
     */
    public function isPaid(): bool
    {
        $price = (float) ($this->enrolment?->course?->certificate_price ?? 0);
        if ($price <= 0) {
            return true;
        }

        if ($this->relationLoaded('payments')) {
            return $this->payments->contains(fn ($p) => $p->status === 'successful');
        }

        return $this->payments()->where('status', 'successful')->exists();
    }
}
