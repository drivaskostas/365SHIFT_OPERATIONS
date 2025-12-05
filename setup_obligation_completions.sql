-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Creates the obligation_completions table if it doesn't exist
-- =====================================================

-- Create obligation_completions table for tracking completed tasks
CREATE TABLE IF NOT EXISTS obligation_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obligation_id UUID NOT NULL REFERENCES contract_obligations(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    completed_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'excused')),
    notes TEXT,
    checklist_completed JSONB DEFAULT '{}'::jsonb,
    photo_urls TEXT[],
    signature_url TEXT,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(obligation_id, scheduled_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_obligation_completions_obligation_id ON obligation_completions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_scheduled_date ON obligation_completions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_status ON obligation_completions(status);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_completed_by ON obligation_completions(completed_by);

-- Enable RLS
ALTER TABLE obligation_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON obligation_completions;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON obligation_completions;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON obligation_completions;

-- RLS Policies for obligation_completions
CREATE POLICY "Allow read access to authenticated users" ON obligation_completions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON obligation_completions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON obligation_completions
    FOR UPDATE TO authenticated USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_obligation_completions_updated_at ON obligation_completions;
CREATE TRIGGER update_obligation_completions_updated_at
    BEFORE UPDATE ON obligation_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify
SELECT 'obligation_completions table created successfully!' as status;
