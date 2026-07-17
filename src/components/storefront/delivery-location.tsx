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
    try {
      const raw = localStorage.getItem("af_store");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredStore;
        queueMicrotask(() => setStore(parsed));
      }
    } catch {
      // Keep the neutral prompt if local storage is unavailable.
    }
  }, []);

  return (
    <Link
      href="/build"
      className="border-border/80 hover:border-accent/40 hover:bg-card hidden items-center gap-2 rounded-full border px-3 py-2 transition-colors lg:flex"
      aria-label={store ? `Delivering from ${store.name}` : "Set delivery location"}
    >
      <MapPin size={14} className="text-accent" />
      <span className="max-w-32 truncate text-[11px] font-semibold">
        {store ? store.name : "Set location"}
      </span>
    </Link>
  );
}
