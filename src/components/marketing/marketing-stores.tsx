"use client";

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MapPin, Clock, Phone, ExternalLink, Navigation, ChevronRight, X, ArrowRight, Leaf } from "lucide-react";
import "leaflet/dist/leaflet.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// ─── STORE DATA ───────────────────────────────────────────────────────
const STORES = [
  {
    id: 0,
    name: "Kadavanthara",
    label: "Flagship",
    labelColor: "#83B13E",
    area: "Central Kochi",
    address: "Kadavanthara, Ernakulam, Kochi",
    pin: "Kerala 682020",
    phone: "+91 484 298 0001",
    hours: [
      { days: "Monday – Saturday", time: "8:00 AM – 9:30 PM" },
      { days: "Sunday", time: "8:00 AM – 8:30 PM" },
    ],
    note: "Largest selection of imported fruits in Kerala.",
    lat: 9.9625,
    lng: 76.3009,
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)/@9.9625028,76.3009008,17z",
    img: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80&auto=format&fit=crop",
  },
  {
    id: 1,
    name: "Kacheripady",
    label: "Open",
    labelColor: "#237049",
    area: "Central Kochi",
    address: "Kacheripady Junction, Ernakulam, Kochi",
    pin: "Kerala 682018",
    phone: "+91 484 298 0002",
    hours: [
      { days: "Monday – Saturday", time: "8:00 AM – 9:30 PM" },
      { days: "Sunday", time: "8:00 AM – 8:30 PM" },
    ],
    note: "Full bakery & dairy section on-site.",
    lat: 9.9884,
    lng: 76.2806,
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Kacheripady/@9.9884178,76.2806464,17z",
    img: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=600&q=80&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Thrippunithura",
    label: "Open",
    labelColor: "#237049",
    area: "South Ernakulam",
    address: "Thrippunithura Junction, Ernakulam, Kochi",
    pin: "Kerala 682301",
    phone: "+91 484 298 0003",
    hours: [
      { days: "Monday – Saturday", time: "8:00 AM – 9:00 PM" },
      { days: "Sunday", time: "9:00 AM – 8:00 PM" },
    ],
    note: "Closest to Thripunithura Palace area.",
    lat: 9.9459,
    lng: 76.3505,
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Thrippunithura/@9.9459107,76.3505294,17z",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Kakkanad",
    label: "Open",
    labelColor: "#237049",
    area: "IT Hub",
    address: "Near Infopark Junction, Kakkanad, Kochi",
    pin: "Kerala 682030",
    phone: "+91 484 298 0004",
    hours: [
      { days: "Monday – Saturday", time: "7:30 AM – 9:30 PM" },
      { days: "Sunday", time: "8:00 AM – 9:00 PM" },
    ],
    note: "Extended weekday hours for IT professionals.",
    lat: 10.0161,
    lng: 76.3621,
    maps: "https://www.google.com/maps/place/Aeden+Fresh+(Formerly+Greens+Angaadi)+Kakkanad/@10.016052,76.362121,17z",
    img: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=600&q=80&auto=format&fit=crop",
  },
];

// ─── LEAFLET MAP ──────────────────────────────────────────────────────
function StoreMap({
  stores, activeId, onSelect,
}: {
  stores: typeof STORES;
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<import("leaflet").Marker[]>([]);

  useEffect(() => {
    let map: import("leaflet").Map;
    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix default icon paths for bundlers
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      map = L.map(mapRef.current, {
        center: [9.9765, 76.3150],
        zoom: 12,
        zoomControl: false,
        attributionControl: true,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Soft, muted tiles
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      // Custom SVG pin markers
      const makeIcon = (store: typeof STORES[0], active: boolean) => {
        const color = active ? store.labelColor : "#162D20";
        const scale = active ? 1.25 : 1;
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${32 * scale}" height="${42 * scale}" viewBox="0 0 32 42">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 11.84 14.4 25.2 15.04 25.76.52.48 1.36.48 1.92 0C17.6 41.2 32 27.84 32 16 32 7.16 24.84 0 16 0z" fill="${color}"/>
            <circle cx="16" cy="16" r="7" fill="white"/>
            <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="${color}" font-family="system-ui">${store.id + 1}</text>
          </svg>
        `;
        return L.divIcon({
          html: svg,
          className: "",
          iconSize: [32 * scale, 42 * scale],
          iconAnchor: [16 * scale, 42 * scale],
          popupAnchor: [0, -42 * scale],
        });
      };

      // Add markers
      stores.forEach((store) => {
        const marker = L.marker([store.lat, store.lng], {
          icon: makeIcon(store, false),
        }).addTo(map);

        marker.on("click", () => onSelect(store.id));
        markersRef.current[store.id] = marker;
      });

      mapInstanceRef.current = map;
    });

    return () => {
      map?.remove();
      mapInstanceRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker icons when activeId changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      stores.forEach((store) => {
        const marker = markersRef.current[store.id];
        if (!marker) return;
        const isActive = store.id === activeId;
        const color = isActive ? store.labelColor : "#162D20";
        const scale = isActive ? 1.25 : 1;
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${32 * scale}" height="${42 * scale}" viewBox="0 0 32 42">
            <path d="M16 0C7.16 0 0 7.16 0 16c0 11.84 14.4 25.2 15.04 25.76.52.48 1.36.48 1.92 0C17.6 41.2 32 27.84 32 16 32 7.16 24.84 0 16 0z" fill="${color}"/>
            <circle cx="16" cy="16" r="7" fill="white"/>
            <text x="16" y="20" text-anchor="middle" font-size="9" font-weight="700" fill="${color}" font-family="system-ui">${store.id + 1}</text>
          </svg>
        `;
        marker.setIcon(L.divIcon({
          html: svg,
          className: "",
          iconSize: [32 * scale, 42 * scale],
          iconAnchor: [16 * scale, 42 * scale],
        }));
      });

      // Pan to active store
      if (activeId !== null) {
        const store = stores[activeId];
        mapInstanceRef.current?.setView([store.lat, store.lng], 14, { animate: true });
      } else {
        mapInstanceRef.current?.setView([9.9765, 76.3150], 12, { animate: true });
      }
    });
  }, [activeId, stores]);

  return <div ref={mapRef} className="w-full h-full" />;
}

// ─── STORE CARD ───────────────────────────────────────────────────────
function StoreCard({
  store, isActive, onClick,
}: {
  store: typeof STORES[0];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: store.id * 0.08, duration: 0.6, ease: EASE_OUT }}
      className={`w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden group
        ${isActive
          ? "border-[#162D20] shadow-xl shadow-[#162D20]/10 bg-white"
          : "border-stone-200 bg-white hover:border-[#162D20]/40 hover:shadow-md"
      }`}
    >
      {/* Number + name row */}
      <button type="button" onClick={onClick} aria-expanded={isActive} className="flex w-full items-stretch text-left">
        <div
          className="w-12 flex-shrink-0 flex items-center justify-center text-white font-serif text-xl font-light"
          style={{ backgroundColor: isActive ? store.labelColor : "#162D20" }}
        >
          {store.id + 1}
        </div>
        <div className="flex-1 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-serif text-[#162D20] text-lg leading-tight">{store.name}</h3>
            <span
              className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${store.labelColor}15`,
                color: store.labelColor,
              }}
            >
              {store.label}
            </span>
          </div>
          <p className="text-stone-400 text-[12px]">{store.area}</p>
        </div>
        <div className={`flex items-center pr-4 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`}>
          <ChevronRight size={16} className="text-[#162D20]" />
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-stone-100">
              {/* Address */}
              <div className="flex gap-2.5 mt-3 mb-3">
                <MapPin size={14} className="text-stone-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-stone-700 text-[13px] leading-snug">{store.address}</p>
                  <p className="text-stone-400 text-[12px]">{store.pin}</p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex gap-2.5 mb-3">
                <Clock size={14} className="text-stone-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  {store.hours.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-stone-500 text-[12px] min-w-[130px]">{h.days}</span>
                      <span className="text-stone-700 text-[12px] font-medium">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div className="flex gap-2.5 mb-4">
                <Phone size={14} className="text-stone-400 mt-0.5 flex-shrink-0" />
                <a href={`tel:${store.phone}`} className="text-[#162D20] text-[13px] font-medium hover:underline">
                  {store.phone}
                </a>
              </div>

              {/* Note */}
              <p className="text-[11px] text-stone-400 italic mb-4">{store.note}</p>

              {/* CTA */}
              <a
                href={store.maps}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-2 bg-[#162D20] hover:bg-[#2E5A3F] text-white rounded-full px-5 h-9 text-[12px] font-semibold transition-colors duration-200"
              >
                <Navigation size={12} />
                Get Directions
                <ExternalLink size={11} />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── MOBILE DRAWER ────────────────────────────────────────────────────
function MobileStoreDrawer({
  store, onClose,
}: {
  store: typeof STORES[0];
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl p-6 pb-10"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-serif text-[#162D20] text-2xl">{store.name}</h3>
            <span
              className="text-[9px] font-bold tracking-[0.18em] uppercase px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${store.labelColor}15`, color: store.labelColor }}
            >
              {store.label}
            </span>
          </div>
          <p className="text-stone-400 text-sm">{store.area}</p>
        </div>
        <button onClick={onClose} aria-label="Close store details" className="p-2 rounded-full hover:bg-stone-100 transition-colors">
          <X size={18} className="text-stone-500" />
        </button>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex gap-2.5">
          <MapPin size={15} className="text-stone-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-stone-700 text-sm leading-snug">{store.address}</p>
            <p className="text-stone-400 text-xs">{store.pin}</p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <Clock size={15} className="text-stone-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            {store.hours.map((h, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-stone-500 text-xs min-w-[130px]">{h.days}</span>
                <span className="text-stone-700 text-xs font-medium">{h.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2.5">
          <Phone size={15} className="text-stone-400 mt-0.5 flex-shrink-0" />
          <a href={`tel:${store.phone}`} className="text-[#162D20] text-sm font-medium">{store.phone}</a>
        </div>
      </div>

      <p className="text-xs text-stone-400 italic mb-5">{store.note}</p>

      <a
        href={store.maps}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#162D20] text-white rounded-full w-full h-12 text-sm font-semibold"
      >
        <Navigation size={14} />
        Get Directions
        <ExternalLink size={13} />
      </a>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────
export default function Stores() {
  const [activeId, setActiveId] = useState<number | null>(0);

  const handleSelect = (id: number) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#F9F7F1] font-sans">
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-[100] bg-[#F9F7F1]/92 backdrop-blur-xl border-b border-[#162D20]/8">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between gap-4">
          <Link href="/">
            <img
              src="/images/logo-dark.png"
              alt="Aeden Fresh"
              className="h-10 md:h-11 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden md:inline-flex text-[13px] text-stone-500 hover:text-[#162D20] transition-colors font-medium gap-1 items-center">
              ← Back to Home
            </Link>
            <a href="#locations" className="hidden sm:inline-flex text-[13px] text-stone-500 hover:text-[#162D20] transition-colors font-medium">Store map</a>
            <Link href="/shop" className="bg-[#83B13E] hover:bg-[#A1CF58] text-[#122119] rounded-full px-5 h-9 text-[12px] font-bold inline-flex items-center gap-2 transition-colors shadow-lg shadow-green-950/20">
              Shop Fresh <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative pt-[72px] bg-[#162D20] overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200&q=60&auto=format&fit=crop)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-white/40 text-[11px] font-semibold tracking-[0.18em] uppercase mb-6">
            <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white/75">Our Stores</span>
          </nav>
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            className="font-serif text-white text-5xl md:text-6xl leading-tight mb-3"
          >
            Four neighbourhoods.<br /><span className="italic text-[#A6D55E]">One fresh standard.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
            className="text-white/55 text-base max-w-lg leading-relaxed"
          >
            Discover exceptional imports, daily-local produce and a store experience designed to make fresh food feel inspiring again.
          </motion.p>

          {/* Quick store pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE_OUT }}
            className="flex flex-wrap gap-2 mt-8"
          >
            {STORES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`text-[12px] font-medium px-4 h-8 rounded-full border transition-all duration-200
                  ${activeId === s.id
                    ? "bg-white text-[#162D20] border-white"
                    : "bg-white/8 text-white/70 border-white/20 hover:bg-white/15"
                  }`}
              >
                {s.id + 1}. {s.name}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── MAP + CARDS SPLIT ── */}
      <section id="locations" className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start">

          {/* Left: store cards */}
          <div className="lg:w-[380px] flex-shrink-0 space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-stone-400 mb-4">
              {STORES.length} Locations · Kochi, Kerala
            </p>
            {STORES.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                isActive={activeId === store.id}
                onClick={() => handleSelect(store.id)}
              />
            ))}
          </div>

          {/* Right: map */}
          <div className="flex-1 rounded-3xl overflow-hidden shadow-xl border border-stone-200 h-[480px] lg:h-[640px] lg:sticky lg:top-[76px]">
            <StoreMap
              stores={STORES}
              activeId={activeId}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </section>

      {/* ── STORE PHOTOS STRIP ── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-stone-400 mb-5">Inside Our Stores</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STORES.map((store, i) => (
            <motion.button
              key={store.id}
              onClick={() => setActiveId(store.id)}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.55, ease: EASE_OUT }}
              className={`relative rounded-2xl overflow-hidden aspect-[4/3] group
                ${activeId === store.id ? "ring-2 ring-[#162D20] ring-offset-2" : ""}`}
            >
              <img
                src={store.img}
                alt={`Aeden Fresh ${store.name}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#162D20]/80 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-3">
                <p className="text-white font-serif text-sm leading-tight">{store.name}</p>
                <p className="text-white/60 text-[10px]">{store.area}</p>
              </div>
              <div
                className="absolute top-3 left-3 text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${store.labelColor}dd`, color: "white" }}
              >
                {store.label}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── COMMERCE BRIDGE ── */}
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#162D20] px-6 py-9 text-white shadow-xl md:px-10 md:py-11">
          <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full bg-[#83B13E]/20 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-[#A6D55E] uppercase"><Leaf size={13} /> Fresh Commerce by Aeden</p>
              <h2 className="font-serif text-3xl leading-tight md:text-4xl">Can’t make it to a store? Let fresh come to you.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/58">Build personalised bowls, choose a chef-made favourite, or set a delivery rhythm around your week.</p>
            </div>
            <Link href="/shop" className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-[#83B13E] px-7 text-sm font-bold text-[#122119] transition-colors hover:bg-[#A1CF58] lg:self-auto">
              Explore Fresh Commerce <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER NOTE ── */}
      <div className="border-t border-[#162D20]/8 bg-white/65 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-stone-400 text-sm">
            All stores are <span className="text-[#237049] font-medium">open today</span>. Hours may vary on public holidays.
          </p>
          <Link href="/products" className="text-[#162D20] text-sm font-medium hover:underline inline-flex items-center gap-1">
            Browse Our Products <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
