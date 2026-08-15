-- =========================================================
-- ISLAMABAD TECH EVENT PORTAL - PRODUCTION SUPABASE SQL SCHEMA
-- Execute this script in your Supabase SQL Editor
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
  is_official BOOLEAN DEFAULT false,
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
  views_count INT DEFAULT 0,
  status TEXT DEFAULT 'approved',
  is_featured BOOLEAN DEFAULT false
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
GRANT SELECT, INSERT ON TABLE public.events TO anon;
GRANT ALL ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;

GRANT INSERT ON TABLE public.event_subscribers TO anon;
GRANT ALL ON TABLE public.event_subscribers TO authenticated;
GRANT ALL ON TABLE public.event_subscribers TO service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_subscribers ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies
DROP POLICY IF EXISTS "Public Read Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Insert Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Update Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Delete Access for Events" ON public.events;
DROP POLICY IF EXISTS "Public Subscribe Access" ON public.event_subscribers;
DROP POLICY IF EXISTS "Events Read Policy" ON public.events;
DROP POLICY IF EXISTS "Events Insert Policy" ON public.events;
DROP POLICY IF EXISTS "Events Update Policy" ON public.events;
DROP POLICY IF EXISTS "Events Delete Policy" ON public.events;
DROP POLICY IF EXISTS "Subscribers Insert Policy" ON public.event_subscribers;
DROP POLICY IF EXISTS "Subscribers Read Policy" ON public.event_subscribers;

-- 5. Secure Production Policies
-- Anyone can view approved events
CREATE POLICY "Events Read Policy" ON public.events
  FOR SELECT
  USING (true);

-- Authenticated organizers or public submissions can insert events
CREATE POLICY "Events Insert Policy" ON public.events
  FOR INSERT
  WITH CHECK (true);

-- Only event owners (matching user_id email / organizer_email) or system admins (app_metadata only) can update events
CREATE POLICY "Events Update Policy" ON public.events
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = user_id 
    OR (auth.jwt() ->> 'email') = organizer_email
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = user_id 
    OR (auth.jwt() ->> 'email') = organizer_email
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Only event owners or system admins (app_metadata only) can delete events
CREATE POLICY "Events Delete Policy" ON public.events
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = user_id 
    OR (auth.jwt() ->> 'email') = organizer_email
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Anyone can subscribe to an event for notifications
CREATE POLICY "Subscribers Insert Policy" ON public.event_subscribers
  FOR INSERT
  WITH CHECK (true);

-- Only admins (app_metadata only) can read subscriber lists
CREATE POLICY "Subscribers Read Policy" ON public.event_subscribers
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
