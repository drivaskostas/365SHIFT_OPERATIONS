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
    checklist_completed JSONB DEFAULT '{}'::jsonb, -- {item_id: boolean}
    photo_urls TEXT[],
    signature_url TEXT,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(obligation_id, scheduled_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_obligations_contract_id ON contract_obligations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_obligations_is_active ON contract_obligations(is_active);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_obligation_id ON obligation_completions(obligation_id);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_scheduled_date ON obligation_completions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_status ON obligation_completions(status);
CREATE INDEX IF NOT EXISTS idx_obligation_completions_completed_by ON obligation_completions(completed_by);

-- Enable RLS
ALTER TABLE contract_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligation_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_obligations
CREATE POLICY "Allow read access to authenticated users" ON contract_obligations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for admins" ON contract_obligations
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND "Role" IN ('admin', 'super_admin', 'manager')
        )
    );

CREATE POLICY "Allow update for admins" ON contract_obligations
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND "Role" IN ('admin', 'super_admin', 'manager')
        )
    );

-- RLS Policies for obligation_completions
CREATE POLICY "Allow read access to authenticated users" ON obligation_completions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON obligation_completions
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON obligation_completions
    FOR UPDATE TO authenticated USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contract_obligations_updated_at ON contract_obligations;
CREATE TRIGGER update_contract_obligations_updated_at
    BEFORE UPDATE ON contract_obligations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_obligation_completions_updated_at ON obligation_completions;
CREATE TRIGGER update_obligation_completions_updated_at
    BEFORE UPDATE ON obligation_completions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
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
    )
ON CONFLICT DO NOTHING;
