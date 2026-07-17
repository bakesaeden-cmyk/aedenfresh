"use client";

/**
 * Client cart — localStorage-backed until checkout creates the order
 * (server recomputes all prices; these are display estimates only).
 */

export interface CartItem {
  key: string; // client-side identity
  label: string;
  option_ids?: string[];
  curated_basket_id?: string;
  saved_combo_id?: string;
  portion_size?: string;
  unit_price_estimate: number;
  quantity: number;
}

const CART_KEY = "af_cart";
const CART_EVENT = "af-cart-changed";

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as CartItem[];
  } catch {
    return [];
  }
}

function persist(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function addToCart(item: Omit<CartItem, "key">) {
  const items = getCart();
  items.push({ ...item, key: crypto.randomUUID() });
  persist(items);
}

export function updateQuantity(key: string, quantity: number) {
  const items = getCart()
    .map((i) => (i.key === key ? { ...i, quantity } : i))
    .filter((i) => i.quantity > 0);
  persist(items);
}

export function removeFromCart(key: string) {
  persist(getCart().filter((i) => i.key !== key));
}

export function clearCart() {
  persist([]);
}

export function onCartChange(callback: () => void): () => void {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
