"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart";

export function AddRetailProductButton({
  product,
  disabled = false,
}: {
  product: {
    id: string;
    sku: string;
    name: string;
    unit_label: string;
    selling_price: number;
    image_url: string;
  };
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);

  function add() {
    addToCart({
      kind: "grocery",
      label: product.name,
      retail_product_id: product.id,
      sku: product.sku,
      unit_label: product.unit_label,
      image_url: product.image_url,
      unit_price_estimate: product.selling_price,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={add}
      disabled={disabled || added}
      className="h-10 rounded-full px-4"
      aria-label={`Add ${product.name} to cart`}
    >
      {added ? <Check size={15} /> : <Plus size={15} />}
      {disabled ? "Unavailable" : added ? "Added" : "Add"}
    </Button>
  );
}
