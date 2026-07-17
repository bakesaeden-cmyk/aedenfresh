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

export async function createCoupon(form: FormData) {
  const code = str(form, "code").toUpperCase();
  const discountType = str(form, "discount_type");
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    redirect("/admin/coupons?error=Code+must+be+3-30+letters%2Fdigits");
  }
  if (!["flat", "percent"].includes(discountType)) {
    redirect("/admin/coupons?error=Invalid+discount+type");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    code,
    discount_type: discountType,
    discount_value: num(form, "discount_value") ?? 0,
    min_order_value: num(form, "min_order_value") ?? 0,
    max_uses: num(form, "max_uses"),
    valid_from: str(form, "valid_from") || null,
    valid_until: str(form, "valid_until") || null,
    is_active: true,
  });
  if (error) redirect(`/admin/coupons?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/coupons");
}

export async function toggleCoupon(form: FormData) {
  const supabase = await createClient();
  await supabase
    .from("coupons")
    .update({ is_active: form.get("next_state") === "true" })
    .eq("id", str(form, "id"));
  revalidatePath("/admin/coupons");
}
