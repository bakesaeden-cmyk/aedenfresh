import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side price computation — the single source of truth (spec §5.4/§5.6).
 * Mirrors the builder rule exactly (docs/api-contract.md):
 *   - option_ids are ORDERED (per-category selection order preserved)
 *   - multi-select categories: first `max_free_selections` picks free, extras
 *     charge their price_delta
 *   - single-select categories always charge (portion carries the bowl price)
 * The client's quoted price is never trusted.
 */

interface PricedOption {
  id: string;
  name: string;
  price_delta: number;
  category_id: string;
  max_free_selections: number | null;
}

export async function priceOptionBuild(
  supabase: SupabaseClient,
  orderedOptionIds: string[],
): Promise<{ unitPrice: number; names: string[] } | { error: string }> {
  const { data, error } = await supabase
    .from("product_options")
    .select("id, name, price_delta, category_id, is_active, product_categories(max_free_selections)")
    .in("id", orderedOptionIds);

  if (error) return { error: "pricing_lookup_failed" };
  const rows = data ?? [];
  if (rows.length !== new Set(orderedOptionIds).size) {
    return { error: "unknown_option" };
  }
  if (rows.some((r) => !r.is_active)) return { error: "option_inactive" };

  const byId = new Map<string, PricedOption>(
    rows.map((r) => [
      r.id as string,
      {
        id: r.id as string,
        name: r.name as string,
        price_delta: Number(r.price_delta),
        category_id: r.category_id as string,
        max_free_selections:
          (r.product_categories as unknown as { max_free_selections: number | null } | null)
            ?.max_free_selections ?? null,
      },
    ]),
  );

  let unitPrice = 0;
  const names: string[] = [];
  const seenPerCategory = new Map<string, number>();

  for (const id of orderedOptionIds) {
    const opt = byId.get(id);
    if (!opt) return { error: "unknown_option" };
    names.push(opt.name);
    const seen = seenPerCategory.get(opt.category_id) ?? 0;
    const isFree = opt.max_free_selections != null && seen < opt.max_free_selections;
    if (!isFree) unitPrice += opt.price_delta;
    seenPerCategory.set(opt.category_id, seen + 1);
  }

  return { unitPrice, names };
}

export interface CouponResult {
  discount: number;
  code: string | null;
  error?: string;
}

/**
 * Validate a coupon against a subtotal. `used_count` is incremented only on
 * payment capture (webhook) so abandoned checkouts don't burn uses.
 */
export async function applyCoupon(
  supabase: SupabaseClient,
  code: string | undefined,
  subtotal: number,
): Promise<CouponResult> {
  if (!code) return { discount: 0, code: null };

  const { data: coupon } = await supabase
    .from("coupons")
    .select("code, discount_type, discount_value, min_order_value, max_uses, used_count, valid_from, valid_until, is_active")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!coupon || !coupon.is_active) return { discount: 0, code: null, error: "invalid_coupon" };

  const today = new Date().toISOString().slice(0, 10);
  if (coupon.valid_from && coupon.valid_from > today) return { discount: 0, code: null, error: "coupon_not_started" };
  if (coupon.valid_until && coupon.valid_until < today) return { discount: 0, code: null, error: "coupon_expired" };
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return { discount: 0, code: null, error: "coupon_exhausted" };
  if (subtotal < Number(coupon.min_order_value)) return { discount: 0, code: null, error: "coupon_min_order" };

  const discount =
    coupon.discount_type === "percent"
      ? Math.round((subtotal * Number(coupon.discount_value)) / 100)
      : Math.min(Number(coupon.discount_value), subtotal);

  return { discount, code: coupon.code as string };
}
