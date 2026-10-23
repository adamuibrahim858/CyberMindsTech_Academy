<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'discount_percentage',
        'max_uses',
        'uses_count',
        'course_id',
        'is_active',
        'expires_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'discount_percentage' => 'integer',
            'max_uses' => 'integer',
            'uses_count' => 'integer',
            'is_active' => 'boolean',
            'expires_at' => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(CertificatePayment::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isExhausted(): bool
    {
        return $this->max_uses !== null && $this->uses_count >= $this->max_uses;
    }

    public function isValidFor(?int $courseId = null): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->isExpired()) {
            return false;
        }

        if ($this->isExhausted()) {
            return false;
        }

        if ($this->course_id !== null && $courseId !== null && (int) $this->course_id !== (int) $courseId) {
            return false;
        }

        return true;
    }

    /**
     * Calculate discount amount and final amount for a given base price.
     *
     * @return array{discount_amount: float, final_amount: float, is_free: bool}
     */
    public function calculateDiscount(float $basePrice): array
    {
        if ($basePrice <= 0) {
            return [
                'discount_amount' => 0.0,
                'final_amount' => 0.0,
                'is_free' => true,
            ];
        }

        if ($this->discount_percentage >= 100) {
            return [
                'discount_amount' => round($basePrice, 2),
                'final_amount' => 0.0,
                'is_free' => true,
            ];
        }

        $discountAmount = round(($basePrice * $this->discount_percentage) / 100, 2);
        $finalAmount = max(0.0, round($basePrice - $discountAmount, 2));

        return [
            'discount_amount' => $discountAmount,
            'final_amount' => $finalAmount,
            'is_free' => $finalAmount <= 0.0,
        ];
    }
}
