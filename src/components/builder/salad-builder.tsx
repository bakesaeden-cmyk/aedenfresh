"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarClock,
  Flame,
  Loader2,
  MapPin,
  Pencil,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import { SubscribePanel } from "@/components/builder/subscribe-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addToCart } from "@/lib/cart";
import { cn, formatINR } from "@/lib/utils";

// ── Contract types (docs/api-contract.md) ───────────────────
interface CatalogueOption {
  id: string;
  name: string;
  price_delta: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_url: string | null;
  allergens: string[];
  is_available: boolean;
}
interface CatalogueCategory {
  id: string;
  type: "base" | "protein" | "dressing" | "topping" | "addon" | "portion";
  name: string;
  display_order: number;
  max_free_selections: number | null;
  options: CatalogueOption[];
}
interface ResolvedStore {
  id: string;
  name: string;
  address: string;
  pincode: string;
}
interface ServiceableArea {
  name: string;
  pincodes: string[];
}

type Phase = "pincode" | "loading" | "building" | "summary" | "subscribe" | "done";

const STORE_KEY = "af_store";

const STEP_HINTS: Record<CatalogueCategory["type"], string> = {
  base: "Every great bowl starts at the bottom.",
  protein: "Fuel — pick your power source.",
  dressing: "The personality of the bowl.",
  topping: "Crunch, colour, character.",
  addon: "Little luxuries, big difference.",
  portion: "How hungry are we today?",
};

export function SaladBuilder() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("pincode");
  const [pincode, setPincode] = useState("");
  const [store, setStore] = useState<ResolvedStore | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  // categoryId → option ids in SELECTION ORDER (order matters for free-count pricing)
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [comboName, setComboName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<ServiceableArea[]>([]);
  const [noCoverage, setNoCoverage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedRemotely, setSavedRemotely] = useState(false);
  const [savedComboId, setSavedComboId] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Store bootstrap: reuse a previously resolved store ─────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as ResolvedStore & { delivery_fee?: number };
        queueMicrotask(() => {
          setStore(saved);
          setDeliveryFee(saved.delivery_fee ?? 0);
          setPhase("loading");
        });
        void loadCatalogue(saved.id);
      }
    } catch {
      /* corrupted localStorage — stay on pincode gate */
    }
    // Serviceable areas for the pincode gate ("we deliver in …")
    void fetch("/api/stores/serviceable")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { areas?: ServiceableArea[] } | null) => {
        if (data?.areas?.length) setAreas(data.areas);
      })
      .catch(() => {
        /* hint is optional — hide silently */
      });
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCatalogue = useCallback(async (storeId: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/catalogue?store_id=${storeId}`);
      if (!res.ok) throw new Error("catalogue_failed");
      const data = (await res.json()) as { categories: CatalogueCategory[] };
      const cats = (data.categories ?? [])
        .filter((c) => c.options.length > 0)
        .sort((a, b) => a.display_order - b.display_order);
      if (cats.length === 0) throw new Error("catalogue_empty");
      setCategories(cats);
      setPhase("building");
      setStepIndex(0);
    } catch {
      setError(
        "Couldn't load the menu right now. Please try again in a moment.",
      );
      setPhase("pincode");
    }
  }, []);

  async function resolveStore(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNoCoverage(false);
    if (!/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/stores/resolve?pincode=${pincode}`);
      if (res.status === 404) {
        setNoCoverage(true);
        setError(
          `We're not delivering to ${pincode} yet — new neighbourhoods are coming soon!`,
        );
        return;
      }
      if (!res.ok) throw new Error("resolve_failed");
      const data = (await res.json()) as {
        store: ResolvedStore;
        delivery_fee: number;
      };
      setStore(data.store);
      setDeliveryFee(data.delivery_fee);
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({ ...data.store, delivery_fee: data.delivery_fee }),
      );
      setPhase("loading");
      await loadCatalogue(data.store.id);
    } catch {
      setError(
        "Our store service is momentarily unreachable — please try again in a minute.",
      );
    } finally {
      setBusy(false);
    }
  }

  function changeStore() {
    localStorage.removeItem(STORE_KEY);
    setStore(null);
    setSelections({});
    setStepIndex(0);
    setPhase("pincode");
  }

  const currentCategory = categories[stepIndex];

  // ── Pricing + nutrition (live, spec §5.2) ──────────────────
  // Multi-select categories: the first `max_free_selections` picks are
  // included; extras charge their price_delta. Single-select categories
  // always charge price_delta (the portion option carries the bowl price).
  const totals = useMemo(() => {
    let price = 0;
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const cat of categories) {
      const picked = selections[cat.id] ?? [];
      picked.forEach((optionId, idx) => {
        const opt = cat.options.find((o) => o.id === optionId);
        if (!opt) return;
        const isFree =
          cat.max_free_selections != null && idx < cat.max_free_selections;
        if (!isFree) price += opt.price_delta;
        calories += opt.calories ?? 0;
        protein += Number(opt.protein_g ?? 0);
        carbs += Number(opt.carbs_g ?? 0);
        fat += Number(opt.fat_g ?? 0);
      });
    }
    return { price, calories, protein, carbs, fat };
  }, [categories, selections]);

  const allOptionIds = useMemo(
    () => Object.values(selections).flat(),
    [selections],
  );
  const portionName = useMemo(() => {
    const portionCat = categories.find((c) => c.type === "portion");
    const id = portionCat ? selections[portionCat.id]?.[0] : undefined;
    return portionCat?.options.find((o) => o.id === id)?.name ?? null;
  }, [categories, selections]);

  function toggleOption(cat: CatalogueCategory, opt: CatalogueOption) {
    if (!opt.is_available) return;
    const isMulti = cat.max_free_selections != null;
    setSelections((prev) => {
      const current = prev[cat.id] ?? [];
      if (isMulti) {
        return {
          ...prev,
          [cat.id]: current.includes(opt.id)
            ? current.filter((id) => id !== opt.id)
            : [...current, opt.id],
        };
      }
      return { ...prev, [cat.id]: [opt.id] };
    });
    // Single-select: brief pause so the tick registers, then advance.
    if (!isMulti) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => goNext(), 260);
    }
  }

  function goNext() {
    setStepIndex((i) => {
      if (i >= categories.length - 1) {
        setPhase("summary");
        return i;
      }
      return i + 1;
    });
  }
  function goBack() {
    if (phase === "summary") {
      setPhase("building");
      return;
    }
    setStepIndex((i) => Math.max(0, i - 1));
  }

  const stepComplete =
    currentCategory != null &&
    (currentCategory.max_free_selections != null ||
      (selections[currentCategory.id]?.length ?? 0) > 0);

  async function finish(variant: "order" | "subscribe") {
    setBusy(true);
    let comboId: string | undefined;
    try {
      const res = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: comboName || undefined,
          combo_type: "salad",
          option_ids: allOptionIds,
          portion_size: portionName ?? undefined,
        }),
      });
      setSavedRemotely(res.status === 201);
      if (res.status === 201) {
        const data = (await res.json()) as { combo?: { id: string } };
        comboId = data.combo?.id;
        setSavedComboId(comboId ?? null);
      }
    } catch {
      setSavedRemotely(false);
    }

    if (variant === "order") {
      // M3: straight to cart — price re-validated server-side at checkout
      addToCart({
        label: comboName || `Custom Salad (${portionName ?? "Regular"})`,
        option_ids: allOptionIds,
        saved_combo_id: comboId,
        portion_size: portionName ?? undefined,
        unit_price_estimate: totals.price,
        quantity: 1,
      });
      setBusy(false);
      router.push("/cart");
      return;
    }

    // M4: subscription setup needs a saved combo (i.e. a signed-in user);
    // guests see the done screen with a sign-in CTA instead.
    setBusy(false);
    setPhase(comboId ? "subscribe" : "done");
  }

  // ═════════════════════ RENDER ═════════════════════

  if (phase === "pincode") {
    return (
      <div className="section-container grid min-h-[72vh] items-center gap-10 py-10 lg:grid-cols-2 lg:py-16">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-6 lg:mx-0">
        <div>
          <Badge variant="accent" className="mb-4 tracking-[0.22em] uppercase">
            Build Your Salad
          </Badge>
          <h1 className="text-5xl leading-[0.92] md:text-6xl">Let’s start with your neighbourhood.</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            We&apos;ll route your bowl to the nearest Aeden Fresh kitchen and load the right menu, availability, and delivery fee.
          </p>
        </div>
        <form onSubmit={resolveStore} className="bg-card border-border/70 shadow-luxe flex flex-col gap-3 rounded-2xl border p-4">
          <div className="relative">
            <MapPin
              size={15}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              inputMode="numeric"
              maxLength={6}
              placeholder="Your pincode — e.g. 682020"
              className="h-12 bg-background pl-10 text-base"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" size="lg" disabled={busy} className="h-12">
            {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            Find my store
          </Button>
        </form>

        {/* Serviceable areas hint (spec §5.5 waitlist UX) */}
        {areas.length > 0 && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
              Now delivering in
            </p>
            <div className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <span
                  key={a.name}
                  className="border-border/80 text-foreground/80 rounded-full border px-3.5 py-1.5 text-xs font-medium"
                >
                  {a.name}
                </span>
              ))}
            </div>
            {noCoverage && (
              <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
                Serviceable pincodes:{" "}
                {[...new Set(areas.flatMap((a) => a.pincodes))]
                  .sort()
                  .join(", ")}
              </p>
            )}
          </div>
        )}
        </div>
        <div className="shadow-luxe-lg relative hidden min-h-[580px] overflow-hidden rounded-[10rem_10rem_2rem_2rem] lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1300&q=88&auto=format&fit=crop"
            alt="Fresh bowl prepared with greens and seasonal vegetables"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="from-secondary/80 absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent p-8 pt-32 text-white">
            <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Once we know your kitchen</p>
            <p className="mt-2 max-w-sm font-serif text-3xl leading-none">Your six-step bowl build opens with live nutrition and pricing.</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" size={18} /> Loading the menu…
      </div>
    );
  }

  if (phase === "subscribe" && savedComboId && store) {
    return (
      <SubscribePanel
        savedComboId={savedComboId}
        storeId={store.id}
        comboLabel={comboName || `Custom Salad (${portionName ?? "Regular"})`}
        priceEstimate={totals.price}
      />
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Check size={28} />
        </div>
        <h1 className="text-4xl">
          {savedRemotely ? "Combo saved!" : "Bowl built!"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {savedRemotely
            ? "It's in your account, one tap from reorder."
            : "Sign in to save this bowl and turn it into a flexible delivery schedule."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {!savedRemotely && (
            <Button asChild variant="accent">
              <Link href="/login?next=/build">Sign in to save</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/baskets">Browse curated baskets</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/account">My account</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
        <div>
          <Badge variant="gold" className="mb-3 tracking-[0.22em] uppercase">
            Your Bowl
          </Badge>
          <h1 className="text-4xl md:text-5xl">Looking delicious.</h1>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-luxe">
          {categories.map((cat) => {
            const picked = (selections[cat.id] ?? [])
              .map((id) => cat.options.find((o) => o.id === id))
              .filter(Boolean) as CatalogueOption[];
            if (picked.length === 0) return null;
            return (
              <div key={cat.id} className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-accent uppercase">
                    {cat.name}
                  </p>
                  <p className="text-sm font-medium">
                    {picked.map((o) => o.name).join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStepIndex(categories.indexOf(cat));
                    setPhase("building");
                  }}
                  className="text-muted-foreground hover:text-foreground mt-1 transition-colors"
                  aria-label={`Edit ${cat.name}`}
                >
                  <Pencil size={14} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-secondary px-5 py-4 text-secondary-foreground">
          <div className="flex items-center gap-4 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Flame size={13} /> {Math.round(totals.calories)} kcal
            </span>
            <span>{totals.protein.toFixed(0)}g protein</span>
          </div>
          <p className="font-serif text-2xl">{formatINR(totals.price)}</p>
        </div>

        <Input
          placeholder="Name this combo (optional) — e.g. Monday Fuel"
          value={comboName}
          onChange={(e) => setComboName(e.target.value)}
          maxLength={80}
        />

        {/* Subscribe or Order Instantly (spec §5.2 branch) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button size="lg" onClick={() => finish("order")} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
            Order Once
          </Button>
          <Button size="lg" variant="accent" onClick={() => finish("subscribe")} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <CalendarClock />}
            Subscribe & Save
          </Button>
        </div>
        <Button variant="ghost" onClick={goBack}>
          <ArrowLeft /> Keep editing
        </Button>
      </div>
    );
  }

  // ── BUILDING ──
  const picked = selections[currentCategory.id] ?? [];
  const isMulti = currentCategory.max_free_selections != null;

  return (
    <div className="section-container grid w-full gap-10 pt-10 pb-36 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:pb-20">
      <div className="mx-auto flex w-full max-w-2xl flex-col">
      {/* Store banner */}
      <div className="bg-card border-border/70 shadow-luxe mb-7 flex items-center justify-between gap-2 rounded-full border px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 truncate">
          <MapPin size={12} className="shrink-0 text-accent" />
          Delivering from <strong className="text-foreground">{store?.name}</strong>
          {deliveryFee > 0 && <> · {formatINR(deliveryFee)} delivery</>}
        </span>
        <button onClick={changeStore} className="shrink-0 underline underline-offset-2 hover:text-foreground">
          Change
        </button>
      </div>

      {/* Progress */}
      <div className="mb-7 flex items-center gap-1.5" aria-label={`Step ${stepIndex + 1} of ${categories.length}`}>
        {categories.map((cat, i) => (
          <div
            key={cat.id}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < stepIndex ? "bg-accent" : i === stepIndex ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <p className="text-[11px] font-semibold tracking-[0.24em] text-accent uppercase">
        Step {stepIndex + 1} of {categories.length}
      </p>
      <h1 className="mt-2 text-4xl md:text-5xl">{currentCategory.name}</h1>
      <p className="mt-2 mb-7 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {STEP_HINTS[currentCategory.type]}
        {isMulti && (
          <>
            {" "}
            First {currentCategory.max_free_selections} included — extras add
            their price.
          </>
        )}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {currentCategory.options.map((opt) => {
          const isPicked = picked.includes(opt.id);
          const freeIndex = picked.indexOf(opt.id);
          const isFreePick =
            isMulti && freeIndex > -1 && freeIndex < (currentCategory.max_free_selections ?? 0);
          const showPrice = opt.price_delta > 0 && !(isPicked && isFreePick);
          return (
            <button
              key={opt.id}
              onClick={() => toggleOption(currentCategory, opt)}
              disabled={!opt.is_available}
              className={cn(
                "flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left transition-all",
                isPicked
                  ? "border-accent shadow-luxe ring-1 ring-accent"
                  : "hover:border-foreground/25 hover:shadow-luxe",
                !opt.is_available && "opacity-45",
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{opt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {!opt.is_available ? (
                    <span className="text-destructive">Temporarily unavailable</span>
                  ) : (
                    <>
                      {opt.calories != null && <>{opt.calories} kcal</>}
                      {opt.protein_g != null && Number(opt.protein_g) > 0 && (
                        <> · {Number(opt.protein_g)}g protein</>
                      )}
                      {opt.allergens.length > 0 && <> · contains {opt.allergens.join(", ")}</>}
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {isPicked && isFreePick && (
                  <Badge variant="accent" className="text-[10px]">
                    included
                  </Badge>
                )}
                {showPrice && (
                  <span className="text-sm text-muted-foreground">
                    +{formatINR(opt.price_delta)}
                  </span>
                )}
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    isPicked
                      ? "border-accent bg-accent text-white"
                      : "border-border",
                  )}
                >
                  {isPicked && <Check size={13} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      </div>

      <aside className="bg-secondary text-secondary-foreground shadow-luxe-lg sticky top-28 hidden overflow-hidden rounded-[1.75rem] lg:block">
        <div className="border-b border-white/10 p-6">
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Live bowl</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <h2 className="text-3xl leading-none text-white">Made by you.</h2>
            <p className="font-serif text-3xl text-white">{formatINR(totals.price)}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/8 p-3">
              <p className="text-lg font-semibold text-white">{Math.round(totals.calories)}</p>
              <p className="text-[10px] text-white/45">calories</p>
            </div>
            <div className="rounded-xl bg-white/8 p-3">
              <p className="text-lg font-semibold text-white">{totals.protein.toFixed(0)}g</p>
              <p className="text-[10px] text-white/45">protein</p>
            </div>
          </div>
        </div>
        <div className="max-h-[320px] space-y-3 overflow-y-auto p-6">
          {categories.map((category) => {
            const names = (selections[category.id] ?? [])
              .map((id) => category.options.find((option) => option.id === id)?.name)
              .filter(Boolean);
            return (
              <div key={category.id} className="flex items-start justify-between gap-3">
                <span className="text-[10px] font-bold tracking-[0.12em] text-white/35 uppercase">{category.name}</span>
                <span className="max-w-44 text-right text-xs text-white/75">{names.length ? names.join(", ") : "Not chosen"}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-white/10 p-5">
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="icon" onClick={goBack} aria-label="Back" className="border-white/20 text-white hover:bg-white/10">
                <ArrowLeft />
              </Button>
            )}
            <Button onClick={goNext} disabled={!stepComplete} className="flex-1">
              {stepIndex === categories.length - 1 ? <><Sparkles /> Review bowl</> : <>Continue <ArrowRight /></>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Sticky totals bar */}
      <div className="bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="font-serif text-2xl leading-none">{formatINR(totals.price)}</p>
            <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame size={11} /> {Math.round(totals.calories)} kcal
              </span>
              <span>{totals.protein.toFixed(0)}g protein</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <Button variant="outline" size="icon" onClick={goBack} aria-label="Back">
                <ArrowLeft />
              </Button>
            )}
            <Button onClick={goNext} disabled={!stepComplete}>
              {stepIndex === categories.length - 1 ? (
                <>
                  <Sparkles /> Review bowl
                </>
              ) : (
                <>
                  Continue <ArrowRight />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
