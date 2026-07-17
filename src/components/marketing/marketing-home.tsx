"use client";

/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities, react-hooks/set-state-in-effect, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  motion, useScroll, useTransform, useSpring,
  useMotionValue, AnimatePresence, useInView
} from "framer-motion";
import {
  Store, TrendingUp, Users, BadgeCheck, Globe,
  MapPin, Phone, Mail, Menu, X, ChevronLeft, ChevronRight,
  ArrowUp, ArrowRight, Plane, ExternalLink, Volume2, VolumeX
} from "lucide-react";
import Link from "next/link";
import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from "@/components/ui/accordion";
import { FRUITS, INDIAN_VARIETIES, PRODUCE } from "@/data/products";

// ─── CONSTANTS ───────────────────────────────────────────────────────
const SPRING      = { stiffness: 220, damping: 24 } as const;
const SPRING_SOFT = { stiffness: 140, damping: 22 } as const;
const EASE_OUT    = [0.16, 1, 0.3, 1] as const;
const EASE_EXPO   = [0.22, 1, 0.36, 1] as const;

// ─── ANIMATION VARIANTS ──────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 42, filter: "blur(6px)" },
  show:   { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.95, ease: EASE_EXPO } },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.12 } },
};
const clipReveal = {
  hidden: { clipPath: "inset(0 0 100% 0)", opacity: 0 },
  show:   { clipPath: "inset(0 0 0% 0)",   opacity: 1, transition: { duration: 1.15, ease: EASE_EXPO } },
};

// ─── CURSOR STATE (module-level, shared across all components) ────────
let _cursorLabelSetter: ((l: string) => void) | null = null;
let _cursorHoverSetter: ((h: boolean) => void) | null = null;
function pushCursorLabel(l: string) { _cursorLabelSetter?.(l); _cursorHoverSetter?.(true); }
function pushCursorClear()          { _cursorLabelSetter?.(""); _cursorHoverSetter?.(false); }
function pushCursorHover(on: boolean) { _cursorHoverSetter?.(on); if (!on) _cursorLabelSetter?.(""); }

// ─── SCROLL PROGRESS BAR ─────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-[#E8303A] z-[200] origin-left"
      style={{ scaleX }}
    />
  );
}

// ─── MAGNETIC BUTTON ─────────────────────────────────────────────────
function Magnetic({ children, className = "", href, onClick }: {
  children: React.ReactNode; className?: string;
  href?: string; onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, SPRING);
  const sy = useSpring(y, SPRING);

  const onMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * 0.32);
    y.set((e.clientY - r.top - r.height / 2) * 0.32);
  }, [x, y]);
  const onLeave = useCallback(() => { x.set(0); y.set(0); pushCursorHover(false); }, [x, y]);

  const Tag = href ? "a" : "button";
  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }}
      onMouseMove={onMove} onMouseLeave={onLeave}
      onMouseEnter={() => pushCursorHover(true)}
      className="inline-block">
      <Tag href={href} onClick={onClick} className={className}>{children}</Tag>
    </motion.div>
  );
}

// ─── TILT CARD ───────────────────────────────────────────────────────
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 280, damping: 28 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 280, damping: 28 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left) / r.width - 0.5);
    y.set((e.clientY - r.top) / r.height - 0.5);
  }, [x, y]);
  const onLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);

  return (
    <motion.div ref={ref} style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100 }}
      onMouseMove={onMove} onMouseLeave={onLeave} className={className}>
      {children}
    </motion.div>
  );
}

// ─── SECTION WRAPPER ─────────────────────────────────────────────────
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={stagger}
      initial="hidden" whileInView="show" viewport={{ once: true, margin: "180px" }}>
      {children}
    </motion.div>
  );
}

// ─── WORD REVEAL ─────────────────────────────────────────────────────
function WordReveal({ text, className = "" }: { text: string; className?: string }) {
  return (
    <motion.h2
      className={`flex flex-wrap ${className}`}
      variants={stagger} initial="hidden" whileInView="show"
      viewport={{ once: true, margin: "180px" }}
    >
      {text.split(" ").map((w, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.22em]">
          <motion.span className="inline-block"
            variants={{
              hidden: { y: "115%", opacity: 0, rotate: 2.5, skewY: 1.5 },
              show:   { y: 0, opacity: 1, rotate: 0, skewY: 0, transition: { duration: 1.15, ease: EASE_EXPO } }
            }}>
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h2>
  );
}

function EyebrowLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.p variants={fadeUp}
      className="flex items-center gap-3 text-[#5C8C2F] text-[11px] font-semibold tracking-[0.28em] uppercase mb-5">
      <span className="w-7 h-px bg-[#5C8C2F]" />{children}
    </motion.p>
  );
}

function RedRule() {
  return (
    <motion.div className="h-[1.5px] bg-[#E8303A] mb-10 origin-left"
      style={{ width: 60 }}
      initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
      viewport={{ once: true }} transition={{ duration: 0.8, ease: "easeOut" }} />
  );
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────────
function Counter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "160px" });

  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const t0 = performance.now();
    const dur = 2200;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);

  return (
    <div ref={ref} className="text-center">
      <div className="relative inline-block">
        <motion.div className="absolute inset-[-18px] rounded-full border border-white/8"
          animate={{ scale: [1, 1.07, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute inset-[-32px] rounded-full border border-white/4"
          animate={{ scale: [1, 1.12, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />
        <p className="relative text-[5rem] md:text-[6.5rem] font-serif font-light text-white leading-none tracking-tight">
          {n}<span className="text-[#E8303A]">{suffix}</span>
        </p>
      </div>
      <p className="text-[11px] font-semibold tracking-[0.24em] uppercase text-white/35 mt-7">{label}</p>
    </div>
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  {
    n: "01", emoji: "🍎", title: "Imported Fruits",
    sub: "80+ varieties · 10+ source countries",
    desc: "Pink Lady®, Shine Muscat, Zespri® SunGold, Driscoll's® berries and 80 more — exclusively through Aeden Fruits International's global supply chain.",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=900&q=80&auto=format&fit=crop",
    accent: "#5C8C2F",
  },
  {
    n: "02", emoji: "🥦", title: "Fresh Vegetables",
    sub: "Sourced daily · Seasonal & staple",
    desc: "From everyday staples to specialty greens — sourced fresh daily and delivered to every Aeden Fresh store in Kochi.",
    img: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=900&q=80&auto=format&fit=crop",
    accent: "#5C8C2F",
  },
  {
    n: "03", emoji: "🥐", title: "Artisan Bakery",
    sub: "Baked in-store every morning",
    desc: "Croissants, sourdough, pastries and cakes — baked fresh in-store daily. Step in to the aroma every morning at Aeden Fresh.",
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80&auto=format&fit=crop",
    accent: "#c8922a",
  },
  {
    n: "04", emoji: "🧀", title: "Premium Dairy",
    sub: "Chilled · Artisan · Curated",
    desc: "Fresh milk, artisan cheeses, Greek yoghurt and premium chilled products — curated for the discerning Kerala household.",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=900&q=80&auto=format&fit=crop",
    accent: "#E8303A",
  },
  {
    n: "05", emoji: "🥗", title: "Salads & Smoothies",
    sub: "Made fresh · In-store bar",
    desc: "Cold-pressed juices, seasonal smoothie blends and gourmet salads crafted in-store with the freshest produce — your daily wellness ritual.",
    img: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80&auto=format&fit=crop",
    accent: "#5C8C2F",
  },
];

const STORES = [
  {
    name: "Kadavanthara",
    label: "Flagship",
    area: "Central Kochi",
    address: "Kadavanthara, Ernakulam, Kochi",
    pin: "Kerala 682020",
    phone: "+91 92078 89500",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)/@9.9625028,76.3009008,17z",
  },
  {
    name: "Kacheripady",
    label: "Open",
    area: "Central Kochi",
    address: "Kacheripady Junction, Ernakulam, Kochi",
    pin: "Kerala 682018",
    phone: "+91 92078 89500",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Kacheripady/@9.9884178,76.2806464,17z",
  },
  {
    name: "Thrippunithura",
    label: "Open",
    area: "South Ernakulam",
    address: "Thrippunithura Junction, Ernakulam, Kochi",
    pin: "Kerala 682301",
    phone: "+91 92078 89500",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Thrippunithura/@9.9459107,76.3505294,17z",
  },
  {
    name: "Kakkanad",
    label: "Open",
    area: "IT Hub",
    address: "Near Infopark Junction, Kakkanad, Kochi",
    pin: "Kerala 682030",
    phone: "+91 92078 89500",
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Kakkanad/@10.016052,76.362121,17z",
  },
];

const BLOG = [
  {
    title: "Why Premium Imported Fruit is Kerala's Fastest-Growing Grocery Category",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop",
    cat: "Market Insight", read: "5 min",
  },
  {
    title: "Shine Muscat: Japan's Coveted Green Grape — Now Exclusively in Kochi",
    img: "https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=600&q=80&auto=format&fit=crop",
    cat: "Premium Produce", read: "4 min",
  },
  {
    title: "From Greens Angaadi to Aeden Fresh — 14 Years of Freshness",
    img: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80&auto=format&fit=crop",
    cat: "Our Story", read: "6 min",
  },
];

const FAQS = [
  {
    q: "What makes Aeden Fresh different from other grocery stores in Kerala?",
    a: "We are Kerala's only premium fresh grocery chain with exclusive access to Aeden Fruits International's global import supply chain. This means 80+ imported premium fruit varieties — Pink Lady®, Shine Muscat, Driscoll's®, Zespri® SunGold — that are simply unavailable anywhere else in Kerala. Combined with daily-fresh vegetables, in-store bakery, and premium dairy, it's a completely unique shopping experience."
  },
  {
    q: "Where are your stores located?",
    a: "We have 4 stores across Kochi — our Flagship at Kadavanthara, plus stores at Kacheripady, Thrippunithura, and Kakkanad. We are actively expanding and new locations are opening soon."
  },
  {
    q: "How does the Aeden Fresh franchise model work?",
    a: "Franchise partners receive the full Aeden Fresh brand, store design, fit-out guidance, staff training, and — critically — exclusive access to the Aeden Fruits International supply chain. This supply chain advantage is the biggest differentiator a franchise partner gets. We support you from pre-launch through ongoing operations."
  },
  {
    q: "What is the relationship between Aeden Fresh and Aeden Fruits International?",
    a: "Aeden Fruits International Pvt Ltd is our exclusive sourcing and supply partner — they import premium fruits from 10+ countries and supply them directly to Aeden Fresh stores, ensuring the freshest, most exclusive imported produce in Kerala reaches our shelves."
  },
  {
    q: "Are you open to investment conversations?",
    a: "Aeden Fresh is expanding rapidly and open to strategic conversations with investors aligned with our vision of building Kerala's definitive premium fresh grocery chain. Please reach out through our contact form."
  },
];

// ─── VIDEO SECTION ───────────────────────────────────────────────────
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
      <path d="M8 5.14v13.72l11-6.86L8 5.14z" />
    </svg>
  );
}

function VideoCard({
  src, title, sub, desc, featured, onClick,
}: {
  src: string; title: string; sub: string;
  desc: string; featured?: boolean; onClick: () => void;
}) {
  const previewRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => { previewRef.current?.play().catch(() => {}); pushCursorLabel("PLAY"); };
  const handleMouseLeave = () => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = 0; }
    pushCursorClear();
  };

  return (
    <motion.div
      className="group relative cursor-pointer overflow-hidden rounded-3xl ring-1 ring-white/10 shimmer-card aspect-[16/10] h-full"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.7, ease: EASE_EXPO }}
    >
      <video
        ref={previewRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover scale-[1.04] group-hover:scale-110 transition-transform duration-[1200ms] ease-out"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#020810]/92 via-[#020810]/38 to-[#020810]/8 group-hover:from-[#020810]/80 transition-colors duration-600" />
      <div className="grain-overlay absolute inset-0 pointer-events-none" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="w-16 h-16 rounded-full bg-white/12 border border-white/28 flex items-center justify-center backdrop-blur-md text-white group-hover:bg-[#E8303A] group-hover:border-[#E8303A] group-hover:scale-110 transition-all duration-500 shadow-2xl"
        >
          <PlayIcon />
        </motion.div>
      </div>

      {/* Sub badge */}
      <div className="absolute top-5 left-6">
        <span className="text-[9px] font-bold tracking-[0.28em] uppercase px-3 py-1.5 rounded-full backdrop-blur-md bg-white/8 border border-white/16 text-white/75">
          {sub}
        </span>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 inset-x-0 p-7 lg:p-8">
        <h3 className={`font-serif text-white leading-tight tracking-[-0.02em] ${featured ? "text-[2.1rem] lg:text-[2.6rem]" : "text-[1.65rem] lg:text-[2rem]"}`}>
          {title}
        </h3>
        <p className="text-white/0 group-hover:text-white/52 text-[13.5px] font-light leading-relaxed mt-2.5 max-h-0 group-hover:max-h-24 overflow-hidden transition-all duration-500">
          {desc}
        </p>
      </div>
    </motion.div>
  );
}

function VideoSection() {
  const [active, setActive] = useState<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => { previewRef.current?.play().catch(() => {}); pushCursorLabel("PLAY"); };
  const handleMouseLeave = () => {
    if (previewRef.current) { previewRef.current.pause(); previewRef.current.currentTime = 0; }
    pushCursorClear();
  };

  return (
    <>
      <section className="bg-[#040b14] py-28 lg:py-40 relative overflow-hidden">
        <div className="grain-overlay absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 55% at 50% 100%, rgba(232,48,58,0.07) 0%, transparent 70%)" }} />

        <div className="relative section-container">
          <Reveal className="max-w-2xl mb-14 lg:mb-18">
            <RedRule />
            <EyebrowLabel>Aeden Fresh on Film</EyebrowLabel>
            <WordReveal
              text="Witness the Moment."
              className="text-5xl md:text-6xl lg:text-[5.2rem] font-serif text-white leading-[0.9] tracking-[-0.03em]"
            />
          </Reveal>

          {/* Full-width inauguration video card */}
          <motion.div
            className="relative cursor-none overflow-hidden rounded-3xl ring-1 ring-white/10 shimmer-card aspect-[16/9] max-h-[80vh]"
            variants={clipReveal} initial="hidden" whileInView="show"
            viewport={{ once: true, margin: "180px" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => setActive("/store-inauguration.mp4")}
            whileHover={{ scale: 1.006 }}
            transition={{ duration: 0.7, ease: EASE_EXPO }}
          >
            <video
              ref={previewRef}
              src="/store-inauguration.mp4"
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover scale-[1.03] transition-transform duration-[1400ms] ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020810]/90 via-[#020810]/20 to-transparent" />
            <div className="grain-overlay absolute inset-0 pointer-events-none" />

            {/* Centre play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-24 h-24 rounded-full bg-white/10 border border-white/25 flex items-center justify-center backdrop-blur-md text-white shadow-2xl"
                whileHover={{ scale: 1.18, backgroundColor: "rgba(232,48,58,0.85)", borderColor: "rgba(232,48,58,0.85)" }}
                transition={{ duration: 0.4, ease: EASE_EXPO }}
              >
                <PlayIcon />
              </motion.div>
            </div>

            {/* Badge */}
            <div className="absolute top-7 left-9">
              <span className="text-[9px] font-bold tracking-[0.3em] uppercase px-3.5 py-1.5 rounded-full backdrop-blur-md bg-white/8 border border-white/14 text-white/70">
                Store Inauguration · Kadavanthra
              </span>
            </div>

            {/* Bottom text */}
            <div className="absolute bottom-0 inset-x-0 p-10 lg:p-16">
              <p className="text-[#E8303A] text-[11px] font-semibold tracking-[0.2em] uppercase mb-3">
                Greens Angaadi → Aeden Fresh
              </p>
              <h3 className="font-serif text-white text-[2.4rem] lg:text-[3.6rem] leading-[0.9] tracking-[-0.03em] mb-4">
                Kadavanthra Reborn
              </h3>
              <p className="text-white/48 text-[15px] font-light leading-relaxed max-w-xl">
                The landmark moment a beloved Kochi store was reborn — the full Kadavanthra flagship rebrand inauguration.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="mt-10 flex items-center gap-6"
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}>
            <div className="h-px flex-1 bg-white/7" />
            <span className="text-white/20 text-[10px] font-semibold tracking-[0.26em] uppercase flex-shrink-0">Hover to preview · Click to watch</span>
            <div className="h-px flex-1 bg-white/7" />
          </motion.div>
        </div>
      </section>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-10"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setActive(null)}>
            <div className="absolute inset-0 bg-black/96 backdrop-blur-2xl" />
            <motion.div
              className="relative z-10 w-full max-w-6xl"
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1,   y: 0,  opacity: 1 }}
              exit={{    scale: 0.9, y: 40, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE_EXPO }}
              onClick={e => e.stopPropagation()}>
              <video src={active} controls autoPlay className="w-full rounded-2xl shadow-2xl ring-1 ring-white/12" />
              <motion.button
                className="absolute -top-12 right-0 text-white/45 hover:text-white transition-colors flex items-center gap-2 text-sm font-light tracking-wide"
                onClick={() => setActive(null)} whileHover={{ x: -3 }}>
                <X size={16} /> Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────
function CustomCursor() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const [label, setLabel]       = useState("");
  const [hovering, setHovering] = useState(false);

  const sx = useSpring(x, { stiffness: 340, damping: 34 });
  const sy = useSpring(y, { stiffness: 340, damping: 34 });

  useEffect(() => {
    _cursorLabelSetter = setLabel;
    _cursorHoverSetter = setHovering;
    const fn = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => {
      _cursorLabelSetter = null; _cursorHoverSetter = null;
      window.removeEventListener("mousemove", fn);
    };
  }, [x, y]);

  const size = label ? 90 : hovering ? 52 : 13;

  return (
    <>
      {/* Blend ring — inverts colours underneath */}
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none mix-blend-difference hidden md:flex items-center justify-center"
        style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}>
        <motion.div
          className="rounded-full bg-white flex items-center justify-center overflow-hidden"
          animate={{ width: size, height: size }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
          <AnimatePresence mode="wait">
            {label && (
              <motion.span key={label}
                initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.4 }} transition={{ duration: 0.18 }}
                className="text-black text-[7.5px] font-black tracking-[0.28em] uppercase whitespace-nowrap select-none">
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Red trailing dot */}
      <motion.div
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full bg-[#E8303A] hidden md:block"
        style={{ x, y, translateX: "-50%", translateY: "-50%", width: 5, height: 5 }}
      />
    </>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 56);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { href: "/products",  label: "Our Products" },
    { href: "#range",     label: "Our Range" },
    { href: "/stores",    label: "Our Stores" },
    { href: "#franchise", label: "Franchise" },
    { href: "#story",     label: "Our Story" },
    { href: "#contact",   label: "Contact" },
    { href: "/shop",      label: "Shop" },
  ];

  const navBg  = scrolled ? "bg-[#FAF7F2]/96 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)] py-3" : "bg-transparent py-5";
  const color   = scrolled ? "text-[#1C2951]" : "text-white";

  return (
    <motion.nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${navBg}`}
      initial={{ y: -72, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.75, delay: 0.1, ease: EASE_OUT }}>
      <div className="section-container flex items-center justify-between">
        <a href="#" className="flex-shrink-0">
          <img
            src={scrolled ? "/images/logo-dark.png" : "/images/logo-light.png"}
            alt="Aeden Fresh"
            className={`w-auto transition-all duration-500 ${scrolled ? "h-12 md:h-14" : "h-14 md:h-[4.5rem]"}`}
          />
        </a>

        <div className="hidden lg:flex items-center gap-9">
          <div className={`flex gap-9 text-[13px] font-medium tracking-wide ${color}`}>
            {links.map(l => (
              l.href.startsWith("/")
                ? <Link key={l.label} href={l.href} className="nav-link opacity-75 hover:opacity-100 transition-opacity">{l.label}</Link>
                : <a key={l.label} href={l.href} className="nav-link opacity-75 hover:opacity-100 transition-opacity">{l.label}</a>
            ))}
          </div>
          <Magnetic href="#stores"
            className="bg-[#E8303A] hover:bg-[#cc2b34] text-white rounded-full px-6 h-10 text-[13px] font-semibold inline-flex items-center transition-colors duration-300 shadow-lg shadow-red-900/25">
            Find a Store
          </Magnetic>
        </div>

        <button className={`lg:hidden p-2 ${color}`} onClick={() => setOpen(p => !p)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
            className="absolute top-full inset-x-0 bg-[#FAF7F2] border-t border-black/5 shadow-2xl overflow-hidden">
            <div className="py-6 px-6 flex flex-col gap-5">
              {links.map(l => (
                l.href.startsWith("/")
                  ? <Link key={l.label} href={l.href} className="text-[#1C2951] font-medium text-lg" onClick={() => setOpen(false)}>{l.label}</Link>
                  : <a key={l.label} href={l.href} className="text-[#1C2951] font-medium text-lg" onClick={() => setOpen(false)}>{l.label}</a>
              ))}
              <Link href="/stores" className="bg-[#E8303A] text-white rounded-full py-3 text-center text-sm font-semibold" onClick={() => setOpen(false)}>Find a Store</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────
type RangeTab = "imported" | "indian" | "produce";

const RANGE_TABS: { id: RangeTab; label: string; emoji: string; count: number }[] = [
  { id: "imported", label: "Imported Fruits",  emoji: "✈️", count: FRUITS.length },
  { id: "indian",   label: "Indian Varieties", emoji: "🇮🇳", count: INDIAN_VARIETIES.length },
  { id: "produce",  label: "Fresh Produce",    emoji: "🥦", count: PRODUCE.length },
];

export default function Home() {
  const [activeRange, setActiveRange] = useState<RangeTab>("imported");
  const [activeRangeItem, setActiveRangeItem] = useState(0);
  const [activeDept, setActiveDept] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [heroTextVisible, setHeroTextVisible] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  const rangeItems = activeRange === "imported" ? FRUITS : activeRange === "indian" ? INDIAN_VARIETIES : PRODUCE;

  // Reset carousel position when category changes
  useEffect(() => { setActiveRangeItem(0); }, [activeRange]);

  // ── Departments carousel interactivity ──────────────────────────────
  const deptSectionRef = useRef<HTMLElement>(null);
  const deptInView     = useInView(deptSectionRef, { amount: 0.35 });
  const deptHoveredRef = useRef(false);
  const deptDirRef     = useRef(1);
  const deptMouseMV    = useMotionValue(0);
  const deptMouseX     = useSpring(deptMouseMV, { stiffness: 55, damping: 18 });

  useEffect(() => {
    if (!deptInView) return;
    const id = setInterval(() => {
      if (deptHoveredRef.current) return;
      setActiveDept(p => {
        const next = p + deptDirRef.current;
        if (next >= DEPARTMENTS.length - 1) deptDirRef.current = -1;
        if (next <= 0)                       deptDirRef.current =  1;
        return Math.max(0, Math.min(DEPARTMENTS.length - 1, next));
      });
    }, 1000);
    return () => clearInterval(id);
  }, [deptInView]);

  const onDeptMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    deptMouseMV.set(((e.clientX - r.left) / r.width - 0.5) * 140);
  };
  const onDeptMouseLeave = () => { deptMouseMV.set(0); deptHoveredRef.current = false; };

  // ── Range carousel interactivity ────────────────────────────────────
  const rangeSectionRef = useRef<HTMLElement>(null);
  const rangeInView     = useInView(rangeSectionRef, { amount: 0.35 });
  const rangeHoveredRef = useRef(false);
  const rangeDirRef     = useRef(1);
  const rangeMouseMV    = useMotionValue(0);
  const rangeMouseX     = useSpring(rangeMouseMV, { stiffness: 55, damping: 18 });

  useEffect(() => {
    if (!rangeInView) return;
    const len = rangeItems.length;
    rangeDirRef.current = 1;
    const id = setInterval(() => {
      if (rangeHoveredRef.current) return;
      setActiveRangeItem(p => {
        const next = p + rangeDirRef.current;
        if (next >= len - 1) rangeDirRef.current = -1;
        if (next <= 0)       rangeDirRef.current =  1;
        return Math.max(0, Math.min(len - 1, next));
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rangeInView, rangeItems.length]);

  const onRangeMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    rangeMouseMV.set(((e.clientX - r.left) / r.width - 0.5) * 140);
  };
  const onRangeMouseLeave = () => { rangeMouseMV.set(0); rangeHoveredRef.current = false; };

  const heroRef  = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroBgY  = useTransform(heroP, [0, 1], ["0%", "18%"]);
  const heroFade = useTransform(heroP, [0, 0.6], [1, 0]);

  const { scrollY } = useScroll();
  useEffect(() => scrollY.on("change", v => setShowTop(v > 600)), [scrollY]);

  // Start the hero immediately; there is intentionally no logo intro/preloader.
  useEffect(() => {
    heroVideoRef.current?.play().catch(() => {});
    setHeroTextVisible(true);
    const t = setTimeout(() => setHeroTextVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
    <div className="marketing-site w-full min-h-screen overflow-x-hidden bg-[#FAF7F2]">
      <CustomCursor />
      <ScrollProgress />
      <Navbar />

      {/* ─────────────────── HERO (VIDEO) ─────────────────────── */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[720px] overflow-hidden bg-black">

        {/* Full-screen ad video */}
        <motion.div className="absolute inset-0" style={{ y: heroBgY, scale: 1.06 }}>
          <video
            ref={heroVideoRef}
            src="/ad-video.mp4"
            loop
            playsInline
            muted={heroMuted}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Cinematic gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
        <div className="grain-overlay absolute inset-0 pointer-events-none" />

        {/* ── HERO TEXT — animates in then fades out ── */}
        <AnimatePresence>
          {heroTextVisible && (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none px-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 1.1, ease: EASE_EXPO } }}
              exit={{ opacity: 0, filter: "blur(8px)", y: -20, transition: { duration: 1.3, ease: EASE_EXPO } }}
            >
              <motion.div
                initial={{ y: 90, opacity: 0, filter: "blur(12px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.15, ease: EASE_EXPO }}
                className="text-[clamp(3.8rem,10vw,9.5rem)] font-serif text-white leading-[0.86] tracking-[-0.035em] drop-shadow-2xl"
              >
                Fresh From<br />the World.
              </motion.div>
              <motion.div
                initial={{ y: 55, opacity: 0, filter: "blur(8px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.0, delay: 0.22, ease: EASE_EXPO }}
                className="text-[clamp(2rem,4.8vw,5rem)] font-serif italic text-[#E8303A] mt-5 drop-shadow-xl"
              >
                Fresh to Your Table.
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mute / Unmute button ── */}
        <motion.button
          onClick={() => setHeroMuted(m => !m)}
          className="absolute top-24 right-8 z-20 w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white/65 hover:text-white hover:bg-white/18 hover:border-white/35 transition-all duration-300 cursor-none"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8, duration: 0.7, ease: EASE_EXPO }}
          onMouseEnter={() => pushCursorLabel(heroMuted ? "UNMUTE" : "MUTE")}
          onMouseLeave={() => pushCursorClear()}
          title={heroMuted ? "Unmute" : "Mute"}
        >
          {heroMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </motion.button>

        {/* ── Bottom overlay: brand tag + CTAs + scroll ── */}
        <motion.div
          className="absolute bottom-0 inset-x-0 z-10 flex items-end justify-between px-8 lg:px-16 pb-10"
          style={{ opacity: heroFade }}
        >
          <div>
            <motion.div className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 3.0, ease: EASE_OUT }}>
              <span className="w-2 h-2 rounded-full bg-[#5C8C2F] pulse-ring" />
              <span className="text-white/40 text-[11px] font-semibold tracking-[0.28em] uppercase">
                4 Stores · Kochi, Kerala · Est. 2010
              </span>
            </motion.div>
            <motion.div className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 3.15, ease: EASE_OUT }}>
              <Magnetic href="#stores"
                className="bg-[#E8303A] hover:bg-[#cc2b34] text-white rounded-full px-9 h-12 text-[14px] font-semibold inline-flex items-center gap-2 transition-colors duration-300 shadow-2xl shadow-red-900/40">
                Find a Store <ArrowRight size={14} />
              </Magnetic>
              <Magnetic href="#franchise"
                className="rounded-full px-9 h-12 text-[14px] text-white border border-white/22 bg-white/8 hover:bg-white/16 inline-flex items-center font-medium backdrop-blur-sm transition-all duration-300">
                Franchise Opportunity
              </Magnetic>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div className="flex flex-col items-center gap-2 mb-1"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.4 }}>
            <span className="text-white/25 text-[10px] tracking-[0.28em] uppercase">Scroll</span>
            <div className="w-px h-14 overflow-hidden rounded-full">
              <motion.div className="w-full h-full bg-gradient-to-b from-white/50 to-transparent"
                animate={{ y: ["-100%", "200%"] }}
                transition={{ duration: 2.0, repeat: Infinity, ease: "easeInOut" }} />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────────── TICKER ───────────────────────────── */}
      <div className="bg-[#0a1220] overflow-hidden ticker-fade">
        {/* Row 1 — left */}
        <div className="py-3 border-b border-white/[0.04]">
          <div className="marquee flex items-center" style={{ animationDuration: "42s" }}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} className="flex items-center shrink-0">
                {["🍎 Pink Lady®", "🍇 Shine Muscat", "🥝 Zespri® SunGold",
                  "🍓 Driscoll's® Strawberries", "🫐 Driscoll's® Blueberries",
                  "🍊 Sunkist® Navel", "🍒 Rainier Cherries", "🐉 Dragon Fruit",
                  "🥦 Fresh Vegetables", "🥐 In-Store Bakery", "🧀 Premium Dairy",
                ].map((item, j) => (
                  <React.Fragment key={j}>
                    <span className="text-white/38 text-[10.5px] font-semibold tracking-[0.22em] uppercase px-7 flex-shrink-0">{item}</span>
                    <span className="w-[3px] h-[3px] rounded-full bg-[#E8303A]/50 flex-shrink-0" />
                  </React.Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>
        {/* Row 2 — reverse, source countries */}
        <div className="py-3">
          <div className="marquee-reverse flex items-center" style={{ animationDuration: "56s" }}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} className="flex items-center shrink-0">
                {["🇯🇵 Japan", "🇺🇸 United States", "🇳🇿 New Zealand", "🇰🇷 South Korea",
                  "🇦🇺 Australia", "🇪🇸 Spain", "🇿🇦 South Africa", "🇨🇱 Chile",
                  "🇹🇷 Turkey", "🇮🇳 India", "🇮🇱 Israel",
                ].map((item, j) => (
                  <React.Fragment key={j}>
                    <span className="text-white/18 text-[10px] font-medium tracking-[0.2em] uppercase px-7 flex-shrink-0">{item}</span>
                    <span className="w-5 h-px bg-white/10 flex-shrink-0" />
                  </React.Fragment>
                ))}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────── DEPARTMENTS ─────────────────────── */}
      <section
        ref={deptSectionRef}
        className="bg-white py-28 lg:py-36 overflow-hidden"
        onMouseMove={onDeptMouseMove}
        onMouseEnter={() => { deptHoveredRef.current = true; }}
        onMouseLeave={onDeptMouseLeave}>
        <div className="section-container">

          {/* ── Header — scroll-triggered entry ── */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 48 }}
            animate={deptInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
            transition={{ duration: 0.9, ease: EASE_EXPO }}>
            <div className="inline-flex items-center gap-2 border border-[#1C2951]/12 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8303A]" />
              <span className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-[#1C2951]/50">Our Departments</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-[4.8rem] font-serif text-[#1C2951] leading-[0.92] tracking-[-0.03em] mb-5">
              Everything Fresh,{" "}
              <em className="text-[#E8303A] not-italic">All Under One Roof.</em>
            </h2>
            <p className="text-[#1C2951]/42 text-[1.05rem] max-w-lg mx-auto font-light leading-relaxed">
              Five curated departments — each sourced to the highest premium standard and delivered fresh daily to all four Kochi stores.
            </p>
          </motion.div>

          {/* ── Department tabs ── */}
          <motion.div
            className="flex justify-center flex-wrap gap-x-7 gap-y-0 border-b border-[#1C2951]/8 mb-20"
            initial={{ opacity: 0, y: 24 }}
            animate={deptInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}>
            {DEPARTMENTS.map((dept, i) => (
              <button key={i}
                onClick={() => { setActiveDept(i); deptHoveredRef.current = true; }}
                className={`pb-4 text-[13.5px] font-medium transition-all duration-300 border-b-2 -mb-px whitespace-nowrap ${
                  activeDept === i
                    ? "text-[#1C2951] border-[#1C2951]"
                    : "text-[#1C2951]/32 border-transparent hover:text-[#1C2951]/60"
                }`}>
                {dept.emoji} {dept.title}
              </button>
            ))}
          </motion.div>

          {/* ── 3D Fan carousel ── */}
          <div className="relative" style={{ perspective: "1600px" }}>
            {/* Mouse-driven deck shift */}
            <motion.div
              className="relative h-[520px] md:h-[580px] flex items-center justify-center"
              style={{ x: deptMouseX, transformStyle: "preserve-3d" }}
              initial={{ opacity: 0, y: 80 }}
              animate={deptInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 80 }}
              transition={{ duration: 1.0, ease: EASE_EXPO, delay: 0.28 }}>
              {DEPARTMENTS.map((dept, i) => {
                const offset    = i - activeDept;
                const absOffset = Math.abs(offset);
                if (absOffset > 2) return null;

                const rotateY = offset * 28;
                const tx      = offset * 330;   // wider spacing
                const scale   = 1 - absOffset * 0.10;
                const opacity = absOffset === 0 ? 1 : 1 - absOffset * 0.28;

                return (
                  <motion.div key={dept.title}
                    onClick={() => { setActiveDept(i); deptHoveredRef.current = true; }}
                    animate={{ rotateY, x: tx, scale, opacity }}
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                    className="absolute w-64 md:w-[19rem] cursor-pointer select-none"
                    style={{ zIndex: 10 - absOffset }}>

                    <div className={`rounded-3xl overflow-hidden bg-white transition-all duration-500 ${
                      offset === 0
                        ? "shadow-[0_40px_100px_rgba(28,41,81,0.20)]"
                        : "shadow-[0_10px_30px_rgba(28,41,81,0.07)]"
                    }`}>
                      {/* Image */}
                      <div className="h-[320px] md:h-[360px] overflow-hidden relative">
                        <img src={dept.img} alt={dept.title} loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                        {offset !== 0 && (
                          <div className="absolute inset-0 bg-white/30" />
                        )}
                        {offset === 0 && (
                          <div className="absolute top-4 left-4">
                            <span className="text-[9px] font-bold tracking-[0.22em] uppercase px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-[#1C2951] shadow-sm">
                              {dept.sub}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Card footer */}
                      <div className="p-6 text-center border-t border-[#1C2951]/5">
                        <span className="text-2xl block mb-1.5">{dept.emoji}</span>
                        <h3 className={`font-serif transition-all duration-300 ${
                          offset === 0 ? "text-xl text-[#1C2951]" : "text-base text-[#1C2951]/45"
                        }`}>{dept.title}</h3>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Prev / Next */}
            <motion.div
              className="flex justify-center gap-6 mt-10"
              initial={{ opacity: 0 }}
              animate={deptInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}>
              <button
                onClick={() => { setActiveDept(p => Math.max(0, p - 1)); deptHoveredRef.current = true; }}
                disabled={activeDept === 0}
                className="w-11 h-11 rounded-full border border-[#E8303A]/35 flex items-center justify-center text-[#E8303A] hover:bg-[#E8303A] hover:text-white hover:border-[#E8303A] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronLeft size={18} />
              </button>
              {/* Dot indicators */}
              <div className="flex items-center gap-2">
                {DEPARTMENTS.map((_, i) => (
                  <button key={i} onClick={() => { setActiveDept(i); deptHoveredRef.current = true; }}
                    className={`rounded-full transition-all duration-400 ${
                      activeDept === i ? "w-5 h-2 bg-[#1C2951]" : "w-2 h-2 bg-[#1C2951]/20 hover:bg-[#1C2951]/40"
                    }`} />
                ))}
              </div>
              <button
                onClick={() => { setActiveDept(p => Math.min(DEPARTMENTS.length - 1, p + 1)); deptHoveredRef.current = true; }}
                disabled={activeDept === DEPARTMENTS.length - 1}
                className="w-11 h-11 rounded-full border border-[#E8303A]/35 flex items-center justify-center text-[#E8303A] hover:bg-[#E8303A] hover:text-white hover:border-[#E8303A] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronRight size={18} />
              </button>
            </motion.div>
          </div>

          {/* ── Active dept description ── */}
          <AnimatePresence mode="wait">
            <motion.div key={activeDept}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.42 }}
              className="text-center mt-10 max-w-md mx-auto">
              <p className="text-[#1C2951]/45 font-light leading-relaxed text-[15px]">
                {DEPARTMENTS[activeDept].desc}
              </p>
            </motion.div>
          </AnimatePresence>

        </div>
      </section>

      {/* ─────────────────── PREMIUM IMPORTS ─────────────────── */}
      <section
        id="range"
        ref={rangeSectionRef}
        className="bg-[#080f1e] py-28 lg:py-36 overflow-hidden relative"
        onMouseMove={onRangeMouseMove}
        onMouseEnter={() => { rangeHoveredRef.current = true; }}
        onMouseLeave={onRangeMouseLeave}>
        <div className="grain-overlay absolute inset-0 pointer-events-none" />

        <div className="relative section-container">

          {/* ── Centred header ── */}
          <motion.div
            className="text-center mb-14"
            initial={{ opacity: 0, y: 48 }}
            animate={rangeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
            transition={{ duration: 0.9, ease: EASE_EXPO }}>
            <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8303A]" />
              <span className="text-[10.5px] font-bold tracking-[0.22em] uppercase text-white/40">Our Products</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-[4.8rem] font-serif text-white leading-[0.92] tracking-[-0.03em] mb-5">
              Premium Produce,{" "}
              <em className="text-[#E8303A] not-italic">All Varieties.</em>
            </h2>
            <p className="text-white/38 text-[1.05rem] max-w-lg mx-auto font-light leading-relaxed">
              Imported fruits sourced from trusted global growers, stored with care, and delivered fresh to all four Aeden Fresh stores in Kochi.
            </p>
          </motion.div>

          {/* ── Category tabs ── */}
          <motion.div
            className="flex justify-center flex-wrap gap-x-8 gap-y-0 border-b border-white/8 mb-20"
            initial={{ opacity: 0, y: 24 }}
            animate={rangeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}>
            {RANGE_TABS.map(tab => (
              <button key={tab.id}
                onClick={() => { setActiveRange(tab.id); rangeHoveredRef.current = true; }}
                className={`pb-4 text-[13.5px] font-medium transition-all duration-300 border-b-2 -mb-px whitespace-nowrap flex items-center gap-2 ${
                  activeRange === tab.id
                    ? "text-white border-white"
                    : "text-white/28 border-transparent hover:text-white/55"
                }`}>
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${
                  activeRange === tab.id ? "bg-white/12 text-white/55" : "bg-white/6 text-white/22"
                }`}>{tab.count}</span>
              </button>
            ))}
          </motion.div>

          {/* ── 3D Fan carousel ── */}
          <div className="relative" style={{ perspective: "1600px" }}>
            <motion.div
              className="relative h-[500px] md:h-[560px] flex items-center justify-center"
              style={{ x: rangeMouseX, transformStyle: "preserve-3d" }}
              initial={{ opacity: 0, y: 80 }}
              animate={rangeInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 80 }}
              transition={{ duration: 1.0, ease: EASE_EXPO, delay: 0.28 }}>
              {rangeItems.map((fruit, i) => {
                const offset    = i - activeRangeItem;
                const absOffset = Math.abs(offset);
                if (absOffset > 2) return null;

                const rotateY = offset * 26;
                const tx      = offset * 310;   // generous spacing
                const scale   = 1 - absOffset * 0.10;
                const opacity = absOffset === 0 ? 1 : 1 - absOffset * 0.30;

                return (
                  <motion.div key={`${activeRange}-${i}`}
                    onClick={() => { setActiveRangeItem(i); rangeHoveredRef.current = true; }}
                    animate={{ rotateY, x: tx, scale, opacity }}
                    transition={{ duration: 0.55, ease: EASE_OUT }}
                    className="absolute cursor-pointer w-56 md:w-64 select-none"
                    style={{ zIndex: 20 - absOffset }}>

                    <Link href={`/products/${fruit.slug}`}
                      onClick={e => { if (offset !== 0) { e.preventDefault(); setActiveRangeItem(i); } }}>
                      <div className={`rounded-3xl overflow-hidden transition-all duration-500 ${
                        offset === 0
                          ? "bg-[#0d1a2e] shadow-[0_40px_100px_rgba(0,0,0,0.55)] ring-1 ring-white/8"
                          : "bg-[#0a1525] shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/4"
                      }`}>
                        {/* Product image */}
                        <div className="relative h-[280px] md:h-[320px] overflow-hidden">
                          <img src={fruit.img}
                            alt={`${fruit.brand} — ${fruit.variety}`}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-106" />
                          {/* dark gradient always */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a2e]/80 via-[#0d1a2e]/20 to-transparent" />
                          {/* extra dim on side cards */}
                          {offset !== 0 && (
                            <div className="absolute inset-0 bg-[#080f1e]/45" />
                          )}
                          {/* Tag on active */}
                          {offset === 0 && (
                            <>
                              <div className="absolute top-4 left-4">
                                <span className="text-[8.5px] font-bold tracking-[0.2em] uppercase px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/16 text-white/85">
                                  {fruit.tag}
                                </span>
                              </div>
                              <div className="absolute top-4 right-4 text-lg">{fruit.flag}</div>
                            </>
                          )}
                          {/* Origin on image bottom */}
                          <div className="absolute bottom-3 left-4">
                            <span className={`text-[9px] font-bold tracking-[0.18em] uppercase transition-colors duration-300 ${
                              offset === 0 ? "text-[#5C8C2F]" : "text-white/20"
                            }`}>{fruit.origin}</span>
                          </div>
                        </div>

                        {/* Card footer */}
                        <div className="px-5 py-4 border-t border-white/6 text-center">
                          <p className={`text-[10px] font-light tracking-wide mb-0.5 transition-colors duration-300 ${
                            offset === 0 ? "text-white/40" : "text-white/18"
                          }`}>{fruit.variety}</p>
                          <h3 className={`font-serif leading-tight transition-all duration-300 ${
                            offset === 0
                              ? "text-[1.1rem] text-white"
                              : "text-[0.9rem] text-white/35"
                          }`}>{fruit.brand}</h3>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Prev / Next + dots */}
            <motion.div
              className="flex justify-center items-center gap-6 mt-10"
              initial={{ opacity: 0 }}
              animate={rangeInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}>
              <button
                onClick={() => { setActiveRangeItem(p => Math.max(0, p - 1)); rangeHoveredRef.current = true; }}
                disabled={activeRangeItem === 0}
                className="w-11 h-11 rounded-full border border-[#E8303A]/35 flex items-center justify-center text-[#E8303A] hover:bg-[#E8303A] hover:text-white hover:border-[#E8303A] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                {rangeItems.map((_, i) => (
                  <button key={i}
                    onClick={() => { setActiveRangeItem(i); rangeHoveredRef.current = true; }}
                    className={`rounded-full transition-all duration-400 ${
                      activeRangeItem === i ? "w-5 h-2 bg-white" : "w-2 h-2 bg-white/18 hover:bg-white/35"
                    }`} />
                ))}
              </div>
              <button
                onClick={() => { setActiveRangeItem(p => Math.min(rangeItems.length - 1, p + 1)); rangeHoveredRef.current = true; }}
                disabled={activeRangeItem === rangeItems.length - 1}
                className="w-11 h-11 rounded-full border border-[#E8303A]/35 flex items-center justify-center text-[#E8303A] hover:bg-[#E8303A] hover:text-white hover:border-[#E8303A] transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed">
                <ChevronRight size={18} />
              </button>
            </motion.div>
          </div>

          {/* Active item description */}
          <AnimatePresence mode="wait">
            <motion.div key={`${activeRange}-${activeRangeItem}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.38 }}
              className="text-center mt-10 max-w-md mx-auto">
              <p className="text-white/30 font-light leading-relaxed text-[14.5px]">
                {rangeItems[activeRangeItem]?.desc}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Footer link */}
          <div className="text-center mt-10">
            <Magnetic href="https://aedenfruits.com"
              className="rounded-full border border-white/12 bg-white/5 hover:bg-white hover:text-[#080f1e] text-white/55 hover:text-[#080f1e] px-8 h-11 text-[13px] font-medium inline-flex items-center gap-2 transition-all duration-300 backdrop-blur-sm">
              Sourced via Aeden Fruits International <Globe size={13} />
            </Magnetic>
          </div>

        </div>
      </section>

      {/* ─────────────────── STATS ────────────────────────────── */}
      <section className="bg-[#1C2951] py-28 lg:py-36 relative overflow-hidden">
        <div className="grain-overlay absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[22vw] font-serif font-bold text-white/[0.022] leading-none">FRESH</span>
        </div>
        <div className="relative section-container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            <Counter value={4}  label="Stores in Kochi" />
            <Counter value={14} suffix="+" label="Years of Heritage" />
            <Counter value={80} suffix="+" label="Imported Fruit SKUs" />
            <Counter value={10} suffix="+" label="Source Countries" />
          </div>
        </div>
      </section>

      {/* ─────────────────── VIDEOS ───────────────────────────── */}
      <VideoSection />

      {/* ─────────────────── OUR STORES ──────────────────────── */}
      <section id="stores" className="bg-[#FAF7F2] py-32 lg:py-44">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div>
              <Reveal>
                <RedRule />
                <EyebrowLabel>Find Us in Kochi</EyebrowLabel>
                <WordReveal
                  text="4 Stores. One Premium Experience."
                  className="text-5xl md:text-6xl lg:text-[5rem] font-serif text-[#1C2951] leading-[0.9] tracking-[-0.03em] mb-8" />
                <motion.p variants={fadeUp} className="text-[#1C2951]/52 text-lg leading-relaxed font-light mb-14">
                  Every Aeden Fresh store is designed to be Kochi's finest fresh grocery experience — bright, premium, and stocked with produce you won't find anywhere else in Kerala.
                </motion.p>
              </Reveal>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {STORES.map((store, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, y: 28 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "180px" }}
                    transition={{ delay: i * 0.09, duration: 0.75, ease: EASE_OUT }}
                    className="group p-6 rounded-2xl border border-[#1C2951]/9 bg-white/60 hover:bg-white hover:border-gold/35 shadow-luxe hover:shadow-luxe-lg transition-all duration-400"
                    whileHover={{ y: -3 }}
                    onMouseEnter={() => pushCursorLabel("MAP")}
                    onMouseLeave={() => pushCursorClear()}>

                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1C2951]/6 group-hover:bg-[#5C8C2F]/10 flex items-center justify-center transition-colors duration-300">
                        <MapPin size={16} className="text-[#1C2951]/45 group-hover:text-[#5C8C2F] transition-colors duration-300" />
                      </div>
                      <span className={`text-[9.5px] font-bold tracking-[0.18em] uppercase rounded-full px-2.5 py-1 ${
                        store.label === "Flagship"
                          ? "text-[#E8303A] bg-[#E8303A]/8"
                          : "text-[#5C8C2F] bg-[#5C8C2F]/10"
                      }`}>
                        {store.label}
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#1C2951]/35 mb-1">{store.area}</p>
                    <p className="font-semibold text-[#1C2951] text-base mb-1">Aeden Fresh {store.name}</p>
                    <p className="text-[#1C2951]/42 text-[13px] font-light mb-0.5">{store.address}</p>
                    <p className="text-[#1C2951]/30 text-[12px] font-light mb-3">{store.pin}</p>

                    <a href={`tel:${store.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 text-[#1C2951]/55 hover:text-[#1C2951] text-[12px] font-medium transition-colors duration-200 mb-1">
                      <Phone size={11} /> {store.phone}
                    </a>

                    <a href={store.maps} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 mt-3 text-[#5C8C2F] text-[12px] font-semibold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      Get Directions <ExternalLink size={11} />
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Store image */}
            <div className="relative lg:sticky lg:top-28">
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
                className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl shadow-[#1C2951]/12">
                <img
                  src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=900&q=82&auto=format&fit=crop"
                  alt="Aeden Fresh store interior" loading="lazy"
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080f1e]/35 to-transparent" />
              </motion.div>

              {/* Floating badges */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.32, ease: EASE_OUT }}
                className="absolute -bottom-5 -right-5 bg-[#1C2951] text-white rounded-2xl px-7 py-5 shadow-2xl hidden md:block ring-4 ring-[#FAF7F2]">
                <p className="text-[3.2rem] font-serif font-light leading-none">4</p>
                <p className="text-[10px] tracking-[0.2em] uppercase text-white/45 mt-1.5">Premium Stores</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.45, ease: EASE_OUT }}
                className="absolute -top-5 -left-5 bg-[#E8303A] text-white rounded-2xl px-6 py-4 shadow-xl hidden md:block ring-4 ring-[#FAF7F2]">
                <p className="text-2xl font-serif leading-none">Est.</p>
                <p className="text-3xl font-serif font-semibold leading-none">2010</p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── FRANCHISE ───────────────────────── */}
      <section id="franchise" className="bg-[#080f1e] py-32 lg:py-44 relative overflow-hidden">
        <div className="grain-overlay absolute inset-0 pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-end overflow-hidden pointer-events-none select-none pr-6">
          <span className="text-[18vw] font-serif font-bold text-white/[0.022] leading-none">OWN</span>
        </div>

        <div className="relative section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24 items-center">

            {/* Image */}
            <motion.div className="relative"
              initial={{ opacity: 0, x: -36 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.95, ease: EASE_OUT }}>
              <div className="aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-white/8">
                <img src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&q=82&auto=format&fit=crop"
                  alt="Franchise opportunity" loading="lazy"
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080f1e]/55 to-transparent" />
              </div>
              <motion.div
                className="absolute -top-5 -right-5 bg-[#E8303A] text-white rounded-2xl p-6 shadow-2xl hidden md:block ring-4 ring-[#080f1e]"
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
                <p className="text-[2.5rem] font-serif font-light leading-none">Own</p>
                <p className="text-[11px] tracking-[0.18em] uppercase text-white/70 mt-1">an Aeden Fresh</p>
              </motion.div>
            </motion.div>

            {/* Text */}
            <Reveal>
              <RedRule />
              <EyebrowLabel>Franchise Opportunity</EyebrowLabel>
              <WordReveal
                text="Bring Aeden Fresh to Your Neighbourhood"
                className="text-5xl md:text-6xl lg:text-[5rem] font-serif text-white leading-[0.9] tracking-[-0.03em] mb-8" />
              <motion.p variants={fadeUp} className="text-white/45 text-lg leading-relaxed font-light mb-10">
                Own a premium fresh grocery store backed by 14 years of brand heritage, a proven 4-store model, and the most powerful fresh produce supply chain in South India — exclusively through Aeden Fruits International.
              </motion.p>

              <div className="space-y-5 mb-12">
                {[
                  { icon: BadgeCheck, title: "Proven 14-Year Brand", desc: "4 operating stores, loyal customer base, established premium positioning" },
                  { icon: Plane, title: "Exclusive Import Supply Chain", desc: "Direct access to Aeden Fruits International's 10+ country import network" },
                  { icon: Store, title: "Full Setup & Launch Support", desc: "Store design, fit-out, staff training and grand opening execution" },
                  { icon: TrendingUp, title: "High-Growth Market Segment", desc: "India's premium grocery sector growing at 23%+ per year" },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div key={i}
                    variants={{ hidden: { opacity: 0, x: -18 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE_OUT } } }}
                    className="flex items-start gap-4 group">
                    <div className="w-10 h-10 rounded-xl border border-white/9 bg-white/4 flex-shrink-0 flex items-center justify-center group-hover:border-[#5C8C2F]/40 group-hover:bg-[#5C8C2F]/10 transition-all duration-300">
                      <Icon size={15} className="text-white/40 group-hover:text-[#5C8C2F] transition-colors duration-300" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm mb-0.5">{title}</p>
                      <p className="text-white/38 text-sm font-light">{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp}>
                <Magnetic href="#contact"
                  className="bg-white text-[#080f1e] hover:bg-[#FAF7F2] rounded-full px-9 h-12 text-[14px] font-semibold inline-flex items-center gap-2 transition-colors duration-300 shadow-2xl">
                  Enquire About Franchising <ArrowRight size={14} />
                </Magnetic>
              </motion.div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────── OUR STORY ───────────────────────── */}
      <section id="story" className="bg-[#FAF7F2] py-32 lg:py-44">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-14 lg:gap-24">
            <Reveal>
              <RedRule />
              <EyebrowLabel>Our Story</EyebrowLabel>
              <WordReveal
                text="14 Years of Freshness in Kerala"
                className="text-5xl md:text-6xl font-serif text-[#1C2951] leading-[0.9] tracking-[-0.03em]" />
            </Reveal>

            <div className="space-y-5">
              {[
                {
                  year: "2010",
                  title: "Born as Greens Angaadi",
                  body: "A beloved neighbourhood fruit and vegetable shop opened in Kochi. Greens Angaadi quickly became the go-to destination for discerning Kerala families — known for exceptional produce quality and honest sourcing."
                },
                {
                  year: "2024",
                  title: "Reborn as Aeden Fresh",
                  body: "Greens Angaadi was reimagined as Aeden Fresh — a premium fresh grocery chain with purpose-built stores and a direct line to Aeden Fruits International's global import supply. Pink Lady®, Shine Muscat, Zespri® SunGold — produce unavailable anywhere else in Kerala."
                },
                {
                  year: "Now",
                  title: "4 Stores. Expanding.",
                  body: "With 4 premium stores across Kochi — Kadavanthara, Kacheripady, Thrippunithura and Kakkanad — Aeden Fresh carries 80+ imported fruit varieties alongside fresh vegetables, artisan bakery and premium dairy. And the expansion is only just beginning."
                },
              ].map((item, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "180px" }}
                  transition={{ duration: 0.78, delay: i * 0.11, ease: EASE_OUT }}
                  className="group relative border border-[#1C2951]/8 bg-white/55 hover:bg-white hover:border-gold/30 shadow-luxe hover:shadow-luxe-lg rounded-2xl p-8 transition-all duration-450 cursor-default overflow-hidden">
                  <motion.div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E8303A] origin-top rounded-l-2xl"
                    initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.18 + i * 0.1 }} />
                  <div className="flex items-start gap-6">
                    <span className="flex-shrink-0 pt-1 text-[11px] font-bold tracking-[0.24em] uppercase text-[#E8303A]/55">{item.year}</span>
                    <div>
                      <h3 className="text-xl font-serif text-[#1C2951] mb-3 group-hover:text-[#E8303A] transition-colors duration-300">{item.title}</h3>
                      <p className="text-[#1C2951]/52 font-light leading-relaxed text-[15px]">{item.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── JOURNAL ──────────────────────────── */}
      <section className="bg-[#1C2951] py-32 lg:py-44 relative overflow-hidden">
        <div className="grain-overlay absolute inset-0 pointer-events-none" />
        <div className="relative section-container">
          <Reveal className="max-w-xl mb-16">
            <RedRule />
            <EyebrowLabel>Journal</EyebrowLabel>
            <WordReveal text="Stories From Our Shelves"
              className="text-5xl md:text-6xl font-serif text-white leading-[0.9] tracking-[-0.03em]" />
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {BLOG.map((post, i) => (
              <motion.article key={i}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "180px" }}
                transition={{ delay: i * 0.1, duration: 0.82, ease: EASE_OUT }}
                className="shimmer-card group cursor-pointer">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-5 ring-1 ring-white/7">
                  <motion.img src={post.img} alt={post.title} loading="lazy"
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.07 }} transition={{ duration: 0.8, ease: [0,0,0.2,1] }} />
                </div>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-[#5C8C2F] text-[10px] font-bold tracking-[0.22em] uppercase">{post.cat}</span>
                  <span className="w-1 h-1 rounded-full bg-white/18" />
                  <span className="text-white/28 text-[10px] tracking-wide">{post.read} read</span>
                </div>
                <h3 className="text-[1.2rem] font-serif text-white leading-snug group-hover:text-[#E8303A] transition-colors duration-300">
                  {post.title}
                </h3>
                <motion.div className="h-px bg-white/9 mt-5 origin-left"
                  initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 + i * 0.07 }} />
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FAQ ──────────────────────────────── */}
      <section className="bg-[#FAF7F2] py-32 lg:py-44">
        <div className="section-container grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24">
          <Reveal>
            <RedRule />
            <EyebrowLabel>Questions</EyebrowLabel>
            <WordReveal text="Everything You Need to Know"
              className="text-5xl md:text-6xl font-serif text-[#1C2951] leading-[0.9] tracking-[-0.03em]" />
          </Reveal>

          <Accordion type="single" collapsible className="space-y-3">
            {FAQS.map(({ q, a }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "180px" }}
                transition={{ delay: i * 0.07, duration: 0.65, ease: EASE_OUT }}>
                <AccordionItem value={`faq-${i}`}
                  className="border border-[#1C2951]/8 bg-white/55 hover:bg-white rounded-2xl overflow-hidden px-6 transition-colors duration-300">
                  <AccordionTrigger
                    className="text-[#1C2951] text-left font-medium text-[15px] py-5 hover:no-underline hover:text-[#E8303A] transition-colors [&>svg]:text-[#1C2951]/28 [&>svg]:flex-shrink-0">
                    {q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#1C2951]/52 font-light leading-relaxed pb-5 text-[15px]">
                    {a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ─────────────────── CONTACT ──────────────────────────── */}
      <section id="contact" className="bg-[#080f1e] py-32 lg:py-44 relative overflow-hidden">
        <div className="grain-overlay absolute inset-0 pointer-events-none" />
        <div className="relative section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-24">
            <Reveal>
              <RedRule />
              <EyebrowLabel>Get in Touch</EyebrowLabel>
              <WordReveal text="Let's Talk Stores, Franchise & More"
                className="text-5xl md:text-6xl font-serif text-white leading-[0.9] tracking-[-0.03em] mb-8" />
              <motion.p variants={fadeUp} className="text-white/40 text-lg leading-relaxed font-light mb-13">
                Whether you're interested in a franchise, exploring an investment, or simply want to know when we're opening near you — we'd love to hear from you.
              </motion.p>

              <div className="space-y-5 mb-10">
                {[
                  { icon: MapPin, label: "Head Office",       value: "Kadavanthara, Ernakulam, Kochi, Kerala 682020" },
                  { icon: Phone,  label: "Call Us",           value: "+91 92078 89500" },
                  { icon: Mail,   label: "Email",             value: "info@aedenfruits.com" },
                  { icon: Globe,  label: "Sourcing Partner",  value: "aedenfruits.com" },
                ].map(({ icon: Icon, label, value }) => (
                  <motion.div key={label} variants={fadeUp} className="flex items-center gap-5 group">
                    <div className="w-11 h-11 rounded-xl border border-white/9 bg-white/4 flex-shrink-0 flex items-center justify-center group-hover:border-[#5C8C2F]/38 group-hover:bg-[#5C8C2F]/9 transition-all duration-300">
                      <Icon size={15} className="text-white/38 group-hover:text-[#5C8C2F] transition-colors duration-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/22 mb-0.5">{label}</p>
                      <p className="text-white/65 font-light">{value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={fadeUp} className="flex gap-3">
                {[FaInstagram, FaFacebook, FaWhatsapp].map((Icon, i) => (
                  <motion.a key={i} href="#"
                    className="w-10 h-10 rounded-xl border border-white/9 flex items-center justify-center text-white/28 hover:text-white hover:border-white/28 hover:bg-white/7 transition-all duration-300"
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.94 }}>
                    <Icon size={14} />
                  </motion.a>
                ))}
              </motion.div>
            </Reveal>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.88, ease: EASE_OUT }}
              className="space-y-4" onSubmit={e => e.preventDefault()}>

              <div className="grid grid-cols-2 gap-4">
                {[{ l: "Name", p: "Your name", t: "text" }, { l: "Phone", p: "+91 …", t: "tel" }].map(({ l, p, t }) => (
                  <div key={l}>
                    <label className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/28 block mb-2">{l}</label>
                    <Input type={t} placeholder={p}
                      className="bg-white/5 border-white/9 text-white placeholder:text-white/22 rounded-xl h-12 focus:border-white/28 focus:bg-white/8 transition-colors" />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/28 block mb-2">Email</label>
                <Input type="email" placeholder="hello@company.com"
                  className="bg-white/5 border-white/9 text-white placeholder:text-white/22 rounded-xl h-12 focus:border-white/28 focus:bg-white/8 transition-colors" />
              </div>

              <div>
                <label className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/28 block mb-2">I'm interested in…</label>
                <select className="w-full bg-white/5 border border-white/9 text-white/62 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/28 appearance-none transition-colors">
                  <option value="" className="bg-[#080f1e]">Select an option</option>
                  {["Franchise Partnership", "Investment Opportunity", "Store Location Query", "Wholesale / Bulk Order", "General Enquiry"].map(o => (
                    <option key={o} className="bg-[#080f1e]">{o}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/28 block mb-2">Message</label>
                <textarea rows={5} placeholder="Tell us what you're looking for…"
                  className="w-full bg-white/5 border border-white/9 text-white placeholder:text-white/22 rounded-xl p-4 text-sm resize-none focus:outline-none focus:border-white/28 focus:bg-white/7 transition-colors" />
              </div>

              <motion.button type="submit"
                className="w-full bg-[#E8303A] hover:bg-[#cc2b34] text-white rounded-xl h-12 text-[14px] font-semibold tracking-wide transition-colors duration-300 shadow-2xl shadow-red-900/25"
                whileHover={{ scale: 1.008 }} whileTap={{ scale: 0.996 }}>
                Send Message
              </motion.button>
            </motion.form>
          </div>
        </div>
      </section>

      {/* ─────────────────── FOOTER ───────────────────────────── */}
      <footer className="bg-[#03080f] py-20">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <img src="/images/logo-light.png" alt="Aeden Fresh" className="h-10 w-auto mb-6" loading="lazy" />
              <p className="text-white/28 font-light leading-relaxed max-w-xs text-sm">
                Kerala's premium fresh grocery chain. Imported fruits, farm-fresh vegetables, artisan bakery, and premium dairy — beautifully curated at 4 stores across Kochi.
              </p>
              <p className="text-white/14 text-xs mt-4">Powered by Aeden Fruits International Pvt Ltd</p>
              <div className="flex gap-3 mt-6">
                {[FaInstagram, FaFacebook, FaWhatsapp].map((Icon, i) => (
                  <motion.a key={i} href="#"
                    className="w-9 h-9 rounded-xl border border-white/8 flex items-center justify-center text-white/28 hover:text-white hover:border-white/22 transition-all duration-300"
                    whileHover={{ scale: 1.1, y: -2 }}>
                    <Icon size={13} />
                  </motion.a>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white/14 text-[10px] font-semibold tracking-[0.22em] uppercase mb-6">Navigate</p>
              <ul className="space-y-3.5">
                {[
                  { label: "Shop Online", href: "/shop" },
                  { label: "Our Range",  href: "#range" },
                  { label: "Our Stores", href: "#stores" },
                  { label: "Franchise",  href: "#franchise" },
                  { label: "Our Story",  href: "#story" },
                  { label: "Journal",    href: "#journal" },
                  { label: "Contact",    href: "#contact" },
                ].map(({ label, href }) => (
                  <li key={label}><a href={href} className="text-white/35 font-light hover:text-white text-sm transition-colors duration-300">{label}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white/14 text-[10px] font-semibold tracking-[0.22em] uppercase mb-6">Our Stores</p>
              <ul className="space-y-3.5">
                {STORES.map(s => (
                  <li key={s.name}>
                    <a href={s.maps} target="_blank" rel="noopener noreferrer"
                      className="text-white/35 font-light text-sm hover:text-white transition-colors duration-300 flex items-center gap-1.5 group">
                      Aeden Fresh {s.name}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/15 text-xs tracking-wide">
              © {new Date().getFullYear()} Aeden Fresh (formerly Greens Angaadi). All rights reserved.
            </p>
            <p className="text-white/15 text-[10px] tracking-[0.14em] uppercase">
              4 Stores · Kochi, Kerala · Premium Fresh Grocery
            </p>
          </div>
        </div>
      </footer>

      {/* ─────────────────── BACK TO TOP ──────────────────────── */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-8 right-8 w-12 h-12 bg-[#E8303A] text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-900/35 z-50 hover:bg-[#1C2951] transition-colors duration-300"
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
