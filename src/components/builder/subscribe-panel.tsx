"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Clock, Loader2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn, formatINR } from "@/lib/utils";

interface Address {
  id: string;
  label: string | null;
  address_line: string;
  pincode: string;
  is_default: boolean;
}
interface Slot {
  id: string;
  start_time: string;
  end_time: string;
}

const FREQUENCIES = [
  { id: "daily", label: "Daily", hint: "Every single day" },
  { id: "alternate_days", label: "Alternate days", hint: "Every other day" },
  { id: "weekly", label: "Weekly", hint: "Same day each week" },
  { id: "custom", label: "Custom days", hint: "Pick your days" },
] as const;

const DAYS = [
  { id: "mon", label: "M" },
  { id: "tue", label: "T" },
  { id: "wed", label: "W" },
  { id: "thu", label: "T" },
  { id: "fri", label: "F" },
  { id: "sat", label: "S" },
  { id: "sun", label: "S" },
] as const;

export function SubscribePanel({
  savedComboId,
  storeId,
  comboLabel,
  priceEstimate,
}: {
  savedComboId: string;
  storeId: string;
  comboLabel: string;
  priceEstimate: number;
}) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [addressId, setAddressId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]["id"]>("daily");
  const [customDays, setCustomDays] = useState<string[]>(["mon", "wed", "fri"]);
  const [startDate, setStartDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ next_delivery_date: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const [{ data: addr }, { data: slotRows }] = await Promise.all([
        supabase
          .from("customer_addresses")
          .select("id, label, address_line, pincode, is_default")
          .order("is_default", { ascending: false }),
        supabase
          .from("delivery_slots")
          .select("id, start_time, end_time")
          .eq("store_id", storeId)
          .eq("is_active", true)
          .order("start_time"),
      ]);
      setAddresses((addr ?? []) as Address[]);
      const def = (addr ?? []).find((a) => a.is_default) ?? (addr ?? [])[0];
      if (def) setAddressId(def.id);
      setSlots((slotRows ?? []) as Slot[]);
      if (slotRows?.[0]) setSlotId(slotRows[0].id);
    })();
  }, [storeId]);

  function toggleDay(day: string) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  async function create() {
    setError(null);
    if (!addressId) {
      setError("Add a delivery address first (you can do that in your cart).");
      return;
    }
    if (frequency === "custom" && customDays.length === 0) {
      setError("Pick at least one delivery day.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_combo_id: savedComboId,
          store_id: storeId,
          address_id: addressId,
          delivery_slot_id: slotId || undefined,
          frequency,
          custom_days: frequency === "custom" ? customDays : undefined,
          start_date: startDate,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        subscription?: { next_delivery_date: string };
      };
      if (!res.ok || !data.subscription) {
        setError(
          data.error === "no_coverage"
            ? "That address isn't covered by your store — try another address."
            : "Couldn't create the subscription. Please try again.",
        );
        return;
      }
      setCreated(data.subscription);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Check size={28} />
        </div>
        <h1 className="text-4xl">Subscription active!</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">{comboLabel}</strong> — first
          delivery on{" "}
          <strong className="text-foreground">{created.next_delivery_date}</strong>.
          Every morning we&apos;ll send the payment link on WhatsApp; skip or
          pause anytime with a message.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/account/subscriptions">Manage subscriptions</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-10">
      <div>
        <Badge variant="accent" className="mb-3 tracking-[0.22em] uppercase">
          Subscribe & Save
        </Badge>
        <h1 className="text-4xl">Set your rhythm.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {comboLabel} · {formatINR(priceEstimate)} per delivery + delivery fee
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label>Frequency</Label>
        <div className="grid grid-cols-2 gap-2.5">
          {FREQUENCIES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFrequency(f.id)}
              className={cn(
                "rounded-xl border bg-card p-3.5 text-left transition-all",
                frequency === f.id
                  ? "border-accent shadow-luxe ring-1 ring-accent"
                  : "hover:border-foreground/25",
              )}
            >
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </button>
          ))}
        </div>
        {frequency === "custom" && (
          <div className="mt-1 flex gap-2">
            {DAYS.map((d) => (
              <button
                key={d.id}
                onClick={() => toggleDay(d.id)}
                aria-label={d.id}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  customDays.includes(d.id)
                    ? "border-accent bg-accent text-white"
                    : "border-border hover:border-foreground/30",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sub-address" className="flex items-center gap-1">
          <MapPin size={12} /> Deliver to
        </Label>
        <select
          id="sub-address"
          value={addressId}
          onChange={(e) => setAddressId(e.target.value)}
          className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
        >
          {addresses.length === 0 && <option value="">No addresses yet</option>}
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label ?? "Address"} — {a.address_line.slice(0, 40)} ({a.pincode})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-slot" className="flex items-center gap-1">
            <Clock size={12} /> Slot
          </Label>
          <select
            id="sub-slot"
            value={slotId}
            onChange={(e) => setSlotId(e.target.value)}
            className="border-input bg-card h-11 rounded-lg border px-3 text-sm"
          >
            {slots.length === 0 && <option value="">Any time</option>}
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sub-start">Starts</Label>
          <Input
            id="sub-start"
            type="date"
            value={startDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button size="lg" variant="accent" onClick={create} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <CalendarClock />}
        Start subscription
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        No lock-in. Skip, pause, or cancel anytime — even from WhatsApp.
      </p>
    </div>
  );
}
