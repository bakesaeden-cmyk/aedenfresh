import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveStoreForLocation } from "@/lib/store-routing";

/**
 * GET /api/stores/resolve?pincode=682020[&lat=&lng=]
 *
 * PIN-code based nearest-store routing (spec §5.5). Pure lookup —
 * no hardcoded store logic; works identically at 5 or 100 stores.
 * Multiple covering stores → closest physical store when coordinates are
 * available, otherwise the lowest delivery fee wins.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pincode = searchParams.get("pincode") ?? "";

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: "invalid_pincode" }, { status: 400 });
  }

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  const supabase = await createClient();
  const resolved = await resolveStoreForLocation(supabase, {
    pincode,
    latitude: hasPoint ? lat : null,
    longitude: hasPoint ? lng : null,
  });
  if ("error" in resolved && resolved.error === "lookup_failed") {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if ("error" in resolved) {
    return NextResponse.json(
      { error: "no_coverage", message: "Not yet available in your area" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    store: resolved.store,
    delivery_fee: resolved.delivery_fee,
  });
}
