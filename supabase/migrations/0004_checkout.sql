-- ============================================================
-- Aeden Fresh — Migration 0004: checkout support (M3)
-- ============================================================

-- Coupon use is burned only on payment capture (webhook), never at
-- checkout creation — abandoned checkouts must not consume uses.
create or replace function public.increment_coupon_use(coupon_code_in text)
returns void
language sql
security definer
set search_path = public
as $$
  update coupons
  set used_count = used_count + 1
  where code = coupon_code_in;
$$;

-- Only the service role may call it (payments path is server-only).
revoke execute on function public.increment_coupon_use(text) from public, anon, authenticated;
