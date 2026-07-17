import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const comboSchema = z.object({
  name: z.string().trim().max(80).optional(),
  combo_type: z.enum(["salad", "basket"]),
  option_ids: z.array(z.string().uuid()).min(1).max(30).optional(),
  curated_basket_id: z.string().uuid().optional(),
  portion_size: z.string().max(40).optional(),
});

/**
 * POST /api/combos — save a built combo for the signed-in customer
 * (spec §5.2 completion step). Guests get 401 and keep the combo in
 * local state until they sign in.
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

  const parsed = comboSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }
  const combo = parsed.data;

  if (!combo.option_ids && !combo.curated_basket_id) {
    return NextResponse.json(
      { error: "invalid_body", message: "option_ids or curated_basket_id required" },
      { status: 400 },
    );
  }

  // Auto-name: "My Salad #n"
  let name = combo.name;
  if (!name) {
    const { count } = await supabase
      .from("saved_combos")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id);
    name = `My ${combo.combo_type === "salad" ? "Salad" : "Basket"} #${(count ?? 0) + 1}`;
  }

  const { data, error } = await supabase
    .from("saved_combos")
    .insert({
      customer_id: user.id,
      name,
      combo_type: combo.combo_type,
      option_ids: combo.option_ids ?? null,
      curated_basket_id: combo.curated_basket_id ?? null,
      portion_size: combo.portion_size ?? null,
    })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  // Lightweight analytics event (public insert policy)
  await supabase.from("analytics_events").insert({
    customer_id: user.id,
    event_name: "combo_built",
    properties: { combo_id: data.id, combo_type: combo.combo_type },
  });

  return NextResponse.json({ combo: data }, { status: 201 });
}

/** GET /api/combos — the signed-in customer's saved combos (RLS-scoped). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_combos")
    .select(
      "id, name, combo_type, option_ids, curated_basket_id, portion_size, order_count, last_ordered_at, created_at",
    )
    .eq("customer_id", user.id)
    .order("order_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  return NextResponse.json({ combos: data ?? [] });
}
