-- Remove the supervisor report trigger since we now call the edge function directly from the application
DROP TRIGGER IF EXISTS supervisor_report_notifications ON supervisor_reports;

-- Optionally keep the function for backward compatibility, but it won't be used
-- DROP FUNCTION IF EXISTS public.notify_supervisor_report_submission();