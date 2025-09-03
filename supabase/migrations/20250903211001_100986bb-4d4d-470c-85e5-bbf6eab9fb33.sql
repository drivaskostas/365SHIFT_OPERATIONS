-- Create supervisor_reports table
CREATE TABLE IF NOT EXISTS supervisor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supervisor_id UUID NOT NULL,
  supervisor_name TEXT,
  site_id UUID,
  guard_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved')),
  location TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  notes JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  incident_time TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT,
  team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE supervisor_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for supervisor_reports
CREATE POLICY "Admins and managers can manage supervisor reports" 
ON supervisor_reports FOR ALL 
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'manager'::text)
);

CREATE POLICY "Users can view their own supervisor reports"
ON supervisor_reports FOR SELECT 
USING (supervisor_id = auth.uid());

-- Create supervisor_report_history table
CREATE TABLE IF NOT EXISTS supervisor_report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for history
ALTER TABLE supervisor_report_history ENABLE ROW LEVEL SECURITY;

-- Create policies for history
CREATE POLICY "Admins and managers can manage supervisor report history" 
ON supervisor_report_history FOR ALL 
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'manager'::text)
);

-- Create site_supervisor_notification_settings table
CREATE TABLE IF NOT EXISTS site_supervisor_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  notify_for_severity TEXT[] NOT NULL DEFAULT '{critical,high,medium,low}'::text[],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notification settings
ALTER TABLE site_supervisor_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for notification settings
CREATE POLICY "Admins can manage notification settings" 
ON site_supervisor_notification_settings FOR ALL 
USING (is_admin(auth.uid()));

-- Create notification trigger function
CREATE OR REPLACE FUNCTION notify_supervisor_report_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    site_name TEXT;
    supervisor_name TEXT;
BEGIN
    -- Get site name
    SELECT name INTO site_name 
    FROM guardian_sites 
    WHERE id = NEW.site_id;
    
    -- Get supervisor name from profiles
    SELECT COALESCE(full_name, first_name || ' ' || last_name, email) INTO supervisor_name
    FROM profiles 
    WHERE id = NEW.supervisor_id;
    
    -- Send notifications to site supervisors
    INSERT INTO notifications (user_id, type, title, body, team_id)
    SELECT 
        p.id as user_id,
        'SYSTEM' as type,
        'Νέα Αναφορά Εποπτείας' as title,
        'Νέα αναφορά εποπτείας υποβλήθηκε για το έργο ' || COALESCE(site_name, 'Άγνωστο') || 
        ' από τον/την ' || COALESCE(supervisor_name, 'Άγνωστο') || 
        ' (Βαθμός σπουδαιότητας: ' || NEW.severity || ')' as body,
        NEW.team_id
    FROM site_supervisor_notification_settings ssns
    JOIN profiles p ON p.email = ssns.email
    WHERE ssns.site_id = NEW.site_id 
    AND ssns.active = true;
    
    -- Also send notifications to clients and admins
    INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        team_id
    )
    SELECT DISTINCT
        ct.client_id as user_id,
        'SYSTEM' as type,
        'Νέα Αναφορά Εποπτείας' as title,
        'Νέα αναφορά εποπτείας υποβλήθηκε για το έργο ' || COALESCE(site_name, 'Άγνωστο') || 
        ' από τον/την ' || COALESCE(supervisor_name, 'Άγνωστο') || 
        ' (Βαθμός σπουδαιότητας: ' || NEW.severity || ')' as body,
        NEW.team_id
    FROM client_teams ct
    JOIN guardian_sites gs ON gs.team_id = ct.team_id
    WHERE gs.id = NEW.site_id;
    
    -- Send notifications to admins
    INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        team_id
    )
    SELECT 
        ur.user_id,
        'SYSTEM' as type,
        'Νέα Αναφορά Εποπτείας' as title,
        'Νέα αναφορά εποπτείας υποβλήθηκε για το έργο ' || COALESCE(site_name, 'Άγνωστο') || 
        ' από τον/την ' || COALESCE(supervisor_name, 'Άγνωστο') || 
        ' (Βαθμός σπουδαιότητας: ' || NEW.severity || ')' as body,
        NEW.team_id
    FROM user_roles ur
    WHERE ur.role IN ('admin', 'super_admin');
    
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_supervisor_report_created ON supervisor_reports;
CREATE TRIGGER on_supervisor_report_created
    AFTER INSERT ON supervisor_reports
    FOR EACH ROW EXECUTE FUNCTION notify_supervisor_report_submission();