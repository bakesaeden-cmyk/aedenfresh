import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Leaf,
  MessageCircle,
  Salad,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";

import { CartIndicator } from "@/components/cart/cart-indicator";
import { DeliveryLocation } from "@/components/storefront/delivery-location";
import { LogoSplash } from "@/components/storefront/logo-splash";
import { MobileNav } from "@/components/storefront/mobile-nav";
import { WhatsAppLauncher } from "@/components/storefront/whatsapp-launcher";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <div className="bg-secondary text-secondary-foreground overflow-hidden py-2.5">
        <div className="section-container flex items-center justify-center gap-2 text-center text-[10px] font-bold tracking-[0.18em] uppercase">
          <Leaf size={11} className="text-primary shrink-0" />
          <span>Made fresh in Kochi · Flexible subscriptions · Order on WhatsApp</span>
        </div>
      </div>
      <header className="border-border/70 bg-background/88 sticky top-0 z-50 border-b backdrop-blur-2xl">
        <div className="section-container flex h-[74px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="Aeden Fresh home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-dark-crop.png"
              alt="Aeden Fresh"
              className="h-9 w-auto md:h-10"
            />
          </Link>

          <nav className="text-foreground/68 hidden items-center gap-7 text-[12px] font-semibold 2xl:flex">
            <Link href="/build" className="hover:text-accent transition-colors">
              Build a Bowl
            </Link>
            <Link href="/baskets" className="hover:text-accent transition-colors">
              Chef’s Menu
            </Link>
            <Link
              href="/account/subscriptions"
              className="hover:text-accent transition-colors"
            >
              Subscriptions
            </Link>
            <Link href="/#how-it-works" className="hover:text-accent transition-colors">
              How it Works
            </Link>
          </nav>

          <div className="flex items-center gap-1.5">
            <DeliveryLocation />
            <Link
              href="/baskets"
              aria-label="Search the menu"
              className="hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            >
              <Search size={17} />
            </Link>
            <Link
              href={user ? "/account" : "/login"}
              aria-label={user ? "My account" : "Sign in"}
              className="hover:bg-muted flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            >
              <User size={17} />
            </Link>
            <CartIndicator />
            <Button asChild size="sm" className="glow-leaf ml-1 hidden xl:inline-flex">
              <Link href="/build">
                <Salad />
                Build my bowl
              </Link>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}

function Footer() {
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto pb-20 md:pb-0">
      <div className="section-container grid gap-10 py-14 md:grid-cols-[1.4fr_0.6fr_0.6fr] lg:py-20">
        <div className="max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light-crop.png" alt="Aeden Fresh" className="h-10 w-auto" />
          <h2 className="mt-7 text-4xl leading-[0.95] text-white">
            Your everyday ritual,
            <br />made delicious.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/58">
            Build precisely what your body wants, schedule it around your life,
            and leave the sourcing, prep, and delivery to us.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/build">Build a bowl <ArrowRight /></Link>
            </Button>
            {whatsappNumber && (
              <Button asChild variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">
                  <MessageCircle /> WhatsApp us
                </a>
              </Button>
            )}
          </div>
        </div>

        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Explore</p>
          <div className="mt-5 flex flex-col gap-3 text-sm text-white/62">
            <Link href="/build" className="hover:text-white">Build a Bowl</Link>
            <Link href="/baskets" className="hover:text-white">Chef’s Menu</Link>
            <Link href="/account/subscriptions" className="hover:text-white">Subscriptions</Link>
            <Link href="/account" className="hover:text-white">My Account</Link>
          </div>
        </div>

        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">The standard</p>
          <div className="mt-5 flex flex-col gap-3 text-sm text-white/62">
            <span className="flex items-center gap-2"><Leaf size={14} /> Sourced fresh</span>
            <span className="flex items-center gap-2"><ShieldCheck size={14} /> Prepared with care</span>
            <span className="flex items-center gap-2"><Camera size={14} /> @aedenfresh</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="section-container flex flex-col gap-2 py-5 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aeden Fresh. Kochi, Kerala.</p>
          <p>Formerly Greens Angaadi · Fresh commerce, thoughtfully made.</p>
        </div>
      </div>
    </footer>
  );
}

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <LogoSplash />
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <WhatsAppLauncher />
    </div>
  );
}
