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

export async function createStore(form: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("stores").insert({
    name: str(form, "name"),
    address: str(form, "address"),
    pincode: str(form, "pincode"),
    latitude: num(form, "latitude"),
    longitude: num(form, "longitude"),
    phone: str(form, "phone") || null,
    is_active: form.get("is_active") === "on",
  });
  if (error) redirect(`/admin/stores?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/stores");
}

export async function updateStore(form: FormData) {
  const id = str(form, "id");
  const supabase = await createClient();
  const { error } = await supabase
    .from("stores")
    .update({
      name: str(form, "name"),
      address: str(form, "address"),
      pincode: str(form, "pincode"),
      latitude: num(form, "latitude"),
      longitude: num(form, "longitude"),
      phone: str(form, "phone") || null,
      is_active: form.get("is_active") === "on",
    })
    .eq("id", id);
  if (error) redirect(`/admin/stores/${id}?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/stores");
  revalidatePath(`/admin/stores/${id}`);
}

export async function addCoverage(form: FormData) {
  const storeId = str(form, "store_id");
  const pincode = str(form, "pincode");
  const supabase = await createClient();
  if (!/^\d{6}$/.test(pincode)) {
    redirect(`/admin/stores/${storeId}?error=Pincode+must+be+6+digits`);
  }
  const { error } = await supabase.from("store_pincode_coverage").insert({
    store_id: storeId,
    pincode,
    delivery_fee: num(form, "delivery_fee") ?? 0,
    is_active: true,
  });
  if (error) redirect(`/admin/stores/${storeId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/admin/stores/${storeId}`);
}

export async function toggleCoverage(form: FormData) {
  const storeId = str(form, "store_id");
  const supabase = await createClient();
  await supabase
    .from("store_pincode_coverage")
    .update({ is_active: form.get("next_state") === "true" })
    .eq("id", str(form, "id"));
  revalidatePath(`/admin/stores/${storeId}`);
}

export async function deleteCoverage(form: FormData) {
  const storeId = str(form, "store_id");
  const supabase = await createClient();
  await supabase.from("store_pincode_coverage").delete().eq("id", str(form, "id"));
  revalidatePath(`/admin/stores/${storeId}`);
}
