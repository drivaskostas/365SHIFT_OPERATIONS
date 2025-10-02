-- Add support for technical_issue severity in emergency reports and patrol observations

-- First, let's check if we need to update any constraints or types
-- Add technical_issue to the severity options for emergency_reports if not already present
ALTER TABLE emergency_reports 
DROP CONSTRAINT IF EXISTS emergency_reports_severity_check;

ALTER TABLE emergency_reports 
ADD CONSTRAINT emergency_reports_severity_check 
CHECK (severity IN ('critical', 'high', 'medium', 'low', 'technical_issue'));

-- Add technical_issue to the severity options for patrol_observations if not already present
ALTER TABLE patrol_observations 
DROP CONSTRAINT IF EXISTS patrol_observations_severity_check;

ALTER TABLE patrol_observations 
ADD CONSTRAINT patrol_observations_severity_check 
CHECK (severity IN ('critical', 'high', 'medium', 'low', 'technical_issue'));

-- Update site_notification_settings to ensure it can handle technical_issue in notify_for_severity array
-- No constraint needed as it's already a text array that can contain any values

-- Add a comment to document the technical_issue severity type
COMMENT ON COLUMN emergency_reports.severity IS 'Report severity: critical, high, medium, low, or technical_issue';
COMMENT ON COLUMN patrol_observations.severity IS 'Observation severity: critical, high, medium, low, or technical_issue';
COMMENT ON COLUMN site_notification_settings.notify_for_severity IS 'Array of severity levels to notify for: critical, high, medium, low, technical_issue. Empty array means notify for all severities.';