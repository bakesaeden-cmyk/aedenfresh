import { NextResponse } from "next/server";

import { revenueSummary } from "@/lib/analytics";
import { createClient, getAdminUser } from "@/lib/supabase/server";

/**
 * GET /api/admin/dashboard/revenue (spec §6) — GMV / MRR / top-combo
 * aggregates. Admin-only: role checked server-side here AND every query
 * runs through the caller's RLS-scoped client (defense in depth) — a
 * store_manager gets numbers for their store only.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  try {
    const summary = await revenueSummary(supabase);
    return NextResponse.json({ scope: admin.store_id ?? "all_stores", ...summary });
  } catch {
    return NextResponse.json({ error: "aggregation_failed" }, { status: 500 });
  }
}
