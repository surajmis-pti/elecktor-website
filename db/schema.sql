-- =====================================================================
-- ELECKTOR INDUSTRIES – website database (PostgreSQL / Supabase)
-- Supabase > SQL Editor mein ye poora file ek baar Run karo.
-- Dobara chalane par bhi safe hai (IF NOT EXISTS).
-- =====================================================================

-- ---------- products ----------
create table if not exists products (
  id           text primary key,                 -- product code, e.g. EL-3P-PVC
  name         text not null,
  category     text not null default '',
  short        text not null default '',
  description  text not null default '',
  cores        text not null default '',
  rating       text not null default '',
  conductor    text not null default '',
  sheath       text not null default '',
  colour       text not null default '',
  application  text not null default '',
  packing      text not null default '',
  moq          integer not null default 0,
  unit         text not null default 'pcs',
  pins         text not null default '3',
  image_url    text not null default '',
  active       boolean not null default true,
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists product_variants (
  id          bigserial primary key,
  product_id  text not null references products(id) on delete cascade on update cascade,
  label       text not null,                     -- e.g. "2 m", "2.5 yard"
  price       numeric(10,2) not null default 0,  -- per piece, incl. GST
  sort        integer not null default 0
);
create index if not exists product_variants_product_idx on product_variants(product_id);

-- ---------- orders ----------
create sequence if not exists order_no_seq start 1001;

create table if not exists orders (
  id            bigserial primary key,
  order_no      text not null unique default ('ELK-' || nextval('order_no_seq')),
  status        text not null default 'New'
                check (status in ('New','Confirmed','Rejected','Dispatched','Completed')),
  cust_name     text not null,
  cust_firm     text not null default '',
  cust_phone    text not null,
  cust_email    text not null default '',
  cust_gst      text not null default '',
  cust_city     text not null default '',
  cust_state    text not null default '',
  cust_address  text not null default '',
  cust_notes    text not null default '',
  est_total     numeric(12,2) not null default 0,
  final_amount  numeric(12,2),
  public_note   text not null default '',        -- customer ko Track Order mein dikhta hai
  admin_note    text not null default '',        -- sirf admin
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_phone_idx on orders(cust_phone);

create table if not exists order_items (
  id            bigserial primary key,
  order_id      bigint not null references orders(id) on delete cascade,
  product_id    text,
  product_name  text not null,
  variant       text not null default '',
  rate          numeric(10,2) not null default 0,
  qty           integer not null check (qty > 0),
  amount        numeric(12,2) not null default 0
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists order_status_history (
  id          bigserial primary key,
  order_id    bigint not null references orders(id) on delete cascade,
  status      text not null,
  note        text not null default '',
  by_admin    text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists order_history_order_idx on order_status_history(order_id);

-- ---------- enquiries ----------
create table if not exists enquiries (
  id          bigserial primary key,
  name        text not null,
  firm        text not null default '',
  phone       text not null,
  email       text not null default '',
  city        text not null default '',
  type        text not null default '',
  message     text not null default '',
  status      text not null default 'New' check (status in ('New','Contacted','Closed')),
  created_at  timestamptz not null default now()
);

-- ---------- admin users ----------
create table if not exists admins (
  id             bigserial primary key,
  email          text not null unique,
  name           text not null default '',
  password_hash  text not null,
  created_at     timestamptz not null default now()
);

create table if not exists login_attempts (
  id          bigserial primary key,
  email       text not null,
  ok          boolean not null,
  created_at  timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on login_attempts(email, created_at);

-- Website ke tables ko sirf Node API (server) chhoota hai; browser se direct access band.
alter table products              enable row level security;
alter table product_variants      enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table order_status_history  enable row level security;
alter table enquiries             enable row level security;
alter table admins                enable row level security;
alter table login_attempts        enable row level security;

-- ---------- starting products (sirf tab jab table khaali ho) ----------
insert into products (id, name, category, short, description, cores, rating, conductor, sheath, colour, application, packing, moq, unit, pins, sort)
select * from (values
  ('EL-3P-PVC', '3 Pin PVC Power Cord', 'PVC Power Cords', '3 core · 6A · White PVC sheath',
   'ELECKTOR 3 pin PVC power cord for household and office appliances. 3 core, 6A rated, white PVC sheath. Each cord is individually pouch-packed with ELECKTOR branding, ready for retail counters.',
   '3', '6A', '23/38 (L 23 + N 23 + E 10)', 'PVC', 'White', 'Household & office appliances', 'Single pouch per piece · 10 pcs per pouch · 400 pcs per sack', 400, 'pcs', '3', 1),
  ('EL-2P-PVC', '2 Pin PVC Power Cord', 'PVC Power Cords', '2 core flat · 6A · White',
   'ELECKTOR 2 pin flat PVC power cord, 2 core, 6A rated, white. Suitable for small appliances and electrical shop retail. Each piece pouch-packed with ELECKTOR branding.',
   '2', '6A', '14/38 Flat', 'PVC, flat', 'White', 'Small appliances, retail counters', 'Single pouch per piece · 10 pcs per pouch · 600 pcs per sack', 600, 'pcs', '2', 2),
  ('EL-3P-BRAID', '3 Pin Cotton Braided Power Cord (Iron / Heater)', 'Cotton Braided Cords', '3 core · 6A · Ring terminals',
   'ELECKTOR 3 pin cotton braided power cord with ring terminals, made for electric irons and heaters. 3 core, 6A rated, heat-friendly cotton braided outer.',
   '3', '6A', '16/36 (16 + 16 + 8)', 'Cotton braided', 'Braided', 'Electric iron, room heater', 'Single pouch per piece · 10 pcs per pouch · 400 pcs per sack', 400, 'pcs', '3', 3)
) v
where not exists (select 1 from products);

insert into product_variants (product_id, label, price, sort)
select * from (values
  ('EL-3P-PVC','2 m',71.26,1),('EL-3P-PVC','2.5 yard',80.17,2),('EL-3P-PVC','3 m',92.54,3),
  ('EL-2P-PVC','2 m',39.70,1),('EL-2P-PVC','2.5 yard',44.17,2),('EL-2P-PVC','3 m',50.37,3),
  ('EL-3P-BRAID','2 m',76.44,1),('EL-3P-BRAID','2.5 yard',85.81,2),('EL-3P-BRAID','3 m',98.82,3)
) v(product_id, label, price, sort)
where not exists (select 1 from product_variants);

-- ---------- product photos bucket (sirf Supabase par; local Postgres par skip) ----------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public) values ('products', 'products', true)
    on conflict (id) do nothing;
  end if;
end $$;
