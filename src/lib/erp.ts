import "server-only";

import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/admin";

const categorySchema = z.object({
  external_id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  display_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

const productSchema = z.object({
  external_id: z.string().min(1).max(160),
  sku: z.string().min(1).max(120),
  category_external_id: z.string().min(1).max(120),
  name: z.string().min(1).max(220),
  description: z.string().max(4000).optional().nullable(),
  unit_label: z.string().min(1).max(80).default("1 unit"),
  selling_price: z.number().nonnegative(),
  compare_at_price: z.number().nonnegative().optional().nullable(),
  tax_rate: z.number().min(0).max(100).optional(),
  image_url: z.string().url().optional().nullable(),
  tags: z.array(z.string().max(60)).max(20).optional(),
  is_active: z.boolean().optional(),
});

const inventorySchema = z.object({
  store_code: z.string().min(1).max(80),
  sku: z.string().min(1).max(120),
  stock_qty: z.number().nonnegative(),
  selling_price: z.number().nonnegative().optional().nullable(),
  is_available: z.boolean().optional(),
  updated_at: z.string().datetime().optional(),
});

export const erpCatalogueSchema = z.object({
  categories: z.array(categorySchema).max(500),
  products: z.array(productSchema).max(10000),
  inventory: z.array(inventorySchema).max(50000),
});

export type ErpCataloguePayload = z.infer<typeof erpCatalogueSchema>;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function erpPullConfigured() {
  return Boolean(process.env.ERP_API_BASE_URL && (process.env.ERP_API_TOKEN || process.env.ERP_API_KEY));
}

export async function pullErpCatalogue(): Promise<ErpCataloguePayload> {
  if (!erpPullConfigured()) throw new Error("erp_not_configured");
  const base = process.env.ERP_API_BASE_URL!.replace(/\/$/, "");
  const path = process.env.ERP_CATALOGUE_PATH ?? "/catalogue";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.ERP_API_TOKEN) {
    headers.Authorization = `${process.env.ERP_API_AUTH_SCHEME ?? "Bearer"} ${process.env.ERP_API_TOKEN}`;
  }
  if (process.env.ERP_API_KEY) headers[process.env.ERP_API_KEY_HEADER ?? "X-API-Key"] = process.env.ERP_API_KEY;

  const response = await fetch(`${base}${path.startsWith("/") ? path : `/${path}`}`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(Number(process.env.ERP_TIMEOUT_MS ?? 15000)),
  });
  if (!response.ok) throw new Error(`erp_http_${response.status}`);
  return erpCatalogueSchema.parse(await response.json());
}

export async function syncErpCatalogue(rawPayload: unknown) {
  const payload = erpCatalogueSchema.parse(rawPayload);
  const db = createServiceClient();
  const { data: run } = await db
    .from("erp_sync_runs")
    .insert({ status: "running", source: "erp" })
    .select("id")
    .single();

  try {
    if (payload.categories.length) {
      const { error } = await db.from("retail_categories").upsert(
        payload.categories.map((category, index) => ({
          external_id: category.external_id,
          slug: category.slug ?? slugify(category.name),
          name: category.name,
          description: category.description ?? null,
          image_url: category.image_url ?? null,
          display_order: category.display_order ?? index,
          is_active: category.is_active ?? true,
        })),
        { onConflict: "external_id" },
      );
      if (error) throw error;
    }

    const { data: categories, error: categoryError } = await db
      .from("retail_categories")
      .select("id, external_id");
    if (categoryError) throw categoryError;
    const categoryByExternalId = new Map((categories ?? []).map((row) => [row.external_id as string, row.id as string]));

    if (payload.products.length) {
      const productRows = payload.products.map((product) => {
        const categoryId = categoryByExternalId.get(product.category_external_id);
        if (!categoryId) throw new Error(`unknown_erp_category:${product.category_external_id}`);
        return {
          external_id: product.external_id,
          sku: product.sku,
          category_id: categoryId,
          name: product.name,
          description: product.description ?? null,
          unit_label: product.unit_label,
          selling_price: product.selling_price,
          compare_at_price: product.compare_at_price ?? null,
          tax_rate: product.tax_rate ?? 0,
          image_url: product.image_url ?? null,
          tags: product.tags ?? [],
          is_active: product.is_active ?? true,
          erp_payload: product,
        };
      });
      const { error } = await db.from("retail_products").upsert(productRows, { onConflict: "external_id" });
      if (error) throw error;
    }

    const [{ data: stores, error: storesError }, { data: products, error: productsError }] = await Promise.all([
      db.from("stores").select("id, erp_store_code").not("erp_store_code", "is", null),
      db.from("retail_products").select("id, sku"),
    ]);
    if (storesError) throw storesError;
    if (productsError) throw productsError;
    const storeByCode = new Map((stores ?? []).map((row) => [row.erp_store_code as string, row.id as string]));
    const productBySku = new Map((products ?? []).map((row) => [row.sku as string, row.id as string]));

    const inventoryRows = payload.inventory.flatMap((inventory) => {
      const storeId = storeByCode.get(inventory.store_code);
      const productId = productBySku.get(inventory.sku);
      if (!storeId || !productId) return [];
      return [{
        store_id: storeId,
        retail_product_id: productId,
        stock_qty: inventory.stock_qty,
        selling_price: inventory.selling_price ?? null,
        is_available: inventory.is_available ?? inventory.stock_qty > 0,
        external_updated_at: inventory.updated_at ?? new Date().toISOString(),
      }];
    });
    if (inventoryRows.length) {
      const { error } = await db.from("retail_inventory").upsert(inventoryRows, {
        onConflict: "store_id,retail_product_id",
      });
      if (error) throw error;
    }

    if (run?.id) {
      await db.from("erp_sync_runs").update({
        status: "completed",
        products_synced: payload.products.length,
        inventory_rows_synced: inventoryRows.length,
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
    }
    return { products_synced: payload.products.length, inventory_rows_synced: inventoryRows.length };
  } catch (error) {
    if (run?.id) {
      await db.from("erp_sync_runs").update({
        status: "failed",
        error_message: error instanceof Error ? error.message.slice(0, 1000) : "unknown_sync_error",
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
    }
    throw error;
  }
}

/** Export a paid order once. ERP_ORDER_WEBHOOK_URL can point directly to an
 * ERP endpoint or to an integration layer such as n8n/Make. */
export async function pushOrderToErp(orderId: string): Promise<boolean> {
  const endpoint = process.env.ERP_ORDER_WEBHOOK_URL;
  if (!endpoint) return false;
  const db = createServiceClient();
  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, total, subtotal, delivery_fee, discount, scheduled_date, erp_exported_at, stores(erp_store_code, name), customer_profiles(full_name, phone), customer_addresses(address_line, pincode), delivery_slots(start_time, end_time)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.erp_exported_at) return Boolean(order?.erp_exported_at);
  const { data: items } = await db
    .from("order_items")
    .select("quantity, unit_price, line_total, retail_product_id, sku_snapshot, product_name_snapshot, unit_label_snapshot, curated_basket_id, option_ids")
    .eq("order_id", orderId);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": order.id,
  };
  if (process.env.ERP_API_TOKEN) headers.Authorization = `${process.env.ERP_API_AUTH_SCHEME ?? "Bearer"} ${process.env.ERP_API_TOKEN}`;
  if (process.env.ERP_API_KEY) headers[process.env.ERP_API_KEY_HEADER ?? "X-API-Key"] = process.env.ERP_API_KEY;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(Number(process.env.ERP_TIMEOUT_MS ?? 15000)),
      body: JSON.stringify({
        event: "order.paid",
        order: {
          id: order.id,
          order_number: order.order_number,
          subtotal: Number(order.subtotal),
          delivery_fee: Number(order.delivery_fee),
          discount: Number(order.discount),
          total: Number(order.total),
          scheduled_date: order.scheduled_date,
          store: order.stores,
          customer: order.customer_profiles,
          address: order.customer_addresses,
          delivery_slot: order.delivery_slots,
          items: (items ?? []).map((item) => ({
            retail_product_id: item.retail_product_id,
            sku: item.sku_snapshot,
            name: item.product_name_snapshot,
            unit_label: item.unit_label_snapshot,
            curated_basket_id: item.curated_basket_id,
            option_ids: item.option_ids,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            line_total: Number(item.line_total),
          })),
        },
      }),
    });
    if (!response.ok) throw new Error(`erp_order_http_${response.status}`);
    const result = await response.json().catch(() => ({})) as { id?: string; order_id?: string };
    await db.from("orders").update({
      erp_order_id: result.order_id ?? result.id ?? order.order_number,
      erp_exported_at: new Date().toISOString(),
      erp_export_error: null,
    }).eq("id", order.id);
    return true;
  } catch (error) {
    await db.from("orders").update({
      erp_export_error: error instanceof Error ? error.message.slice(0, 500) : "erp_order_export_failed",
    }).eq("id", order.id);
    return false;
  }
}
