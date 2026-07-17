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

const itemSchema = z.object({
  option_ids: z.array(z.string().uuid()).min(1).max(30).optional(),
  curated_basket_id: z.string().uuid().optional(),
  saved_combo_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(20).default(1),
});

const checkoutSchema = z.object({
  channel: z.enum(["web", "whatsapp"]).default("web"),
  phone: z.string().optional(), // whatsapp channel identity
  store_id: z.string().uuid(),
  address_id: z.string().uuid(),
  delivery_slot_id: z.string().uuid().optional(),
  coupon_code: z.string().max(30).optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(itemSchema).min(1).max(10),
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
    .select("id, customer_id, pincode")
    .eq("id", input.address_id)
    .maybeSingle();
  if (!address || address.customer_id !== customerId) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const { data: coverage } = await db
    .from("store_pincode_coverage")
    .select("delivery_fee")
    .eq("store_id", input.store_id)
    .eq("pincode", address.pincode)
    .eq("is_active", true)
    .maybeSingle();
  if (!coverage) {
    return NextResponse.json(
      { error: "no_coverage", message: "This store does not deliver to that address" },
      { status: 400 },
    );
  }
  const deliveryFee = Number(coverage.delivery_fee);

  // ── Price every line server-side ───────────────────────────
  let subtotal = 0;
  const pricedItems: {
    option_ids: string[] | null;
    curated_basket_id: string | null;
    saved_combo_id: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[] = [];

  for (const item of input.items) {
    let unitPrice: number;
    if (item.option_ids?.length) {
      const priced = await priceOptionBuild(db, item.option_ids);
      if ("error" in priced) {
        return NextResponse.json({ error: priced.error }, { status: 400 });
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
    } else {
      return NextResponse.json(
        { error: "invalid_body", message: "item needs option_ids or curated_basket_id" },
        { status: 400 },
      );
    }
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    pricedItems.push({
      option_ids: item.option_ids ?? null,
      curated_basket_id: item.curated_basket_id ?? null,
      saved_combo_id: item.saved_combo_id ?? null,
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
      store_id: input.store_id,
      address_id: input.address_id,
      delivery_slot_id: input.delivery_slot_id ?? null,
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

  const { error: itemsError } = await db
    .from("order_items")
    .insert(pricedItems.map((i) => ({ ...i, order_id: order.id })));
  if (itemsError) {
    return NextResponse.json({ error: "order_items_failed" }, { status: 500 });
  }

  // Converted-cart signal — the abandoned-cart cron (§5.8) treats any
  // cart_activity without a later order_placed as abandoned.
  await db.from("analytics_events").insert({
    customer_id: customerId,
    event_name: "order_placed",
    properties: { order_id: order.id, channel: input.channel, total },
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

  const service = createServiceClient(); // payments table is service-role only
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
