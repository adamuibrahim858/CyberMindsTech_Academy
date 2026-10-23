<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds central_reference column to certificate_payments.
 * This stores the gateway-assigned CM-PAY-... reference so payments can be
 * looked up by either our local external reference OR the gateway reference
 * during webhook and callback processing.
 *
 * Non-destructive: adds a single nullable column with an index.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('certificate_payments', function (Blueprint $table) {
            $table->string('central_reference', 100)
                  ->nullable()
                  ->after('paystack_reference')
                  ->index()
                  ->comment('Central CyberMinds Gateway reference (CM-PAY-...)');
        });
    }

    public function down(): void
    {
        Schema::table('certificate_payments', function (Blueprint $table) {
            $table->dropColumn('central_reference');
        });
    }
};
