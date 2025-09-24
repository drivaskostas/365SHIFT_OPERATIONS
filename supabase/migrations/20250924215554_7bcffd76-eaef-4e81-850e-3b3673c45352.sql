-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Admins can manage email deliverability" ON public.email_deliverability;
DROP POLICY IF EXISTS "Users can view deliverability for their reports" ON public.email_deliverability;

-- Create policies for email_deliverability
CREATE POLICY "Admins can manage email deliverability" ON public.email_deliverability
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Users can view deliverability for their reports" ON public.email_deliverability
  FOR SELECT USING (
    (reference_type = 'supervisor_report' AND EXISTS (
      SELECT 1 FROM supervisor_reports sr 
      WHERE sr.id = email_deliverability.reference_id 
      AND sr.supervisor_id = auth.uid()
    )) OR
    (reference_type = 'patrol_observation' AND EXISTS (
      SELECT 1 FROM patrol_observations po 
      WHERE po.id = email_deliverability.reference_id 
      AND po.guard_id = auth.uid()
    )) OR
    (reference_type = 'emergency_report' AND EXISTS (
      SELECT 1 FROM emergency_reports er 
      WHERE er.id = email_deliverability.reference_id 
      AND er.guard_id = auth.uid()
    )) OR
    is_admin(auth.uid())
  );