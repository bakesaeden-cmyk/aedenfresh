"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Leaf, Search, SlidersHorizontal } from "lucide-react";

import { AddBasketButton } from "@/components/cart/add-basket-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatINR } from "@/lib/utils";

export interface BasketItem {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  nutrition_summary: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  } | null;
}

const IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=88&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&q=88&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000&q=88&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1000&q=88&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&q=88&auto=format&fit=crop",
];

const GOALS = [
  { id: "all", label: "All bowls" },
  { id: "protein", label: "High protein" },
  { id: "light", label: "Under 400 kcal" },
  { id: "value", label: "Under ₹250" },
] as const;

export function BasketBrowser({ baskets }: { baskets: BasketItem[] }) {
  const [query, setQuery] = useState("");
  const [goal, setGoal] = useState<(typeof GOALS)[number]["id"]>("all");
  const [sort, setSort] = useState("recommended");

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = baskets.filter((basket) => {
      const nutrition = basket.nutrition_summary;
      const matchesQuery =
        !normalized ||
        basket.name.toLowerCase().includes(normalized) ||
        basket.description?.toLowerCase().includes(normalized);
      const matchesGoal =
        goal === "all" ||
        (goal === "protein" && Number(nutrition?.protein_g ?? 0) >= 25) ||
        (goal === "light" && Number(nutrition?.calories ?? Infinity) < 400) ||
        (goal === "value" && Number(basket.base_price) < 250);
      return matchesQuery && matchesGoal;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return Number(a.base_price) - Number(b.base_price);
      if (sort === "protein") {
        return Number(b.nutrition_summary?.protein_g ?? 0) - Number(a.nutrition_summary?.protein_g ?? 0);
      }
      return 0;
    });
  }, [baskets, goal, query, sort]);

  return (
    <>
      <div className="bg-card border-border/70 shadow-luxe sticky top-[74px] z-30 rounded-2xl border p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search size={15} className="text-muted-foreground absolute top-1/2 left-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bowls or ingredients"
              className="bg-background pl-10"
              aria-label="Search curated bowls"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {GOALS.map((item) => (
              <button
                key={item.id}
                onClick={() => setGoal(item.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors",
                  goal === item.id
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border bg-background hover:border-accent/40",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="border-border bg-background flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold">
            <SlidersHorizontal size={13} className="text-muted-foreground" />
            <span className="sr-only">Sort menu</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="bg-transparent outline-none"
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="protein">Most protein</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">
          <strong className="text-foreground">{visible.length}</strong> bowls matched
        </p>
        <p className="text-muted-foreground hidden text-xs sm:block">Tap add to keep browsing · your cart stays with you</p>
      </div>

      {visible.length ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((basket, index) => (
            <article key={basket.id} className="bg-card border-border/70 shadow-luxe group flex flex-col overflow-hidden rounded-[1.75rem] border">
              <div className="image-zoom relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={basket.image_url || IMAGES[index % IMAGES.length]}
                  alt={basket.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {Number(basket.nutrition_summary?.protein_g ?? 0) >= 25 && (
                  <span className="bg-secondary text-secondary-foreground absolute top-4 left-4 rounded-full px-3 py-1.5 text-[9px] font-bold tracking-[0.15em] uppercase">
                    Protein forward
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-2xl leading-none">{basket.name}</h2>
                  <p className="shrink-0 font-serif text-xl font-semibold">{formatINR(Number(basket.base_price))}</p>
                </div>
                <p className="text-muted-foreground mt-3 line-clamp-3 flex-1 text-xs leading-relaxed">{basket.description}</p>
                {basket.nutrition_summary && (
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-muted-foreground">
                    {basket.nutrition_summary.calories != null && (
                      <span className="bg-muted flex items-center gap-1 rounded-full px-2.5 py-1"><Flame size={10} /> {basket.nutrition_summary.calories} kcal</span>
                    )}
                    {basket.nutrition_summary.protein_g != null && (
                      <span className="bg-muted rounded-full px-2.5 py-1">{basket.nutrition_summary.protein_g}g protein</span>
                    )}
                    {basket.nutrition_summary.carbs_g != null && (
                      <span className="bg-muted rounded-full px-2.5 py-1">{basket.nutrition_summary.carbs_g}g carbs</span>
                    )}
                  </div>
                )}
                <AddBasketButton basketId={basket.id} name={basket.name} price={Number(basket.base_price)} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="border-border/70 bg-card mt-5 flex min-h-72 flex-col items-center justify-center rounded-[1.75rem] border p-8 text-center">
          <span className="bg-primary/20 text-accent flex h-12 w-12 items-center justify-center rounded-full"><Leaf size={18} /></span>
          <h2 className="mt-4 text-3xl">Nothing matched that mix.</h2>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">Clear the filters or build exactly what you have in mind.</p>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" onClick={() => { setGoal("all"); setQuery(""); }}>Clear filters</Button>
            <Button asChild><Link href="/build">Build my own <ArrowRight /></Link></Button>
          </div>
        </div>
      )}
    </>
  );
}
