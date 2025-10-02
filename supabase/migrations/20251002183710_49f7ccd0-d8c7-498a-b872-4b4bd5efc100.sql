-- Fix send_observation_notification to handle missing request headers gracefully
CREATE OR REPLACE FUNCTION public.send_observation_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  recipient_emails TEXT[];
  site_uuid UUID;
  auth_header TEXT;
BEGIN
  -- Get site_id from the new record (it's now included in the insert)
  site_uuid := NEW.site_id;
  
  -- Get all active recipient emails from site_notification_settings
  -- Filter by severity if the observation has one
  SELECT ARRAY_AGG(DISTINCT email)
  INTO recipient_emails
  FROM site_notification_settings
  WHERE site_id = site_uuid
    AND active = true
    AND (
      notify_for_severity IS NULL 
      OR notify_for_severity = ARRAY[]::varchar[]
      OR NEW.severity = ANY(notify_for_severity)
    );
  
  -- Only proceed if we have recipients
  IF recipient_emails IS NOT NULL AND array_length(recipient_emails, 1) > 0 THEN
    -- Try to get auth header, use empty string if not available
    BEGIN
      auth_header := current_setting('request.headers', true)::json->>'authorization';
    EXCEPTION WHEN OTHERS THEN
      auth_header := '';
    END;
    
    -- Call the edge function
    PERFORM
      net.http_post(
        url := 'https://igcqqrcdtqpecopvuuva.supabase.co/functions/v1/send-observation-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', CASE WHEN auth_header != '' THEN 'Bearer ' || auth_header ELSE '' END
        ),
        body := jsonb_build_object(
          'observationId', NEW.id,
          'recipientEmails', recipient_emails,
          'guardName', NEW.guard_name,
          'title', NEW.title,
          'description', NEW.description,
          'severity', NEW.severity,
          'latitude', NEW.latitude,
          'longitude', NEW.longitude
        )
      );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Observation notification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;