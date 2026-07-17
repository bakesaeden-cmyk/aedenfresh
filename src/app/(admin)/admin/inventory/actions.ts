"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function setAvailability(form: FormData) {
  const storeId = String(form.get("store_id") ?? "");
  const optionId = String(form.get("option_id") ?? "");
  const nextState = form.get("next_state") === "true";

  const supabase = await createClient();
  await supabase.from("store_inventory").upsert(
    {
      store_id: storeId,
      product_option_id: optionId,
      is_available: nextState,
    },
    { onConflict: "store_id,product_option_id" },
  );
  revalidatePath("/admin/inventory");
}
