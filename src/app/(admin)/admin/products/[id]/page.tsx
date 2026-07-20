import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { updateOption } from "../actions";

export const metadata = { title: "Edit Option · Admin" };

export default async function EditOptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg } = await searchParams;
  const supabase = await createClient();

  const { data: option } = await supabase
    .from("product_options")
    .select(
      "id, name, price_delta, calories, protein_g, carbs_g, fat_g, allergens, is_active, product_categories(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!option) notFound();

  const categoryName =
    (option.product_categories as unknown as { name: string } | null)?.name ?? "";

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <Link
          href="/admin/products"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> All products
        </Link>
        <h1 className="text-4xl">{option.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{categoryName}</p>
      </div>

      {errorMsg && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Option details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateOption} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={option.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={option.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price_delta">Price delta (₹)</Label>
              <Input
                id="price_delta"
                name="price_delta"
                type="number"
                min="0"
                defaultValue={Number(option.price_delta)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calories">Calories</Label>
              <Input id="calories" name="calories" type="number" min="0" defaultValue={option.calories ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="protein_g">Protein (g)</Label>
              <Input id="protein_g" name="protein_g" type="number" step="any" min="0" defaultValue={option.protein_g ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="carbs_g">Carbs (g)</Label>
              <Input id="carbs_g" name="carbs_g" type="number" step="any" min="0" defaultValue={option.carbs_g ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fat_g">Fat (g)</Label>
              <Input id="fat_g" name="fat_g" type="number" step="any" min="0" defaultValue={option.fat_g ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="allergens">Allergens (comma-separated)</Label>
              <Input
                id="allergens"
                name="allergens"
                defaultValue={(option.allergens ?? []).join(", ")}
                placeholder="dairy, nuts, gluten"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked={option.is_active}
                className="h-4 w-4 accent-[#237049]"
              />
              <Label htmlFor="is_active">Active (visible in builder)</Label>
            </div>
            <div className="flex items-end justify-end">
              <Button type="submit">
                <Save /> Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
