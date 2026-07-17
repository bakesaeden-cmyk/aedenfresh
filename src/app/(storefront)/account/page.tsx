import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarClock, LogOut, MapPin, Salad } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/account");

  const [{ data: profile }, { data: combos }] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("full_name, phone, dietary_tags, nutrition_goal")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saved_combos")
      .select("id, name, combo_type, portion_size, order_count")
      .eq("customer_id", user.id)
      .order("order_count", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="section-container flex flex-col gap-8 py-10 lg:py-14">
      <div className="bg-secondary text-secondary-foreground paper-noise shadow-luxe-lg relative overflow-hidden rounded-[2rem] p-7 md:p-10">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Your fresh dashboard</p>
          <h1 className="mt-2 text-5xl text-white">{profile?.full_name ? `Hello, ${profile.full_name}.` : "Welcome back."}</h1>
          <p className="mt-2 text-sm text-white/50">
            {profile?.phone ?? user.phone} · Everything you need to stay on track
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm"><Link href="/build"><Salad /> Build a bowl</Link></Button>
          <form action={signOut}>
          <Button variant="outline" size="sm" type="submit" className="border-white/20 text-white hover:bg-white/10">
            <LogOut /> Sign out
          </Button>
        </form>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Salad size={18} />
            </div>
            <CardTitle className="text-xl">Saved Combos</CardTitle>
            <CardDescription>Your builds, one tap from reorder.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(combos ?? []).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.portion_size ?? c.combo_type}
                  {c.order_count > 0 && ` · ×${c.order_count}`}
                </span>
              </div>
            ))}
            {(combos ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing saved yet —{" "}
                <Link href="/build" className="text-accent underline underline-offset-2">
                  build your first bowl
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock size={18} />
            </div>
            <CardTitle className="text-xl">Subscriptions</CardTitle>
            <CardDescription>Skip, pause, or change frequency.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/account/subscriptions">Manage subscriptions <ArrowRight /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <MapPin size={18} />
            </div>
            <CardTitle className="text-xl">Addresses</CardTitle>
            <CardDescription>Home, office, and more.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Add or pick addresses at checkout —{" "}
              <Link href="/cart" className="text-accent underline underline-offset-2">
                open your cart
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
