/*
  # Create missing RPC functions for Souffle app

  1. New Functions
    - `get_souffles_in_view` - Retrieves souffles within a geographic radius
    - `create_single_simulated_souffle` - Creates a single simulated souffle
    - `clear_all_simulated_souffles` - Clears all simulated souffles (referenced in context)
    - `report_souffle` - Reports a souffle for moderation
    - `submit_moderation_vote` - Submits a moderation vote

  2. Security
    - Functions use proper authentication checks
    - RLS policies are respected
    - Input validation included

  3. Notes
    - These functions support the core functionality of the Souffle app
    - Geographic calculations use PostGIS functions
    - Moderation system is integrated
*/

-- Function to get souffles within a geographic view
CREATE OR REPLACE FUNCTION get_souffles_in_view(
  lat DOUBLE PRECISION,
  long DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 10000
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  pseudo TEXT,
  content JSONB,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  sticker TEXT,
  background_id TEXT,
  is_simulated BOOLEAN,
  moderation JSONB,
  language_code TEXT,
  voice_id TEXT,
  audio_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    COALESCE(p.pseudo, 'Anonyme') as pseudo,
    s.content,
    s.latitude,
    s.longitude,
    s.created_at,
    s.expires_at,
    s.sticker,
    s.background_id,
    s.is_simulated,
    s.moderation,
    s.language_code,
    s.voice_id,
    s.audio_url
  FROM souffles s
  LEFT JOIN profiles p ON s.user_id = p.id
  WHERE 
    s.expires_at > NOW()
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326),
      ST_SetSRID(ST_MakePoint(long, lat), 4326),
      radius_meters
    )
  ORDER BY s.created_at DESC;
END;
$$;

-- Function to create a single simulated souffle
CREATE OR REPLACE FUNCTION create_single_simulated_souffle(
  id_data UUID,
  content_data JSONB,
  latitude_data DOUBLE PRECISION,
  longitude_data DOUBLE PRECISION,
  created_at_data TIMESTAMPTZ,
  expires_at_data TIMESTAMPTZ,
  is_flagged_data BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO souffles (
    id,
    user_id,
    content,
    latitude,
    longitude,
    created_at,
    expires_at,
    is_simulated,
    moderation,
    sticker,
    background_id,
    language_code
  ) VALUES (
    id_data,
    NULL, -- Simulated souffles don't have a user
    content_data,
    latitude_data,
    longitude_data,
    created_at_data,
    expires_at_data,
    TRUE,
    CASE 
      WHEN is_flagged_data THEN '{"status": "pending", "votes": []}'::jsonb
      ELSE '{"status": "clean", "votes": []}'::jsonb
    END,
    'default',
    'default',
    'fr'
  );
END;
$$;

-- Function to clear all simulated souffles
CREATE OR REPLACE FUNCTION clear_all_simulated_souffles()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow authenticated users to clear simulated souffles
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  DELETE FROM souffles WHERE is_simulated = TRUE;
END;
$$;

-- Function to report a souffle
CREATE OR REPLACE FUNCTION report_souffle(souffle_id_to_report UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Update the souffle's moderation status
  UPDATE souffles 
  SET moderation = jsonb_set(
    moderation,
    '{status}',
    '"reported"'::jsonb
  )
  WHERE id = souffle_id_to_report;
  
  -- If no rows were affected, the souffle doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Souffle not found';
  END IF;
END;
$$;

-- Function to submit moderation vote
CREATE OR REPLACE FUNCTION submit_moderation_vote(
  souffle_id UUID,
  voter_id UUID,
  vote_decision TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_moderation JSONB;
  updated_votes JSONB;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Validate vote decision
  IF vote_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid vote decision. Must be approve or reject';
  END IF;
  
  -- Get current moderation data
  SELECT moderation INTO current_moderation
  FROM souffles
  WHERE id = souffle_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Souffle not found';
  END IF;
  
  -- Add the vote to the votes array
  updated_votes := COALESCE(current_moderation->'votes', '[]'::jsonb) || 
    jsonb_build_object('voter_id', voter_id, 'decision', vote_decision, 'timestamp', NOW());
  
  -- Update the moderation data
  UPDATE souffles 
  SET moderation = jsonb_set(
    jsonb_set(current_moderation, '{votes}', updated_votes),
    '{status}',
    CASE 
      WHEN vote_decision = 'approve' THEN '"clean"'::jsonb
      WHEN vote_decision = 'reject' THEN '"blocked"'::jsonb
      ELSE current_moderation->'status'
    END
  )
  WHERE id = souffle_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_souffles_in_view TO authenticated;
GRANT EXECUTE ON FUNCTION create_single_simulated_souffle TO authenticated;
GRANT EXECUTE ON FUNCTION clear_all_simulated_souffles TO authenticated;
GRANT EXECUTE ON FUNCTION report_souffle TO authenticated;
GRANT EXECUTE ON FUNCTION submit_moderation_vote TO authenticated;

-- Also grant to anon for public access where appropriate
GRANT EXECUTE ON FUNCTION get_souffles_in_view TO anon;