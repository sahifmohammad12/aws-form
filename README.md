# AWS SBG Member Form (Next.js + Supabase)

Routes: `/` (form), `/admin` (admin: applications, question editor, CSV/Excel export).

## Setup
1. supabase.com → New project.
2. SQL Editor → paste all of `schema.sql` → change `you@example.com` near the bottom to YOUR admin email → Run.
3. Authentication → Users → Add user → same email + password (tick "Auto confirm").
4. Copy `.env.example` to `.env.local` and fill in Project URL + anon public key (Project Settings → API).
5. `npm install` then `npm run dev` → http://localhost:3000 and /admin.
6. Deploy: push to GitHub → import in Vercel → add the same two env vars → Deploy.

More admins: insert their email into the `admins` table and create their Auth user.
The anon key is safe in the browser (Row Level Security protects data). Never use the service_role key here.
