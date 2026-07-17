-- ============================================================
-- Aeden Fresh — Migration 0005: automation support (M6)
-- ============================================================

-- Favourite/repeat-order tracking (spec §5.10): when an order is paid,
-- bump order_count and last_ordered_at on every saved combo it contains.
-- The reorder-prompt cron and the storefront "favourites" both read these.
create or replace function public.record_combo_reorder(order_id_in uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update saved_combos sc
  set order_count = sc.order_count + 1,
      last_ordered_at = now()
  from order_items oi
  where oi.order_id = order_id_in
    and oi.saved_combo_id = sc.id;
$$;

revoke execute on function public.record_combo_reorder(uuid) from public, anon, authenticated;
