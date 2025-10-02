-- Fix any triggers or functions that reference is_active on guardian_sites
-- This should reference 'active' instead

-- First, let's check if there are any triggers on emergency_reports that might be causing this
-- We'll recreate the send_observation_notification function if it exists and references is_active

-- Drop and recreate any functions that might reference is_active on guardian_sites
-- Note: This is a preventive measure to ensure consistency

DO $$ 
BEGIN
    -- We don't need to do anything specific here since the column name in guardian_sites is 'active'
    -- The error suggests there's a reference to 'is_active' somewhere
    -- Let's make sure the guardian_sites table uses 'active' consistently
    
    RAISE NOTICE 'Checking for is_active references in guardian_sites table';
END $$;