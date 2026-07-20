import Link from "next/link";
import { ArrowRight, Leaf, PackageCheck, ShoppingBag, Store } from "lucide-react";

import { GroceryStorefront } from "@/components/storefront/grocery-storefront";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Fresh Groceries",
  description: "Shop fruits, vegetables, bakery, dairy and everyday fresh essentials from your nearest Aeden Fresh store.",
};

export default function GroceriesPage() {
  return (
    <>
      <section className="bg-secondary text-secondary-foreground paper-noise overflow-hidden">
        <div className="section-container relative z-10 grid min-h-[510px] items-center gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div>
            <span className="text-primary inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase">
              <Store size={13} /> The Aeden store, delivered
            </span>
            <h1 className="mt-5 text-5xl leading-[0.86] text-white md:text-7xl">
              The fresh shelf,
              <span className="text-primary block italic">now at your door.</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-white/60 md:text-base">
              Shop premium fruit, everyday produce, bakery and chilled essentials with live availability from your nearest Aeden Fresh store.
            </p>
            <div className="mt-7 flex flex-wrap gap-4 text-[11px] font-semibold text-white/55">
              <span className="flex items-center gap-2"><PackageCheck size={14} className="text-primary" /> Store-verified stock</span>
              <span className="flex items-center gap-2"><Leaf size={14} className="text-primary" /> Freshness-first handling</span>
              <span className="flex items-center gap-2"><ShoppingBag size={14} className="text-primary" /> One secure cart</span>
            </div>
          </div>
          <div className="relative min-h-[340px] lg:min-h-[410px]">
            <div className="bg-primary/18 absolute -inset-8 rounded-full blur-3xl" />
            <div className="image-zoom shadow-luxe-lg absolute inset-0 overflow-hidden rounded-[9rem_9rem_2rem_2rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=88&auto=format&fit=crop"
                alt="A premium display of fresh fruit and vegetables"
                className="h-full w-full object-cover"
                fetchPriority="high"
              />
            </div>
            <div className="bg-card text-foreground shadow-luxe-lg absolute right-4 bottom-4 max-w-[220px] rounded-2xl p-4 sm:right-7 sm:bottom-7">
              <p className="text-accent text-[9px] font-bold tracking-[0.17em] uppercase">Fulfilled locally</p>
              <p className="mt-1 text-sm font-semibold">Your closest store receives the order instantly.</p>
            </div>
          </div>
        </div>
        <div className="section-container relative z-10 pb-14">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="#catalogue">Shop the shelves <ArrowRight /></Link>
          </Button>
        </div>
      </section>
      <div id="catalogue"><GroceryStorefront /></div>
    </>
  );
}
