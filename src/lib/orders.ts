import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { logNotification, sendWhatsAppText } from "@/lib/whatsapp";

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
  await logNotification({
    customerId: order.customer_id,
    type: "delivery_update",
    status: sent ? "sent" : "failed",
  });
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
