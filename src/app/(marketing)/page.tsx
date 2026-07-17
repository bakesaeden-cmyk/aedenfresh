import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChefHat,
  ExternalLink,
  Globe2,
  Leaf,
  MapPin,
  Salad,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Premium Fresh Grocery in Kochi",
  description:
    "Discover Aeden Fresh: imported fruit, farm-fresh vegetables, artisan bakery, premium dairy, and fresh commerce across Kochi.",
};

const DEPARTMENTS = [
  {
    number: "01",
    title: "Imported fruits",
    note: "80+ varieties · 10+ source countries",
    description:
      "Shine Muscat, Pink Lady®, Zespri® SunGold, Driscoll's® berries and more—selected through our global sourcing network.",
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200&q=88&auto=format&fit=crop",
  },
  {
    number: "02",
    title: "Fresh vegetables",
    note: "Sourced daily · Seasonal and staple",
    description:
      "Everyday essentials, specialty greens and premium produce chosen each morning for colour, crunch and flavour.",
    image:
      "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=1200&q=88&auto=format&fit=crop",
  },
  {
    number: "03",
    title: "Artisan bakery",
    note: "Baked in store every morning",
    description:
      "Croissants, sourdough, pastries and celebration cakes made fresh enough to let the aroma lead the way.",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=88&auto=format&fit=crop",
  },
  {
    number: "04",
    title: "Premium dairy",
    note: "Chilled · Artisan · Curated",
    description:
      "Fresh milk, cultured yoghurt, artisan cheese and premium chilled staples, kept with uncompromising cold-chain care.",
    image:
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1200&q=88&auto=format&fit=crop",
  },
  {
    number: "05",
    title: "Salads & smoothies",
    note: "Made fresh · Built around you",
    description:
      "Personalised bowls, cold-pressed juices and seasonal blends made in our kitchen and now available through Fresh Commerce.",
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061e?w=1200&q=88&auto=format&fit=crop",
  },
];

const STORES = [
  {
    name: "Kadavanthara",
    label: "Flagship",
    area: "Central Kochi",
    address: "Kadavanthara, Ernakulam, Kerala 682020",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)/@9.9625028,76.3009008,17z",
  },
  {
    name: "Kacheripady",
    label: "Open daily",
    area: "Central Kochi",
    address: "Kacheripady Junction, Ernakulam, Kerala 682018",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Kacheripady/@9.9884178,76.2806464,17z",
  },
  {
    name: "Thrippunithura",
    label: "Open daily",
    area: "South Ernakulam",
    address: "Thrippunithura Junction, Ernakulam, Kerala 682301",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Thrippunithura/@9.9459107,76.3505294,17z",
  },
  {
    name: "Kakkanad",
    label: "Open daily",
    area: "Kochi's IT hub",
    address: "Near Infopark Junction, Kakkanad, Kerala 682030",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Kakkanad/@10.016052,76.362121,17z",
  },
];

const FAQS = [
  {
    question: "What makes Aeden Fresh different?",
    answer:
      "We combine a neighbourhood fresh-food experience with direct access to Aeden Fruits International's global supply network. That means exceptional imported fruit alongside produce, bakery, dairy and made-fresh food under one roof.",
  },
  {
    question: "Can I order Aeden Fresh online?",
    answer:
      "Yes. Fresh Commerce lets you build personalised bowls, browse chef-built combinations, see nutrition as you choose, and schedule delivery online.",
  },
  {
    question: "Where are your stores?",
    answer:
      "Aeden Fresh currently has four stores across Kochi: Kadavanthara, Kacheripady, Thrippunithura and Kakkanad.",
  },
  {
    question: "Do you offer subscriptions?",
    answer:
      "Fresh Commerce supports flexible recurring meal schedules. Choose your delivery rhythm, then pause, skip or adjust it as your week changes.",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="bg-primary text-primary-foreground">
        <div className="section-container flex min-h-9 items-center justify-center gap-2 py-2 text-center text-[10px] font-bold tracking-[0.18em] uppercase">
          <Leaf size={11} /> Four stores across Kochi · Fresh Commerce now online
        </div>
      </div>

      <header className="border-white/10 bg-secondary/95 sticky top-0 z-50 border-b text-white backdrop-blur-xl">
        <div className="section-container flex h-[76px] items-center justify-between gap-5">
          <a href="#top" aria-label="Aeden Fresh marketing home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light-crop.png" alt="Aeden Fresh" className="h-10 w-auto" />
          </a>

          <nav className="hidden items-center gap-7 text-[12px] font-semibold text-white/65 lg:flex" aria-label="Marketing navigation">
            <a href="#range" className="transition-colors hover:text-primary">Our range</a>
            <a href="#stores" className="transition-colors hover:text-primary">Stores</a>
            <a href="#story" className="transition-colors hover:text-primary">Our story</a>
            <a href="#franchise" className="transition-colors hover:text-primary">Franchise</a>
            <a href="#contact" className="transition-colors hover:text-primary">Contact</a>
          </nav>

          <Button asChild size="sm" className="glow-leaf rounded-full px-5">
            <Link href="/shop"><ShoppingBag /> Shop fresh</Link>
          </Button>
        </div>
      </header>

      <main>
        <section id="top" className="bg-secondary text-secondary-foreground paper-noise relative overflow-hidden">
          <div className="bg-primary/10 absolute -top-48 -left-40 h-[34rem] w-[34rem] rounded-full blur-3xl" />
          <div className="section-container relative z-10 grid min-h-[760px] items-center gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
            <div className="max-w-2xl">
              <span className="text-primary inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.23em] uppercase">
                <span className="h-px w-8 bg-primary" /> Kerala&apos;s premium fresh grocery
              </span>
              <h1 className="mt-7 text-balance text-[clamp(4rem,8.4vw,8.8rem)] leading-[0.82] tracking-[-0.06em] text-white">
                Fresh from
                <span className="block text-primary italic">the world.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-8 text-white/58 md:text-lg">
                Global fruit. Local harvests. In-store baking. A fresh kitchen made for your day—beautifully curated across Kochi and now online.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="glow-leaf h-13 rounded-full px-7">
                  <Link href="/shop">Shop Fresh Commerce <ArrowRight /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-13 rounded-full border-white/20 bg-white/5 px-7 text-white hover:bg-white/10 hover:text-white">
                  <a href="#stores"><MapPin /> Find a store</a>
                </Button>
              </div>
              <div className="mt-12 grid max-w-xl grid-cols-3 border-y border-white/10 py-5">
                {[["4", "Kochi stores"], ["80+", "imported varieties"], ["14", "years of trust"]].map(([value, label], index) => (
                  <div key={label} className={index ? "border-l border-white/10 pl-5" : ""}>
                    <p className="font-serif text-3xl font-semibold text-white">{value}</p>
                    <p className="mt-1 text-[9px] font-bold tracking-[0.15em] text-white/35 uppercase">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[560px] lg:min-h-[650px]">
              <div className="image-zoom shadow-luxe-lg absolute top-0 right-0 h-[82%] w-[84%] overflow-hidden rounded-[12rem_12rem_2rem_2rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1500&q=90&auto=format&fit=crop"
                  alt="Premium fresh produce inside a beautifully stocked market"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="border-secondary shadow-luxe-lg absolute bottom-0 left-0 h-64 w-52 overflow-hidden rounded-[6rem_6rem_1.5rem_1.5rem] border-[8px] sm:h-72 sm:w-60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=90&auto=format&fit=crop"
                  alt="Colourful premium fruit selection"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="bg-card text-card-foreground shadow-luxe-lg absolute right-2 bottom-7 max-w-[15rem] rounded-2xl p-4 sm:right-8 sm:bottom-10">
                <div className="flex items-center gap-3">
                  <span className="bg-primary/20 text-accent flex h-10 w-10 items-center justify-center rounded-full"><Globe2 size={17} /></span>
                  <div>
                    <p className="text-[9px] font-bold tracking-[0.16em] uppercase">Global to local</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">Selected at source. Fresh in Kochi.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-border/70 bg-card/70 overflow-hidden border-y py-3.5" aria-label="Fresh range highlights">
          <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap text-[10px] font-bold tracking-[0.2em] uppercase">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-8">
                {["Pink Lady®", "Shine Muscat", "Zespri® SunGold", "Farm-fresh vegetables", "Artisan bakery", "Premium dairy", "Fresh Commerce"].map((item) => (
                  <span key={`${copy}-${item}`} className="flex items-center gap-8">{item}<Leaf size={11} className="text-primary" /></span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section id="range" className="section-container py-20 lg:py-28">
          <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <div>
              <span className="eyebrow">Five fresh departments</span>
              <h2 className="mt-4 max-w-4xl text-5xl leading-[0.9] md:text-7xl">Everything fresh, considered as one experience.</h2>
            </div>
            <p className="text-muted-foreground max-w-lg text-sm leading-7 lg:justify-self-end">
              From growers around the world to bakers in store, every department follows the same simple standard: source thoughtfully, handle carefully and never compromise freshness.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
            {DEPARTMENTS.map((department, index) => (
              <article
                key={department.number}
                className={`group bg-card border-border/70 shadow-luxe image-zoom overflow-hidden rounded-[1.75rem] border ${index < 2 ? "xl:col-span-3" : "xl:col-span-2"}`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={department.image} alt={department.title} className="h-full w-full object-cover" loading="lazy" />
                  <span className="bg-background/90 absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full font-serif text-lg backdrop-blur">{department.number}</span>
                </div>
                <div className="p-6">
                  <p className="text-accent text-[9px] font-bold tracking-[0.18em] uppercase">{department.note}</p>
                  <h3 className="mt-2 text-3xl">{department.title}</h3>
                  <p className="text-muted-foreground mt-3 text-sm leading-6">{department.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-secondary text-secondary-foreground paper-noise py-20 lg:py-28">
          <div className="section-container relative z-10 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="relative min-h-[540px]">
              <div className="absolute inset-0 overflow-hidden rounded-[10rem_10rem_2rem_2rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=1400&q=88&auto=format&fit=crop"
                  alt="Fresh fruit selected from a global grower network"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="bg-card text-card-foreground shadow-luxe-lg absolute right-5 bottom-5 max-w-xs rounded-2xl p-5 sm:right-8 sm:bottom-8">
                <p className="text-accent text-[9px] font-bold tracking-[0.18em] uppercase">Powered by Aeden Fruits International</p>
                <p className="mt-2 font-serif text-xl leading-tight">A direct line from trusted growers to Kerala families.</p>
              </div>
            </div>

            <div>
              <span className="text-primary inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] uppercase"><Globe2 size={13} /> Our sourcing advantage</span>
              <h2 className="mt-5 text-5xl leading-[0.9] text-white md:text-7xl">The world, selected for your table.</h2>
              <p className="mt-6 max-w-xl text-sm leading-7 text-white/55 md:text-base">
                Our direct sourcing relationship gives Aeden Fresh access to premium varieties rarely seen elsewhere in Kerala—while our local buying teams keep everyday produce genuinely fresh.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  [ShieldCheck, "Quality checked at every handoff"],
                  [Truck, "Cold-chain care from source to shelf"],
                  [BadgeCheck, "Known growers and trusted brands"],
                  [Leaf, "Local produce sourced every day"],
                ].map(([Icon, text]) => {
                  const ItemIcon = Icon as typeof Leaf;
                  return (
                    <div key={text as string} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                      <ItemIcon size={15} className="shrink-0 text-primary" /> {text as string}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="section-container py-20 lg:py-28">
          <div className="bg-muted/75 border-border/70 shadow-luxe relative overflow-hidden rounded-[2.25rem] border p-7 md:p-12 lg:p-16">
            <div className="bg-primary/25 absolute -top-32 -right-24 h-80 w-80 rounded-full blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_0.85fr]">
              <div>
                <span className="eyebrow"><Sparkles size={13} /> Aeden Fresh Commerce</span>
                <h2 className="mt-4 max-w-4xl text-5xl leading-[0.9] md:text-7xl">The Aeden kitchen, now made for your screen.</h2>
                <p className="text-muted-foreground mt-6 max-w-2xl text-sm leading-7 md:text-base">
                  Build a personalised fresh bowl, browse chef-made combinations, see live nutrition and put your favourites on a flexible delivery schedule.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button asChild size="lg" className="glow-leaf h-13 rounded-full px-7">
                    <Link href="/shop">Enter Fresh Commerce <ArrowRight /></Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-13 rounded-full bg-card/70 px-7">
                    <Link href="/build"><Salad /> Build a bowl</Link>
                  </Button>
                </div>
              </div>
              <div className="bg-secondary text-secondary-foreground shadow-luxe-lg rounded-[2rem] p-6 md:p-8">
                <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Your fresh rhythm</p>
                <div className="mt-6 space-y-4">
                  {[
                    ["01", "Choose", "Start with a chef-built bowl or make your own."],
                    ["02", "Know", "Watch price and nutrition update as you build."],
                    ["03", "Schedule", "Order once or create a flexible recurring plan."],
                  ].map(([number, title, body]) => (
                    <div key={number} className="flex gap-4 border-t border-white/10 pt-4 first:border-0 first:pt-0">
                      <span className="text-primary font-serif text-xl">{number}</span>
                      <div><p className="font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/45">{body}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="stores" className="bg-card/60 border-border/70 border-y py-20 lg:py-28">
          <div className="section-container">
            <div className="mb-11 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="eyebrow"><Store size={13} /> Around Kochi</span>
                <h2 className="mt-4 text-5xl leading-[0.9] md:text-7xl">Four stores. One fresh standard.</h2>
              </div>
              <p className="text-muted-foreground max-w-md text-sm leading-7">Walk in for the full sensory experience—produce, bakery, dairy and fresh food, brought together under one considered roof.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {STORES.map((store, index) => (
                <a
                  key={store.name}
                  href={store.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="group bg-background border-border/70 shadow-luxe flex min-h-72 flex-col rounded-[1.75rem] border p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <span className="bg-primary/20 text-accent flex h-11 w-11 items-center justify-center rounded-full"><MapPin size={17} /></span>
                    <span className="text-muted-foreground text-[9px] font-bold tracking-[0.16em] uppercase">0{index + 1}</span>
                  </div>
                  <div className="mt-auto pt-10">
                    <p className="text-accent text-[9px] font-bold tracking-[0.16em] uppercase">{store.label} · {store.area}</p>
                    <h3 className="mt-2 text-3xl">{store.name}</h3>
                    <p className="text-muted-foreground mt-3 text-xs leading-5">{store.address}</p>
                    <span className="mt-5 flex items-center gap-2 text-xs font-semibold">Open in Maps <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" /></span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="story" className="section-container grid gap-12 py-20 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20 lg:py-28">
          <div>
            <span className="eyebrow">Our story</span>
            <h2 className="mt-4 text-5xl leading-[0.9] md:text-7xl">Fourteen years of freshness in Kerala.</h2>
          </div>
          <div className="space-y-4">
            {[
              ["2010", "Born as Greens Angaadi", "A neighbourhood produce store earned Kochi's trust through exceptional freshness and honest sourcing."],
              ["2024", "Reborn as Aeden Fresh", "A loved local business became a premium fresh-grocery experience with a direct global supply advantage."],
              ["Now", "Four stores and growing", "Aeden Fresh brings imported fruit, local vegetables, bakery, dairy and fresh food to more Kochi neighbourhoods—and now to the web."],
            ].map(([year, title, body]) => (
              <article key={year} className="bg-card border-border/70 shadow-luxe grid gap-4 rounded-2xl border p-6 sm:grid-cols-[5rem_1fr] sm:p-8">
                <span className="text-accent text-[10px] font-bold tracking-[0.18em] uppercase">{year}</span>
                <div><h3 className="text-2xl">{title}</h3><p className="text-muted-foreground mt-3 text-sm leading-6">{body}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section id="franchise" className="bg-secondary text-secondary-foreground paper-noise py-20 lg:py-28">
          <div className="section-container relative z-10 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="text-primary text-[10px] font-bold tracking-[0.22em] uppercase">Grow with Aeden Fresh</span>
              <h2 className="mt-5 max-w-4xl text-5xl leading-[0.9] text-white md:text-7xl">Bring Kerala&apos;s premium fresh experience to your neighbourhood.</h2>
              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/55 md:text-base">A proven brand, a differentiated supply chain and a store experience designed around the category customers return for most: fresh food.</p>
            </div>
            <div className="grid gap-3">
              {[
                [BadgeCheck, "Proven local brand", "Four operating stores and fourteen years of customer trust."],
                [Globe2, "Sourcing advantage", "Direct access to a differentiated global and local fresh network."],
                [ChefHat, "A complete format", "Retail, bakery and fresh kitchen brought together in one model."],
              ].map(([Icon, title, body]) => {
                const ItemIcon = Icon as typeof Leaf;
                return (
                  <div key={title as string} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-3"><ItemIcon size={16} className="text-primary" /><p className="font-semibold text-white">{title as string}</p></div>
                    <p className="mt-2 pl-7 text-xs leading-5 text-white/45">{body as string}</p>
                  </div>
                );
              })}
              <Button asChild className="mt-2 h-12 rounded-full">
                <a href="mailto:info@aedenfruits.com?subject=Aeden%20Fresh%20Franchise%20Enquiry">Start a conversation <ArrowRight /></a>
              </Button>
            </div>
          </div>
        </section>

        <section className="section-container grid gap-12 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <div>
            <span className="eyebrow">Questions, answered</span>
            <h2 className="mt-4 text-5xl leading-[0.9] md:text-7xl">Everything you need to know.</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, index) => (
              <details key={faq.question} className="group bg-card border-border/70 shadow-luxe rounded-2xl border px-6 open:pb-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-sm font-semibold">
                  <span><span className="text-accent mr-3 font-serif">0{index + 1}</span>{faq.question}</span>
                  <span className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="text-muted-foreground max-w-xl pl-8 text-sm leading-6">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-secondary text-secondary-foreground paper-noise">
        <div className="section-container relative z-10 grid gap-12 py-16 md:grid-cols-[1.3fr_0.7fr_0.7fr] lg:py-20">
          <div className="max-w-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-light-crop.png" alt="Aeden Fresh" className="h-11 w-auto" />
            <h2 className="mt-7 text-4xl leading-[0.95] text-white md:text-5xl">The freshest part of your day, in store or online.</h2>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="glow-leaf rounded-full"><Link href="/shop">Shop Fresh Commerce <ArrowRight /></Link></Button>
              <Button asChild variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><a href="tel:+919207889500">Call +91 92078 89500</a></Button>
            </div>
          </div>
          <div>
            <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Explore</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-white/55">
              <a href="#range" className="hover:text-white">Our range</a>
              <a href="#stores" className="hover:text-white">Our stores</a>
              <a href="#story" className="hover:text-white">Our story</a>
              <a href="#franchise" className="hover:text-white">Franchise</a>
              <Link href="/shop" className="hover:text-white">Shop online</Link>
            </div>
          </div>
          <div>
            <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Contact</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-white/55">
              <span>Kadavanthara, Kochi</span>
              <a href="tel:+919207889500" className="hover:text-white">+91 92078 89500</a>
              <a href="mailto:info@aedenfruits.com" className="hover:text-white">info@aedenfruits.com</a>
              <a href="https://aedenfruits.com" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-white">Aeden Fruits International <ExternalLink size={11} /></a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="section-container flex flex-col gap-2 py-5 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Aeden Fresh. Kochi, Kerala.</p>
            <p>Formerly Greens Angaadi · Fresh commerce, thoughtfully made.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
