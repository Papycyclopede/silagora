/*
  # Create clear_all_simulated_souffles function

  1. New Functions
    - `clear_all_simulated_souffles` - Safely removes all simulated souffles from the database
      - No parameters required
      - Returns the number of deleted records
      - Only deletes souffles where is_simulated = true

  2. Security
    - Function is accessible to authenticated users
    - Uses SECURITY DEFINER to ensure proper permissions
    - Only affects simulated souffles to prevent accidental data loss
*/

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.clear_all_simulated_souffles() TO authenticated;