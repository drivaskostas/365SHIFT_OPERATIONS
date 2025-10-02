-- Fix the send_emergency_notification function to use 'active' instead of 'is_active'
CREATE OR REPLACE FUNCTION public.send_emergency_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  recipient_emails TEXT[];
  site_uuid UUID;
  guard_full_name TEXT;
BEGIN
  -- Get site_id from team_id via guardian_sites
  -- Emergency reports are associated with teams, we need to find the relevant site
  -- For now, we'll get the first active site for the team
  SELECT id INTO site_uuid
  FROM guardian_sites
  WHERE team_id = NEW.team_id
    AND active = true  -- FIXED: changed from is_active to active
  LIMIT 1;
  
  -- Get guard name
  SELECT COALESCE(full_name, first_name || ' ' || last_name)
  INTO guard_full_name
  FROM profiles
  WHERE id = NEW.guard_id;
  
  -- Get all active recipient emails from site_notification_settings
  -- Filter by severity
  SELECT ARRAY_AGG(DISTINCT email)
  INTO recipient_emails
  FROM site_notification_settings
  WHERE site_id = site_uuid
    AND active = true
    AND (
      notify_for_severity IS NULL 
      OR notify_for_severity = '{}'::text[]
      OR NEW.severity = ANY(notify_for_severity)
    );
  
  -- Only proceed if we have recipients
  IF recipient_emails IS NOT NULL AND array_length(recipient_emails, 1) > 0 THEN
    -- Call the edge function
    PERFORM
      net.http_post(
        url := 'https://igcqqrcdtqpecopvuuva.supabase.co/functions/v1/send-emergency-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'reportId', NEW.id,
          'recipientEmails', recipient_emails,
          'guardName', COALESCE(guard_full_name, 'Unknown Guard'),
          'title', NEW.title,
          'severity', NEW.severity,
          'description', NEW.description,
          'location', NEW.location
        )
      );
  END IF;
  
  RETURN NEW;
END;
$function$;