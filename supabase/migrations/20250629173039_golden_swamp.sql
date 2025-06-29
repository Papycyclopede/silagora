/*
  # Create additional required functions

  1. New Functions
    - `report_souffle` - Handles souffle reporting functionality
    - `submit_moderation_vote` - Handles moderation voting
    - `create_single_simulated_souffle` - Creates a single simulated souffle

  2. Security
    - All functions use SECURITY DEFINER for proper permissions
    - Functions are accessible to authenticated users
*/

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
    
    -- You could also insert into a reports table here if needed
    -- INSERT INTO reports (souffle_id, reported_by, created_at) 
    -- VALUES (souffle_id_to_report, auth.uid(), NOW());
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
                        'voter_id', voter_id,
                        'decision', vote_decision,
                        'timestamp', NOW()
                    );
    
    -- Update the souffle with the new vote
    UPDATE souffles 
    SET moderation = jsonb_set(
        jsonb_set(current_moderation, '{votes}', updated_votes),
        '{status}',
        CASE 
            WHEN vote_decision = 'approve' THEN '"clean"'::jsonb
            WHEN vote_decision = 'reject' THEN '"blocked"'::jsonb
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.report_souffle(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_moderation_vote(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_single_simulated_souffle(uuid, jsonb, double precision, double precision, timestamp with time zone, timestamp with time zone, boolean) TO authenticated;