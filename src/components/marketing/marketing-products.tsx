"use client";

/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, ArrowRight, X } from "lucide-react";
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

const CATEGORIES: { id: "all" | ProductCategory; label: string; emoji: string }[] = [
  { id: "all",      label: "All Products",      emoji: "🛒" },
  { id: "imported", label: "Imported Fruits",   emoji: "✈️" },
  { id: "indian",   label: "Indian Varieties",  emoji: "🇮🇳" },
  { id: "produce",  label: "Fresh Produce",     emoji: "🥦" },
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
    <div className="w-full min-h-screen bg-[#FAF7F2] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#FAF7F2]/96 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)] py-3">
        <div className="section-container flex items-center justify-between">
          <Link href="/">
            <img src="/images/logo-dark.png" alt="Aeden Fresh" className="h-10 md:h-12 w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[#1C2951]/60 hover:text-[#1C2951] text-[13px] font-medium transition-colors hidden md:block">
              ← Back to Home
            </Link>
            <Link href="/shop" className="text-[#1C2951]/60 hover:text-[#1C2951] text-[13px] font-medium transition-colors hidden md:block">
              Shop Online
            </Link>
            <Link href="/stores"
              className="bg-[#E8303A] hover:bg-[#cc2b34] text-white rounded-full px-6 h-10 text-[13px] font-semibold inline-flex items-center transition-colors duration-300 shadow-lg shadow-red-900/25">
              Find a Store
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#050d1c]/90 via-[#0d1c3a]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050d1c]/50 via-transparent to-transparent" />

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
      <div className="bg-white border-b border-[#1C2951]/8 sticky top-[60px] z-40 shadow-sm">
        <div className="section-container py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 flex-1">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[12.5px] font-semibold transition-all duration-250 ${
                  category === cat.id
                    ? "bg-[#1C2951] text-white shadow-md"
                    : "bg-[#FAF7F2] text-[#1C2951]/60 border border-[#1C2951]/12 hover:bg-[#1C2951]/8 hover:text-[#1C2951]"
                }`}>
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1C2951]/35 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full h-9 pl-9 pr-8 rounded-full border border-[#1C2951]/14 bg-[#FAF7F2] text-[#1C2951] text-[13px] placeholder:text-[#1C2951]/35 focus:outline-none focus:border-[#1C2951]/30 focus:bg-white transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C2951]/35 hover:text-[#1C2951] transition-colors">
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── PRODUCT GRID ── */}
      <section className="section-container py-16 lg:py-20">

        <div className="flex items-center justify-between mb-10">
          <p className="text-[#1C2951]/40 text-[13px] font-medium">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
            {query && <span className="text-[#1C2951]/60"> for "{query}"</span>}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-24">
              <p className="text-6xl mb-6">🔍</p>
              <p className="text-[#1C2951] font-serif text-2xl mb-3">No products found</p>
              <p className="text-[#1C2951]/45 font-light">Try a different search term or category.</p>
              <button onClick={() => { setQuery(""); setCategory("all"); }}
                className="mt-6 text-[#E8303A] text-sm font-semibold underline underline-offset-2">
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
                    <div className="bg-white rounded-2xl overflow-hidden border border-[#1C2951]/8 hover:border-gold/40 shadow-luxe hover:shadow-luxe-lg lift transition-[border-color,box-shadow] duration-400 h-full flex flex-col">

                      {/* Image */}
                      <div className="aspect-[4/3] overflow-hidden bg-[#f0ece5] relative">
                        <img src={product.img} alt={product.brand} loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                        <div className="absolute top-3 left-3">
                          <span className="text-[9.5px] font-bold tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[#1C2951]/70 border border-[#1C2951]/10">
                            {product.tag}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3 text-xl">{product.flag}</div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-1">
                        <p className="text-[10.5px] font-semibold tracking-[0.18em] uppercase text-[#5C8C2F] mb-1">
                          {product.variety}
                        </p>
                        <h3 className="font-serif text-[1.3rem] text-[#1C2951] leading-tight mb-2 group-hover:text-[#E8303A] transition-colors duration-300">
                          {product.brand}
                        </h3>
                        <p className="text-[#1C2951]/50 text-[13px] font-light leading-relaxed line-clamp-2 flex-1 mb-4">
                          {product.desc}
                        </p>

                        <div className="h-px bg-[#1C2951]/8 mb-4" />

                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-[#1C2951]/38 font-medium tracking-wide">{product.origin}</p>
                          <span className="flex items-center gap-1 text-[#E8303A] text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
      <div className="bg-[#1C2951] py-10">
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
