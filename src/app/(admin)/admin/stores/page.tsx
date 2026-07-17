import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { createStore } from "./actions";

export const metadata = { title: "Stores · Admin" };

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorMsg } = await searchParams;
  const supabase = await createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, pincode, phone, is_active")
    .order("name");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-4xl">Stores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Locations, activation, and PIN-code coverage (spec §5.5).
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
                <th className="px-6 py-4">Store</th>
                <th className="px-6 py-4">Pincode</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {(stores ?? []).map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-medium">{s.name}</td>
                  <td className="px-6 py-4">{s.pincode}</td>
                  <td className="px-6 py-4 text-muted-foreground">{s.phone ?? "—"}</td>
                  <td className="px-6 py-4">
                    <Badge variant={s.is_active ? "accent" : "muted"}>
                      {s.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/stores/${s.id}`}>Edit</Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {(stores ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No stores yet — run the seed migration or add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a store</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStore} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Aeden Fresh Edappally" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" required placeholder="Full street address" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" name="pincode" required pattern="\d{6}" placeholder="682024" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" name="latitude" type="number" step="any" placeholder="9.9700" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" name="longitude" type="number" step="any" placeholder="76.3100" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" placeholder="+91 484 …" />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input id="is_active" name="is_active" type="checkbox" defaultChecked className="h-4 w-4 accent-[#5C8C2F]" />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-end">
              <Button type="submit">
                <Plus /> Add store
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
