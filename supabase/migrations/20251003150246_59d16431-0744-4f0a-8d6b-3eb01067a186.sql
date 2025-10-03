-- Drop the old policy that incorrectly checks supervisor_id column
DROP POLICY IF EXISTS "Supervisors can view assigned sites" ON public.guardian_sites;

-- Create new policy that checks site_supervisors table
CREATE POLICY "Supervisors can view their assigned sites via site_supervisors"
ON public.guardian_sites
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.site_supervisors
    WHERE site_supervisors.site_id = guardian_sites.id
      AND site_supervisors.supervisor_id = auth.uid()
      AND site_supervisors.is_active = true
  )
);