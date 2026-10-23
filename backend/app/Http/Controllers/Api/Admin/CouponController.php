<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class CouponController extends Controller
{
    /**
     * Display a listing of coupons with filters and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Coupon::with(['course', 'creator'])->withCount('payments');

        if ($search = $request->input('search')) {
            $query->where('code', 'like', "%" . strtoupper(trim($search)) . "%");
        }

        if ($request->has('course_id') && $request->input('course_id') !== '') {
            $query->where('course_id', $request->input('course_id'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $coupons = $query->latest('id')->paginate($perPage);

        return CouponResource::collection($coupons);
    }

    /**
     * Create a new coupon.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:coupons,code'],
            'discount_percentage' => ['required', 'integer', 'min:1', 'max:100'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'course_id' => ['nullable', 'exists:courses,id'],
            'is_active' => ['nullable', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $validated['code'] = Str::upper(trim($validated['code']));
        $validated['created_by'] = $request->user()->id;
        $validated['is_active'] = $validated['is_active'] ?? true;

        $coupon = Coupon::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Coupon created successfully.',
            'data' => new CouponResource($coupon->load(['course', 'creator'])),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display coupon details.
     */
    public function show(int $id): JsonResponse
    {
        $coupon = Coupon::with(['course', 'creator'])->withCount('payments')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new CouponResource($coupon),
        ]);
    }

    /**
     * Update coupon details.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:50', 'alpha_dash', Rule::unique('coupons', 'code')->ignore($coupon->id)],
            'discount_percentage' => ['sometimes', 'required', 'integer', 'min:1', 'max:100'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'course_id' => ['nullable', 'exists:courses,id'],
            'is_active' => ['sometimes', 'boolean'],
            'expires_at' => ['nullable', 'date'],
        ]);

        if (isset($validated['code'])) {
            $validated['code'] = Str::upper(trim($validated['code']));
        }

        $coupon->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Coupon updated successfully.',
            'data' => new CouponResource($coupon->fresh(['course', 'creator'])->loadCount('payments')),
        ]);
    }

    /**
     * Delete coupon if no payments used it; otherwise advise deactivation.
     */
    public function destroy(int $id): JsonResponse
    {
        $coupon = Coupon::findOrFail($id);

        if ($coupon->payments()->exists() || $coupon->uses_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete coupon that has already been used in transactions. You can deactivate it instead.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $coupon->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Coupon deleted successfully.',
        ]);
    }
}
