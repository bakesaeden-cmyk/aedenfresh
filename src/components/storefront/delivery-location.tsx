"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

interface StoredStore {
  name: string;
  pincode: string;
}

export function DeliveryLocation() {
  const [store, setStore] = useState<StoredStore | null>(null);

  useEffect(() => {
    const readStore = () => {
      try {
        const raw = localStorage.getItem("af_store");
        setStore(raw ? JSON.parse(raw) as StoredStore : null);
      } catch {
        setStore(null);
      }
    };
    readStore();
    window.addEventListener("af-store-changed", readStore);
    window.addEventListener("storage", readStore);
    return () => {
      window.removeEventListener("af-store-changed", readStore);
      window.removeEventListener("storage", readStore);
    };
  }, []);

  return (
    <Link
      href="/groceries"
      className="border-border/80 hover:border-accent/40 hover:bg-card hidden items-center gap-2 rounded-full border px-3 py-2 transition-colors lg:flex"
      aria-label={store ? `Shopping from ${store.name}` : "Set delivery location"}
    >
      <MapPin size={14} className="text-accent" />
      <span className="max-w-32 truncate text-[11px] font-semibold">
        {store ? store.name.replace(/^Aeden Fresh\s+/i, "") : "Set location"}
      </span>
    </Link>
  );
}
