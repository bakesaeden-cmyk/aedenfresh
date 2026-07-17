import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { setAvailability } from "./actions";

export const metadata = { title: "Inventory · Admin" };

interface Option {
  id: string;
  category_id: string;
  name: string;
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: selectedStore } = await searchParams;
  const supabase = await createClient();

  const [{ data: stores }, { data: categories }, { data: options }] =
    await Promise.all([
      supabase.from("stores").select("id, name").eq("is_active", true).order("name"),
      supabase.from("product_categories").select("id, name, display_order").order("display_order"),
      supabase.from("product_options").select("id, category_id, name").eq("is_active", true).order("name"),
    ]);

  const storeId = selectedStore ?? stores?.[0]?.id;

  const { data: inventory } = storeId
    ? await supabase
        .from("store_inventory")
        .select("product_option_id, is_available")
        .eq("store_id", storeId)
    : { data: [] };

  const availability = new Map<string, boolean>(
    (inventory ?? []).map((r) => [r.product_option_id as string, r.is_available as boolean]),
  );

  const opts = (options ?? []) as Option[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-store availability. No row = made-to-order (available by default).
        </p>
      </div>

      <form method="get" className="flex items-center gap-3">
        <label htmlFor="store" className="text-sm font-medium">
          Store
        </label>
        <select
          id="store"
          name="store"
          defaultValue={storeId}
          className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
        >
          {(stores ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Load
        </Button>
      </form>

      {!storeId && (
        <p className="text-muted-foreground">No active stores found — seed the database first.</p>
      )}

      {storeId &&
        (categories ?? []).map((cat) => {
          const catOptions = opts.filter((o) => o.category_id === cat.id);
          if (catOptions.length === 0) return null;
          return (
            <Card key={cat.id}>
              <CardHeader>
                <CardTitle className="text-xl">{cat.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <tbody>
                    {catOptions.map((o) => {
                      const available = availability.get(o.id) ?? true;
                      return (
                        <tr key={o.id} className="border-b last:border-0">
                          <td className="px-6 py-3 font-medium">{o.name}</td>
                          <td className="px-6 py-3">
                            <Badge variant={available ? "accent" : "muted"}>
                              {available ? "Available" : "Unavailable"}
                            </Badge>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <form action={setAvailability} className="inline">
                              <input type="hidden" name="store_id" value={storeId} />
                              <input type="hidden" name="option_id" value={o.id} />
                              <input type="hidden" name="next_state" value={String(!available)} />
                              <Button variant="outline" size="sm" type="submit">
                                {available ? "Mark unavailable" : "Mark available"}
                              </Button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
