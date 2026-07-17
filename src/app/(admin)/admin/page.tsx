import Link from "next/link";
import { ArrowRight, CalendarClock, IndianRupee, ShoppingBag, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueSummary, type RevenueSummary } from "@/lib/analytics";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Admin Dashboard" };

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Failed",
};

const EMPTY: RevenueSummary = {
  gmv: { today: 0, last7: 0, last30: 0 },
  orders: { today: 0, last30: 0, byStatus: {} },
  subscriptions: { active: 0, paused: 0, mrrEstimate: 0 },
  topCombos: [],
};

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  const supabase = await createClient();

  let summary = EMPTY;
  try {
    summary = await revenueSummary(supabase);
  } catch {
    /* empty DB / no connection — render zeros */
  }

  const stats = [
    {
      icon: IndianRupee,
      label: "GMV Today",
      value: formatINR(summary.gmv.today),
      sub: `${summary.orders.today} orders today`,
    },
    {
      icon: TrendingUp,
      label: "GMV — 7 days",
      value: formatINR(summary.gmv.last7),
      sub: `${formatINR(summary.gmv.last30)} over 30 days`,
    },
    {
      icon: CalendarClock,
      label: "Subscription MRR (est.)",
      value: formatINR(summary.subscriptions.mrrEstimate),
      sub: `${summary.subscriptions.active} active · ${summary.subscriptions.paused} paused`,
    },
    {
      icon: ShoppingBag,
      label: "Orders — 30 days",
      value: String(summary.orders.last30),
      sub: `${summary.orders.byStatus["delivered"] ?? 0} delivered`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {admin?.store_id
            ? "Store-scoped view (your store only)"
            : "All stores"}{" "}
          · role: <strong>{admin?.role}</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  {s.label}
                </p>
                <s.icon size={16} className="text-accent" />
              </div>
              <p className="font-serif text-3xl">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-xl">
              Orders by status
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                Open board <ArrowRight size={12} />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {Object.entries(STATUS_LABELS).map(([status, label]) => {
              const count = summary.orders.byStatus[status] ?? 0;
              const max = Math.max(1, ...Object.values(summary.orders.byStatus));
              return (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-medium">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Top combos — 30 days</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {summary.topCombos.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No paid orders yet — rankings appear after the first sales.
              </p>
            )}
            {summary.topCombos.map((c, i) => (
              <div key={c.label} className="flex items-center gap-3 text-sm">
                <Badge variant={i === 0 ? "gold" : "muted"} className="w-7 justify-center">
                  {i + 1}
                </Badge>
                <span className="flex-1 truncate font-medium">{c.label}</span>
                <span className="text-muted-foreground">{c.orders}×</span>
                <span className="w-20 text-right font-serif">{formatINR(c.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
