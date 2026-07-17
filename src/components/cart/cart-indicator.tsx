"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { getCart, onCartChange } from "@/lib/cart";

export function CartIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () =>
      setCount(getCart().reduce((n, i) => n + i.quantity, 0));
    update();
    return onCartChange(update);
  }, []);

  return (
    <Link
      href="/cart"
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-muted"
      aria-label={`Cart, ${count} items`}
    >
      <ShoppingBag size={17} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
