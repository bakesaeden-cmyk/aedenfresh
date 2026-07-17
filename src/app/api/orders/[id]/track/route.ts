import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/orders/:id/track (spec §6) — status + history.
 * Auth: session (RLS scopes to owner/admin) OR x-n8n-secret (WhatsApp bot).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const n8nSecret = request.headers.get("x-n8n-secret");
  const isN8n =
    Boolean(process.env.N8N_API_SECRET) && n8nSecret === process.env.N8N_API_SECRET;

  const db = isN8n ? createServiceClient() : await createClient();

  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, status, order_type, channel, subtotal, delivery_fee, discount, total, coupon_code, scheduled_date, created_at, stores(name), delivery_slots(start_time, end_time)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: history } = await db
    .from("order_status_history")
    .select("status, note, changed_at")
    .eq("order_id", id)
    .order("changed_at", { ascending: true });

  return NextResponse.json({ order, history: history ?? [] });
}
