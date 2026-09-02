<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reservation_events', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('resource');
            $table->unsignedBigInteger('tenant_id');
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservation_events');
    }
};
