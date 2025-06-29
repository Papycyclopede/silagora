-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pseudo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_master boolean DEFAULT false,
  premium_access boolean DEFAULT false,
  unlimited_tickets boolean DEFAULT false,
  ticket_count integer DEFAULT 0,
  premium_usage_credits integer DEFAULT 0,
  moderation_score integer DEFAULT 0,
  moderation_level text DEFAULT 'new',
  owned_backgrounds text[] DEFAULT '{}'
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
ALTER TABLE spatial_ref_sys ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE souffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspended_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for souffles table
DROP POLICY IF EXISTS "Anyone can read non-expired souffles" ON souffles;
CREATE POLICY "Anyone can read non-expired souffles"
  ON souffles
  FOR SELECT
  TO authenticated, anon
  USING (expires_at > now());

DROP POLICY IF EXISTS "Authenticated users can create souffles" ON souffles;
CREATE POLICY "Authenticated users can create souffles"
  ON souffles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can update own souffles" ON souffles;
CREATE POLICY "Users can update own souffles"
  ON souffles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for suspended_tickets table
DROP POLICY IF EXISTS "Anyone can read unclaimed tickets" ON suspended_tickets;
CREATE POLICY "Anyone can read unclaimed tickets"
  ON suspended_tickets
  FOR SELECT
  TO authenticated, anon
  USING (claimed_by IS NULL);

DROP POLICY IF EXISTS "Authenticated users can create tickets" ON suspended_tickets;
CREATE POLICY "Authenticated users can create tickets"
  ON suspended_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update tickets to claim them" ON suspended_tickets;
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

-- Create the get_souffles_in_view function
CREATE OR REPLACE FUNCTION public.get_souffles_in_view(
    lat double precision,
    long double precision,
    radius_meters integer
)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    pseudo text,
    content jsonb,
    latitude double precision,
    longitude double precision,
    created_at timestamp with time zone,
    expires_at timestamp with time zone,
    sticker text,
    background_id text,
    is_simulated boolean,
    moderation jsonb,
    language_code text,
    voice_id text,
    audio_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.user_id,
        COALESCE(p.pseudo, 'Anonyme'::text) as pseudo,
        s.content,
        s.latitude,
        s.longitude,
        s.created_at,
        s.expires_at,
        s.sticker,
        s.background_id,
        COALESCE(s.is_simulated, false) as is_simulated,
        COALESCE(s.moderation, '{}'::jsonb) as moderation,
        s.language_code,
        s.voice_id,
        s.audio_url
    FROM
        souffles s
    LEFT JOIN
        profiles p ON s.user_id = p.id
    WHERE
        ST_DWithin(
            ST_MakePoint(s.longitude, s.latitude)::geography,
            ST_MakePoint(long, lat)::geography,
            radius_meters
        )
        AND s.expires_at > NOW()
    ORDER BY s.created_at DESC;
END;
$$;

-- Create the clear_all_simulated_souffles function
CREATE OR REPLACE FUNCTION public.clear_all_simulated_souffles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete all simulated souffles and get the count
    DELETE FROM souffles 
    WHERE is_simulated = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- Create report_souffle function
CREATE OR REPLACE FUNCTION public.report_souffle(souffle_id_to_report uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the souffle's moderation status to pending
    UPDATE souffles 
    SET moderation = jsonb_set(
        COALESCE(moderation, '{}'::jsonb),
        '{status}',
        '"pending"'::jsonb
    )
    WHERE id = souffle_id_to_report;
END;
$$;

-- Create submit_moderation_vote function
CREATE OR REPLACE FUNCTION public.submit_moderation_vote(
    souffle_id uuid,
    voter_id uuid,
    vote_decision text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_moderation jsonb;
    updated_votes jsonb;
BEGIN
    -- Get current moderation data
    SELECT moderation INTO current_moderation 
    FROM souffles 
    WHERE id = souffle_id;
    
    -- Initialize moderation if null
    IF current_moderation IS NULL THEN
        current_moderation := '{"status": "pending", "votes": []}'::jsonb;
    END IF;
    
    -- Add the new vote
    updated_votes := COALESCE(current_moderation->'votes', '[]'::jsonb) || 
                    jsonb_build_object(
                        'userId', voter_id,
                        'decision', vote_decision,
                        'timestamp', NOW()
                    );
    
    -- Update the souffle with the new vote
    UPDATE souffles 
    SET moderation = jsonb_set(
        jsonb_set(current_moderation, '{votes}', updated_votes),
        '{status}',
        CASE 
            WHEN vote_decision = 'approve' THEN '"approved"'::jsonb
            WHEN vote_decision = 'reject' THEN '"rejected"'::jsonb
            ELSE '"pending"'::jsonb
        END
    )
    WHERE id = souffle_id;
END;
$$;

-- Create create_single_simulated_souffle function
CREATE OR REPLACE FUNCTION public.create_single_simulated_souffle(
    id_data uuid,
    content_data jsonb,
    latitude_data double precision,
    longitude_data double precision,
    created_at_data timestamp with time zone,
    expires_at_data timestamp with time zone,
    is_flagged_data boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO souffles (
        id,
        content,
        latitude,
        longitude,
        created_at,
        expires_at,
        is_simulated,
        moderation,
        sticker,
        background_id
    ) VALUES (
        id_data,
        content_data,
        latitude_data,
        longitude_data,
        created_at_data,
        expires_at_data,
        true,
        CASE 
            WHEN is_flagged_data THEN '{"status": "pending", "votes": []}'::jsonb
            ELSE '{"status": "clean", "votes": []}'::jsonb
        END,
        'default',
        'default'
    );
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Grant execute permissions for specific functions
GRANT EXECUTE ON FUNCTION public.get_souffles_in_view(double precision, double precision, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.clear_all_simulated_souffles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_souffle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_moderation_vote(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_single_simulated_souffle(uuid, jsonb, double precision, double precision, timestamp with time zone, timestamp with time zone, boolean) TO authenticated;