-- Add checkpoint_group_id column to patrol_sessions table if it doesn't exist
ALTER TABLE patrol_sessions ADD COLUMN IF NOT EXISTS checkpoint_group_id UUID REFERENCES checkpoint_groups(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_patrol_sessions_checkpoint_group ON patrol_sessions(checkpoint_group_id);

-- Add comment for documentation
COMMENT ON COLUMN patrol_sessions.checkpoint_group_id IS 'Reference to the specific checkpoint group selected for this patrol';