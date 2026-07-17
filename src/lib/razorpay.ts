import "server-only";

import crypto from "crypto";

/**
 * Razorpay REST client (spec §5.6). Plain fetch + Basic auth — no SDK.
 * Raw card data never touches this server; Razorpay Checkout owns PCI scope.
 */

const BASE = "https://api.razorpay.com/v1";

function authHeader() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64");
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  receipt: string;
  status: string;
}

/** Create a Razorpay Order (web Checkout.js flow). Amount in INR. */
export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(params.amountInr * 100),
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });
  if (!res.ok) {
    throw new Error(`razorpay_order_failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as RazorpayOrder;
}

/** Create a Payment Link (WhatsApp flow — sent as a tappable URL). */
export async function createPaymentLink(params: {
  amountInr: number;
  description: string;
  contact?: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; short_url: string }> {
  const res = await fetch(`${BASE}/payment_links`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: Math.round(params.amountInr * 100),
      currency: "INR",
      description: params.description,
      customer: params.contact ? { contact: params.contact } : undefined,
      notify: { sms: false, email: false }, // WhatsApp delivery is n8n's job
      notes: params.notes ?? {},
    }),
  });
  if (!res.ok) {
    throw new Error(`razorpay_link_failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as { id: string; short_url: string };
}

function timingSafeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** Verify the Checkout.js success handler signature (order|payment HMAC). */
export function verifyCheckoutSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "")
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return timingSafeEqualHex(expected, params.signature);
}

/** Verify a webhook: HMAC of the RAW request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET ?? "")
    .update(rawBody)
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
}
