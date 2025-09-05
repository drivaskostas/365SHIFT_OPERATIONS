-- Enable real-time updates for patrol_sessions table
ALTER TABLE patrol_sessions REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE patrol_sessions;