import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/admin";

/**
 * WhatsApp Cloud API webhook (spec §5.7, §6).
 *
 * GET  — Meta's subscription handshake: echo `hub.challenge` when
 *        `hub.verify_token` matches WHATSAPP_WEBHOOK_VERIFY_TOKEN.
 * POST — verify `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with the
 *        Meta App Secret), log inbound messages, and forward the payload to
 *        the n8n state machine. Returns 200 immediately — Meta retries on
 *        anything else, and conversation latency belongs to n8n.
 *
 * Register THIS endpoint as the callback URL in the Meta App Dashboard —
 * it handles the GET handshake that n8n's webhook node can't.
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

interface MetaWebhookBody {
  entry?: {
    changes?: {
      value?: {
        messages?: {
          from?: string;
          type?: string;
        }[];
      };
    }[];
  }[];
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Signature verification is mandatory when the app secret is configured
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const header = request.headers.get("x-hub-signature-256") ?? "";
    const expected =
      "sha256=" +
      crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(header, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  } else {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  let body: MetaWebhookBody;
  try {
    body = JSON.parse(rawBody) as MetaWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Log inbound messages (status callbacks etc. carry no `messages`)
  const messages =
    body.entry?.flatMap(
      (e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? [],
    ) ?? [];
  if (messages.length > 0) {
    const db = createServiceClient();
    await db.from("whatsapp_messages_log").insert(
      messages.map((m) => ({
        phone: m.from ?? null,
        direction: "inbound",
        message_type: m.type ?? "unknown",
        content: body as unknown as Record<string, unknown>,
      })),
    );
  }

  // Forward to the n8n conversation workflow (fire-and-forget)
  const forwardUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL;
  if (forwardUrl && messages.length > 0) {
    try {
      await fetch(forwardUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: rawBody,
      });
    } catch {
      // n8n unreachable — message is logged; the abandoned-session cron
      // will re-engage the customer.
    }
  }

  return NextResponse.json({ received: true });
}
