"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Salad, ShoppingBag, ShoppingBasket } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/shop", label: "Home", icon: Home, exact: true },
  { href: "/groceries", label: "Groceries", icon: ShoppingBag, exact: false },
  { href: "/build", label: "Build", icon: Salad, exact: false },
  { href: "/baskets", label: "Browse", icon: ShoppingBasket, exact: false },
  { href: "/account", label: "Orders", icon: Package, exact: true },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="border-border/70 bg-card/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-between px-3 py-2">
        {ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon size={19} strokeWidth={active ? 2.4 : 1.9} />
              {item.label}
              <span
                className={cn(
                  "h-0.5 w-5 rounded-full transition-colors",
                  active ? "bg-primary" : "bg-transparent",
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
