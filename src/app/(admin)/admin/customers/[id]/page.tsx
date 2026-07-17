import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Customer · Admin" };

export default async function AdminCustomerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customer_profiles")
    .select("id, full_name, phone, dietary_tags, nutrition_goal, whatsapp_opted_in, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!customer) notFound();

  const [{ data: orders }, { data: subs }, { data: combos }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, total, channel, scheduled_date, created_at, stores(name)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("subscriptions")
      .select("id, frequency, status, next_delivery_date, saved_combos(name)")
      .eq("customer_id", id),
    supabase
      .from("saved_combos")
      .select("id, name, order_count, last_ordered_at")
      .eq("customer_id", id)
      .order("order_count", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link
          href="/admin/customers"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> All customers
        </Link>
        <h1 className="text-4xl">{customer.full_name ?? customer.phone}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {customer.phone} · joined {String(customer.created_at).slice(0, 10)}
          {customer.nutrition_goal && <> · goal: {customer.nutrition_goal.replace("_", " ")}</>}
          {customer.dietary_tags?.length ? <> · {customer.dietary_tags.join(", ")}</> : null}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {(subs ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {(s.saved_combos as unknown as { name: string } | null)?.name ?? "Combo"} ·{" "}
                  {s.frequency}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {s.next_delivery_date ?? "—"}
                  <Badge variant={s.status === "active" ? "accent" : "muted"}>{s.status}</Badge>
                </span>
              </div>
            ))}
            {(subs ?? []).length === 0 && (
              <p className="text-muted-foreground">No subscriptions.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Favourite combos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {(combos ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{c.name}</span>
                <span className="text-muted-foreground">
                  ×{c.order_count}
                  {c.last_ordered_at && ` · last ${String(c.last_ordered_at).slice(0, 10)}`}
                </span>
              </div>
            ))}
            {(combos ?? []).length === 0 && (
              <p className="text-muted-foreground">No saved combos.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Order history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Store</th>
                <th className="px-6 py-3">Channel</th>
                <th className="px-6 py-3">Scheduled</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="px-6 py-3 font-medium">{o.order_number}</td>
                  <td className="px-6 py-3 text-muted-foreground">
                    {(o.stores as unknown as { name: string } | null)?.name ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{o.channel}</td>
                  <td className="px-6 py-3">{o.scheduled_date}</td>
                  <td className="px-6 py-3">
                    <Badge variant={o.status === "delivered" ? "accent" : "muted"}>
                      {o.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right font-serif">
                    {formatINR(Number(o.total))}
                  </td>
                </tr>
              ))}
              {(orders ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
