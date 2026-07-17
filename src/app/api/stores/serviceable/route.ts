import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/stores/serviceable — active stores and the pincodes they cover.
 * Powers the builder's "we deliver in…" hint and the no-coverage fallback
 * (spec §5.5: waitlist UX when an area isn't served yet). Public read.
 */
export async function GET() {
  const supabase = await createClient();

  const [{ data: stores, error: storesError }, { data: coverage, error: covError }] =
    await Promise.all([
      supabase.from("stores").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("store_pincode_coverage")
        .select("store_id, pincode")
        .eq("is_active", true),
    ]);

  if (storesError || covError) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const byStore = new Map<string, string[]>();
  for (const row of coverage ?? []) {
    const list = byStore.get(row.store_id as string) ?? [];
    list.push(row.pincode as string);
    byStore.set(row.store_id as string, list);
  }

  const areas = (stores ?? [])
    .map((s) => ({
      // "Aeden Fresh Kadavanthara" → "Kadavanthara" for display chips
      name: (s.name as string).replace(/^Aeden Fresh\s+/i, ""),
      pincodes: (byStore.get(s.id as string) ?? []).sort(),
    }))
    .filter((a) => a.pincodes.length > 0);

  return NextResponse.json({ areas });
}
