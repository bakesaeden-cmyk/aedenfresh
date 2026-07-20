import { NextRequest, NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const inr = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

/**
 * GET /api/orders/:id/receipt (spec §5.4) — branded, printable HTML receipt
 * (print-to-PDF). Available once the order is paid. Auth: session owner
 * (RLS) or x-n8n-secret (n8n attaches the URL to the WhatsApp receipt
 * message, §5.8).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const n8nSecret = request.headers.get("x-n8n-secret");
  const isN8n =
    Boolean(process.env.N8N_API_SECRET) && n8nSecret === process.env.N8N_API_SECRET;
  const db = isN8n ? createServiceClient() : await createClient();

  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, status, subtotal, delivery_fee, discount, total, coupon_code, scheduled_date, created_at, stores(name, address, phone), customer_profiles(full_name, phone), customer_addresses(label, address_line, pincode)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.status === "pending_payment" || order.status === "failed") {
    return NextResponse.json({ error: "not_paid" }, { status: 409 });
  }

  const { data: items } = await db
    .from("order_items")
    .select("quantity, unit_price, line_total, option_ids, curated_basket_id, retail_product_id, product_name_snapshot, unit_label_snapshot")
    .eq("order_id", id);

  // Resolve display names for line items
  const lines: { label: string; qty: number; unit: number; total: number }[] = [];
  for (const item of items ?? []) {
    let label = "Custom Salad";
    if (item.retail_product_id) {
      label = `${item.product_name_snapshot ?? "Fresh grocery"}${item.unit_label_snapshot ? ` · ${item.unit_label_snapshot}` : ""}`;
    } else if (item.curated_basket_id) {
      const { data: b } = await db
        .from("curated_baskets")
        .select("name")
        .eq("id", item.curated_basket_id)
        .maybeSingle();
      label = b?.name ?? "Curated Basket";
    } else if (item.option_ids?.length) {
      const { data: opts } = await db
        .from("product_options")
        .select("name")
        .in("id", item.option_ids);
      label = (opts ?? []).map((o) => o.name).join(", ") || label;
    }
    lines.push({
      label,
      qty: item.quantity,
      unit: Number(item.unit_price),
      total: Number(item.line_total),
    });
  }

  const store = order.stores as unknown as {
    name: string;
    address: string;
    phone: string | null;
  } | null;
  const customer = order.customer_profiles as unknown as {
    full_name: string | null;
    phone: string;
  } | null;
  const address = order.customer_addresses as unknown as {
    label: string | null;
    address_line: string;
    pincode: string;
  } | null;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receipt ${esc(order.order_number)} · Aeden Fresh</title>
<style>
  :root { --navy:#162D20; --red:#83B13E; --leaf:#237049; --cream:#F9F7F1; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background:var(--cream); color:var(--navy); padding:32px 16px; }
  .sheet { max-width:640px; margin:0 auto; background:#fff; border-radius:16px; padding:40px; box-shadow:0 24px 48px -12px rgba(16,24,40,.16); }
  .brand { font-family: Georgia, serif; font-size:28px; font-weight:600; }
  .brand span { color:var(--leaf); }
  .muted { color:#6b7280; font-size:12px; }
  .row { display:flex; justify-content:space-between; gap:16px; }
  .rule { height:1px; background:linear-gradient(90deg,transparent,#c9a25c99,transparent); margin:24px 0; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#6b7280; padding:8px 0; border-bottom:1px solid #e5e7eb; }
  td { padding:10px 0; border-bottom:1px solid #f3f4f6; vertical-align:top; }
  td.num, th.num { text-align:right; white-space:nowrap; }
  .totals td { border:none; padding:4px 0; }
  .grand { font-family: Georgia, serif; font-size:22px; color:var(--red); }
  .badge { display:inline-block; background:#2370491a; color:var(--leaf); font-size:11px; font-weight:600; padding:4px 10px; border-radius:99px; text-transform:uppercase; letter-spacing:.08em; }
  @media print { body { background:#fff; padding:0 } .sheet { box-shadow:none } }
</style>
</head>
<body>
<div class="sheet">
  <div class="row" style="align-items:flex-start">
    <div>
      <img src="/logo-dark.png" alt="aeden fresh" style="height:34px;width:auto;margin-bottom:6px" />
      <p class="muted">Fresh, delivered daily · Kochi, Kerala</p>
    </div>
    <div style="text-align:right">
      <p style="font-weight:600">${esc(order.order_number)}</p>
      <p class="muted">${esc(new Date(order.created_at as string).toDateString())}</p>
      <p style="margin-top:6px"><span class="badge">${esc(order.status)}</span></p>
    </div>
  </div>
  <div class="rule"></div>
  <div class="row">
    <div>
      <p class="muted" style="margin-bottom:4px">BILLED TO</p>
      <p style="font-weight:600">${esc(customer?.full_name || customer?.phone || "Customer")}</p>
      ${address ? `<p class="muted">${esc(address.address_line)}, ${esc(address.pincode)}</p>` : ""}
    </div>
    <div style="text-align:right">
      <p class="muted" style="margin-bottom:4px">FULFILLED BY</p>
      <p style="font-weight:600">${esc(store?.name ?? "Aeden Fresh")}</p>
      <p class="muted">${esc(store?.address ?? "")}</p>
    </div>
  </div>
  <div class="rule"></div>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
    <tbody>
      ${lines
        .map(
          (l) =>
            `<tr><td>${esc(l.label)}</td><td class="num">${l.qty}</td><td class="num">${inr(l.unit)}</td><td class="num">${inr(l.total)}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
  <table class="totals" style="margin-top:16px">
    <tr><td></td><td class="num muted" style="width:140px">Subtotal</td><td class="num" style="width:100px">${inr(Number(order.subtotal))}</td></tr>
    <tr><td></td><td class="num muted">Delivery</td><td class="num">${inr(Number(order.delivery_fee))}</td></tr>
    ${Number(order.discount) > 0 ? `<tr><td></td><td class="num muted">Discount${order.coupon_code ? ` (${esc(order.coupon_code)})` : ""}</td><td class="num">−${inr(Number(order.discount))}</td></tr>` : ""}
    <tr><td></td><td class="num" style="font-weight:600;padding-top:10px">Total</td><td class="num grand" style="padding-top:10px">${inr(Number(order.total))}</td></tr>
  </table>
  <div class="rule"></div>
  <p class="muted" style="text-align:center">Thank you for eating fresh. 🥗 — Aeden Fresh (formerly Greens Angaadi)</p>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
