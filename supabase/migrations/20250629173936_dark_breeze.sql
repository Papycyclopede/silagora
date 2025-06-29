/*
  # Create core database schema for Souffle app

  1. New Tables
    - `profiles` - User profile information
      - `id` (uuid, primary key, references auth.users)
      - `pseudo` (text, user display name)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `souffles` - Main souffle content table
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles, nullable for simulated)
      - `content` (jsonb, souffle content data)
      - `latitude` (double precision, location)
      - `longitude` (double precision, location)
      - `created_at` (timestamp)
      - `expires_at` (timestamp)
      - `sticker` (text, sticker identifier)
      - `background_id` (text, background identifier)
      - `is_simulated` (boolean, default false)
      - `moderation` (jsonb, moderation data)
      - `language_code` (text, language)
      - `voice_id` (text, voice identifier)
      - `audio_url` (text, audio file URL)
    
    - `suspended_tickets` - Suspended ticket system
      - `id` (uuid, primary key)
      - `latitude` (double precision, location)
      - `longitude` (double precision, location)
      - `claimed_by` (uuid, references profiles, nullable)
      - `claimed_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    - Ensure proper access control

  3. Indexes
    - Add spatial indexes for location-based queries
    - Add performance indexes for common queries
*/

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create souffles table
CREATE TABLE IF NOT EXISTS souffles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  sticker text DEFAULT 'default',
  background_id text DEFAULT 'default',
  is_simulated boolean DEFAULT false,
  moderation jsonb DEFAULT '{"status": "clean", "votes": []}'::jsonb,
  language_code text DEFAULT 'fr',
  voice_id text,
  audio_url text
);

-- Create suspended_tickets table
CREATE TABLE IF NOT EXISTS suspended_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  claimed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE souffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspended_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for souffles table
CREATE POLICY "Anyone can read non-expired souffles"
  ON souffles
  FOR SELECT
  TO authenticated, anon
  USING (expires_at > now());

CREATE POLICY "Authenticated users can create souffles"
  ON souffles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own souffles"
  ON souffles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for suspended_tickets table
CREATE POLICY "Anyone can read unclaimed tickets"
  ON suspended_tickets
  FOR SELECT
  TO authenticated, anon
  USING (claimed_by IS NULL);

CREATE POLICY "Authenticated users can create tickets"
  ON suspended_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update tickets to claim them"
  ON suspended_tickets
  FOR UPDATE
  TO authenticated
  USING (claimed_by IS NULL OR auth.uid() = claimed_by);

-- Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_souffles_location 
  ON souffles USING GIST (ST_MakePoint(longitude, latitude));

CREATE INDEX IF NOT EXISTS idx_souffles_expires_at 
  ON souffles (expires_at);

CREATE INDEX IF NOT EXISTS idx_souffles_created_at 
  ON souffles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_souffles_is_simulated 
  ON souffles (is_simulated);

CREATE INDEX IF NOT EXISTS idx_suspended_tickets_location 
  ON suspended_tickets USING GIST (ST_MakePoint(longitude, latitude));

CREATE INDEX IF NOT EXISTS idx_suspended_tickets_claimed 
  ON suspended_tickets (claimed_by, claimed_at);

-- Create function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo)
  VALUES (new.id, new.raw_user_meta_data->>'pseudo');
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;