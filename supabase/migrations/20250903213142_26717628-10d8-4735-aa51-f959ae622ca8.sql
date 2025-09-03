-- Update the supervisor report trigger to also call the email notification edge function
CREATE OR REPLACE FUNCTION public.notify_supervisor_report_submission()
RETURNS TRIGGER AS $$
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
    
    -- Call edge function for email notifications
    PERFORM
        net.http_post(
            url := (SELECT COALESCE(current_setting('app.settings.supabase_url', true), 'https://igcqqrcdtqpecopvuuva.supabase.co')) || '/functions/v1/send-supervisor-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (SELECT COALESCE(current_setting('app.settings.supabase_service_role_key', true), ''))
            ),
            body := jsonb_build_object(
                'type', 'INSERT',
                'table', 'supervisor_reports',
                'schema', 'public',
                'record', to_jsonb(NEW)
            )
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;