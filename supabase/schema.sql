create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  location text not null,
  google_review_link text not null,
  services jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  type text not null check (type in ('qr_scan', 'review_options_view', 'google_click', 'complaint_created')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id text not null,
  service_name text not null,
  feedback text not null,
  customer_name text default '',
  customer_contact text default '',
  status text not null default 'New' check (status in ('New', 'Contacted', 'Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_created_at_idx on public.businesses(created_at desc);
create index if not exists events_business_id_idx on public.events(business_id);
create index if not exists events_type_idx on public.events(type);
create index if not exists complaints_business_id_idx on public.complaints(business_id);
create index if not exists complaints_status_idx on public.complaints(status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists complaints_set_updated_at on public.complaints;
create trigger complaints_set_updated_at
before update on public.complaints
for each row execute function public.set_updated_at();
