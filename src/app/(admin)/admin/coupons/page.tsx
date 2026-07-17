import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { createCoupon, toggleCoupon } from "./actions";

export const metadata = { title: "Coupons · Admin" };

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
  const supabase = await createClient();
  const { data: coupons } = await supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, min_order_value, max_uses, used_count, valid_from, valid_until, is_active",
    )
    .order("code");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl">Coupons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Uses are burned only when a payment captures — abandoned checkouts
          don&apos;t count.
        </p>
      </div>

      {errorMsg && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Min order</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Window</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {(coupons ?? []).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-mono font-semibold">{c.code}</td>
                  <td className="px-6 py-4">
                    {c.discount_type === "percent"
                      ? `${Number(c.discount_value)}%`
                      : `₹${Number(c.discount_value)}`}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">₹{Number(c.min_order_value)}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {c.used_count}
                    {c.max_uses != null && ` / ${c.max_uses}`}
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {c.valid_from ?? "∞"} → {c.valid_until ?? "∞"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={c.is_active ? "accent" : "muted"}>
                      {c.is_active ? "Active" : "Off"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={toggleCoupon} className="inline">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="next_state" value={String(!c.is_active)} />
                      <Button variant="outline" size="sm" type="submit">
                        {c.is_active ? "Disable" : "Enable"}
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
              {(coupons ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No coupons yet — create one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create a coupon</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCoupon} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" required placeholder="ONAM25" className="w-40 uppercase" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount_type">Type</Label>
              <select
                id="discount_type"
                name="discount_type"
                className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
              >
                <option value="flat">Flat ₹</option>
                <option value="percent">Percent %</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discount_value">Value</Label>
              <Input id="discount_value" name="discount_value" type="number" min="1" required className="w-24" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="min_order_value">Min order (₹)</Label>
              <Input id="min_order_value" name="min_order_value" type="number" min="0" defaultValue="0" className="w-28" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="max_uses">Max uses</Label>
              <Input id="max_uses" name="max_uses" type="number" min="1" placeholder="∞" className="w-24" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valid_from">From</Label>
              <Input id="valid_from" name="valid_from" type="date" className="w-40" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valid_until">Until</Label>
              <Input id="valid_until" name="valid_until" type="date" className="w-40" />
            </div>
            <Button type="submit">
              <Plus /> Create
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
