import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SubscriptionList } from "./subscription-list";

export const metadata = { title: "My Subscriptions" };

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/subscriptions");

  const { data } = await supabase
    .from("subscriptions")
    .select(
      "id, frequency, custom_days, status, next_delivery_date, paused_until, created_at, saved_combos(name, portion_size), stores(name), delivery_slots(start_time, end_time)",
    )
    .order("created_at", { ascending: false });

  return (
    <div className="section-container flex max-w-3xl flex-col gap-8 py-14">
      <div>
        <h1 className="text-4xl">My Subscriptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Skip, pause, or cancel anytime — changes apply from the next delivery.
        </p>
      </div>
      <SubscriptionList initial={JSON.parse(JSON.stringify(data ?? []))} />
    </div>
  );
}
