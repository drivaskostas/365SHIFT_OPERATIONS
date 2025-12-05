-- =====================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO SET UP OBLIGATIONS
-- =====================================================

-- Create contract_obligations table for tracking recurring tasks
CREATE TABLE IF NOT EXISTS contract_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES service_contracts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    specific_days INTEGER[], -- For weekly: [0-6] (Sun-Sat), For monthly: [1-31]
    requires_checklist BOOLEAN DEFAULT false,
    checklist_items JSONB DEFAULT '[]'::jsonb, -- Array of {id, label, required}
    requires_photo_proof BOOLEAN DEFAULT false,
    requires_signature BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_contract_obligations_contract_id ON contract_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_obligations_is_active ON contract_obligations(is_active);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_obligation_id ON obligation_completions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_scheduled_date ON obligation_completions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_status ON obligation_completions(status);

-- Enable RLS
ALTER TABLE contract_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON contract_obligations;
DROP POLICY IF EXISTS "Allow insert for admins" ON contract_obligations;
DROP POLICY IF EXISTS "Allow update for admins" ON contract_obligations;
DROP POLICY IF EXISTS "Allow read access to authenticated users" ON obligation_completions;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON obligation_completions;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON obligation_completions;

-- RLS Policies for contract_obligations
CREATE POLICY "Allow read access to authenticated users" ON contract_obligations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for admins" ON contract_obligations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for admins" ON contract_obligations
    FOR UPDATE TO authenticated USING (true);

-- RLS Policies for obligation_completions
CREATE POLICY "Allow read access to authenticated users" ON obligation_completions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON obligation_completions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON obligation_completions
    FOR UPDATE TO authenticated USING (true);

-- =====================================================
-- INSERT SAMPLE DATA
-- =====================================================

INSERT INTO contract_obligations (title, description, frequency, requires_photo_proof, requires_signature, requires_checklist, checklist_items, is_active)
VALUES 
    (
        'Daily Security Check', 
        'Perform daily security inspection of all entry points and perimeter', 
        'daily', 
        true, 
        false, 
        true,
        '[{"id": "check1", "label": "All doors locked", "required": true}, {"id": "check2", "label": "Lights functioning", "required": true}, {"id": "check3", "label": "CCTV operational", "required": false}]'::jsonb,
        true
    ),
    (
        'Weekly Equipment Inspection', 
        'Check all security equipment and report any issues', 
        'weekly', 
        true, 
        true, 
        true,
        '[{"id": "eq1", "label": "Radio batteries charged", "required": true}, {"id": "eq2", "label": "Flashlights working", "required": true}, {"id": "eq3", "label": "First aid kit stocked", "required": true}]'::jsonb,
        true
    ),
    (
        'Fire Extinguisher Monthly Check', 
        'Verify all fire extinguishers are in working condition and properly placed', 
        'monthly', 
        true, 
        true, 
        true,
        '[{"id": "fe1", "label": "Pressure gauge in green zone", "required": true}, {"id": "fe2", "label": "Safety pin intact", "required": true}, {"id": "fe3", "label": "No visible damage", "required": true}, {"id": "fe4", "label": "Signage visible", "required": false}]'::jsonb,
        true
    ),
    (
        'Parking Lot Inspection',
        'Check parking lot for any issues or suspicious activity',
        'daily',
        true,
        false,
        false,
        '[]'::jsonb,
        true
    )
ON CONFLICT DO NOTHING;

-- Verify the data was inserted
SELECT id, title, frequency, requires_photo_proof, requires_signature, requires_checklist FROM contract_obligations;
