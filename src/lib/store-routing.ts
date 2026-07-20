import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

interface CoverageRow {
  delivery_fee: number;
  stores: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    whatsapp_phone: string | null;
    pincode: string;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
  };
}
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function resolveStoreForLocation(
  db: SupabaseClient,
  location: { pincode: string; latitude?: number | null; longitude?: number | null },
) {
  const { data, error } = await db
    .from("store_pincode_coverage")
    .select("delivery_fee, stores!inner(id, name, address, phone, whatsapp_phone, pincode, latitude, longitude, is_active)")
    .eq("pincode", location.pincode)
    .eq("is_active", true)
    .eq("stores.is_active", true);
  if (error) return { error: "lookup_failed" as const };

  const rows = (data ?? []) as unknown as CoverageRow[];
  if (!rows.length) return { error: "no_coverage" as const };
  const hasPoint = Number.isFinite(location.latitude) && Number.isFinite(location.longitude);

  rows.sort((a, b) => {
    if (hasPoint && a.stores.latitude != null && b.stores.latitude != null) {
      const distanceA = haversineKm(
        Number(location.latitude), Number(location.longitude),
        Number(a.stores.latitude), Number(a.stores.longitude),
      );
      const distanceB = haversineKm(
        Number(location.latitude), Number(location.longitude),
        Number(b.stores.latitude), Number(b.stores.longitude),
      );
      if (distanceA !== distanceB) return distanceA - distanceB;
    }
    return Number(a.delivery_fee) - Number(b.delivery_fee);
  });

  const best = rows[0];
  return {
    store: best.stores,
    delivery_fee: Number(best.delivery_fee),
  };
}
