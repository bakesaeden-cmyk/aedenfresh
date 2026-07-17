"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResolvedStore {
  id: string;
  name: string;
  address: string;
  pincode: string;
  delivery_fee?: number;
}

const STORE_KEY = "af_store";

export function DeliveryAvailability() {
  const router = useRouter();
  const [pincode, setPincode] = useState("");
  const [store, setStore] = useState<ResolvedStore | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ResolvedStore;
        queueMicrotask(() => setStore(parsed));
      }
    } catch {
      // A location is helpful, never required to browse.
    }
  }, []);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pincode)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/stores/resolve?pincode=${pincode}`);
      if (response.status === 404) {
        setError("We are not in your neighbourhood yet — but we are expanding quickly.");
        return;
      }
      if (!response.ok) throw new Error("store_lookup_failed");
      const data = (await response.json()) as {
        store: ResolvedStore;
        delivery_fee: number;
      };
      const resolved = { ...data.store, delivery_fee: data.delivery_fee };
      localStorage.setItem(STORE_KEY, JSON.stringify(resolved));
      setStore(resolved);
      router.push("/build");
    } catch {
      setError("We could not check that location just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (store) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full">
            <Check size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold">Fresh delivery is available</p>
            <p className="text-muted-foreground text-xs">
              {store.name} · {store.pincode}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/build")} className="shrink-0">
          Start building <ArrowRight />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={check} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPin
            size={16}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
          />
          <Input
            aria-label="Delivery pincode"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder="Enter delivery pincode"
            value={pincode}
            onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))}
            className="h-12 bg-white pl-11 text-base"
          />
        </div>
        <Button type="submit" size="lg" disabled={busy} className="h-12 sm:px-6">
          {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          Check delivery
        </Button>
      </div>
      {error && <p className="text-destructive text-xs" role="alert">{error}</p>}
    </form>
  );
}
