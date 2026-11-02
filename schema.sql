-- Run this whole file once in Supabase → SQL Editor
create extension if not exists pgcrypto;

create table if not exists questions(
  id uuid primary key default gen_random_uuid(),
  team text not null default 'all' check (team in ('all','pr','tech')),
  position int not null default 100,
  key text not null,
  label text not null,
  hint text default '',
  type text not null check (type in ('text','email','tel','one','multi','long','links')),
  options jsonb default '[]',
  allow_other boolean default false,
  required boolean default true,
  placeholder text default '',
  active boolean default true
);
create table if not exists applications(
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  team text not null,
  name text, email text,
  answers jsonb not null default '{}'
);
create unique index if not exists app_email_uq on applications (lower(email));
create table if not exists admins(email text primary key);

alter table questions enable row level security;
alter table applications enable row level security;
alter table admins enable row level security;

create or replace function is_admin() returns boolean language sql security definer set search_path=public as
$$ select exists(select 1 from admins where lower(email)=lower(coalesce(auth.jwt()->>'email',''))) $$;

create policy q_read on questions for select to anon, authenticated using (active or is_admin());
create policy q_admin on questions for all to authenticated using (is_admin()) with check (is_admin());
create policy a_insert on applications for insert to anon, authenticated with check (true);
create policy a_admin on applications for all to authenticated using (is_admin()) with check (is_admin());

-- >>> CHANGE THIS to the email of the admin user you create in Authentication → Users
insert into admins values ('sahifmohammad12@gmail.com') on conflict do nothing;

insert into questions(team,position,key,label,hint,type,options,allow_other,placeholder) values
('all',10,'name','What’s your name?','Full name, the way you’d like it on your badge.','text','[]',false,'Ada Lovelace'),
('all',20,'usn','Your USN?','University seat number.','text','[]',false,'1MJ23CS000'),
('all',30,'email','Where can we reach you by email?','We’ll use this for club updates only.','email','[]',false,'you@college.edu'),
('all',40,'phone','And your phone number?','WhatsApp preferred.','tel','[]',false,'98765 43210'),
('all',50,'year','Which year are you in?','','one','["1st","2nd","3rd","4th"]',false,''),
('all',60,'branch','Your branch?','','one','["CSE","AI & ML","ISE","ECE"]',true,''),
('pr',70,'roles','What can you bring to PR?','Pick every one that fits.','multi','["Content writing","Graphic design","Video editing","Photography","Social media","Sponsor outreach","Event hosting"]',true,''),
('pr',80,'socials','Show us your corner of the internet.','All four, please.','links','["Instagram","LinkedIn","Discord","GitHub"]',false,''),
('pr',90,'exp','Anything you’ve run, made or managed before?','Clubs, pages, campaigns, events.','long','[]',false,''),
('tech',70,'stack','What’s in your toolbox?','Pick every one that fits.','multi','["Web dev","Cloud / AWS","AI / ML","App dev","Cybersecurity","DevOps","Data / Analytics"]',true,''),
('tech',75,'aws','Where are you with AWS today?','','one','["Just curious","Know the basics","Built something","Certified"]',false,''),
('tech',80,'socials','Show us your corner of the internet.','All four, please.','links','["Instagram","LinkedIn","Discord","GitHub"]',false,''),
('tech',90,'proj','Best thing you’ve built?','One project, a line or two.','long','[]',false,''),
('all',1000,'why','Last one. Why this team?','What do you want to learn, make or change?','long','[]',false,'');
