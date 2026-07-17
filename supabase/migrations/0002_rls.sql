-- ============================================================
-- Aeden Fresh — Migration 0002: Row-Level Security (spec §4)
--
-- Principles:
--  * Customers only touch rows where customer_id = auth.uid()
--  * store_manager admins scoped to their store_id; super_admin/ops see all
--  * Catalogue tables: public read, admin-only write
--  * payments: service_role only (no client policies at all)
-- ============================================================

-- ── Helper functions (security definer avoids recursive RLS
--    when policies on other tables consult admin_users) ─────
create or replace function public.admin_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from admin_users where id = auth.uid();
$$;

create or replace function public.admin_store_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select store_id from admin_users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from admin_users where id = auth.uid());
$$;

create or replace function public.is_super_or_ops()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid() and role in ('super_admin','ops')
  );
$$;

-- Convenience predicate: admin may act on rows for a given store
create or replace function public.admin_can_access_store(target_store uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users
    where id = auth.uid()
      and (role in ('super_admin','ops','support') or store_id = target_store)
  );
$$;

-- ── Enable RLS everywhere ───────────────────────────
alter table stores enable row level security;
alter table store_pincode_coverage enable row level security;
alter table customer_profiles enable row level security;
alter table customer_addresses enable row level security;
alter table product_categories enable row level security;
alter table product_options enable row level security;
alter table store_inventory enable row level security;
alter table curated_baskets enable row level security;
alter table saved_combos enable row level security;
alter table delivery_slots enable row level security;
alter table subscriptions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table payments enable row level security;
alter table coupons enable row level security;
alter table whatsapp_sessions enable row level security;
alter table whatsapp_messages_log enable row level security;
alter table notifications_log enable row level security;
alter table admin_users enable row level security;
alter table analytics_events enable row level security;

-- ── Public-read catalogue ───────────────────────────
create policy "public read stores" on stores
  for select using (is_active = true);
create policy "admin write stores" on stores
  for all using (is_super_or_ops()) with check (is_super_or_ops());

create policy "public read pincode coverage" on store_pincode_coverage
  for select using (is_active = true);
create policy "admin write pincode coverage" on store_pincode_coverage
  for all using (is_super_or_ops()) with check (is_super_or_ops());

create policy "public read categories" on product_categories
  for select using (true);
create policy "admin write categories" on product_categories
  for all using (is_super_or_ops()) with check (is_super_or_ops());

create policy "public read options" on product_options
  for select using (is_active = true);
create policy "admin read all options" on product_options
  for select using (is_admin());
create policy "admin write options" on product_options
  for all using (is_super_or_ops()) with check (is_super_or_ops());

create policy "public read baskets" on curated_baskets
  for select using (is_active = true);
create policy "admin write baskets" on curated_baskets
  for all using (is_super_or_ops()) with check (is_super_or_ops());

create policy "public read slots" on delivery_slots
  for select using (is_active = true);
create policy "admin write slots" on delivery_slots
  for all using (admin_can_access_store(store_id)) with check (admin_can_access_store(store_id));

create policy "public read active coupons" on coupons
  for select using (is_active = true);
create policy "admin write coupons" on coupons
  for all using (is_super_or_ops()) with check (is_super_or_ops());

-- ── Store inventory: public read, store-scoped admin write ──
create policy "public read inventory" on store_inventory
  for select using (true);
create policy "admin write inventory" on store_inventory
  for all using (admin_can_access_store(store_id))
  with check (admin_can_access_store(store_id));

-- ── Customer-owned rows ─────────────────────────────
create policy "own profile read" on customer_profiles
  for select using (id = auth.uid() or is_admin());
create policy "own profile update" on customer_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on customer_profiles
  for insert with check (id = auth.uid());

create policy "own addresses" on customer_addresses
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "admin read addresses" on customer_addresses
  for select using (is_admin());

create policy "own combos" on saved_combos
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "admin read combos" on saved_combos
  for select using (is_admin());

create policy "own subscriptions" on subscriptions
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "admin read subscriptions" on subscriptions
  for select using (admin_can_access_store(store_id));

-- ── Orders: customer sees own; store_manager scoped to store ──
create policy "own orders read" on orders
  for select using (customer_id = auth.uid());
create policy "own orders insert" on orders
  for insert with check (customer_id = auth.uid());
create policy "admin orders read" on orders
  for select using (admin_can_access_store(store_id));
create policy "admin orders update" on orders
  for update using (admin_can_access_store(store_id))
  with check (admin_can_access_store(store_id));

create policy "own order items" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "own order items insert" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "admin order items read" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id and admin_can_access_store(o.store_id))
  );

create policy "own status history" on order_status_history
  for select using (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "admin status history read" on order_status_history
  for select using (
    exists (select 1 from orders o where o.id = order_id and admin_can_access_store(o.store_id))
  );

-- ── Payments: NO client policies. RLS enabled with none defined
--    means only service_role (which bypasses RLS) can touch it. ──
-- (intentionally empty)

-- ── WhatsApp state: service-role only (n8n uses service key) ──
-- (intentionally empty — RLS enabled, no policies)

-- ── Notifications log: customer can read own; writes via service role ──
create policy "own notifications read" on notifications_log
  for select using (customer_id = auth.uid());
create policy "admin notifications read" on notifications_log
  for select using (is_admin());

-- ── Admin users: super_admin manages; each admin can read self ──
create policy "read own admin row" on admin_users
  for select using (id = auth.uid());
create policy "super admin manages admins" on admin_users
  for all using (admin_role() = 'super_admin')
  with check (admin_role() = 'super_admin');

-- ── Analytics: insert-only from clients, admin read ─────────
create policy "insert events" on analytics_events
  for insert with check (true);
create policy "admin read events" on analytics_events
  for select using (is_admin());
