-- Remove test triggers and function from all tables
DROP TRIGGER IF EXISTS test_patrol_observations_trigger ON public.patrol_observations CASCADE;
DROP TRIGGER IF EXISTS test_emergency_reports_trigger ON public.emergency_reports CASCADE;
DROP FUNCTION IF EXISTS public.simple_trigger_test() CASCADE;