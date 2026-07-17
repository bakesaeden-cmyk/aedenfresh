"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CartItem,
  getCart,
  onCartChange,
  removeFromCart,
  updateQuantity,
  clearCart,
} from "@/lib/cart";
import { createClient } from "@/lib/supabase/client";
import { formatINR } from "@/lib/utils";

interface StoredStore {
  id: string;
  name: string;
  delivery_fee?: number;
}
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

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function CartClient() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [store, setStore] = useState<StoredStore | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [addressId, setAddressId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [coupon, setCoupon] = useState("");
  const [newAddress, setNewAddress] = useState({ label: "Home", address_line: "", pincode: "" });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => setItems(getCart()), []);

  useEffect(() => {
    queueMicrotask(refresh);
    const off = onCartChange(refresh);
    try {
      const raw = localStorage.getItem("af_store");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredStore;
        queueMicrotask(() => setStore(parsed));
      }
    } catch {
      /* no store yet */
    }
    return off;
  }, [refresh]);

  // Auth + addresses + slots
  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSignedIn(Boolean(user));
      if (!user) return;
      // Web abandoned-cart signal (§5.8): the n8n cron finds customers
      // whose latest cart_activity has no later order_placed event.
      const cartItems = getCart();
      if (cartItems.length > 0) {
        void supabase.from("analytics_events").insert({
          customer_id: user.id,
          event_name: "cart_activity",
          properties: {
            channel: "web",
            item_count: cartItems.reduce((n, i) => n + i.quantity, 0),
          },
        });
      }
      const { data: addr } = await supabase
        .from("customer_addresses")
        .select("id, label, address_line, pincode, is_default")
        .order("is_default", { ascending: false });
      setAddresses((addr ?? []) as Address[]);
      const def = (addr ?? []).find((a) => a.is_default) ?? (addr ?? [])[0];
      if (def) setAddressId(def.id);
    })();
  }, []);

  useEffect(() => {
    if (!store?.id) return;
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("delivery_slots")
        .select("id, start_time, end_time")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("start_time");
      setSlots((data ?? []) as Slot[]);
      if (data?.[0]) setSlotId(data[0].id);
    })();
  }, [store?.id]);

  const subtotalEstimate = items.reduce(
    (sum, i) => sum + i.unit_price_estimate * i.quantity,
    0,
  );

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(newAddress.pincode)) {
      setError("Address pincode must be 6 digits.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error: insErr } = await supabase
      .from("customer_addresses")
      .insert({
        customer_id: user.id,
        label: newAddress.label || null,
        address_line: newAddress.address_line,
        pincode: newAddress.pincode,
        is_default: addresses.length === 0,
      })
      .select("id, label, address_line, pincode, is_default")
      .single();
    if (insErr || !data) {
      setError("Couldn't save the address — please try again.");
      return;
    }
    setAddresses((prev) => [...prev, data as Address]);
    setAddressId(data.id);
    setShowAddressForm(false);
  }

  async function checkout() {
    setError(null);
    if (!store) {
      setError("Pick a delivery area first — build a salad to set your store.");
      return;
    }
    if (!addressId) {
      setError("Choose or add a delivery address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          store_id: store.id,
          address_id: addressId,
          delivery_slot_id: slotId || undefined,
          coupon_code: coupon.trim() || undefined,
          items: items.map((i) => ({
            option_ids: i.option_ids,
            curated_basket_id: i.curated_basket_id,
            saved_combo_id: i.saved_combo_id,
            quantity: i.quantity,
          })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        order?: { id: string; order_number: string; total: number };
        payment?: {
          type: string;
          razorpay_order_id?: string;
          key_id?: string;
          amount?: number;
        } | null;
      };

      if (!res.ok && res.status !== 502) {
        setError(humanError(data.error));
        return;
      }
      if (!data.order) {
        setError("Checkout failed — please try again.");
        return;
      }

      clearCart();

      if (data.payment?.type === "checkout" && data.payment.razorpay_order_id) {
        // Load Checkout.js on demand and open the payment sheet
        await loadRazorpayScript();
        if (window.Razorpay) {
          const rzp = new window.Razorpay({
            key: data.payment.key_id,
            amount: data.payment.amount,
            currency: "INR",
            name: "Aeden Fresh",
            description: `Order ${data.order.order_number}`,
            order_id: data.payment.razorpay_order_id,
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              await fetch("/api/payments/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              router.push(`/orders/${data.order!.id}`);
            },
            modal: { ondismiss: () => router.push(`/orders/${data.order!.id}`) },
            theme: { color: "#74A53D" },
          });
          rzp.open();
          return;
        }
      }
      // Gateway not configured/unavailable — order exists, show tracking
      router.push(`/orders/${data.order.id}`);
    } catch {
      setError("Something went wrong at checkout. Your cart is unchanged.");
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="section-container flex min-h-[65vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="bg-primary/20 text-accent flex h-16 w-16 items-center justify-center rounded-full"><ShoppingBag size={25} /></span>
        <p className="eyebrow">Your fresh order</p>
        <h1 className="text-5xl">Your cart is ready for an idea.</h1>
        <p className="text-sm text-muted-foreground">
          Build a bowl or grab a curated basket to get started.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/build">Build a Bowl</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/baskets">Chef’s Menu</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="section-container grid max-w-6xl grid-cols-1 gap-9 py-10 lg:grid-cols-[1fr_400px] lg:py-14">
      <div className="flex flex-col gap-5">
        <div>
          <p className="eyebrow">Review your order</p>
          <h1 className="mt-2 text-5xl">Your Cart</h1>
          <p className="text-muted-foreground mt-2 text-sm">{items.reduce((sum, item) => sum + item.quantity, 0)} item{items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}, prepared fresh for you.</p>
        </div>
        {store && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={12} className="text-accent" />
            Delivering from <strong className="text-foreground">{store.name}</strong>
          </p>
        )}
        {items.map((item) => (
          <Card key={item.key} className="rounded-2xl">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.portion_size && <>{item.portion_size} · </>}
                  {formatINR(item.unit_price_estimate)} each
                </p>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                <div className="flex items-center gap-1 rounded-full border px-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus />
                  </Button>
                </div>
                <p className="w-20 text-right font-serif text-lg">
                  {formatINR(item.unit_price_estimate * item.quantity)}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFromCart(item.key)}
                  aria-label="Remove item"
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {signedIn === false && (
              <p className="text-sm">
                <Link href="/login?next=/cart" className="text-primary underline underline-offset-2">
                  Sign in
                </Link>{" "}
                to choose an address and pay.
              </p>
            )}
            {signedIn && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="address">Address</Label>
                  <select
                    id="address"
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
                  <button
                    className="self-start text-xs text-primary underline underline-offset-2"
                    onClick={() => setShowAddressForm((s) => !s)}
                  >
                    {showAddressForm ? "Cancel" : "+ Add address"}
                  </button>
                </div>
                {showAddressForm && (
                  <form onSubmit={saveAddress} className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
                    <Input
                      placeholder="Label (Home, Office…)"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    />
                    <Input
                      placeholder="Full address"
                      required
                      value={newAddress.address_line}
                      onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                    />
                    <Input
                      placeholder="Pincode"
                      required
                      maxLength={6}
                      value={newAddress.pincode}
                      onChange={(e) =>
                        setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\D/g, "") })
                      }
                    />
                    <Button type="submit" size="sm" variant="accent">
                      Save address
                    </Button>
                  </form>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="slot" className="flex items-center gap-1">
                    <Clock size={12} /> Delivery slot
                  </Label>
                  <select
                    id="slot"
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
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="relative">
              <Tag
                size={13}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Coupon code"
                className="pl-9 uppercase"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (estimate)</span>
              <span>{formatINR(subtotalEstimate)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span>{store?.delivery_fee ? formatINR(store.delivery_fee) : "At checkout"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Final price (incl. coupon) is computed securely at checkout.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button size="lg" onClick={checkout} disabled={busy || signedIn === false}>
              {busy ? <Loader2 className="animate-spin" /> : <ShoppingBag />}
              Pay with Razorpay
            </Button>
            <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-[10px]">
              <ShieldCheck size={11} className="text-accent" /> Secure payment · server-verified pricing
            </p>
            {signedIn === false && (
              <Badge variant="muted" className="self-center">
                Sign in required to pay
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function humanError(code?: string): string {
  switch (code) {
    case "invalid_coupon":
    case "coupon_expired":
    case "coupon_not_started":
      return "That coupon isn't valid.";
    case "coupon_exhausted":
      return "That coupon has been fully redeemed.";
    case "coupon_min_order":
      return "Your order is below the coupon's minimum.";
    case "no_coverage":
      return "This store doesn't deliver to that address — try another address.";
    case "invalid_address":
      return "Choose a valid delivery address.";
    case "option_inactive":
    case "unknown_option":
      return "An item in your cart is no longer available — please rebuild it.";
    case "auth_required":
      return "Please sign in to checkout.";
    default:
      return "Checkout failed — please try again.";
  }
}

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve();
      s.onerror = () => resolve(); // fall through to tracking page
      document.head.appendChild(s);
    });
  }
  return razorpayScriptPromise;
}
