<?php

namespace App\Services;

use App\Models\Counter;
use Illuminate\Support\Facades\DB;

class SequentialNumberService
{
    /**
     * Generate the next unique sequential identifier in a thread-safe manner.
     */
    public static function generate(
        string $counterKey,
        string $prefix,
        ?string $checkTable = null,
        ?string $checkColumn = null,
        ?int $year = null,
        int $padLength = 3
    ): string {
        $year = $year ?? (int) date('Y');
        $fullKey = "{$counterKey}_{$year}";

        return DB::transaction(function () use ($fullKey, $prefix, $year, $padLength, $checkTable, $checkColumn) {
            $counter = Counter::where('key', $fullKey)->lockForUpdate()->first();

            if (! $counter) {
                $initialMax = 0;
                if ($checkTable && $checkColumn) {
                    $pattern = "{$prefix}/{$year}/%";
                    $existing = DB::table($checkTable)
                        ->where($checkColumn, 'like', $pattern)
                        ->pluck($checkColumn);

                    foreach ($existing as $val) {
                        $parts = explode('/', $val);
                        $num = (int) end($parts);
                        if ($num > $initialMax) {
                            $initialMax = $num;
                        }
                    }
                }

                $counter = Counter::create([
                    'key' => $fullKey,
                    'last_number' => $initialMax,
                ]);

                $counter = Counter::where('id', $counter->id)->lockForUpdate()->first();
            }

            do {
                $counter->increment('last_number');
                $number = str_pad((string) $counter->last_number, $padLength, '0', STR_PAD_LEFT);
                $candidate = "{$prefix}/{$year}/{$number}";

                $exists = false;
                if ($checkTable && $checkColumn) {
                    $exists = DB::table($checkTable)->where($checkColumn, $candidate)->exists();
                }
            } while ($exists);

            return $candidate;
        });
    }

    public static function generateStudentId(?int $year = null): string
    {
        $prefix = config('academy.student_id_prefix', 'CMT/STU');

        return self::generate('student_id', $prefix, 'students', 'student_id', $year, 3);
    }

    public static function generateCertificateNumber(?int $year = null): string
    {
        $prefix = config('academy.certificate_prefix', 'CMT');

        return self::generate('certificate', $prefix, 'certificates', 'certificate_number', $year, 3);
    }
}
