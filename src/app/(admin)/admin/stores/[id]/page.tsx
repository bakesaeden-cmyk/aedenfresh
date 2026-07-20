import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";
import { addCoverage, deleteCoverage, toggleCoverage, updateStore } from "../actions";

export const metadata = { title: "Edit Store · Admin" };

export default async function EditStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMsg } = await searchParams;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, address, pincode, latitude, longitude, phone, whatsapp_phone, erp_store_code, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!store) notFound();

  const { data: coverage } = await supabase
    .from("store_pincode_coverage")
    .select("id, pincode, delivery_fee, is_active")
    .eq("store_id", id)
    .order("pincode");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <Link
          href="/admin/stores"
          className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> All stores
        </Link>
        <h1 className="text-4xl">{store.name}</h1>
      </div>

      {errorMsg && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Store details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateStore} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={store.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={store.name} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={store.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsapp_phone">Store WhatsApp</Label>
              <Input id="whatsapp_phone" name="whatsapp_phone" inputMode="tel" defaultValue={store.whatsapp_phone ?? ""} placeholder="919876543210" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="erp_store_code">ERP store code</Label>
              <Input id="erp_store_code" name="erp_store_code" defaultValue={store.erp_store_code ?? ""} placeholder="KAD" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={store.address} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pincode">Pincode</Label>
              <Input id="pincode" name="pincode" defaultValue={store.pincode} pattern="\d{6}" required />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="latitude">Lat</Label>
                <Input id="latitude" name="latitude" type="number" step="any" defaultValue={store.latitude ?? ""} />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="longitude">Lng</Label>
                <Input id="longitude" name="longitude" type="number" step="any" defaultValue={store.longitude ?? ""} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                defaultChecked={store.is_active}
                className="h-4 w-4 accent-[#237049]"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex items-end justify-end">
              <Button type="submit">
                <Save /> Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">PIN-code coverage</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-3">Pincode</th>
                <th className="py-3">Delivery fee (₹)</th>
                <th className="py-3">Status</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {(coverage ?? []).map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{c.pincode}</td>
                  <td className="py-3">₹{Number(c.delivery_fee)}</td>
                  <td className="py-3">
                    <Badge variant={c.is_active ? "accent" : "muted"}>
                      {c.is_active ? "Active" : "Off"}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <div className="flex justify-end gap-2">
                      <form action={toggleCoverage}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="store_id" value={store.id} />
                        <input type="hidden" name="next_state" value={String(!c.is_active)} />
                        <Button variant="outline" size="sm" type="submit">
                          {c.is_active ? "Disable" : "Enable"}
                        </Button>
                      </form>
                      <form action={deleteCoverage}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="store_id" value={store.id} />
                        <Button variant="ghost" size="sm" type="submit">
                          <Trash2 />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {(coverage ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No coverage yet — this store can&apos;t receive orders until a pincode is added.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <form action={addCoverage} className="flex flex-wrap items-end gap-3 border-t pt-5">
            <input type="hidden" name="store_id" value={store.id} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-pincode">Pincode</Label>
              <Input id="new-pincode" name="pincode" pattern="\d{6}" required placeholder="682019" className="w-36" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-fee">Delivery fee (₹)</Label>
              <Input id="new-fee" name="delivery_fee" type="number" min="0" defaultValue="0" className="w-36" />
            </div>
            <Button type="submit" variant="accent">
              <Plus /> Add coverage
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
