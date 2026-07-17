import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChefHat,
  Clock3,
  Flame,
  Leaf,
  MessageCircle,
  Pause,
  Salad,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

import { AddBasketButton } from "@/components/cart/add-basket-button";
import { DeliveryAvailability } from "@/components/storefront/delivery-availability";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { formatINR } from "@/lib/utils";

export const metadata = {
  title: "Fresh Commerce",
  description:
    "Build personalised bowls, shop the chef's menu, and schedule fresh deliveries from Aeden Fresh.",
};

interface Basket {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  nutrition_summary: {
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
  } | null;
}

const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=88&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1000&q=88&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1000&q=88&auto=format&fit=crop",
];

const FALLBACK_PICKS: Basket[] = [
  {
    id: "ffffffff-0000-4000-8000-000000000001",
    name: "The Kerala Power Bowl",
    description: "Grilled fish, coconut-curry leaf dressing, beetroot and fresh herbs.",
    base_price: 249,
    image_url: FOOD_IMAGES[0],
    nutrition_summary: { calories: 520, protein_g: 32 },
  },
  {
    id: "ffffffff-0000-4000-8000-000000000002",
    name: "Protein Punch",
    description: "Quinoa, grilled chicken, eggs, chickpeas and pumpkin seeds.",
    base_price: 299,
    image_url: FOOD_IMAGES[1],
    nutrition_summary: { calories: 610, protein_g: 48 },
  },
  {
    id: "ffffffff-0000-4000-8000-000000000003",
    name: "Green Detox",
    description: "Spinach, sprouts, cucumber, zucchini noodles and vinaigrette.",
    base_price: 229,
    image_url: FOOD_IMAGES[2],
    nutrition_summary: { calories: 280, protein_g: 12 },
  },
];

const ROUTES = [
  {
    number: "01",
    eyebrow: "Full control",
    title: "Build your own",
    body: "Pick every base, protein, topping and dressing. Price and nutrition update with every choice.",
    href: "/build",
    cta: "Start your build",
    image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&q=85&auto=format&fit=crop",
  },
  {
    number: "02",
    eyebrow: "One-tap delicious",
    title: "Chef-built bowls",
    body: "Balanced combinations from our kitchen for the days when good decisions need to be effortless.",
    href: "/baskets",
    cta: "Explore the menu",
    image: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=1200&q=85&auto=format&fit=crop",
  },
  {
    number: "03",
    eyebrow: "Healthy on repeat",
    title: "Set your rhythm",
    body: "Schedule daily, alternate-day, weekly or custom deliveries. Skip, pause, or change anytime.",
    href: "/build",
    cta: "Create a plan",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=85&auto=format&fit=crop",
  },
];

const STANDARDS = [
  {
    icon: Leaf,
    title: "Fresh by default",
    body: "Daily sourcing and small-batch prep keep every bowl crisp, bright, and full of character.",
  },
  {
    icon: ShieldCheck,
    title: "Nothing to hide",
    body: "Live calories, protein, carbs, fats and allergen cues make choosing feel clear—not clinical.",
  },
  {
    icon: Truck,
    title: "Built for real life",
    body: "Store routing, delivery slots, saved addresses and easy tracking remove the usual ordering friction.",
  },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("curated_baskets")
    .select("id, name, description, base_price, image_url, nutrition_summary")
    .eq("is_active", true)
    .order("base_price")
    .limit(3);
  const hasLivePicks = Boolean(data?.length);
  const picks = ((data?.length ? data : FALLBACK_PICKS) as Basket[]).map((pick, index) => ({
    ...pick,
    image_url: pick.image_url || FOOD_IMAGES[index % FOOD_IMAGES.length],
  }));

  return (
    <>
      <section className="section-container grid min-h-[720px] items-center gap-12 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div className="relative z-10 flex flex-col items-start">
          <span className="eyebrow">
            <span className="bg-accent h-px w-8" /> Kochi’s modern fresh kitchen
          </span>
          <h1 className="display-title text-balance mt-7">
            Feel good food,
            <span className="text-accent block italic">made around you.</span>
          </h1>
          <p className="text-muted-foreground mt-7 max-w-xl text-[15px] leading-7 md:text-base">
            Personalised bowls, honest nutrition, and recurring deliveries that move
            with your week. Fresh eating finally feels as easy as it should.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="glow-leaf h-13 px-6">
              <Link href="/build">Build my bowl <ArrowRight /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-13 bg-white/50 px-6">
              <Link href="/baskets">Shop chef’s menu</Link>
            </Button>
          </div>
          <div className="border-border/70 mt-10 grid w-full max-w-lg grid-cols-3 border-y py-5">
            {[
              ["6", "guided build steps"],
              ["Live", "price & nutrition"],
              ["Anytime", "pause or skip"],
            ].map(([value, label], index) => (
              <div key={label} className={index ? "border-border/70 border-l pl-5" : ""}>
                <p className="font-serif text-2xl font-semibold">{value}</p>
                <p className="text-muted-foreground mt-0.5 text-[10px] leading-tight uppercase">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[540px] md:min-h-[620px]">
          <div className="bg-primary/20 absolute top-10 right-0 h-[72%] w-[82%] rounded-[48%_48%_12%_12%] blur-3xl" />
          <div className="image-zoom shadow-luxe-lg absolute top-0 right-0 h-[86%] w-[82%] overflow-hidden rounded-[10rem_10rem_2rem_2rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1543362906-acfc16c67564?w=1400&q=90&auto=format&fit=crop"
              alt="Colourful fresh bowl with greens, avocado and vegetables"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="border-background shadow-luxe-lg absolute bottom-0 left-0 h-52 w-44 overflow-hidden rounded-[5rem_5rem_1.5rem_1.5rem] border-[7px] sm:h-64 sm:w-52">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1607532941433-304659e8198a?w=700&q=88&auto=format&fit=crop"
              alt="Fresh vegetable bowl being prepared"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="bg-card shadow-luxe-lg absolute right-1 bottom-5 rounded-2xl p-4 sm:right-5 sm:bottom-10">
            <div className="flex items-center gap-3">
              <span className="bg-primary/20 text-accent flex h-10 w-10 items-center justify-center rounded-full">
                <Sparkles size={17} />
              </span>
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] uppercase">Your bowl, live</p>
                <p className="text-muted-foreground text-xs">Price · calories · protein</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-border/70 bg-card/60 overflow-hidden border-y py-3.5" aria-label="Aeden Fresh benefits">
        <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap text-[10px] font-bold tracking-[0.2em] uppercase">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-8">
              {[
                "Sourced fresh",
                "Built your way",
                "Live nutrition",
                "Flexible schedules",
                "WhatsApp friendly",
                "Delivered in Kochi",
              ].map((item) => (
                <span key={`${copy}-${item}`} className="flex items-center gap-8">
                  {item} <Leaf size={11} className="text-primary" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="section-container py-16 lg:py-24">
        <div className="bg-muted/75 border-border/70 shadow-luxe grid items-center gap-8 rounded-[2rem] border p-6 md:p-8 lg:grid-cols-[0.7fr_1.3fr] lg:p-10">
          <div>
            <span className="eyebrow"><Clock3 size={13} /> Check your neighbourhood</span>
            <h2 className="mt-3 text-3xl leading-none md:text-4xl">Fresh starts at your door.</h2>
            <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed">
              Enter your pincode once. We’ll remember your nearest kitchen and show the right menu and delivery fee.
            </p>
          </div>
          <DeliveryAvailability />
        </div>
      </section>

      <section id="how-it-works" className="section-container pb-16 lg:pb-24">
        <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow">Choose your way</span>
            <h2 className="mt-3 text-4xl leading-none md:text-6xl">A fresh route for every day.</h2>
          </div>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
            Start from a blank bowl, trust the kitchen, or put your favourite combination on repeat.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {ROUTES.map((route) => (
            <Link
              key={route.number}
              href={route.href}
              className="group bg-card border-border/70 shadow-luxe image-zoom flex flex-col overflow-hidden rounded-[1.75rem] border"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={route.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                <span className="bg-background/90 absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full font-serif text-lg backdrop-blur">
                  {route.number}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-accent text-[10px] font-bold tracking-[0.18em] uppercase">{route.eyebrow}</p>
                <h3 className="mt-2 text-3xl">{route.title}</h3>
                <p className="text-muted-foreground mt-3 flex-1 text-sm leading-relaxed">{route.body}</p>
                <span className="mt-6 flex items-center justify-between text-sm font-semibold">
                  {route.cta}
                  <span className="bg-secondary text-secondary-foreground flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:rotate-45">
                    <ArrowUpRight size={16} />
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-secondary text-secondary-foreground paper-noise py-16 lg:py-24">
        <div className="section-container relative z-10">
          <div className="mb-9 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-primary text-[10px] font-bold tracking-[0.22em] uppercase">From the Aeden kitchen</span>
              <h2 className="mt-3 text-4xl text-white md:text-6xl">Today’s easy favourites.</h2>
            </div>
            <Link href="/baskets" className="text-primary flex items-center gap-2 text-sm font-semibold">
              See the full menu <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {picks.map((pick, index) => (
              <article key={pick.id} className="group overflow-hidden rounded-[1.75rem] bg-white text-[hsl(147,30%,10%)]">
                <div className="image-zoom relative aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pick.image_url!} alt={pick.name} className="h-full w-full object-cover" loading="lazy" />
                  <span className="bg-secondary text-secondary-foreground absolute top-4 left-4 rounded-full px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] uppercase">
                    {index === 0 ? "House favourite" : index === 1 ? "High protein" : "Fresh & light"}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl leading-none">{pick.name}</h3>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[hsl(145,9%,39%)]">{pick.description}</p>
                    </div>
                    <p className="shrink-0 font-serif text-xl font-semibold">{formatINR(Number(pick.base_price))}</p>
                  </div>
                  {pick.nutrition_summary && (
                    <div className="mt-4 flex gap-2 text-[10px] font-semibold text-[hsl(145,9%,39%)]">
                      {pick.nutrition_summary.calories != null && <span className="flex items-center gap-1 rounded-full bg-[hsl(46,28%,91%)] px-2.5 py-1"><Flame size={10} /> {pick.nutrition_summary.calories} kcal</span>}
                      {pick.nutrition_summary.protein_g != null && <span className="rounded-full bg-[hsl(46,28%,91%)] px-2.5 py-1">{pick.nutrition_summary.protein_g}g protein</span>}
                    </div>
                  )}
                  {hasLivePicks ? (
                    <AddBasketButton basketId={pick.id} name={pick.name} price={Number(pick.base_price)} />
                  ) : (
                    <Button asChild className="mt-1 w-full">
                      <Link href="/build"><Salad /> Build something similar</Link>
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-container grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div className="relative min-h-[560px]">
          <div className="absolute inset-0 overflow-hidden rounded-[10rem_10rem_2rem_2rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1300&q=88&auto=format&fit=crop"
              alt="Fresh ingredients and prepared meals arranged for the week"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="bg-card shadow-luxe-lg absolute right-4 bottom-4 w-[calc(100%-2rem)] rounded-2xl p-5 sm:right-8 sm:bottom-8 sm:w-72">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] uppercase">Your weekly rhythm</p>
                <p className="text-muted-foreground mt-1 text-xs">Protein Punch · 8:00–10:00 AM</p>
              </div>
              <span className="bg-primary/20 text-accent flex h-9 w-9 items-center justify-center rounded-full"><CalendarClock size={16} /></span>
            </div>
            <div className="mt-5 flex justify-between gap-1.5">
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <span key={`${day}-${index}`} className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${[0, 2, 4].includes(index) ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>{day}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <span className="eyebrow"><CalendarClock size={13} /> Subscribe & save</span>
          <h2 className="text-balance mt-4 text-5xl leading-[0.92] md:text-7xl">
            Good habits, without the daily negotiation.
          </h2>
          <p className="text-muted-foreground mt-6 max-w-lg text-sm leading-7 md:text-base">
            Turn any saved bowl into a schedule that fits your life. Choose the days, start date,
            delivery slot and address—then manage the rest from your account or WhatsApp.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              [Check, "Daily, weekly or custom days"],
              [Pause, "Skip, pause or cancel anytime"],
              [MessageCircle, "WhatsApp payment reminders"],
              [CalendarClock, "Your preferred delivery slot"],
            ].map(([Icon, copy]) => {
              const FeatureIcon = Icon as typeof Check;
              return (
                <div key={copy as string} className="flex items-center gap-3 text-sm font-medium">
                  <span className="bg-primary/20 text-accent flex h-8 w-8 items-center justify-center rounded-full"><FeatureIcon size={14} /></span>
                  {copy as string}
                </div>
              );
            })}
          </div>
          <Button asChild size="lg" className="mt-8 h-13 px-6">
            <Link href="/build">Build my recurring bowl <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <section className="section-container pb-16 lg:pb-24">
        <div className="border-border/70 bg-card shadow-luxe rounded-[2rem] border p-6 md:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <span className="eyebrow"><ChefHat size={13} /> The Aeden standard</span>
              <h2 className="mt-4 text-5xl leading-[0.92] md:text-6xl">Freshness you can feel. Clarity you can trust.</h2>
              <p className="text-muted-foreground mt-5 max-w-md text-sm leading-relaxed">
                Premium should mean fewer compromises—not more ceremony. We make the good choice feel obvious at every step.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {STANDARDS.map((item, index) => (
                <div key={item.title} className={`rounded-2xl p-5 ${index === 1 ? "bg-primary/18" : "bg-muted/70"}`}>
                  <item.icon size={20} className="text-accent" />
                  <h3 className="mt-8 text-2xl leading-none">{item.title}</h3>
                  <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-container pb-16 lg:pb-24">
        <div className="bg-primary relative overflow-hidden rounded-[2rem] p-7 md:p-12 lg:p-16">
          <div className="relative z-10 max-w-3xl">
            <span className="text-secondary text-[10px] font-bold tracking-[0.22em] uppercase">Ready when you are</span>
            <h2 className="mt-4 text-5xl leading-[0.9] text-[hsl(145,36%,8%)] md:text-7xl">
              Your next fresh favourite starts here.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[hsl(145,36%,8%)]/70">
              Build from scratch or begin with a kitchen favourite. Either way, it arrives made for your day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-13 bg-secondary px-6 text-white hover:bg-secondary/90">
                <Link href="/build"><Salad /> Build my bowl</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-13 border-secondary/25 bg-transparent px-6 text-secondary hover:bg-white/20">
                <Link href="/baskets">Browse the menu</Link>
              </Button>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-24 h-80 w-80 rounded-full border-[70px] border-white/15" />
          <div className="absolute top-8 right-12 hidden h-20 w-20 items-center justify-center rounded-full bg-white/20 lg:flex">
            <Salad size={30} className="text-secondary" />
          </div>
        </div>
      </section>
    </>
  );
}
