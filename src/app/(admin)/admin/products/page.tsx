import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { createCategory, createOption, toggleOption } from "./actions";

export const metadata = { title: "Products · Admin" };

interface Option {
  id: string;
  category_id: string;
  name: string;
  price_delta: number;
  calories: number | null;
  protein_g: number | null;
  is_active: boolean;
  allergens: string[] | null;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: options }] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, type, name, display_order, max_free_selections")
      .order("display_order"),
    supabase
      .from("product_options")
      .select("id, category_id, name, price_delta, calories, protein_g, is_active, allergens")
      .order("name"),
  ]);

  const opts = (options ?? []) as Option[];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Builder categories and options — price deltas, nutrition, allergens (spec §5.2).
        </p>
      </div>

      {errorMsg && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      {(categories ?? []).map((cat) => {
        const catOptions = opts.filter((o) => o.category_id === cat.id);
        return (
          <Card key={cat.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-xl">{cat.name}</CardTitle>
                <Badge variant="muted">{cat.type}</Badge>
                {cat.max_free_selections != null && (
                  <Badge variant="outline">max {cat.max_free_selections} free</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="py-2.5">Option</th>
                    <th className="py-2.5">Δ Price</th>
                    <th className="py-2.5">Kcal</th>
                    <th className="py-2.5">Protein</th>
                    <th className="py-2.5">Allergens</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {catOptions.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2.5 font-medium">
                        <Link href={`/admin/products/${o.id}`} className="hover:text-primary">
                          {o.name}
                        </Link>
                      </td>
                      <td className="py-2.5">₹{Number(o.price_delta)}</td>
                      <td className="py-2.5">{o.calories ?? "—"}</td>
                      <td className="py-2.5">{o.protein_g != null ? `${o.protein_g}g` : "—"}</td>
                      <td className="py-2.5 text-muted-foreground">
                        {o.allergens?.length ? o.allergens.join(", ") : "—"}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={o.is_active ? "accent" : "muted"}>
                          {o.is_active ? "Active" : "Off"}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <form action={toggleOption} className="inline">
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="next_state" value={String(!o.is_active)} />
                          <Button variant="outline" size="sm" type="submit">
                            {o.is_active ? "Disable" : "Enable"}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                  {catOptions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No options in this category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <form
                action={createOption}
                className="flex flex-wrap items-end gap-3 border-t pt-4"
              >
                <input type="hidden" name="category_id" value={cat.id} />
                <div className="flex flex-col gap-1.5">
                  <Label>Name</Label>
                  <Input name="name" required placeholder="New option" className="w-44" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Δ Price (₹)</Label>
                  <Input name="price_delta" type="number" min="0" defaultValue="0" className="w-28" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Kcal</Label>
                  <Input name="calories" type="number" min="0" className="w-24" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Protein g</Label>
                  <Input name="protein_g" type="number" step="any" min="0" className="w-24" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Allergens (csv)</Label>
                  <Input name="allergens" placeholder="dairy, nuts" className="w-40" />
                </div>
                <Button type="submit" variant="accent" size="sm">
                  <Plus /> Add option
                </Button>
              </form>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a category</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCategory} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-type">Type</Label>
              <select
                id="cat-type"
                name="type"
                required
                className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
              >
                <option value="base">base</option>
                <option value="protein">protein</option>
                <option value="dressing">dressing</option>
                <option value="topping">topping</option>
                <option value="addon">addon</option>
                <option value="portion">portion</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" name="name" required placeholder="Display name" className="w-52" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-order">Display order</Label>
              <Input id="cat-order" name="display_order" type="number" defaultValue="0" className="w-28" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cat-max">Max free (multi-select)</Label>
              <Input id="cat-max" name="max_free_selections" type="number" min="0" className="w-36" />
            </div>
            <Button type="submit">
              <Plus /> Add category
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
