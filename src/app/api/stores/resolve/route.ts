import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

interface CoverageRow {
  delivery_fee: number;
  stores: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
  };
}

/** Haversine distance in km between two lat/lng points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * GET /api/stores/resolve?pincode=682020[&lat=&lng=]
 *
 * PIN-code based nearest-store routing (spec §5.5). Pure lookup —
 * no hardcoded store logic; works identically at 5 or 100 stores.
 * Multiple covering stores → lowest delivery_fee wins; ties broken
 * by haversine distance when the caller provides lat/lng.
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
  const { data, error } = await supabase
    .from("store_pincode_coverage")
    .select(
      "delivery_fee, stores!inner(id, name, address, phone, pincode, latitude, longitude, is_active)",
    )
    .eq("pincode", pincode)
    .eq("is_active", true)
    .eq("stores.is_active", true);

  if (error) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as CoverageRow[];
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "no_coverage", message: "Not yet available in your area" },
      { status: 404 },
    );
  }

  rows.sort((a, b) => {
    const feeDiff = Number(a.delivery_fee) - Number(b.delivery_fee);
    if (feeDiff !== 0) return feeDiff;
    if (hasPoint && a.stores.latitude != null && b.stores.latitude != null) {
      return (
        haversineKm(lat, lng, Number(a.stores.latitude), Number(a.stores.longitude)) -
        haversineKm(lat, lng, Number(b.stores.latitude), Number(b.stores.longitude))
      );
    }
    return 0;
  });

  const best = rows[0];
  return NextResponse.json({
    store: {
      id: best.stores.id,
      name: best.stores.name,
      address: best.stores.address,
      phone: best.stores.phone,
      pincode: best.stores.pincode,
      latitude: best.stores.latitude,
      longitude: best.stores.longitude,
    },
    delivery_fee: Number(best.delivery_fee),
  });
}
