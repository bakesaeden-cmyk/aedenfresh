# Aeden Fresh ERP integration

The storefront never calls the ERP from the browser. ERP data is normalized into Supabase, and customers shop that fast, store-specific cache. Checkout validates the current database price and inventory again before creating an order.

## First-time Supabase setup

On a new Supabase project, run every file in `supabase/migrations` in numeric order: `0001`, `0002`, `0003`, `0004`, `0005`, then `0006`. In the Supabase SQL Editor, make sure no partial block is highlighted when pressing **Run**. Migration `0006` is additive and can be safely rerun after the base migrations.

## Catalogue sync

Call `POST /api/integrations/erp/sync` with the `x-erp-sync-secret` header.

- Send an empty body to make Aeden pull from `ERP_API_BASE_URL` + `ERP_CATALOGUE_PATH`.
- Send the normalized JSON body below if the ERP or integration platform pushes changes.

```json
{
  "categories": [
    {
      "external_id": "FRUIT",
      "name": "Fruits",
      "slug": "fruits",
      "display_order": 1,
      "is_active": true
    }
  ],
  "products": [
    {
      "external_id": "ITEM-1001",
      "sku": "AF-FR-001",
      "category_external_id": "FRUIT",
      "name": "Pink Lady Apples",
      "description": "Premium imported apples",
      "unit_label": "4 pcs",
      "selling_price": 329,
      "compare_at_price": 369,
      "tax_rate": 0,
      "image_url": "https://example.com/apple.jpg",
      "tags": ["Imported", "Bestseller"],
      "is_active": true
    }
  ],
  "inventory": [
    {
      "store_code": "KAD",
      "sku": "AF-FR-001",
      "stock_qty": 24,
      "selling_price": 329,
      "is_available": true,
      "updated_at": "2026-07-20T10:00:00.000Z"
    }
  ]
}
```

The seeded store codes are `KAD`, `KAC`, `TRI`, `KAK`, and `UNI`. Change `stores.erp_store_code` in Supabase if your ERP uses different codes.

## Paid-order export

Set `ERP_ORDER_WEBHOOK_URL`. After Razorpay capture, Aeden sends a normalized `order.paid` payload to this endpoint. The request includes `Idempotency-Key: <Aeden order UUID>`, so the ERP or integration layer must treat retries as the same order.

## Store WhatsApp dispatch

Set `stores.whatsapp_phone` for every store in international digits-only format. After payment capture, the routed store receives the order, customer address, delivery slot, line items and tracking link. `STORE_WHATSAPP_DEFAULT_NUMBER` is used only when a store-specific number is missing.

For reliable delivery outside WhatsApp’s 24-hour conversation window, create an approved utility template and set `WHATSAPP_STORE_ORDER_TEMPLATE`. Its body should contain eight variables in this order: order number, store, items, total, delivery time, customer phone, address, tracking link.
