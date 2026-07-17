import { ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient, getAdminUser } from "@/lib/supabase/server";
import { assignRole, removeAdmin } from "./actions";

export const metadata = { title: "Roles · Admin" };

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
  const me = await getAdminUser();
  const supabase = await createClient();

  const [{ data: admins }, { data: stores }] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id, role, store_id, created_at, stores(name)")
      .order("created_at"),
    supabase.from("stores").select("id, name").eq("is_active", true).order("name"),
  ]);

  const isSuper = me?.role === "super_admin";

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-4xl">Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          super_admin/ops see all stores; store_managers are scoped to one
          store by RLS on every query (spec §5.9).
        </p>
      </div>

      {errorMsg && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Store</th>
                {isSuper && <th className="px-6 py-4" />}
              </tr>
            </thead>
            <tbody>
              {(admins ?? []).map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-mono text-xs">{a.id}</td>
                  <td className="px-6 py-4">
                    <Badge variant={a.role === "super_admin" ? "gold" : "secondary"}>
                      {a.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {(a.stores as unknown as { name: string } | null)?.name ?? "All stores"}
                  </td>
                  {isSuper && (
                    <td className="px-6 py-4 text-right">
                      {a.id !== me?.id && (
                        <form action={removeAdmin} className="inline">
                          <input type="hidden" name="user_id" value={a.id} />
                          <Button variant="ghost" size="sm" type="submit">
                            <Trash2 />
                          </Button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(admins ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Only you here so far.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {isSuper && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck size={18} className="text-accent" /> Assign a role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={assignRole} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="user_id">Auth user UUID</Label>
                <Input
                  id="user_id"
                  name="user_id"
                  required
                  placeholder="From Supabase → Authentication → Users"
                  className="w-80 font-mono text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
                >
                  <option value="store_manager">store_manager</option>
                  <option value="ops">ops</option>
                  <option value="support">support</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="store_id">Store (managers only)</Label>
                <select
                  id="store_id"
                  name="store_id"
                  className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
                >
                  <option value="">—</option>
                  {(stores ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">
                <UserPlus /> Assign
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
