import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";

/**
 * WhatsApp Cloud API — outbound helper (spec §5.7).
 * The conversational state machine lives in n8n; the platform sends only
 * transactional messages it owns end-to-end (order confirmed, payment
 * retry) so customers get instant feedback even if n8n is briefly down.
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
  );
}

/** Send a plain text message. Returns true when accepted by Meta. */
export async function sendWhatsAppText(
  phone: string,
  body: string,
): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/^\+/, ""),
          type: "text",
          text: { body },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Send an approved utility template (safe outside the 24-hour chat window). */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  parameters: string[],
): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  try {
    const res = await fetch(
      `${GRAPH_BASE}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/\D/g, ""),
          type: "template",
          template: {
            name: templateName,
            language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en" },
            components: [{
              type: "body",
              parameters: parameters.map((text) => ({ type: "text", text })),
            }],
          },
        }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Log a customer notification (dedup source for automation crons, §5.8). */
export async function logNotification(params: {
  customerId: string | null;
  orderId?: string | null;
  type: string;
  status: "sent" | "failed" | "queued";
}) {
  const db = createServiceClient();
  await db.from("notifications_log").insert({
    customer_id: params.customerId,
    order_id: params.orderId ?? null,
    channel: "whatsapp",
    type: params.type,
    status: params.status,
  });
}
