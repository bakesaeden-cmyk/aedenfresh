import Link from "next/link";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Customers · Admin" };

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customer_profiles")
    .select("id, full_name, phone, dietary_tags, nutrition_goal, whatsapp_opted_in, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (q?.trim()) {
    const term = q.trim();
    query = query.or(`phone.ilike.%${term}%,full_name.ilike.%${term}%`);
  }
  const { data: customers } = await query;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by phone or name (spec §5.9).
        </p>
      </div>

      <form method="get" className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input name="q" defaultValue={q} placeholder="98765… or a name" className="pl-10" />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Goal</th>
                <th className="px-6 py-4">Dietary</th>
                <th className="px-6 py-4">WhatsApp</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-medium">{c.full_name ?? "—"}</td>
                  <td className="px-6 py-4">{c.phone}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {c.nutrition_goal?.replace("_", " ") ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {c.dietary_tags?.length ? c.dietary_tags.join(", ") : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={c.whatsapp_opted_in ? "accent" : "muted"}>
                      {c.whatsapp_opted_in ? "Opted in" : "Off"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/customers/${c.id}`}>View</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {(customers ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    {q ? "No customers match that search." : "No customers yet."}
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
