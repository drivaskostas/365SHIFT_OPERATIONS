-- Fix type casting issue in send_emergency_notification function
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
  SELECT id INTO site_uuid
  FROM guardian_sites
  WHERE team_id = NEW.team_id
    AND active = true
  LIMIT 1;
  
  -- Get guard name
  SELECT COALESCE(full_name, first_name || ' ' || last_name)
  INTO guard_full_name
  FROM profiles
  WHERE id = NEW.guard_id;
  
  -- Get all active recipient emails from site_notification_settings
  -- Filter by severity with proper type casting
  SELECT ARRAY_AGG(DISTINCT email)
  INTO recipient_emails
  FROM site_notification_settings
  WHERE site_id = site_uuid
    AND active = true
    AND (
      notify_for_severity IS NULL 
      OR array_length(notify_for_severity, 1) IS NULL
      OR NEW.severity = ANY(notify_for_severity::text[])
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