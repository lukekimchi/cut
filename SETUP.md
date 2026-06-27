# cut. — Setup Guide

## 1. Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, open **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your project credentials from **Settings → API**:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`

## 2. Local env

```bash
cp .env.example .env
# then fill in the two values
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 4. Deploy (Vercel / Netlify)

Set the two env vars in your hosting dashboard and deploy the `dist/` output from `npm run build`.

---

## Project structure

```
src/
  components/   AuthForm, Nav, StatCard
  hooks/        useAuth, useGoals
  lib/          supabase.ts
  pages/        Dashboard, LogEntry, Progress, Goals
  services/     logs.ts, goals.ts
  types/        index.ts
supabase/
  schema.sql    Full DB schema + RLS + triggers
```
