-- =========================================================
-- ISLAMABAD TECH EVENT DASHBOARD - SUPABASE SQL SCHEMA
-- Execute this script in your Supabase SQL Editor to grant permissions
-- =========================================================

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'In-Person',
  sector TEXT NOT NULL DEFAULT 'H-12 Islamabad',
  city TEXT NOT NULL DEFAULT 'Islamabad',
  organizer_name TEXT NOT NULL,
  organizer_email TEXT,
  is_official BOOLEAN DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,
  deadline DATE NOT NULL,
  description TEXT NOT NULL,
  agenda TEXT,
  prize_pool TEXT DEFAULT 'PKR 0',
  fee TEXT DEFAULT 'Free',
  banner_url TEXT,
  registration_url TEXT NOT NULL,
  user_id TEXT,
  views_count INT DEFAULT 0
);

-- 2. Create Event Subscribers Table
CREATE TABLE IF NOT EXISTS public.event_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT
);

-- 3. Grant Table Privileges to Anon & Authenticated API Roles
GRANT ALL ON TABLE public.events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.event_subscribers TO anon, authenticated, service_role;

-- 4. Enable Row Level Security & Public Access Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Insert Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Update Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Delete Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Subscribe Access" ON public.event_subscribers;

CREATE POLICY "Public Read Access for Events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public Insert Access for Events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access for Events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Public Delete Access for Events" ON public.events FOR DELETE USING (true);
CREATE POLICY "Public Subscribe Access" ON public.event_subscribers FOR INSERT WITH CHECK (true);
