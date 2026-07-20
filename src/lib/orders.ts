import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { pushOrderToErp } from "@/lib/erp";
import { logNotification, sendWhatsAppTemplate, sendWhatsAppText } from "@/lib/whatsapp";

/**
 * Payment-driven order transitions (spec §5.4). Idempotent: re-delivered
 * webhooks or a verify call after the webhook are no-ops. Status history
 * rows are written automatically by the DB trigger.
 */

export async function markOrderPaid(params: {
  razorpayOrderId?: string;
  orderId?: string;
  razorpayPaymentId: string;
  method?: string;
  rawPayload?: unknown;
}): Promise<{ ok: boolean; already?: boolean; orderId?: string }> {
  const db = createServiceClient();

  const query = db.from("payments").select("id, order_id, status");
  const { data: payment } = params.razorpayOrderId
    ? await query.eq("razorpay_order_id", params.razorpayOrderId).maybeSingle()
    : await query.eq("order_id", params.orderId ?? "").maybeSingle();

  if (!payment) return { ok: false };
  if (payment.status === "captured") {
    return { ok: true, already: true, orderId: payment.order_id ?? undefined };
  }

  await db
    .from("payments")
    .update({
      status: "captured",
      razorpay_payment_id: params.razorpayPaymentId,
      method: params.method ?? null,
      raw_payload: (params.rawPayload as Record<string, unknown>) ?? null,
    })
    .eq("id", payment.id);

  if (payment.order_id) {
    const { data: order } = await db
      .from("orders")
      .select("id, status, coupon_code")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (order && order.status === "pending_payment") {
      await db.from("orders").update({ status: "confirmed" }).eq("id", order.id);
      await db.rpc("commit_retail_inventory", { order_id_in: order.id });
      // Burn a coupon use only on successful capture
      if (order.coupon_code) {
        await db.rpc("increment_coupon_use", { coupon_code_in: order.coupon_code });
      }
      // Favourite tracking (§5.10): bump order_count/last_ordered_at on
      // every saved combo in this order — feeds reorder prompts (§5.8)
      await db.rpc("record_combo_reorder", { order_id_in: order.id });
    }
  }

  return { ok: true, orderId: payment.order_id ?? undefined };
}

export async function markOrderPaymentFailed(params: {
  razorpayOrderId?: string;
  orderId?: string;
  rawPayload?: unknown;
}): Promise<{ ok: boolean; orderId?: string }> {
  const db = createServiceClient();

  const query = db.from("payments").select("id, order_id, status");
  const { data: payment } = params.razorpayOrderId
    ? await query.eq("razorpay_order_id", params.razorpayOrderId).maybeSingle()
    : await query.eq("order_id", params.orderId ?? "").maybeSingle();

  if (!payment) return { ok: false };
  // A capture always wins over a late/duplicate failure event
  if (payment.status === "captured") return { ok: true, orderId: payment.order_id ?? undefined };

  await db
    .from("payments")
    .update({
      status: "failed",
      raw_payload: (params.rawPayload as Record<string, unknown>) ?? null,
    })
    .eq("id", payment.id);

  if (payment.order_id) {
    await db
      .from("orders")
      .update({ status: "failed" })
      .eq("id", payment.order_id)
      .eq("status", "pending_payment");
    await db.rpc("release_retail_inventory", { order_id_in: payment.order_id });
  }

  return { ok: true, orderId: payment.order_id ?? undefined };
}

/**
 * Instant WhatsApp confirmation + receipt link on capture (spec §5.7:
 * "On captured: send WhatsApp confirmation + ETA"). Sent directly by the
 * platform so the customer hears back even if n8n is briefly down.
 */
export async function notifyOrderConfirmed(orderId: string) {
  const db = createServiceClient();
  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, customer_id, scheduled_date, customer_profiles(phone, whatsapp_opted_in), delivery_slots(start_time, end_time), stores(name)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const profile = order.customer_profiles as unknown as {
    phone: string;
    whatsapp_opted_in: boolean;
  } | null;
  if (!profile?.phone || !profile.whatsapp_opted_in) return;

  const notificationId = await claimOrderNotification({
    orderId,
    customerId: order.customer_id,
    type: "order_confirmation",
  });
  if (!notificationId) return;

  const slot = order.delivery_slots as unknown as {
    start_time: string;
    end_time: string;
  } | null;
  const store = order.stores as unknown as { name: string } | null;
  const eta = slot
    ? `between ${slot.start_time.slice(0, 5)} and ${slot.end_time.slice(0, 5)}`
    : "in your chosen slot";
  const receiptUrl = `${process.env.PLATFORM_URL ?? ""}/orders/${order.id}`;

  const sent = await sendWhatsAppText(
    profile.phone,
    `✅ Order ${order.order_number} confirmed! ${store?.name ?? "Aeden Fresh"} will deliver on ${order.scheduled_date} ${eta}.\n\nTrack + receipt: ${receiptUrl}`,
  );
  await db.from("notifications_log").update({ status: sent ? "sent" : "failed", sent_at: new Date().toISOString() }).eq("id", notificationId);
}

/** Send the paid order to the WhatsApp number of the routed store. */
export async function notifyStoreForFulfillment(orderId: string) {
  const db = createServiceClient();
  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, total, scheduled_date, customer_id, stores(name, phone, whatsapp_phone), customer_profiles(full_name, phone), customer_addresses(address_line, pincode), delivery_slots(start_time, end_time)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const store = order.stores as unknown as { name: string; phone: string | null; whatsapp_phone: string | null } | null;
  const storePhone = store?.whatsapp_phone || process.env.STORE_WHATSAPP_DEFAULT_NUMBER;
  if (!storePhone) return;
  const notificationId = await claimOrderNotification({ orderId, customerId: null, type: "store_dispatch" });
  if (!notificationId) return;

  const { data: items } = await db
    .from("order_items")
    .select("quantity, product_name_snapshot, unit_label_snapshot, curated_basket_id, option_ids")
    .eq("order_id", orderId);
  const lines = (items ?? []).map((item) => {
    const name = item.product_name_snapshot || (item.curated_basket_id ? "Chef-built bowl" : "Custom Aeden bowl");
    return `• ${item.quantity} × ${name}${item.unit_label_snapshot ? ` (${item.unit_label_snapshot})` : ""}`;
  });
  const customer = order.customer_profiles as unknown as { full_name: string | null; phone: string } | null;
  const address = order.customer_addresses as unknown as { address_line: string; pincode: string } | null;
  const slot = order.delivery_slots as unknown as { start_time: string; end_time: string } | null;
  const slotText = slot ? `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}` : "Next available slot";
  const trackingUrl = `${process.env.PLATFORM_URL ?? ""}/orders/${order.id}`;
  const message = [
    `🛍️ NEW PAID ORDER · ${order.order_number}`,
    `Store: ${store?.name ?? "Aeden Fresh"}`,
    "",
    ...lines,
    "",
    `Total: ₹${Number(order.total).toLocaleString("en-IN")}`,
    `Delivery: ${order.scheduled_date} · ${slotText}`,
    `Customer: ${customer?.full_name || "Customer"} · ${customer?.phone ?? "No phone"}`,
    `Address: ${address ? `${address.address_line}, ${address.pincode}` : "See order dashboard"}`,
    "",
    `Prepare, assign a delivery executive and update status: ${trackingUrl}`,
  ].join("\n");
  const sent = process.env.WHATSAPP_STORE_ORDER_TEMPLATE
    ? await sendWhatsAppTemplate(storePhone, process.env.WHATSAPP_STORE_ORDER_TEMPLATE, [
        order.order_number,
        store?.name ?? "Aeden Fresh",
        lines.join("; "),
        `₹${Number(order.total).toLocaleString("en-IN")}`,
        `${order.scheduled_date} · ${slotText}`,
        customer?.phone ?? "No phone",
        address ? `${address.address_line}, ${address.pincode}` : "See dashboard",
        trackingUrl,
      ])
    : await sendWhatsAppText(storePhone, message);
  await db.from("notifications_log").update({ status: sent ? "sent" : "failed", sent_at: new Date().toISOString() }).eq("id", notificationId);
}

/** Idempotent composite used by both Checkout verification and webhooks. */
export async function notifyPaidOrder(orderId: string) {
  await Promise.all([
    notifyOrderConfirmed(orderId),
    notifyStoreForFulfillment(orderId),
    pushOrderToErp(orderId),
  ]);
}

async function claimOrderNotification(params: {
  orderId: string;
  customerId: string | null;
  type: string;
}) {
  const db = createServiceClient();
  const { data, error } = await db
    .from("notifications_log")
    .insert({
      order_id: params.orderId,
      customer_id: params.customerId,
      channel: "whatsapp",
      type: params.type,
      status: "queued",
    })
    .select("id")
    .maybeSingle();
  if (error || !data) return null;
  return data.id as string;
}

/** Direct retry-link message on payment failure (first touch, instant). */
export async function notifyPaymentFailedDirect(orderId: string) {
  const db = createServiceClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, customer_id, customer_profiles(phone, whatsapp_opted_in)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;
  const profile = order.customer_profiles as unknown as {
    phone: string;
    whatsapp_opted_in: boolean;
  } | null;
  if (!profile?.phone || !profile.whatsapp_opted_in) return;

  const sent = await sendWhatsAppText(
    profile.phone,
    `Your payment for order ${order.order_number} didn't go through 😔 — retry here: ${process.env.PLATFORM_URL ?? ""}/orders/${order.id}`,
  );
  await logNotification({
    customerId: order.customer_id,
    orderId: order.id,
    type: "failed_payment",
    status: sent ? "sent" : "failed",
  });
}

/** Fire-and-forget: hand a failed payment to n8n's recovery workflow (§5.8). */
export async function notifyPaymentFailed(orderId: string) {
  const url = process.env.N8N_PAYMENT_FAILED_WEBHOOK_URL;
  if (!url) return;
  const db = createServiceClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, customer_id, customer_profiles(phone)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;
  const phone =
    (order.customer_profiles as unknown as { phone: string } | null)?.phone ?? null;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        phone,
        retry_link: `${process.env.PLATFORM_URL ?? ""}/orders/${order.id}`,
        attempt: 1,
      }),
    });
  } catch {
    /* n8n unreachable — recovery cron will still find the failed order */
  }
}
