import { NextRequest, NextResponse } from "next/server";

import {
  markOrderPaid,
  markOrderPaymentFailed,
  notifyPaidOrder,
  notifyPaymentFailed,
  notifyPaymentFailedDirect,
} from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: {
      entity?: {
        id: string;
        order_id?: string;
        method?: string;
        notes?: Record<string, string>;
      };
    };
    payment_link?: {
      entity?: {
        id: string;
        notes?: Record<string, string>;
      };
    };
  };
}

/**
 * POST /api/webhooks/razorpay (spec §5.6)
 *
 * Signature verification is MANDATORY — HMAC-SHA256 of the raw body with
 * RAZORPAY_WEBHOOK_SECRET. Handlers are idempotent (Razorpay retries
 * deliveries): a re-delivered capture is a no-op, and a late failure event
 * never downgrades a captured payment.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;

  switch (event.event) {
    case "payment.captured": {
      if (!payment) break;
      const result = await markOrderPaid({
        // Checkout.js flow → razorpay order id; payment-link flow → notes
        razorpayOrderId: payment.order_id,
        orderId: payment.notes?.order_id,
        razorpayPaymentId: payment.id,
        method: payment.method,
        rawPayload: event,
      });
      // Instant WhatsApp confirmation + ETA (§5.7) — once, not on re-delivery
      if (result.ok && result.orderId) {
        await notifyPaidOrder(result.orderId);
      }
      break;
    }
    case "payment.failed": {
      if (!payment) break;
      const result = await markOrderPaymentFailed({
        razorpayOrderId: payment.order_id,
        orderId: payment.notes?.order_id,
        rawPayload: event,
      });
      if (result.orderId) {
        await notifyPaymentFailedDirect(result.orderId); // instant retry link
        await notifyPaymentFailed(result.orderId); // n8n recovery follow-ups
      }
      break;
    }
    case "payment_link.paid": {
      // Redundant with payment.captured (also fired for link payments) —
      // handled for completeness; markOrderPaid is idempotent.
      const link = event.payload?.payment_link?.entity;
      if (link?.notes?.order_id && payment?.id) {
        const result = await markOrderPaid({
          orderId: link.notes.order_id,
          razorpayPaymentId: payment.id,
          rawPayload: event,
        });
        if (result.ok && result.orderId) await notifyPaidOrder(result.orderId);
      }
      break;
    }
    default:
      // Unhandled events are acknowledged so Razorpay stops retrying.
      break;
  }

  return NextResponse.json({ received: true });
}
