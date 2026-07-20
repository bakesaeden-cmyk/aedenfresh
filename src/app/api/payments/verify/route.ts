import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { markOrderPaid, notifyPaidOrder } from "@/lib/orders";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { createClient } from "@/lib/supabase/server";

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

/**
 * POST /api/payments/verify — Checkout.js success-handler verification.
 * Fast UX confirmation; the webhook remains the source of truth (this and
 * the webhook are both idempotent, so either may land first).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  const valid = verifyCheckoutSignature({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!valid) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const result = await markOrderPaid({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });
  if (!result.ok) {
    return NextResponse.json({ error: "payment_not_found" }, { status: 404 });
  }
  if (result.orderId) await notifyPaidOrder(result.orderId);

  return NextResponse.json({ ok: true, order_id: result.orderId });
}
