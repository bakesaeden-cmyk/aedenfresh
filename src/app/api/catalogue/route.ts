import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OptionRow {
  id: string;
  category_id: string;
  name: string;
  price_delta: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_url: string | null;
  allergens: string[] | null;
}

/**
 * GET /api/catalogue?store_id=<uuid>
 *
 * Categories + options for the salad builder (spec §5.1/§5.2), plus
 * curated baskets. Options inactive globally are excluded; options
 * unavailable at THIS store are included with is_available:false so
 * the builder can grey them out. No inventory row = available
 * (made-to-order default).
 */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id") ?? "";
  if (!UUID_RE.test(storeId)) {
    return NextResponse.json({ error: "invalid_store_id" }, { status: 400 });
  }

  const supabase = await createClient();

  const [categoriesRes, optionsRes, inventoryRes, basketsRes] =
    await Promise.all([
      supabase
        .from("product_categories")
        .select("id, type, name, display_order, max_free_selections")
        .order("display_order", { ascending: true }),
      supabase
        .from("product_options")
        .select(
          "id, category_id, name, price_delta, calories, protein_g, carbs_g, fat_g, image_url, allergens",
        )
        .eq("is_active", true),
      supabase
        .from("store_inventory")
        .select("product_option_id, is_available")
        .eq("store_id", storeId),
      supabase
        .from("curated_baskets")
        .select("id, name, description, base_price, image_url, nutrition_summary")
        .eq("is_active", true),
    ]);

  if (categoriesRes.error || optionsRes.error || inventoryRes.error || basketsRes.error) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const availability = new Map<string, boolean>(
    (inventoryRes.data ?? []).map((row) => [
      row.product_option_id as string,
      row.is_available as boolean,
    ]),
  );

  const options = (optionsRes.data ?? []) as OptionRow[];

  const categories = (categoriesRes.data ?? []).map((cat) => ({
    id: cat.id,
    type: cat.type,
    name: cat.name,
    display_order: cat.display_order,
    max_free_selections: cat.max_free_selections,
    options: options
      .filter((o) => o.category_id === cat.id)
      .map((o) => ({
        id: o.id,
        name: o.name,
        price_delta: Number(o.price_delta),
        calories: o.calories,
        protein_g: o.protein_g,
        carbs_g: o.carbs_g,
        fat_g: o.fat_g,
        image_url: o.image_url,
        allergens: o.allergens ?? [],
        // No inventory row → made-to-order default (available)
        is_available: availability.get(o.id) ?? true,
      })),
  }));

  return NextResponse.json({
    store_id: storeId,
    categories,
    baskets: basketsRes.data ?? [],
  });
}
