import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  firstDeliveryDate,
  isValidCustomDays,
  todayIst,
} from "@/lib/subscriptions";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  saved_combo_id: z.string().uuid(),
  store_id: z.string().uuid(),
  address_id: z.string().uuid(),
  delivery_slot_id: z.string().uuid().optional(),
  frequency: z.enum(["daily", "weekly", "alternate_days", "custom"]),
  custom_days: z.array(z.string()).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * POST /api/subscriptions (spec §5.3) — create a subscription from a saved
 * combo. `next_delivery_date` is computed SERVER-SIDE. Auth: session
 * (RLS additionally guards every row touched).
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (input.frequency === "custom" && !isValidCustomDays(input.custom_days)) {
    return NextResponse.json(
      { error: "invalid_body", message: "custom frequency needs custom_days (mon…sun)" },
      { status: 400 },
    );
  }

  // Combo must exist and belong to the caller (RLS scopes the read)
  const { data: combo } = await supabase
    .from("saved_combos")
    .select("id, customer_id")
    .eq("id", input.saved_combo_id)
    .maybeSingle();
  if (!combo || combo.customer_id !== user.id) {
    return NextResponse.json({ error: "unknown_combo" }, { status: 400 });
  }

  // Address must belong to the caller and be covered by the store
  const { data: address } = await supabase
    .from("customer_addresses")
    .select("id, customer_id, pincode")
    .eq("id", input.address_id)
    .maybeSingle();
  if (!address || address.customer_id !== user.id) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  const { data: coverage } = await supabase
    .from("store_pincode_coverage")
    .select("id")
    .eq("store_id", input.store_id)
    .eq("pincode", address.pincode)
    .eq("is_active", true)
    .maybeSingle();
  if (!coverage) {
    return NextResponse.json({ error: "no_coverage" }, { status: 400 });
  }

  const today = todayIst();
  let start = input.start_date ?? today;
  if (start <= today) start = today; // never schedule into the past
  const firstDelivery = firstDeliveryDate(
    input.frequency,
    start,
    (input.custom_days ?? null) as never,
  );

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert({
      customer_id: user.id,
      saved_combo_id: input.saved_combo_id,
      store_id: input.store_id,
      address_id: input.address_id,
      delivery_slot_id: input.delivery_slot_id ?? null,
      frequency: input.frequency,
      custom_days: input.frequency === "custom" ? input.custom_days : null,
      status: "active",
      next_delivery_date: firstDelivery,
    })
    .select("id, frequency, next_delivery_date, status")
    .single();

  if (error || !subscription) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  await supabase.from("analytics_events").insert({
    customer_id: user.id,
    event_name: "subscription_started",
    properties: { subscription_id: subscription.id, frequency: input.frequency },
  });

  return NextResponse.json({ subscription }, { status: 201 });
}
