import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isValidCustomDays,
  nextDeliveryDate,
  todayIst,
  type DayKey,
  type Frequency,
} from "@/lib/subscriptions";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const patchSchema = z.object({
  action: z.enum(["skip", "pause", "resume", "cancel", "change_frequency"]),
  phone: z.string().optional(), // n8n/WhatsApp identity
  pause_days: z.number().int().min(1).max(60).optional(),
  paused_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  frequency: z.enum(["daily", "weekly", "alternate_days", "custom"]).optional(),
  custom_days: z.array(z.string()).optional(),
});

/**
 * PATCH /api/subscriptions/:id (spec §5.3/§6) —
 * skip / pause / resume / cancel / change_frequency.
 *
 * Auth: session (RLS scopes to owner) or x-n8n-secret + phone (WhatsApp:
 * "skip"/"pause my subscription" — ownership checked against the phone).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // ── Resolve client + ownership per channel ─────────────────
  let db: SupabaseClient;
  const n8nSecret = request.headers.get("x-n8n-secret");
  const isN8n =
    Boolean(process.env.N8N_API_SECRET) && n8nSecret === process.env.N8N_API_SECRET;

  if (isN8n) {
    if (!input.phone) {
      return NextResponse.json({ error: "phone_required" }, { status: 400 });
    }
    db = createServiceClient();
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    db = supabase; // RLS enforces ownership on every statement below
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select(
      "id, customer_id, status, frequency, custom_days, next_delivery_date, paused_until, customer_profiles(phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (isN8n) {
    const ownerPhone =
      (sub.customer_profiles as unknown as { phone: string } | null)?.phone;
    if (!ownerPhone || ownerPhone !== input.phone) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }
  if (sub.status === "cancelled") {
    return NextResponse.json({ error: "already_cancelled" }, { status: 409 });
  }

  const today = todayIst();
  const frequency = sub.frequency as Frequency;
  const customDays = (sub.custom_days ?? null) as DayKey[] | null;
  let update: Record<string, unknown>;

  switch (input.action) {
    case "skip": {
      // Skip exactly one occurrence
      const from = (sub.next_delivery_date as string) ?? today;
      update = { next_delivery_date: nextDeliveryDate(frequency, from, customDays) };
      break;
    }
    case "pause": {
      const until =
        input.paused_until ??
        new Date(new Date(`${today}T00:00:00Z`).getTime() + (input.pause_days ?? 7) * 86400000)
          .toISOString()
          .slice(0, 10);
      if (until <= today) {
        return NextResponse.json({ error: "invalid_pause_date" }, { status: 400 });
      }
      update = { status: "paused", paused_until: until };
      break;
    }
    case "resume": {
      update = {
        status: "active",
        paused_until: null,
        // Next occurrence strictly after today
        next_delivery_date: nextDeliveryDate(frequency, today, customDays),
      };
      break;
    }
    case "cancel": {
      update = { status: "cancelled" };
      break;
    }
    case "change_frequency": {
      if (!input.frequency) {
        return NextResponse.json({ error: "frequency_required" }, { status: 400 });
      }
      if (input.frequency === "custom" && !isValidCustomDays(input.custom_days)) {
        return NextResponse.json({ error: "invalid_custom_days" }, { status: 400 });
      }
      update = {
        frequency: input.frequency,
        custom_days: input.frequency === "custom" ? input.custom_days : null,
        next_delivery_date: nextDeliveryDate(
          input.frequency,
          today,
          (input.custom_days ?? null) as DayKey[] | null,
        ),
      };
      break;
    }
  }

  const { data: updated, error } = await db
    .from("subscriptions")
    .update(update)
    .eq("id", id)
    .select("id, status, frequency, custom_days, next_delivery_date, paused_until")
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ subscription: updated });
}
