/*
  # Create get_souffles_in_view function

  1. New Functions
    - `get_souffles_in_view` - Returns souffles within a specified radius from a given location
      - Parameters: lat (latitude), long (longitude), radius_meters (search radius)
      - Returns: All souffle data with user pseudo from profiles table
      - Uses PostGIS for geospatial calculations
      - Filters out expired souffles

  2. Dependencies
    - Requires PostGIS extension for spatial calculations
    - Assumes `souffles` and `profiles` tables exist
    - Uses ST_DWithin for efficient radius-based queries

  3. Security
    - Function is accessible to authenticated users
    - No RLS policies needed as this is a read-only function
*/

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_souffles_in_view(double precision, double precision, integer) TO authenticated;