"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart";

export function AddBasketButton({
  basketId,
  name,
  price,
}: {
  basketId: string;
  name: string;
  price: number;
}) {
  const [added, setAdded] = useState(false);

  function add() {
    addToCart({
      label: name,
      curated_basket_id: basketId,
      unit_price_estimate: price,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Button className="mt-1 w-full" onClick={add} disabled={added}>
      {added ? (
        <>
          <Check /> Added to cart
        </>
      ) : (
        <>
          <ShoppingBag /> Add to cart
        </>
      )}
    </Button>
  );
}
