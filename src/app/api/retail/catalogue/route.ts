import { NextRequest, NextResponse } from "next/server";

import { RETAIL_CATEGORIES, RETAIL_PRODUCTS } from "@/data/retail-products";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id");
  if (storeId && !UUID_RE.test(storeId)) {
    return NextResponse.json({ error: "invalid_store_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const [categoriesResult, productsResult, inventoryResult] = await Promise.all([
    supabase
      .from("retail_categories")
      .select("id, slug, name, description, display_order")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("retail_products")
      .select("id, sku, category_id, name, description, unit_label, selling_price, compare_at_price, image_url, tags, updated_at")
      .eq("is_active", true)
      .order("name"),
    storeId
      ? supabase
          .from("retail_inventory")
          .select("retail_product_id, stock_qty, reserved_qty, selling_price, is_available")
          .eq("store_id", storeId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // The UI remains usable while the retail migration or ERP connection is
  // being provisioned. Checkout still validates against live DB inventory.
  if (categoriesResult.error || productsResult.error || !productsResult.data?.length) {
    return NextResponse.json({
      source: "preview",
      store_id: storeId,
      categories: RETAIL_CATEGORIES,
      products: RETAIL_PRODUCTS,
    });
  }

  const categories = categoriesResult.data ?? [];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const inventoryByProduct = new Map(
    (inventoryResult.data ?? []).map((row) => [row.retail_product_id as string, row]),
  );

  const products = productsResult.data.map((product) => {
    const category = categoryById.get(product.category_id);
    const inventory = inventoryByProduct.get(product.id);
    const availableStock = inventory
      ? Math.max(0, Number(inventory.stock_qty) - Number(inventory.reserved_qty))
      : null;
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      unit_label: product.unit_label,
      selling_price: Number(inventory?.selling_price ?? product.selling_price),
      compare_at_price: product.compare_at_price == null ? null : Number(product.compare_at_price),
      image_url: product.image_url ?? "",
      tags: product.tags ?? [],
      category_id: product.category_id,
      category_slug: category?.slug ?? "other",
      category_name: category?.name ?? "Other",
      stock_qty: availableStock,
      is_available: storeId
        ? Boolean(inventory?.is_available) && Number(availableStock) > 0
        : true,
    };
  });

  return NextResponse.json({
    source: "erp-cache",
    store_id: storeId,
    categories,
    products,
  });
}
