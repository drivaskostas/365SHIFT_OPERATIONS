-- =====================================================
-- Tenant Feature Settings - Controls visibility of features per tenant
-- Only super_admin can modify these settings
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_feature_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Tenant Branding
    tenant_name TEXT,
    app_name TEXT DEFAULT 'SENTINEL', -- Main app name shown in header
    app_subtitle TEXT DEFAULT 'SECURITY.SYS', -- Subtitle shown under app name
    logo_url TEXT,
    theme TEXT DEFAULT 'default', -- default, dark, blue, green, purple, red
    primary_color TEXT DEFAULT '#3B82F6',
    
    -- Quick Actions visibility
    show_scan_button BOOLEAN DEFAULT true,
    show_tasks_button BOOLEAN DEFAULT true,
    show_observations_button BOOLEAN DEFAULT true,
    show_report_button BOOLEAN DEFAULT true,
    
    -- Cards visibility
    show_supervisor_report BOOLEAN DEFAULT true,
    show_todays_tasks BOOLEAN DEFAULT true,
    show_patrol_status BOOLEAN DEFAULT true,
    
    -- Feature modules
    show_emergency_reports BOOLEAN DEFAULT true,
    show_location_tracking BOOLEAN DEFAULT true,
    show_team_observations BOOLEAN DEFAULT true,
    show_patrol_sessions BOOLEAN DEFAULT true,
    
    -- Obligation requirements visibility (what users see when completing)
    show_photo_requirement BOOLEAN DEFAULT true,
    show_signature_requirement BOOLEAN DEFAULT true,
    show_checklist_requirement BOOLEAN DEFAULT true,
    show_notes_field BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(tenant_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_tenant_feature_settings_tenant ON tenant_feature_settings(tenant_id);

-- Enable RLS
ALTER TABLE tenant_feature_settings ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage these settings
CREATE POLICY "Super admin can manage feature settings" ON tenant_feature_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND "Role" = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND "Role" = 'super_admin'
        )
    );

-- All authenticated users can read their tenant's settings
CREATE POLICY "Users can read their tenant settings" ON tenant_feature_settings
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenant_feature_settings_updated_at ON tenant_feature_settings;
CREATE TRIGGER update_tenant_feature_settings_updated_at
    BEFORE UPDATE ON tenant_feature_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for existing tenants
INSERT INTO tenant_feature_settings (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
