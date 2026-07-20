"use client";

/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, ArrowRight, X, Leaf, Store } from "lucide-react";
import { ALL_PRODUCTS, type ProductCategory } from "@/data/products";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: EASE_OUT } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const CATEGORIES: { id: "all" | ProductCategory; label: string }[] = [
  { id: "all",      label: "All Products" },
  { id: "imported", label: "Imported Fruits" },
  { id: "indian",   label: "Indian Varieties" },
  { id: "produce",  label: "Fresh Produce" },
];

const HERO_IMAGES: Record<"all" | ProductCategory, string> = {
  all:      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&q=85&auto=format&fit=crop",
  imported: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1920&q=85&auto=format&fit=crop",
  indian:   "https://images.unsplash.com/photo-1553279768-865429fa0078?w=1920&q=85&auto=format&fit=crop",
  produce:  "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=1920&q=85&auto=format&fit=crop",
};

const HERO_TITLES: Record<"all" | ProductCategory, string> = {
  all:      "Our Full Range",
  imported: "Imported Fruits",
  indian:   "Indian Varieties",
  produce:  "Fresh Produce",
};

const HERO_DESCS: Record<"all" | ProductCategory, string> = {
  all:      "Every premium product we carry — from rare imported fruits to freshly-sourced Indian varieties and daily-fresh produce.",
  imported: "Pink Lady®, Shine Muscat, Zespri® SunGold and 80+ more exclusive imported varieties sourced via Aeden Fruits International's global supply chain.",
  indian:   "GI-tagged Alphonso mangoes, Kerala's heritage Nendran banana, Nashik pomegranates and the finest Indian varieties — sourced from origin.",
  produce:  "Crisp, Highland-grown vegetables sourced every morning. From Nilgiri broccoli to Bengaluru cherry tomatoes — daily-fresh, no compromise.",
};

export default function Products() {
  const [query, setQuery]       = useState("");
  const [category, setCategory] = useState<"all" | ProductCategory>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_PRODUCTS.filter(p => {
      const matchCat = category === "all" || p.category === category;
      const matchQ   = !q || p.brand.toLowerCase().includes(q) || p.variety.toLowerCase().includes(q) || p.origin.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, category]);

  return (
    <div className="w-full min-h-screen bg-[#F9F7F1] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#F9F7F1]/96 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)] py-3">
        <div className="section-container flex items-center justify-between">
          <Link href="/">
            <img src="/images/logo-dark.png" alt="Aeden Fresh" className="h-10 md:h-12 w-auto" />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="text-[#162D20]/60 hover:text-[#162D20] text-[13px] font-medium transition-colors hidden md:block">
              ← Back to Home
            </Link>
            <Link href="/stores" className="text-[#162D20]/60 hover:text-[#162D20] text-[13px] font-medium transition-colors hidden sm:block">
              Find a Store
            </Link>
            <Link href="/shop"
              className="bg-[#83B13E] hover:bg-[#A1CF58] text-[#122119] rounded-full px-6 h-10 text-[13px] font-bold inline-flex items-center gap-2 transition-colors duration-300 shadow-lg shadow-green-950/25">
              Shop Fresh <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative h-[52vh] min-h-[380px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={category} className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: EASE_OUT }}>
            <img src={HERO_IMAGES[category]} alt="" className="w-full h-full object-cover object-center" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B2116]/90 via-[#183D29]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B2116]/50 via-transparent to-transparent" />

        <div className="relative z-10 h-full flex flex-col justify-end pb-12 section-container">
          <nav className="flex items-center gap-2 mb-5 text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/70">Our Products</span>
          </nav>
          <AnimatePresence mode="wait">
            <motion.div key={category}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.55, ease: EASE_OUT }}>
              <h1 className="text-[clamp(2.8rem,6vw,5rem)] font-serif text-white leading-[0.9] tracking-[-0.03em] mb-4">
                {HERO_TITLES[category]}
              </h1>
              <p className="text-white/52 text-[15px] font-light max-w-xl leading-relaxed">
                {HERO_DESCS[category]}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── FILTERS + SEARCH ── */}
      <div className="bg-white border-b border-[#162D20]/8 sticky top-[60px] z-40 shadow-sm">
        <div className="section-container py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 flex-1">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                aria-pressed={category === cat.id}
                className={`flex items-center gap-2 px-4 h-9 rounded-full text-[12.5px] font-semibold transition-all duration-250 ${
                  category === cat.id
                    ? "bg-[#162D20] text-white shadow-md"
                    : "bg-[#F9F7F1] text-[#162D20]/60 border border-[#162D20]/12 hover:bg-[#162D20]/8 hover:text-[#162D20]"
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${category === cat.id ? "bg-[#83B13E]" : "bg-[#162D20]/25"}`} />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#162D20]/35 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label="Search Aeden Fresh products"
              placeholder="Search products…"
              className="w-full h-9 pl-9 pr-8 rounded-full border border-[#162D20]/14 bg-[#F9F7F1] text-[#162D20] text-[13px] placeholder:text-[#162D20]/35 focus:outline-none focus:border-[#162D20]/30 focus:bg-white transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")}
                aria-label="Clear product search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#162D20]/35 hover:text-[#162D20] transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PRODUCT GRID ── */}
      <section className="section-container py-16 lg:py-20">

        <div className="relative mb-14 overflow-hidden rounded-[2rem] bg-[#162D20] px-6 py-8 text-white shadow-luxe md:px-10 md:py-10">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#83B13E]/18 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-[#A6D55E] uppercase">
                <Leaf size={13} /> Fresh, two ways
              </p>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Take the best produce home, or let our kitchen make it for you.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/58">Our store range and Fresh Commerce kitchen share the same standard: considered sourcing, honest ingredients and freshness you can see.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#83B13E] px-6 text-sm font-bold text-[#122119] transition-colors hover:bg-[#A1CF58]">
                Explore Fresh Commerce <ArrowRight size={14} />
              </Link>
              <Link href="/stores" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-white/8 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/14">
                <Store size={14} /> Visit a store
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-10">
          <p className="text-[#162D20]/40 text-[13px] font-medium">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
            {query && <span className="text-[#162D20]/60"> for "{query}"</span>}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-24">
              <span className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#162D20]/8 text-[#237049]"><Search size={22} /></span>
              <p className="text-[#162D20] font-serif text-2xl mb-3">No products found</p>
              <p className="text-[#162D20]/45 font-light">Try a different search term or category.</p>
              <button onClick={() => { setQuery(""); setCategory("all"); }}
                className="mt-6 text-[#237049] text-sm font-semibold underline underline-offset-2">
                Clear all filters
              </button>
            </motion.div>
          ) : (
            <motion.div key={`${category}-${query}`}
              variants={stagger} initial="hidden" animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-7 gap-y-10">
              {filtered.map((product) => (
                <motion.div key={product.slug} variants={fadeUp}>
                  <Link href={`/products/${product.slug}`} className="group block h-full">
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#162D20]/8 hover:border-gold/40 shadow-luxe hover:shadow-luxe-lg lift transition-[border-color,box-shadow] duration-400 h-full flex flex-col">

                      {/* Image */}
                      <div className="aspect-[4/3] overflow-hidden bg-[#EEEBE2] relative">
                        <img src={product.img} alt={product.brand} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                        <div className="absolute top-3 left-3">
                          <span className="text-[9.5px] font-bold tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[#162D20]/70 border border-[#162D20]/10">
                            {product.tag}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 text-xl">{product.flag}</div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-1">
                        <p className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-[#237049] mb-1">
                          {product.variety}
                        </p>
                        <h3 className="font-serif text-[1.3rem] text-[#162D20] leading-tight mb-2 group-hover:text-[#237049] transition-colors duration-300">
                          {product.brand}
                        </h3>
                        <p className="text-[#162D20]/50 text-[13px] font-light leading-relaxed line-clamp-2 flex-1 mb-4">
                          {product.desc}
                        </p>

                        <div className="h-px bg-[#162D20]/8 mb-4" />

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-[#162D20]/38 font-medium tracking-wide">{product.origin}</p>
                          <span className="flex items-center gap-1 text-[#237049] text-[12px] font-semibold opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                            Explore <ArrowRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── FOOTER NOTE ── */}
      <div className="bg-[#162D20] py-10">
        <div className="section-container text-center">
          <p className="text-white/30 text-sm font-light">
            Sourced exclusively via <span className="text-white/60 font-medium">Aeden Fruits International Pvt Ltd</span>
          </p>
          <p className="text-white/20 text-xs mt-2">Available at all Aeden Fresh stores across Kochi, Kerala</p>
        </div>
      </div>
    </div>
  );
}
