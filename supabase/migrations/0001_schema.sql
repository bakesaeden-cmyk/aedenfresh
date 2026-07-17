-- ============================================================
-- Aeden Fresh — Digital Fresh-Commerce Platform
-- Migration 0001: core schema (build spec §4)
-- ============================================================

create extension if not exists pgcrypto;

-- ── Stores & Geography ──────────────────────────────
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  pincode text not null,
  latitude numeric,
  longitude numeric,
  phone text,
  is_active boolean default true,
  operating_hours jsonb, -- {mon: {open, close}, ...}
  created_at timestamptz default now()
);

create table store_pincode_coverage (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  pincode text not null,
  delivery_fee numeric default 0,
  is_active boolean default true
);
create index idx_pincode_coverage on store_pincode_coverage(pincode);

-- ── Customers ────────────────────────────────────────
-- customer_profiles extends Supabase auth.users
create table customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text unique not null, -- WhatsApp identity key
  whatsapp_opted_in boolean default true,
  dietary_tags text[], -- ['vegan','gluten_free','low_carb']
  nutrition_goal text, -- 'weight_loss' | 'muscle_gain' | 'maintenance' | null
  referral_source text,
  created_at timestamptz default now()
);

-- Auto-create a customer profile when a user signs up via phone OTP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.phone is not null then
    insert into public.customer_profiles (id, phone)
    values (new.id, new.phone)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_profiles(id) on delete cascade,
  label text, -- 'Home','Office'
  address_line text not null,
  pincode text not null,
  latitude numeric,
  longitude numeric,
  is_default boolean default false
);
create index idx_addresses_customer on customer_addresses(customer_id);

-- ── Product Catalogue (customisation engine) ────────
create table product_categories (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('base','protein','dressing','topping','addon','portion')),
  name text not null,
  display_order int default 0,
  -- max free selections for multi-select categories (spec §5.2);
  -- null = single-select category
  max_free_selections int
);

create table product_options (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references product_categories(id) on delete cascade,
  name text not null,
  price_delta numeric default 0, -- added to base price
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  image_url text,
  is_active boolean default true,
  allergens text[]
);
create index idx_options_category on product_options(category_id);

create table store_inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade,
  product_option_id uuid references product_options(id) on delete cascade,
  stock_qty int, -- null = unlimited/made-to-order
  is_available boolean default true,
  updated_at timestamptz default now(),
  unique(store_id, product_option_id)
);

-- ── Curated baskets (pre-built, non-customisable) ───
create table curated_baskets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_price numeric not null,
  image_url text,
  nutrition_summary jsonb,
  is_active boolean default true
);

-- ── Saved customer combos ───────────────────────────
create table saved_combos (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_profiles(id) on delete cascade,
  name text, -- customer-given or auto 'My Salad #1'
  combo_type text check (combo_type in ('salad','basket')),
  option_ids uuid[], -- array of product_options.id
  curated_basket_id uuid references curated_baskets(id),
  portion_size text,
  order_count int default 0, -- for "favourite/repeat order" logic
  last_ordered_at timestamptz,
  created_at timestamptz default now()
);
create index idx_combos_customer on saved_combos(customer_id);

-- ── Delivery slots (before subscriptions, which reference them) ──
create table delivery_slots (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id),
  start_time time,
  end_time time,
  max_orders int,
  is_active boolean default true
);

-- ── Subscriptions ────────────────────────────────────
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_profiles(id) on delete cascade,
  saved_combo_id uuid references saved_combos(id),
  store_id uuid references stores(id),
  address_id uuid references customer_addresses(id),
  frequency text check (frequency in ('daily','weekly','alternate_days','custom')),
  custom_days text[], -- ['mon','wed','fri'] if frequency='custom'
  delivery_slot_id uuid references delivery_slots(id),
  status text check (status in ('active','paused','cancelled')) default 'active',
  next_delivery_date date,
  paused_until date,
  razorpay_subscription_id text,
  created_at timestamptz default now()
);
create index idx_subs_customer on subscriptions(customer_id);
create index idx_subs_next_delivery on subscriptions(next_delivery_date) where status = 'active';

-- ── Orders ───────────────────────────────────────────
create sequence order_number_seq;

create or replace function public.generate_order_number()
returns text
language sql
as $$
  select 'AF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('order_number_seq')::text, 5, '0');
$$;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default public.generate_order_number(),
  customer_id uuid references customer_profiles(id),
  subscription_id uuid references subscriptions(id), -- null if one-time
  store_id uuid references stores(id) not null,
  address_id uuid references customer_addresses(id),
  delivery_slot_id uuid references delivery_slots(id),
  order_type text check (order_type in ('one_time','subscription')),
  channel text check (channel in ('web','whatsapp','admin')),
  status text check (status in
    ('pending_payment','confirmed','preparing','out_for_delivery','delivered','cancelled','failed')
  ) default 'pending_payment',
  subtotal numeric not null,
  delivery_fee numeric default 0,
  discount numeric default 0,
  total numeric not null,
  coupon_code text,
  scheduled_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_orders_customer on orders(customer_id);
create index idx_orders_store on orders(store_id);
create index idx_orders_status on orders(status);
-- Idempotency guard for the daily renewal job (spec §7):
-- one subscription can generate at most one order per scheduled date.
create unique index idx_orders_subscription_date
  on orders(subscription_id, scheduled_date)
  where subscription_id is not null;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger orders_touch_updated_at
  before update on orders
  for each row execute function public.touch_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  saved_combo_id uuid references saved_combos(id),
  curated_basket_id uuid references curated_baskets(id),
  option_ids uuid[],
  quantity int default 1,
  unit_price numeric not null,
  line_total numeric not null
);
create index idx_order_items_order on order_items(order_id);

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  status text not null,
  note text,
  changed_at timestamptz default now()
);
create index idx_status_history_order on order_status_history(order_id);

-- Log every order status transition automatically
create or replace function public.log_order_status()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into order_status_history (order_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;
create trigger orders_log_status
  after insert or update on orders
  for each row execute function public.log_order_status();

-- ── Payments ─────────────────────────────────────────
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  subscription_id uuid references subscriptions(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric not null,
  status text check (status in ('created','authorized','captured','failed','refunded')),
  method text, -- 'upi','card','wallet'
  raw_payload jsonb,
  created_at timestamptz default now()
);
create index idx_payments_order on payments(order_id);
create index idx_payments_rzp_order on payments(razorpay_order_id);

-- ── Coupons ──────────────────────────────────────────
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text check (discount_type in ('flat','percent')),
  discount_value numeric,
  min_order_value numeric default 0,
  max_uses int,
  used_count int default 0,
  valid_from date,
  valid_until date,
  is_active boolean default true
);

-- ── WhatsApp / conversation state ───────────────────
create table whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  customer_id uuid references customer_profiles(id),
  state text not null default 'idle', -- 'idle','browsing','customising','cart','checkout','awaiting_payment','support'
  context jsonb default '{}'::jsonb, -- in-progress combo selections, cart contents, etc.
  last_message_at timestamptz default now()
);
create index idx_wa_sessions_phone on whatsapp_sessions(phone);

create table whatsapp_messages_log (
  id uuid primary key default gen_random_uuid(),
  phone text,
  direction text check (direction in ('inbound','outbound')),
  message_type text, -- 'text','interactive','template'
  content jsonb,
  created_at timestamptz default now()
);

-- ── Notifications ────────────────────────────────────
create table notifications_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customer_profiles(id),
  channel text check (channel in ('whatsapp','sms','email','push')),
  type text, -- 'renewal_reminder','abandoned_cart','delivery_update','birthday','failed_payment'
  status text check (status in ('queued','sent','failed')),
  sent_at timestamptz default now()
);

-- ── Admin ────────────────────────────────────────────
create table admin_users (
  id uuid primary key references auth.users(id),
  role text check (role in ('super_admin','store_manager','ops','support')),
  store_id uuid references stores(id), -- null for super_admin/ops (all stores)
  created_at timestamptz default now()
);

-- ── Analytics (event stream, lightweight) ───────────
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  event_name text, -- 'combo_built','cart_abandoned','subscription_started','order_placed'
  properties jsonb,
  created_at timestamptz default now()
);
create index idx_events_name on analytics_events(event_name);
