-- Fix the type mismatch in send_observation_notification trigger function
-- The notify_for_severity column is character varying[], not text[]

CREATE OR REPLACE FUNCTION public.send_observation_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  recipient_emails TEXT[];
  site_uuid UUID;
BEGIN
  -- Get site_id from the patrol session
  SELECT site_id INTO site_uuid
  FROM patrol_sessions
  WHERE id = NEW.patrol_id;
  
  -- Get all active recipient emails from site_notification_settings
  -- Filter by severity if the observation has one
  -- FIX: Use proper type casting for character varying[] comparison
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
    -- Call the edge function
    PERFORM
      net.http_post(
        url := 'https://igcqqrcdtqpecopvuuva.supabase.co/functions/v1/send-observation-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'observationId', NEW.id,
          'recipientEmails', recipient_emails,
          'guardName', NEW.guard_name,
          'observationType', NEW.observation_type,
          'description', NEW.description,
          'location', NEW.location
        )
      );
  END IF;
  
  RETURN NEW;
END;
$function$;