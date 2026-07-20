import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { applyCoupon, priceOptionBuild } from "@/lib/pricing";
import {
  createPaymentLink,
  createRazorpayOrder,
  razorpayConfigured,
} from "@/lib/razorpay";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveStoreForLocation } from "@/lib/store-routing";

const itemSchema = z.object({
  option_ids: z.array(z.string().uuid()).min(1).max(30).optional(),
  curated_basket_id: z.string().uuid().optional(),
  saved_combo_id: z.string().uuid().optional(),
  retail_product_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(20).default(1),
});

const checkoutSchema = z.object({
  channel: z.enum(["web", "whatsapp"]).default("web"),
  phone: z.string().optional(), // whatsapp channel identity
  store_id: z.string().uuid().optional(),
  address_id: z.string().uuid(),
  delivery_slot_id: z.string().uuid().optional(),
  coupon_code: z.string().max(30).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(itemSchema).min(1).max(40),
});

/**
 * POST /api/cart/checkout (spec §5.4, §5.6, §6)
 *
 * Validates the cart SERVER-SIDE (prices recomputed from DB — the client
 * quote is never trusted), locks the store (§5.5: never re-routed after
 * creation), creates orders/order_items (pending_payment), and returns a
 * Razorpay order (web) or payment link (whatsapp).
 *
 * Auth: web = session cookie; whatsapp = x-n8n-secret header + phone.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // ── Resolve identity + DB client per channel ──────────────
  let db: SupabaseClient;
  let customerId: string;
  let customerPhone: string | undefined;

  const n8nSecret = request.headers.get("x-n8n-secret");
  if (input.channel === "whatsapp") {
    if (!process.env.N8N_API_SECRET || n8nSecret !== process.env.N8N_API_SECRET) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!input.phone) {
      return NextResponse.json({ error: "phone_required" }, { status: 400 });
    }
    db = createServiceClient();
    const { data: profile } = await db
      .from("customer_profiles")
      .select("id, phone")
      .eq("phone", input.phone)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: "unknown_customer" }, { status: 404 });
    }
    customerId = profile.id;
    customerPhone = profile.phone;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    db = supabase; // RLS-enforced for the web path
    customerId = user.id;
    customerPhone = user.phone ?? undefined;
  }

  // ── Address must belong to the customer; fee from coverage ──
  const { data: address } = await db
    .from("customer_addresses")
    .select("id, customer_id, pincode, latitude, longitude")
    .eq("id", input.address_id)
    .maybeSingle();
  if (!address || address.customer_id !== customerId) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const resolved = await resolveStoreForLocation(db, {
    pincode: address.pincode,
    latitude: address.latitude == null ? null : Number(address.latitude),
    longitude: address.longitude == null ? null : Number(address.longitude),
  });
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error, message: "No Aeden store currently delivers to that address" },
      { status: resolved.error === "no_coverage" ? 400 : 500 },
    );
  }
  const storeId = resolved.store.id;
  const deliveryFee = resolved.delivery_fee;

  // A slot selected for an earlier location must never leak into a newly
  // routed store order.
  let deliverySlotId: string | null = null;
  if (input.delivery_slot_id) {
    const { data: slot } = await db
      .from("delivery_slots")
      .select("id")
      .eq("id", input.delivery_slot_id)
      .eq("store_id", storeId)
      .eq("is_active", true)
      .maybeSingle();
    deliverySlotId = slot?.id ?? null;
  }

  // ── Price every line server-side ───────────────────────────
  let subtotal = 0;
  const pricedItems: {
    option_ids: string[] | null;
    curated_basket_id: string | null;
    saved_combo_id: string | null;
    retail_product_id: string | null;
    product_name_snapshot: string | null;
    sku_snapshot: string | null;
    unit_label_snapshot: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[] = [];

  for (const item of input.items) {
    let unitPrice: number;
    let retailSnapshot: { name: string; sku: string; unitLabel: string } | null = null;
    if (item.option_ids?.length) {
      const priced = await priceOptionBuild(db, item.option_ids);
      if ("error" in priced) {
        return NextResponse.json({ error: priced.error }, { status: 400 });
      }
      const { data: unavailable } = await db
        .from("store_inventory")
        .select("product_option_id, stock_qty, is_available")
        .eq("store_id", storeId)
        .in("product_option_id", item.option_ids);
      if ((unavailable ?? []).some((row) => !row.is_available || (row.stock_qty != null && Number(row.stock_qty) <= 0))) {
        return NextResponse.json({ error: "option_unavailable" }, { status: 409 });
      }
      unitPrice = priced.unitPrice;
    } else if (item.curated_basket_id) {
      const { data: basket } = await db
        .from("curated_baskets")
        .select("base_price, is_active")
        .eq("id", item.curated_basket_id)
        .maybeSingle();
      if (!basket || !basket.is_active) {
        return NextResponse.json({ error: "unknown_basket" }, { status: 400 });
      }
      unitPrice = Number(basket.base_price);
    } else if (item.retail_product_id) {
      const [{ data: product }, { data: inventory }] = await Promise.all([
        db
          .from("retail_products")
          .select("id, sku, name, unit_label, selling_price, is_active")
          .eq("id", item.retail_product_id)
          .maybeSingle(),
        db
          .from("retail_inventory")
          .select("stock_qty, reserved_qty, selling_price, is_available")
          .eq("store_id", storeId)
          .eq("retail_product_id", item.retail_product_id)
          .maybeSingle(),
      ]);
      const availableQuantity = inventory
        ? Number(inventory.stock_qty) - Number(inventory.reserved_qty)
        : 0;
      if (!product?.is_active) {
        return NextResponse.json({ error: "unknown_retail_product" }, { status: 400 });
      }
      if (!inventory?.is_available || availableQuantity < item.quantity) {
        return NextResponse.json({ error: "retail_out_of_stock", product_id: item.retail_product_id }, { status: 409 });
      }
      unitPrice = Number(inventory.selling_price ?? product.selling_price);
      retailSnapshot = { name: product.name, sku: product.sku, unitLabel: product.unit_label };
    } else {
      return NextResponse.json(
        { error: "invalid_body", message: "item needs option_ids, curated_basket_id or retail_product_id" },
        { status: 400 },
      );
    }
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    pricedItems.push({
      option_ids: item.option_ids ?? null,
      curated_basket_id: item.curated_basket_id ?? null,
      saved_combo_id: item.saved_combo_id ?? null,
      retail_product_id: item.retail_product_id ?? null,
      product_name_snapshot: retailSnapshot?.name ?? null,
      sku_snapshot: retailSnapshot?.sku ?? null,
      unit_label_snapshot: retailSnapshot?.unitLabel ?? null,
      quantity: item.quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    });
  }

  // ── Coupon ─────────────────────────────────────────────────
  const coupon = await applyCoupon(db, input.coupon_code, subtotal);
  if (coupon.error) {
    return NextResponse.json({ error: coupon.error }, { status: 400 });
  }
  const total = subtotal + deliveryFee - coupon.discount;

  // ── Create the order (store locked in here — never re-routed) ──
  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({
      customer_id: customerId,
      store_id: storeId,
      address_id: input.address_id,
      delivery_slot_id: deliverySlotId,
      order_type: "one_time",
      channel: input.channel,
      status: "pending_payment",
      subtotal,
      delivery_fee: deliveryFee,
      discount: coupon.discount,
      total,
      coupon_code: coupon.code,
      scheduled_date: input.scheduled_date ?? new Date().toISOString().slice(0, 10),
    })
    .select("id, order_number, total")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "order_create_failed" }, { status: 500 });
  }

  const service = createServiceClient();
  const retailQuantities = new Map<string, number>();
  for (const item of pricedItems) {
    if (item.retail_product_id) {
      retailQuantities.set(
        item.retail_product_id,
        (retailQuantities.get(item.retail_product_id) ?? 0) + item.quantity,
      );
    }
  }
  if (retailQuantities.size) {
    const { error: reservationError } = await service.rpc("reserve_retail_inventory", {
      order_id_in: order.id,
      store_id_in: storeId,
      items_in: Array.from(retailQuantities, ([product_id, quantity]) => ({ product_id, quantity })),
    });
    if (reservationError) {
      await service.from("orders").delete().eq("id", order.id);
      return NextResponse.json({ error: "retail_out_of_stock" }, { status: 409 });
    }
  }

  const { error: itemsError } = await db
    .from("order_items")
    .insert(pricedItems.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    if (retailQuantities.size) {
      await service.rpc("release_retail_inventory", { order_id_in: order.id });
    }
    await service.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "order_items_failed" }, { status: 500 });
  }

  // Converted-cart signal — the abandoned-cart cron (§5.8) treats any
  // cart_activity without a later order_placed as abandoned.
  await db.from("analytics_events").insert({
    customer_id: customerId,
    event_name: "order_placed",
    properties: { order_id: order.id, channel: input.channel, total, store_id: storeId, retail_items: retailQuantities.size },
  });

  // ── Razorpay ───────────────────────────────────────────────
  if (!razorpayConfigured()) {
    return NextResponse.json(
      {
        order: { id: order.id, order_number: order.order_number, total },
        payment: null,
        message: "payment_gateway_not_configured",
      },
      { status: 201 },
    );
  }

  try {
    if (input.channel === "whatsapp") {
      const link = await createPaymentLink({
        amountInr: total,
        description: `Aeden Fresh order ${order.order_number}`,
        contact: customerPhone,
        notes: { order_id: order.id },
      });
      await service.from("payments").insert({
        order_id: order.id,
        razorpay_order_id: link.id,
        amount: total,
        status: "created",
      });
      return NextResponse.json(
        {
          order: { id: order.id, order_number: order.order_number, total },
          payment: { type: "link", url: link.short_url },
        },
        { status: 201 },
      );
    }

    const rzpOrder = await createRazorpayOrder({
      amountInr: total,
      receipt: order.order_number,
      notes: { order_id: order.id },
    });
    await service.from("payments").insert({
      order_id: order.id,
      razorpay_order_id: rzpOrder.id,
      amount: total,
      status: "created",
    });
    return NextResponse.json(
      {
        order: { id: order.id, order_number: order.order_number, total },
        payment: {
          type: "checkout",
          razorpay_order_id: rzpOrder.id,
          key_id: process.env.RAZORPAY_KEY_ID,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
        },
      },
      { status: 201 },
    );
  } catch {
    // Order exists but gateway failed — order stays pending_payment;
    // customer can retry from the order page.
    return NextResponse.json(
      {
        order: { id: order.id, order_number: order.order_number, total },
        payment: null,
        message: "payment_gateway_error",
      },
      { status: 502 },
    );
  }
}
