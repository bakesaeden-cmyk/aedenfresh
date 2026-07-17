import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Salad,
  ShieldCheck,
  Store,
  Ticket,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getAdminUser } from "@/lib/supabase/server";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Salad },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/orders", label: "Orders", icon: BarChart3 },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/roles", label: "Roles", icon: ShieldCheck },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth: proxy already gates this, verify again server-side.
  const admin = await getAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-secondary text-secondary-foreground lg:flex">
        <div className="flex h-[72px] items-center gap-2 border-b border-white/10 px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="Aeden Fresh" className="h-7 w-auto" />
          <Badge variant="gold" className="ml-1 text-[10px]">ADMIN</Badge>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 p-4 text-xs text-white/40">
          Role: <span className="text-white/70">{admin.role}</span>
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex h-[72px] items-center gap-2 border-b border-border/60 bg-card px-6 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="Aeden Fresh" className="h-6 w-auto" />
          <Badge variant="gold" className="ml-1 text-[10px]">ADMIN</Badge>
        </div>
        <main className="p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
