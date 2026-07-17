"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}
function num(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function allergenArray(form: FormData): string[] | null {
  const raw = str(form, "allergens");
  if (!raw) return null;
  const arr = raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  return arr.length ? arr : null;
}

const CATEGORY_TYPES = ["base", "protein", "dressing", "topping", "addon", "portion"];

export async function createCategory(form: FormData) {
  const type = str(form, "type");
  if (!CATEGORY_TYPES.includes(type)) {
    redirect("/admin/products?error=Invalid+category+type");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("product_categories").insert({
    type,
    name: str(form, "name"),
    display_order: num(form, "display_order") ?? 0,
    max_free_selections: num(form, "max_free_selections"),
  });
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
}

export async function createOption(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("product_options").insert({
    category_id: str(form, "category_id"),
    name: str(form, "name"),
    price_delta: num(form, "price_delta") ?? 0,
    calories: num(form, "calories"),
    protein_g: num(form, "protein_g"),
    carbs_g: num(form, "carbs_g"),
    fat_g: num(form, "fat_g"),
    allergens: allergenArray(form),
    is_active: true,
  });
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
}

export async function updateOption(form: FormData) {
  const id = str(form, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_options")
    .update({
      name: str(form, "name"),
      price_delta: num(form, "price_delta") ?? 0,
      calories: num(form, "calories"),
      protein_g: num(form, "protein_g"),
      carbs_g: num(form, "carbs_g"),
      fat_g: num(form, "fat_g"),
      allergens: allergenArray(form),
      is_active: form.get("is_active") === "on",
    })
    .eq("id", id);
  if (error) redirect(`/admin/products/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

export async function toggleOption(form: FormData) {
  const supabase = await createClient();
  await supabase
    .from("product_options")
    .update({ is_active: form.get("next_state") === "true" })
    .eq("id", str(form, "id"));
  revalidatePath("/admin/products");
}
