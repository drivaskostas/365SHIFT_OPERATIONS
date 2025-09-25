-- Create email_correlation table to link Resend message IDs with report IDs
CREATE TABLE IF NOT EXISTS public.email_correlation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resend_message_id text NOT NULL UNIQUE,
  reference_type text NOT NULL,
  reference_id uuid NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_correlation ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage email correlations" 
ON public.email_correlation 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view correlations for their reports" 
ON public.email_correlation 
FOR SELECT 
USING (
  (reference_type = 'supervisor_report' AND EXISTS (
    SELECT 1 FROM supervisor_reports sr 
    WHERE sr.id = email_correlation.reference_id 
    AND sr.supervisor_id = auth.uid()
  )) OR
  (reference_type = 'patrol_observation' AND EXISTS (
    SELECT 1 FROM patrol_observations po 
    WHERE po.id = email_correlation.reference_id 
    AND po.guard_id = auth.uid()
  )) OR
  (reference_type = 'emergency_report' AND EXISTS (
    SELECT 1 FROM emergency_reports er 
    WHERE er.id = email_correlation.reference_id 
    AND er.guard_id = auth.uid()
  )) OR
  is_admin(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_email_correlation_resend_id ON public.email_correlation(resend_message_id);
CREATE INDEX idx_email_correlation_reference ON public.email_correlation(reference_type, reference_id);