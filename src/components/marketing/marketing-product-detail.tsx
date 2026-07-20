"use client";

/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */

import React, { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight, ArrowLeft, ArrowRight, Leaf, Store } from "lucide-react";
import { getProductBySlug, getRelatedProducts, type Product } from "@/data/products";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

function AccordionSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-[#162D20]/10">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-4 text-left group"
      >
        <ChevronRight size={14} className={`text-[#237049] transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
        <span className="text-[10px] font-bold tracking-[0.26em] uppercase text-[#162D20] group-hover:text-[#237049] transition-colors duration-200">
          {title}
        </span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="overflow-hidden"
      >
        <div className="pb-5 pl-6">{children}</div>
      </motion.div>
    </div>
  );
}

function RelatedCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="bg-[#F9F7F1] border border-[#162D20]/8 rounded-2xl overflow-hidden hover:shadow-lg hover:border-[#162D20]/14 transition-all duration-400">
        <div className="aspect-[4/3] overflow-hidden bg-[#EEEBE2]">
          <img src={product.img} alt={product.brand} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
        </div>
        <div className="p-4">
          <h4 className="font-serif text-[1.05rem] text-[#162D20] leading-tight mb-1 group-hover:text-[#237049] transition-colors duration-300">
            {product.brand}
          </h4>
          <p className="text-[#162D20]/45 text-[12px] font-light line-clamp-2">{product.desc}</p>
        </div>
      </div>
    </Link>
  );
}

function NotFoundProduct() {
  return (
    <div className="min-h-screen bg-[#F9F7F1] flex flex-col items-center justify-center text-center px-6">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#162D20]/8 text-[#237049]"><Leaf size={25} /></span>
      <h1 className="font-serif text-3xl text-[#162D20] mb-3">Product Not Found</h1>
      <p className="text-[#162D20]/50 mb-8">This product doesn't exist in our range.</p>
      <Link href="/products"
        className="bg-[#83B13E] text-[#122119] rounded-full px-8 h-11 inline-flex items-center gap-2 text-sm font-bold hover:bg-[#A1CF58] transition-colors">
        <ArrowLeft size={14} /> View All Products
      </Link>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const product = getProductBySlug(slug ?? "");

  if (!product) return <NotFoundProduct />;

  const related = getRelatedProducts(product, 4);

  const categoryLabel =
    product.category === "imported" ? "Imported Fruits" :
    product.category === "indian"   ? "Indian Varieties" : "Fresh Produce";

  return (
    <div className="w-full min-h-screen bg-[#F9F7F1] overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#F9F7F1]/96 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)] py-3">
        <div className="section-container flex items-center justify-between">
          <Link href="/">
            <img src="/images/logo-dark.png" alt="Aeden Fresh" className="h-10 md:h-12 w-auto" />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/products" className="text-[#162D20]/55 hover:text-[#162D20] text-[13px] font-medium transition-colors hidden md:flex items-center gap-1">
              <ArrowLeft size={13} /> All Products
            </Link>
            <Link href="/stores" className="text-[#162D20]/55 hover:text-[#162D20] text-[13px] font-medium transition-colors hidden sm:block">
              Find a Store
            </Link>
            <Link href="/shop"
              className="bg-[#83B13E] hover:bg-[#A1CF58] text-[#122119] rounded-full px-6 h-10 text-[13px] font-bold inline-flex items-center gap-2 transition-colors duration-300 shadow-lg shadow-green-950/25">
              Shop Fresh <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="pt-20 pb-0">
        <div className="section-container py-10 lg:py-16">

          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="flex items-center flex-wrap gap-1.5 mb-10 text-[11px] font-semibold tracking-[0.16em] uppercase text-[#162D20]/40">
            <Link href="/" className="hover:text-[#162D20]/70 transition-colors">Home</Link>
            <ChevronRight size={10} />
            <Link href="/products" className="hover:text-[#162D20]/70 transition-colors">Our Products</Link>
            <ChevronRight size={10} />
            <Link href="/products" className="hover:text-[#162D20]/70 transition-colors">
              {categoryLabel}
            </Link>
            <ChevronRight size={10} />
            <span className="text-[#237049]">{product.brand}</span>
          </motion.nav>

          {/* Product layout: left detail + right image */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-start">

            {/* ── LEFT: Detail ── */}
            <motion.div
              initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: EASE_OUT }}>

              <p className="mb-4 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-[#237049] uppercase">
                <Leaf size={13} /> {categoryLabel} · {product.origin}
              </p>
              <h1 className="text-[clamp(2.4rem,5vw,3.8rem)] font-serif text-[#162D20] leading-[1] tracking-[-0.02em] mb-4">
                {product.brand}
              </h1>

              <p className="text-[#162D20]/55 text-[15.5px] font-light leading-relaxed mb-10 max-w-2xl">
                {product.longDesc}
              </p>

              {/* Accordion sections */}
              <div className="max-w-2xl">

                <AccordionSection title="Origins">
                  <p className="text-[#162D20]/60 text-[14px] font-light leading-relaxed">
                    {product.originsText}
                  </p>
                </AccordionSection>

                <AccordionSection title="Places We Source From">
                  <ul className="space-y-2">
                    {product.sourceCountries.map((c, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-[14px] text-[#162D20]/65 font-light">
                        <span className="text-xl leading-none">{c.flag}</span>
                        <span>{c.name}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionSection>

                <AccordionSection title="Taste & Texture">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2.5 text-[14px] text-[#162D20]/60 font-light leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#83B13E] flex-shrink-0 mt-[0.45em]" />
                      {product.taste}
                    </li>
                  </ul>
                </AccordionSection>

                <AccordionSection title="Nutritional Facts (per 100 g)">
                  <div className="grid grid-cols-2 gap-2 mt-1 sm:grid-cols-5">
                    {[
                      { label: "Calories",      value: `${product.nutrition.calories}` },
                      { label: "Carbohydrates", value: product.nutrition.carbs },
                      { label: "Sugar",         value: product.nutrition.sugar },
                      { label: "Protein",       value: product.nutrition.protein },
                      { label: "Fat",           value: product.nutrition.fat },
                    ].map(({ label, value }) => (
                      <div key={label} className="text-center bg-[#F3EEDF] rounded-xl py-4 px-2">
                        <p className="text-[1.4rem] font-serif font-semibold text-[#162D20] leading-none mb-1">{value}</p>
                        <p className="text-[9px] font-semibold tracking-[0.16em] uppercase text-[#162D20]/40">{label}</p>
                      </div>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection title="Health & Nutrition Value">
                  <ul className="space-y-2.5">
                    {product.healthBenefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#162D20]/60 font-light leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#237049] flex-shrink-0 mt-[0.45em]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </AccordionSection>

                <div className="border-t border-[#162D20]/10" />
              </div>

              {/* Availability note */}
              <div className="mt-10 inline-flex items-center gap-3 bg-[#237049]/8 border border-[#237049]/18 rounded-2xl px-6 py-4">
                <span className="w-2 h-2 rounded-full bg-[#237049]" />
                <p className="text-[13px] text-[#237049] font-medium">
                  Available at all Aeden Fresh stores · Kochi, Kerala
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/stores" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#162D20] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#214B35]">
                  <Store size={14} /> Find it near you
                </Link>
                <Link href="/products" className="inline-flex h-11 items-center gap-2 rounded-full border border-[#162D20]/14 bg-white/45 px-6 text-sm font-semibold text-[#162D20] transition-colors hover:bg-white">
                  Explore the full range
                </Link>
              </div>
            </motion.div>

            {/* ── RIGHT: Image ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.12, ease: EASE_OUT }}
              className="lg:sticky lg:top-28">
              <div className="rounded-3xl overflow-hidden bg-[#EEEBE2] aspect-[4/5] shadow-2xl shadow-[#162D20]/10">
                <img
                  src={product.img}
                  alt={product.brand}
                  className="w-full h-full object-cover"
                  fetchPriority="high"
                />
              </div>

              {/* Origin pill */}
              <div className="mt-5 flex items-center gap-3 bg-white rounded-2xl px-5 py-3 border border-[#162D20]/8 shadow-sm">
                <span className="text-2xl">{product.flag}</span>
                <div>
                  <p className="text-[9.5px] font-bold tracking-[0.2em] uppercase text-[#162D20]/35 mb-0.5">Sourced From</p>
                  <p className="text-[#162D20] text-[13.5px] font-medium">{product.origin}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[9.5px] font-bold tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-full bg-[#237049]/10 text-[#237049]">
                    {product.tag}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── FRESH COMMERCE BRIDGE ── */}
      <section className="section-container pb-16 lg:pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#162D20] px-6 py-9 text-white shadow-luxe md:px-10 md:py-11">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#83B13E]/20 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-[10px] font-bold tracking-[0.22em] text-[#A6D55E] uppercase">Fresh Commerce by Aeden</p>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Looking for lunch, not groceries?</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/58">Build a bowl around your taste, see nutrition as you choose, and schedule it around your week.</p>
            </div>
            <Link href="/shop" className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-[#83B13E] px-7 text-sm font-bold text-[#122119] transition-colors hover:bg-[#A1CF58] lg:self-auto">
              Shop Fresh <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── RELATED ITEMS ── */}
      {related.length > 0 && (
        <section className="bg-white border-t border-[#162D20]/8 py-16 lg:py-20">
          <div className="section-container">
            <div className="flex items-end justify-between mb-10">
              <h2 className="text-[2.4rem] font-serif text-[#162D20] leading-tight">Related Items</h2>
              <Link href="/products"
                className="hidden md:flex items-center gap-1.5 text-[#237049] text-[13px] font-semibold hover:gap-3 transition-all duration-200">
                View all <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map(product => (
                <RelatedCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <div className="bg-[#162D20] py-10">
        <div className="section-container flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm font-light">
            Sourced exclusively via <span className="text-white/55 font-medium">Aeden Fruits International Pvt Ltd</span>
          </p>
          <Link href="/products"
            className="text-white/45 hover:text-white text-[13px] font-medium transition-colors flex items-center gap-1.5">
            <ArrowLeft size={13} /> Back to All Products
          </Link>
        </div>
      </div>
    </div>
  );
}
