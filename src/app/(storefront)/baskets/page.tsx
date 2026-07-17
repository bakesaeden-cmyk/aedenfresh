import Link from "next/link";
import { ArrowRight, ChefHat, Leaf, Salad } from "lucide-react";

import { BasketBrowser, type BasketItem } from "@/components/storefront/basket-browser";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Chef’s Menu",
  description: "Balanced, chef-built fresh bowls from the Aeden Fresh kitchen in Kochi.",
};

export default async function BasketsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("curated_baskets")
    .select("id, name, description, base_price, image_url, nutrition_summary")
    .eq("is_active", true)
    .order("base_price");
  const baskets = (data ?? []) as BasketItem[];

  return (
    <>
      <section className="bg-secondary text-secondary-foreground paper-noise overflow-hidden">
        <div className="section-container relative z-10 grid items-end gap-10 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:py-20">
          <div>
            <span className="text-primary inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase">
              <ChefHat size={13} /> Balanced by the Aeden kitchen
            </span>
            <h1 className="mt-5 text-5xl leading-[0.88] text-white md:text-7xl">Chef’s menu.<br /><span className="text-primary italic">Your easy win.</span></h1>
          </div>
          <div className="max-w-xl lg:justify-self-end">
            <p className="text-sm leading-7 text-white/60 md:text-base">
              Ready-to-order combinations built around flavour, balance, and real-life hunger. Filter by your goal, add in one tap, and keep browsing.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/build"><Salad /> Build from scratch</Link>
              </Button>
              <span className="flex items-center gap-2 px-2 text-xs text-white/50"><Leaf size={13} className="text-primary" /> Nutrition shown up front</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section-container py-10 lg:py-14">
        {baskets.length ? (
          <BasketBrowser baskets={baskets} />
        ) : (
          <div className="bg-card border-border/70 flex min-h-[50vh] flex-col items-center justify-center rounded-[2rem] border p-8 text-center">
            <span className="bg-primary/20 text-accent flex h-14 w-14 items-center justify-center rounded-full"><Leaf size={20} /></span>
            <h2 className="mt-5 text-4xl">The kitchen is being stocked.</h2>
            <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">Curated bowls will appear here as soon as today’s menu is live. Your custom builder is ready now.</p>
            <Button asChild className="mt-6"><Link href="/build">Build a fresh bowl <ArrowRight /></Link></Button>
          </div>
        )}
      </section>
    </>
  );
}
