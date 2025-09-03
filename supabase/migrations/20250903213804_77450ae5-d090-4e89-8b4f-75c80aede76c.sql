-- Update the supervisor report trigger to call the edge function with proper authentication
CREATE OR REPLACE FUNCTION public.notify_supervisor_report_submission()
RETURNS TRIGGER AS $$
DECLARE
    site_name TEXT;
    supervisor_name TEXT;
    response_data text;
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
    
    -- Call edge function for email notifications
    -- Using direct HTTP POST with hardcoded URL and anon key for authentication
    SELECT INTO response_data content FROM net.http_post(
        url := 'https://igcqqrcdtqpecopvuuva.supabase.co/functions/v1/send-supervisor-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnY3FxcmNkdHFwZWNvcHZ1dXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0OTI5MzAsImV4cCI6MjA1NjA2ODkzMH0.w5Ac9bpsfXpkAa4FJi2pDlMzpM6j1pEe3bL36fpzuQE'
        ),
        body := jsonb_build_object(
            'type', 'INSERT',
            'table', 'supervisor_reports',
            'schema', 'public',
            'record', to_jsonb(NEW)
        )::text
    );
    
    -- Log the response for debugging
    RAISE LOG 'Edge function response: %', response_data;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;