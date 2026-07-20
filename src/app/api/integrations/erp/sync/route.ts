import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { pullErpCatalogue, syncErpCatalogue } from "@/lib/erp";

function validSecret(received: string | null) {
  const expected = process.env.ERP_SYNC_SECRET;
  if (!expected || !received) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
/**
 * POST /api/integrations/erp/sync
 * - Empty body: pull the normalized catalogue from ERP_API_BASE_URL.
 * - JSON body: accept a normalized push payload from the ERP/iPaaS.
 */
export async function POST(request: NextRequest) {
  if (!validSecret(request.headers.get("x-erp-sync-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const raw = await request.text();
    const payload = raw.trim() ? JSON.parse(raw) : await pullErpCatalogue();
    const result = await syncErpCatalogue(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "erp_sync_failed";
    return NextResponse.json({ error: "erp_sync_failed", message }, { status: 502 });
  }
}
