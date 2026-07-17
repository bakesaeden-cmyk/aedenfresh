import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";
import { advanceOrder } from "./actions";

export const metadata = { title: "Orders · Admin" };

const COLUMNS = [
  { status: "pending_payment", label: "Awaiting Payment", next: null },
  { status: "confirmed", label: "Confirmed", next: "preparing" },
  { status: "preparing", label: "Preparing", next: "out_for_delivery" },
  { status: "out_for_delivery", label: "Out for Delivery", next: "delivered" },
  { status: "delivered", label: "Delivered", next: null },
] as const;

const NEXT_LABEL: Record<string, string> = {
  preparing: "Start preparing",
  out_for_delivery: "Send out",
  delivered: "Mark delivered",
};

interface OrderRow {
  id: string;
  order_number: string;
  status: string;
  total: number;
  channel: string | null;
  scheduled_date: string | null;
  created_at: string;
  stores: { name: string } | null;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, order_number, status, total, channel, scheduled_date, created_at, stores(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (date) query = query.eq("scheduled_date", date);

  const { data } = await query;
  const orders = (data ?? []) as unknown as OrderRow[];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lifecycle board (spec §5.4). Store managers see only their store&apos;s
            orders — enforced by RLS.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="border-input bg-card h-10 rounded-lg border px-3 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        {COLUMNS.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          return (
            <Card key={col.status} className="min-h-40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  {col.label}
                  <Badge variant="muted">{colOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {colOrders.map((o) => (
                  <div key={o.id} className="rounded-lg border bg-background p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{o.order_number}</span>
                      <span className="font-serif">{formatINR(Number(o.total))}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {o.stores?.name ?? "—"} · {o.channel ?? "web"} · {o.scheduled_date}
                    </p>
                    {col.next && (
                      <form action={advanceOrder} className="mt-2">
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="from" value={o.status} />
                        <input type="hidden" name="to" value={col.next} />
                        <Button size="sm" variant="accent" type="submit" className="w-full">
                          {NEXT_LABEL[col.next]}
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
                {colOrders.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Empty</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {orders.some((o) => o.status === "cancelled" || o.status === "failed") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cancelled / Failed</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {orders
              .filter((o) => o.status === "cancelled" || o.status === "failed")
              .map((o) => (
                <Badge key={o.id} variant="muted">
                  {o.order_number} · {o.status} · {formatINR(Number(o.total))}
                </Badge>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
