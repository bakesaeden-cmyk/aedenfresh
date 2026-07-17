"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getAdminUser } from "@/lib/supabase/server";

const ROLES = ["super_admin", "store_manager", "ops", "support"];

export async function assignRole(form: FormData) {
  // RLS already restricts writes to super_admin; check again for clear errors
  const admin = await getAdminUser();
  if (admin?.role !== "super_admin") {
    redirect("/admin/roles?error=Only+super+admins+can+manage+roles");
  }

  const userId = String(form.get("user_id") ?? "").trim();
  const role = String(form.get("role") ?? "").trim();
  const storeId = String(form.get("store_id") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    redirect("/admin/roles?error=Enter+the+user%27s+auth+UUID");
  }
  if (!ROLES.includes(role)) {
    redirect("/admin/roles?error=Invalid+role");
  }
  if (role === "store_manager" && !storeId) {
    redirect("/admin/roles?error=Store+managers+need+a+store");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admin_users").upsert({
    id: userId,
    role,
    store_id: role === "store_manager" ? storeId : null,
  });
  if (error) redirect(`/admin/roles?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/roles");
}

export async function removeAdmin(form: FormData) {
  const admin = await getAdminUser();
  if (admin?.role !== "super_admin") return;
  const userId = String(form.get("user_id") ?? "");
  if (userId === admin.id) return; // never remove yourself
  const supabase = await createClient();
  await supabase.from("admin_users").delete().eq("id", userId);
  revalidatePath("/admin/roles");
}
