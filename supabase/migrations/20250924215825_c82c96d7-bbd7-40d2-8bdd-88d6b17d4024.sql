-- Create email_deliverability table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_deliverability') THEN
        CREATE TABLE public.email_deliverability (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email_id TEXT NOT NULL,
          recipient_email TEXT NOT NULL,
          status TEXT NOT NULL,
          event_type TEXT NOT NULL,
          reference_type TEXT NOT NULL DEFAULT 'supervisor_report',
          reference_id UUID,
          event_data JSONB,
          occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Add email_id columns to reports tables if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'supervisor_reports' AND column_name = 'email_id') THEN
        ALTER TABLE public.supervisor_reports ADD COLUMN email_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'patrol_observations' AND column_name = 'email_id') THEN
        ALTER TABLE public.patrol_observations ADD COLUMN email_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emergency_reports' AND column_name = 'email_id') THEN
        ALTER TABLE public.emergency_reports ADD COLUMN email_id TEXT;
    END IF;
END $$;

-- Enable RLS on email_deliverability if not already enabled
ALTER TABLE public.email_deliverability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
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