"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Leaf,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Truck,
} from "lucide-react";

import { AddRetailProductButton } from "@/components/cart/add-retail-product-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RETAIL_CATEGORIES,
  RETAIL_PRODUCTS,
  type RetailCategory,
  type RetailProduct,
} from "@/data/retail-products";
import { cn, formatINR } from "@/lib/utils";

interface ResolvedStore {
  id: string;
  name: string;
  address: string;
  pincode: string;
  delivery_fee: number;
}

interface CatalogueResponse {
  source: string;
  categories: RetailCategory[];
  products: RetailProduct[];
}

const STORE_KEY = "af_store";

export function GroceryStorefront() {
  const [categories, setCategories] = useState<RetailCategory[]>(RETAIL_CATEGORIES);
  const [products, setProducts] = useState<RetailProduct[]>(RETAIL_PRODUCTS);
  const [store, setStore] = useState<ResolvedStore | null>(null);
  const [pincode, setPincode] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("featured");
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadCatalogue = useCallback(async (storeId?: string) => {
    setCatalogueBusy(true);
    try {
      const response = await fetch(`/api/retail/catalogue${storeId ? `?store_id=${storeId}` : ""}`);
      if (!response.ok) throw new Error("catalogue_failed");
      const data = (await response.json()) as CatalogueResponse;
      setCategories(data.categories);
      setProducts(data.products);
    } catch {
      setCategories(RETAIL_CATEGORIES);
      setProducts(RETAIL_PRODUCTS);
    } finally {
      setCatalogueBusy(false);
    }
  }, []);

  useEffect(() => {
    let savedStore: ResolvedStore | null = null;
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) savedStore = JSON.parse(saved) as ResolvedStore;
    } catch {
      // Browsing remains available if storage is blocked.
    }
    queueMicrotask(() => {
      if (savedStore) setStore(savedStore);
      void loadCatalogue(savedStore?.id);
    });
  }, [loadCatalogue]);

  async function setDeliveryArea(event: React.FormEvent) {
    event.preventDefault();
    setLocationError(null);
    if (!/^\d{6}$/.test(pincode)) {
      setLocationError("Enter a valid 6-digit delivery pincode.");
      return;
    }
    setLocationBusy(true);
    try {
      const position = await getOptionalPosition();
      const params = new URLSearchParams({ pincode });
      if (position) {
        params.set("lat", String(position.latitude));
        params.set("lng", String(position.longitude));
      }
      const response = await fetch(`/api/stores/resolve?${params}`);
      if (response.status === 404) {
        setLocationError("We’re not delivering to that pincode yet. Try another nearby address.");
        return;
      }
      if (!response.ok) throw new Error("location_failed");
      const data = (await response.json()) as { store: Omit<ResolvedStore, "delivery_fee">; delivery_fee: number };
      const resolved = { ...data.store, delivery_fee: data.delivery_fee };
      localStorage.setItem(STORE_KEY, JSON.stringify(resolved));
      window.dispatchEvent(new Event("af-store-changed"));
      setStore(resolved);
      await loadCatalogue(resolved.id);
    } catch {
      setLocationError("We couldn’t check live availability just now. Please try again.");
    } finally {
      setLocationBusy(false);
    }
  }

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory = category === "all" || product.category_slug === category;
      const matchesQuery =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        product.description.toLowerCase().includes(normalized) ||
        product.tags.some((tag) => tag.toLowerCase().includes(normalized));
      return matchesCategory && matchesQuery;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.selling_price - b.selling_price;
      if (sort === "price-high") return b.selling_price - a.selling_price;
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(b.tags.includes("Bestseller")) - Number(a.tags.includes("Bestseller"));
    });
  }, [category, products, query, sort]);

  return (
    <>
      <section className="section-container -mt-8 relative z-20">
        <div className="bg-card border-border/70 shadow-luxe-lg grid gap-5 rounded-[1.75rem] border p-5 md:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex items-start gap-4">
            <span className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
              store ? "bg-primary text-primary-foreground" : "bg-muted text-accent",
            )}>
              {store ? <Check size={17} /> : <MapPin size={17} />}
            </span>
            <div>
              <p className="text-sm font-semibold">
                {store ? `Shopping live inventory from ${store.name}` : "Set your delivery area for live store inventory"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {store
                  ? `${store.address} · Delivery ${store.delivery_fee ? formatINR(store.delivery_fee) : "included"}`
                  : "We’ll connect your cart to the nearest Aeden store before you add anything."}
              </p>
            </div>
          </div>
          <form onSubmit={setDeliveryArea} className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <LocateFixed size={14} className="text-muted-foreground absolute top-1/2 left-3.5 -translate-y-1/2" />
              <Input
                aria-label="Delivery pincode"
                value={pincode}
                onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                placeholder={store ? "Change pincode" : "Delivery pincode"}
                className="h-11 bg-background pl-10 sm:w-48"
              />
            </div>
            <Button type="submit" disabled={locationBusy} className="h-11">
              {locationBusy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              Check area
            </Button>
          </form>
          {locationError && <p role="alert" className="text-destructive text-xs lg:col-span-2">{locationError}</p>}
        </div>
      </section>

      <section className="section-container py-12 lg:py-16">
        <div className="bg-card/95 border-border/70 shadow-luxe sticky top-[74px] z-30 rounded-2xl border p-3 backdrop-blur-xl md:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1 xl:max-w-md">
              <Search size={15} className="text-muted-foreground absolute top-1/2 left-3.5 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search fruit, bakery, dairy…"
                aria-label="Search grocery catalogue"
                className="bg-background pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
              <button
                onClick={() => setCategory("all")}
                aria-pressed={category === "all"}
                className={filterClass(category === "all")}
              >
                All fresh
              </button>
              {categories.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCategory(item.slug)}
                  aria-pressed={category === item.slug}
                  className={filterClass(category === item.slug)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <label className="border-border bg-background flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold">
              <SlidersHorizontal size={13} className="text-muted-foreground" />
              <span className="sr-only">Sort products</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none">
                <option value="featured">Featured first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow"><Leaf size={12} /> Curated for Aeden</p>
            <h2 className="mt-2 text-4xl leading-none md:text-5xl">The fresh shelf.</h2>
          </div>
          <p className="text-muted-foreground text-right text-xs">
            {catalogueBusy ? "Refreshing availability…" : `${visibleProducts.length} items`}
          </p>
        </div>

        {visibleProducts.length ? (
          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <article key={product.id} className="bg-card border-border/70 shadow-luxe group flex min-h-full flex-col overflow-hidden rounded-[1.65rem] border transition-transform duration-500 hover:-translate-y-1">
                <div className="image-zoom relative aspect-[4/3] overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
                    <span className="bg-card/92 text-foreground rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] uppercase backdrop-blur">
                      {product.category_name}
                    </span>
                    {store && (
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] uppercase backdrop-blur",
                        product.is_available ? "bg-secondary/90 text-white" : "bg-card/92 text-muted-foreground",
                      )}>
                        {product.is_available
                          ? product.stock_qty != null && product.stock_qty <= 5
                            ? `Only ${product.stock_qty} left`
                            : "In stock"
                          : "Sold out"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-accent text-[9px] font-bold tracking-[0.16em] uppercase">{product.unit_label}</p>
                  <h3 className="mt-1.5 text-2xl leading-none">{product.name}</h3>
                  <p className="text-muted-foreground mt-3 line-clamp-2 flex-1 text-xs leading-relaxed">{product.description}</p>
                  <div className="mt-5 flex items-end justify-between gap-3 border-t pt-4">
                    <div>
                      <p className="font-serif text-2xl font-semibold leading-none">{formatINR(product.selling_price)}</p>
                      {product.compare_at_price && product.compare_at_price > product.selling_price && (
                        <p className="text-muted-foreground mt-1 text-[10px] line-through">{formatINR(product.compare_at_price)}</p>
                      )}
                    </div>
                    <AddRetailProductButton product={product} disabled={!store || !product.is_available} />
                  </div>
                  {!store && <p className="text-muted-foreground mt-2 text-right text-[9px]">Set pincode to add</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-card border-border/70 mt-7 flex min-h-80 flex-col items-center justify-center rounded-[2rem] border p-8 text-center">
            <span className="bg-primary/20 text-accent flex h-14 w-14 items-center justify-center rounded-full"><Search size={20} /></span>
            <h3 className="mt-5 text-3xl">Nothing on that shelf.</h3>
            <p className="text-muted-foreground mt-2 text-sm">Try another category or clear your search.</p>
            <Button variant="outline" className="mt-5" onClick={() => { setCategory("all"); setQuery(""); }}>Clear filters</Button>
          </div>
        )}
      </section>

      <section className="section-container pb-16 lg:pb-24">
        <div className="bg-secondary text-secondary-foreground paper-noise grid gap-7 rounded-[2rem] p-7 md:grid-cols-3 md:p-10">
          {[
            [ShieldCheck, "Live store stock", "Availability and prices are validated again securely at checkout."],
            [Truck, "Nearest-store fulfilment", "Your delivery address is routed to the closest serviceable Aeden store."],
            [Sparkles, "Handled like fresh food", "Chilled and delicate items stay with the store team through dispatch."],
          ].map(([Icon, title, copy]) => {
            const ItemIcon = Icon as typeof ShieldCheck;
            return (
              <div key={title as string}>
                <ItemIcon className="text-primary" size={20} />
                <h3 className="mt-5 text-2xl text-white">{title as string}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/55">{copy as string}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline"><Link href="/cart"><ShoppingBag /> Review my cart <ArrowRight /></Link></Button>
        </div>
      </section>
    </>
  );
}

function filterClass(active: boolean) {
  return cn(
    "shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition-colors",
    active
      ? "border-secondary bg-secondary text-secondary-foreground"
      : "border-border bg-background hover:border-accent/40",
  );
}

function getOptionalPosition(): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 300000 },
    );
  });
}
