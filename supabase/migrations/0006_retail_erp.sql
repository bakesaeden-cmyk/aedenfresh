-- ============================================================
-- Aeden Fresh — Migration 0006: retail commerce + ERP inventory
-- ============================================================

do $$
begin
  if to_regclass('public.stores') is null
     or to_regclass('public.orders') is null
     or to_regclass('public.order_items') is null then
    raise exception 'Aeden base schema is missing. Run migrations 0001 through 0005 in order, then rerun 0006.';
  end if;
end;
$$;

alter table stores add column if not exists erp_store_code text;
alter table stores add column if not exists whatsapp_phone text;
create unique index if not exists idx_stores_erp_code
  on stores(erp_store_code) where erp_store_code is not null;

update stores set erp_store_code = case id
  when 'aaaaaaaa-0000-4000-8000-000000000001' then 'KAD'
  when 'aaaaaaaa-0000-4000-8000-000000000002' then 'KAC'
  when 'aaaaaaaa-0000-4000-8000-000000000003' then 'TRI'
  when 'aaaaaaaa-0000-4000-8000-000000000004' then 'KAK'
  when 'aaaaaaaa-0000-4000-8000-000000000005' then 'UNI'
  else erp_store_code end
where erp_store_code is null;

create table if not exists retail_categories (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  slug text unique not null,
  name text not null,
  description text,
  image_url text,
  display_order int default 0,
  is_active boolean default true,
  updated_at timestamptz default now()
);

create table if not exists retail_products (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  sku text unique not null,
  category_id uuid references retail_categories(id),
  name text not null,
  description text,
  unit_label text not null default '1 unit',
  selling_price numeric(12,2) not null check (selling_price >= 0),
  compare_at_price numeric(12,2),
  tax_rate numeric(5,2) default 0,
  image_url text,
  tags text[] default '{}',
  is_active boolean default true,
  erp_payload jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
create index if not exists idx_retail_products_category on retail_products(category_id);
create index if not exists idx_retail_products_active on retail_products(is_active);

create table if not exists retail_inventory (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) on delete cascade not null,
  retail_product_id uuid references retail_products(id) on delete cascade not null,
  stock_qty numeric(12,3) not null default 0,
  reserved_qty numeric(12,3) not null default 0 check (reserved_qty >= 0),
  selling_price numeric(12,2),
  is_available boolean default true,
  external_updated_at timestamptz,
  updated_at timestamptz default now(),
  unique(store_id, retail_product_id)
);
create index if not exists idx_retail_inventory_store on retail_inventory(store_id);

create table if not exists retail_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  store_id uuid references stores(id) not null,
  retail_product_id uuid references retail_products(id) not null,
  quantity numeric(12,3) not null check (quantity > 0),
  status text not null check (status in ('reserved','committed','released')) default 'reserved',
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  created_at timestamptz default now(),
  unique(order_id, retail_product_id)
);
create index if not exists idx_retail_reservations_expiry
  on retail_inventory_reservations(expires_at) where status = 'reserved';

create table if not exists erp_sync_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running','completed','failed')),
  source text default 'erp',
  products_synced int default 0,
  inventory_rows_synced int default 0,
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz
);

alter table order_items add column if not exists retail_product_id uuid references retail_products(id);
alter table order_items add column if not exists product_name_snapshot text;
alter table order_items add column if not exists sku_snapshot text;
alter table order_items add column if not exists unit_label_snapshot text;
create index if not exists idx_order_items_retail_product on order_items(retail_product_id);

alter table orders add column if not exists erp_order_id text;
alter table orders add column if not exists erp_exported_at timestamptz;
alter table orders add column if not exists erp_export_error text;

alter table notifications_log add column if not exists order_id uuid references orders(id) on delete cascade;
create unique index if not exists idx_notifications_order_type_channel
  on notifications_log(order_id, type, channel) where order_id is not null;

drop trigger if exists retail_categories_touch_updated_at on retail_categories;
create trigger retail_categories_touch_updated_at before update on retail_categories
  for each row execute function public.touch_updated_at();
drop trigger if exists retail_products_touch_updated_at on retail_products;
create trigger retail_products_touch_updated_at before update on retail_products
  for each row execute function public.touch_updated_at();
drop trigger if exists retail_inventory_touch_updated_at on retail_inventory;
create trigger retail_inventory_touch_updated_at before update on retail_inventory
  for each row execute function public.touch_updated_at();

alter table retail_categories enable row level security;
alter table retail_products enable row level security;
alter table retail_inventory enable row level security;
alter table retail_inventory_reservations enable row level security;
alter table erp_sync_runs enable row level security;

drop policy if exists "public read retail categories" on retail_categories;
create policy "public read retail categories" on retail_categories
  for select using (is_active = true);
drop policy if exists "admin write retail categories" on retail_categories;
create policy "admin write retail categories" on retail_categories
  for all using (is_super_or_ops()) with check (is_super_or_ops());
drop policy if exists "public read retail products" on retail_products;
create policy "public read retail products" on retail_products
  for select using (is_active = true);
drop policy if exists "admin write retail products" on retail_products;
create policy "admin write retail products" on retail_products
  for all using (is_super_or_ops()) with check (is_super_or_ops());
drop policy if exists "public read retail inventory" on retail_inventory;
create policy "public read retail inventory" on retail_inventory
  for select using (true);
drop policy if exists "admin write retail inventory" on retail_inventory;
create policy "admin write retail inventory" on retail_inventory
  for all using (admin_can_access_store(store_id)) with check (admin_can_access_store(store_id));
drop policy if exists "admin read erp sync runs" on erp_sync_runs;
create policy "admin read erp sync runs" on erp_sync_runs
  for select using (is_super_or_ops());

-- Reserve all retail lines in one transaction. A single unavailable line
-- rolls back the full reservation so checkout can never partially reserve.
create or replace function public.reserve_retail_inventory(
  order_id_in uuid,
  store_id_in uuid,
  items_in jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_id uuid;
  requested numeric;
  changed int;
begin
  for item in select * from jsonb_array_elements(items_in)
  loop
    product_id := (item->>'product_id')::uuid;
    requested := (item->>'quantity')::numeric;
    if requested <= 0 then raise exception 'invalid_retail_quantity'; end if;

    update retail_inventory
      set reserved_qty = reserved_qty + requested
      where store_id = store_id_in
        and retail_product_id = product_id
        and is_available = true
        and stock_qty - reserved_qty >= requested;
    get diagnostics changed = row_count;
    if changed <> 1 then
      raise exception 'retail_out_of_stock:%', product_id;
    end if;

    insert into retail_inventory_reservations
      (order_id, store_id, retail_product_id, quantity)
    values (order_id_in, store_id_in, product_id, requested);
  end loop;
end;
$$;

create or replace function public.commit_retail_inventory(order_id_in uuid)
returns void language plpgsql security definer set search_path = public as $$
declare reservation record;
begin
  for reservation in
    select * from retail_inventory_reservations
    where order_id = order_id_in and status = 'reserved' for update
  loop
    update retail_inventory
      set stock_qty = greatest(0, stock_qty - reservation.quantity),
          reserved_qty = greatest(0, reserved_qty - reservation.quantity)
      where store_id = reservation.store_id
        and retail_product_id = reservation.retail_product_id;
    update retail_inventory_reservations set status = 'committed'
      where id = reservation.id;
  end loop;
end;
$$;

create or replace function public.release_retail_inventory(order_id_in uuid)
returns void language plpgsql security definer set search_path = public as $$
declare reservation record;
begin
  for reservation in
    select * from retail_inventory_reservations
    where order_id = order_id_in and status = 'reserved' for update
  loop
    update retail_inventory
      set reserved_qty = greatest(0, reserved_qty - reservation.quantity)
      where store_id = reservation.store_id
        and retail_product_id = reservation.retail_product_id;
    update retail_inventory_reservations set status = 'released'
      where id = reservation.id;
  end loop;
end;
$$;

revoke execute on function public.reserve_retail_inventory(uuid, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.commit_retail_inventory(uuid) from public, anon, authenticated;
revoke execute on function public.release_retail_inventory(uuid) from public, anon, authenticated;

-- Premium starter catalogue. ERP upserts these rows by external_id/SKU.
insert into retail_categories (id, external_id, slug, name, description, display_order) values
  ('11111111-0000-4000-8000-000000000001','fruit','fruits','Fruits','Imported icons and Indian favourites, selected daily.',1),
  ('11111111-0000-4000-8000-000000000002','vegetable','vegetables','Vegetables','Crisp staples and speciality greens.',2),
  ('11111111-0000-4000-8000-000000000003','bakery','bakery','Bakery','Breads and bakes made for the everyday table.',3),
  ('11111111-0000-4000-8000-000000000004','dairy','dairy','Dairy & Eggs','Premium chilled essentials.',4),
  ('11111111-0000-4000-8000-000000000005','beverage','beverages','Juices & Drinks','Cold, clean and ready to pour.',5)
on conflict (external_id) do update set name=excluded.name, description=excluded.description, display_order=excluded.display_order;

insert into retail_products
  (id, external_id, sku, category_id, name, description, unit_label, selling_price, compare_at_price, image_url, tags)
values
  ('22222222-0000-4000-8000-000000000001','pink-lady-apple','AF-FR-001','11111111-0000-4000-8000-000000000001','Pink Lady® Apples','Crisp, rosy and naturally balanced between sweetness and acidity.','4 pcs',329,369,'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=900&q=85&auto=format&fit=crop','{imported,bestseller}'),
  ('22222222-0000-4000-8000-000000000002','shine-muscat','AF-FR-002','11111111-0000-4000-8000-000000000001','Shine Muscat Grapes','Fragrant, seedless Japanese-style grapes with a clean snap.','400 g',899,999,'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=900&q=85&auto=format&fit=crop','{imported,premium}'),
  ('22222222-0000-4000-8000-000000000003','sungold-kiwi','AF-FR-003','11111111-0000-4000-8000-000000000001','Zespri® SunGold Kiwi','Silky golden flesh with tropical sweetness and bright vitamin C.','3 pcs',279,319,'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=900&q=85&auto=format&fit=crop','{imported}'),
  ('22222222-0000-4000-8000-000000000004','blueberries','AF-FR-004','11111111-0000-4000-8000-000000000001','Driscoll’s® Blueberries','Plump premium berries, cold-chain handled for freshness.','125 g',349,null,'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=900&q=85&auto=format&fit=crop','{imported,antioxidant}'),
  ('22222222-0000-4000-8000-000000000005','alphonso-mango','AF-FR-005','11111111-0000-4000-8000-000000000001','Ratnagiri Alphonso Mango','Origin-sourced, aromatic and deeply golden seasonal mangoes.','2 pcs',399,449,'https://images.unsplash.com/photo-1553279768-865429fa0078?w=900&q=85&auto=format&fit=crop','{indian,seasonal}'),
  ('22222222-0000-4000-8000-000000000006','nendran-banana','AF-FR-006','11111111-0000-4000-8000-000000000001','Kerala Nendran Banana','A Kerala staple selected for flavour, body and even ripening.','500 g',69,null,'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=900&q=85&auto=format&fit=crop','{local}'),
  ('22222222-0000-4000-8000-000000000007','broccoli','AF-VE-001','11111111-0000-4000-8000-000000000002','Highland Broccoli','Dense, crisp crowns sourced from cool-climate farms.','1 pc',129,149,'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=900&q=85&auto=format&fit=crop','{fresh}'),
  ('22222222-0000-4000-8000-000000000008','cherry-tomato','AF-VE-002','11111111-0000-4000-8000-000000000002','Cherry Tomatoes','Sweet, firm and colourful—ideal for salads and quick cooking.','250 g',99,null,'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=900&q=85&auto=format&fit=crop','{fresh}'),
  ('22222222-0000-4000-8000-000000000009','romaine','AF-VE-003','11111111-0000-4000-8000-000000000002','Romaine Lettuce','Cool, crunchy hearts with clean flavour and excellent shelf life.','1 head',119,null,'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=900&q=85&auto=format&fit=crop','{fresh,salad}'),
  ('22222222-0000-4000-8000-000000000010','avocado','AF-FR-007','11111111-0000-4000-8000-000000000001','Hass Avocado','Creamy, ready-to-ripen fruit selected for consistent quality.','2 pcs',289,329,'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=900&q=85&auto=format&fit=crop','{imported}'),
  ('22222222-0000-4000-8000-000000000011','sourdough','AF-BA-001','11111111-0000-4000-8000-000000000003','Aeden Country Sourdough','Slow-fermented loaf with a burnished crust and open crumb.','500 g loaf',189,null,'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=85&auto=format&fit=crop','{bakery}'),
  ('22222222-0000-4000-8000-000000000012','croissant','AF-BA-002','11111111-0000-4000-8000-000000000003','Butter Croissants','Flaky, deeply layered and baked fresh for the morning shelf.','2 pcs',159,null,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=900&q=85&auto=format&fit=crop','{bakery}'),
  ('22222222-0000-4000-8000-000000000013','greek-yogurt','AF-DA-001','11111111-0000-4000-8000-000000000004','Natural Greek Yogurt','Thick, cultured yogurt with no unnecessary sweetness.','400 g',179,199,'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=85&auto=format&fit=crop','{chilled,protein}'),
  ('22222222-0000-4000-8000-000000000014','free-range-eggs','AF-DA-002','11111111-0000-4000-8000-000000000004','Free-range Eggs','Carefully packed everyday eggs with rich golden yolks.','6 pcs',109,null,'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=900&q=85&auto=format&fit=crop','{chilled}'),
  ('22222222-0000-4000-8000-000000000015','orange-juice','AF-BE-001','11111111-0000-4000-8000-000000000005','Cold-pressed Orange','Bright citrus pressed in small batches with no added sugar.','300 ml',149,null,'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=900&q=85&auto=format&fit=crop','{cold-pressed}'),
  ('22222222-0000-4000-8000-000000000016','green-juice','AF-BE-002','11111111-0000-4000-8000-000000000005','Daily Green Juice','Cucumber, apple, spinach and lime—cold pressed and clean.','300 ml',169,null,'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=900&q=85&auto=format&fit=crop','{cold-pressed}'),
  ('22222222-0000-4000-8000-000000000017','dragon-fruit','AF-FR-008','11111111-0000-4000-8000-000000000001','Vietnamese Dragon Fruit','Mildly sweet, refreshing and strikingly beautiful.','1 pc',219,null,'https://images.unsplash.com/photo-1527325678964-54921661f888?w=900&q=85&auto=format&fit=crop','{imported}'),
  ('22222222-0000-4000-8000-000000000018','pomegranate','AF-FR-009','11111111-0000-4000-8000-000000000001','Nashik Pomegranate','Ruby arils, crisp bite and deep natural sweetness.','2 pcs',199,null,'https://images.unsplash.com/photo-1541344999736-83eca272f6fc?w=900&q=85&auto=format&fit=crop','{indian}')
on conflict (external_id) do update set
  sku=excluded.sku, category_id=excluded.category_id, name=excluded.name,
  description=excluded.description, unit_label=excluded.unit_label,
  selling_price=excluded.selling_price, compare_at_price=excluded.compare_at_price,
  image_url=excluded.image_url, tags=excluded.tags, is_active=true;

insert into retail_inventory (store_id, retail_product_id, stock_qty, reserved_qty, is_available)
select s.id, p.id,
  case when 'seasonal' = any(p.tags) then 8 else 24 end,
  0, true
from stores s cross join retail_products p
where s.is_active = true
on conflict (store_id, retail_product_id) do nothing;
