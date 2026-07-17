import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { priceOptionBuild } from "@/lib/pricing";

/**
 * Admin revenue aggregates (spec §5.9) — shared by the /admin dashboard
 * page and GET /api/admin/dashboard/revenue. Queries run through the
 * caller's RLS-scoped client, so a store_manager automatically sees only
 * their store's numbers.
 */

const PAID_STATUSES = ["confirmed", "preparing", "out_for_delivery", "delivered"];

/** Deliveries per month by frequency (custom = days/week × 4.33). */
function deliveriesPerMonth(frequency: string, customDays: string[] | null): number {
  switch (frequency) {
    case "daily":
      return 30;
    case "alternate_days":
      return 15;
    case "weekly":
      return 4.33;
    case "custom":
      return (customDays?.length ?? 1) * 4.33;
    default:
      return 0;
  }
}

export interface RevenueSummary {
  gmv: { today: number; last7: number; last30: number };
  orders: { today: number; last30: number; byStatus: Record<string, number> };
  subscriptions: { active: number; paused: number; mrrEstimate: number };
  topCombos: { label: string; orders: number; revenue: number }[];
}

export async function revenueSummary(db: SupabaseClient): Promise<RevenueSummary> {
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  // ── Orders (last 30 days, capped) ─────────────────────────
  const { data: orderRows } = await db
    .from("orders")
    .select("id, total, status, created_at")
    .gte("created_at", since30)
    .order("created_at", { ascending: false })
    .limit(2000);
  const orders = orderRows ?? [];

  const byStatus: Record<string, number> = {};
  let gmvToday = 0;
  let gmv7 = 0;
  let gmv30 = 0;
  let ordersToday = 0;

  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    const day = String(o.created_at).slice(0, 10);
    if (day === today) ordersToday++;
    if (!PAID_STATUSES.includes(o.status)) continue;
    const total = Number(o.total);
    gmv30 += total;
    if (day >= since7) gmv7 += total;
    if (day === today) gmvToday += total;
  }

  // ── Subscriptions + MRR estimate ──────────────────────────
  const { data: subRows } = await db
    .from("subscriptions")
    .select("id, status, frequency, custom_days, saved_combos(option_ids, curated_basket_id)")
    .in("status", ["active", "paused"])
    .limit(500);
  const subs = subRows ?? [];

  const active = subs.filter((s) => s.status === "active");
  const priceCache = new Map<string, number>();
  let mrr = 0;

  for (const sub of active) {
    const combo = sub.saved_combos as unknown as {
      option_ids: string[] | null;
      curated_basket_id: string | null;
    } | null;
    if (!combo) continue;

    const cacheKey = combo.curated_basket_id ?? (combo.option_ids ?? []).join(",");
    let unit = priceCache.get(cacheKey);
    if (unit == null) {
      if (combo.option_ids?.length) {
        const priced = await priceOptionBuild(db, combo.option_ids);
        unit = "error" in priced ? 0 : priced.unitPrice;
      } else if (combo.curated_basket_id) {
        const { data: basket } = await db
          .from("curated_baskets")
          .select("base_price")
          .eq("id", combo.curated_basket_id)
          .maybeSingle();
        unit = Number(basket?.base_price ?? 0);
      } else {
        unit = 0;
      }
      priceCache.set(cacheKey, unit);
    }
    mrr +=
      unit *
      deliveriesPerMonth(sub.frequency as string, (sub.custom_days ?? null) as string[] | null);
  }

  // ── Top combos (paid orders, last 30 days) ────────────────
  const paidIds = orders.filter((o) => PAID_STATUSES.includes(o.status)).map((o) => o.id);
  const combosAgg = new Map<string, { label: string; orders: number; revenue: number }>();

  if (paidIds.length > 0) {
    const { data: items } = await db
      .from("order_items")
      .select("line_total, saved_combos(name), curated_baskets(name)")
      .in("order_id", paidIds.slice(0, 500));
    for (const item of items ?? []) {
      const label =
        (item.saved_combos as unknown as { name: string } | null)?.name ??
        (item.curated_baskets as unknown as { name: string } | null)?.name ??
        "Custom Salad";
      const agg = combosAgg.get(label) ?? { label, orders: 0, revenue: 0 };
      agg.orders += 1;
      agg.revenue += Number(item.line_total);
      combosAgg.set(label, agg);
    }
  }
  const topCombos = [...combosAgg.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    gmv: { today: gmvToday, last7: gmv7, last30: gmv30 },
    orders: { today: ordersToday, last30: orders.length, byStatus },
    subscriptions: {
      active: active.length,
      paused: subs.length - active.length,
      mrrEstimate: Math.round(mrr),
    },
    topCombos,
  };
}
