import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, Clock, FileText, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn, formatINR } from "@/lib/utils";

export const metadata = { title: "Track Order" };

const FLOW = [
  "pending_payment",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
] as const;

const LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  preparing: "Being prepared",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  failed: "Payment failed",
};

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, subtotal, delivery_fee, discount, total, coupon_code, scheduled_date, created_at, stores(name), delivery_slots(start_time, end_time)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: history } = await supabase
    .from("order_status_history")
    .select("status, changed_at")
    .eq("order_id", id)
    .order("changed_at");

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, unit_price, line_total, retail_product_id, product_name_snapshot, unit_label_snapshot, curated_basket_id")
    .eq("order_id", id);

  const reached = new Map(
    (history ?? []).map((h) => [h.status as string, h.changed_at as string]),
  );
  const terminated = order.status === "cancelled" || order.status === "failed";
  const currentIdx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const store = order.stores as unknown as { name: string } | null;
  const slot = order.delivery_slots as unknown as {
    start_time: string;
    end_time: string;
  } | null;

  return (
    <div className="section-container flex max-w-2xl flex-col gap-7 py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
            {order.order_number}
          </p>
          <h1 className="mt-1 text-4xl">Track your order</h1>
        </div>
        <Badge
          variant={terminated ? "muted" : order.status === "delivered" ? "accent" : "default"}
          className="text-xs"
        >
          {LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-7">
          {terminated ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-lg font-medium">{LABELS[order.status]}</p>
              <p className="text-sm text-muted-foreground">
                {order.status === "failed"
                  ? "The payment didn't complete. You can retry from your cart, or contact the store."
                  : "This order was cancelled."}
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/build">Build a fresh one</Link>
              </Button>
            </div>
          ) : (
            <ol className="flex flex-col gap-0">
              {FLOW.map((step, i) => {
                const done = i <= currentIdx;
                const at = reached.get(step);
                return (
                  <li key={step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs",
                          done
                            ? "border-accent bg-accent text-white"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {done ? <Check size={14} /> : i + 1}
                      </span>
                      {i < FLOW.length - 1 && (
                        <span
                          className={cn("w-px flex-1", i < currentIdx ? "bg-accent" : "bg-border")}
                          style={{ minHeight: 28 }}
                        />
                      )}
                    </div>
                    <div className="pb-7">
                      <p className={cn("font-medium", !done && "text-muted-foreground")}>
                        {LABELS[step]}
                      </p>
                      {at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(at).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl"><ShoppingBag size={17} /> Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">
                  {item.product_name_snapshot || (item.curated_basket_id ? "Chef-built bowl" : "Custom Aeden bowl")}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.quantity} × {formatINR(Number(item.unit_price))}
                  {item.unit_label_snapshot ? ` · ${item.unit_label_snapshot}` : ""}
                </p>
              </div>
              <p className="font-serif text-lg">{formatINR(Number(item.line_total))}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Store</span>
            <span>{store?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Scheduled</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {order.scheduled_date}
              {slot && ` · ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatINR(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{formatINR(Number(order.delivery_fee))}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Discount{order.coupon_code && ` (${order.coupon_code})`}
              </span>
              <span>−{formatINR(Number(order.discount))}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t pt-2 font-medium">
            <span>Total</span>
            <span className="font-serif text-lg text-primary">
              {formatINR(Number(order.total))}
            </span>
          </div>
          {order.status !== "pending_payment" && order.status !== "failed" && (
            <Button asChild variant="outline" size="sm" className="mt-3 self-start">
              <a href={`/api/orders/${order.id}/receipt`} target="_blank" rel="noreferrer">
                <FileText /> View receipt
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
