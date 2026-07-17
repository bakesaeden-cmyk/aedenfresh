"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

const ALLOWED: Record<string, string[]> = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
};

export async function advanceOrder(form: FormData) {
  const id = String(form.get("id") ?? "");
  const from = String(form.get("from") ?? "");
  const to = String(form.get("to") ?? "");

  if (!ALLOWED[from]?.includes(to)) return;

  const supabase = await createClient(); // RLS scopes store_manager to their store
  await supabase.from("orders").update({ status: to }).eq("id", id).eq("status", from);
  revalidatePath("/admin/orders");
}
