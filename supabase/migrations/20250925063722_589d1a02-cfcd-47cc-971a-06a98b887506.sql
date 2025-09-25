-- Add site_id column to patrol_observations table
ALTER TABLE public.patrol_observations 
ADD COLUMN site_id UUID REFERENCES public.guardian_sites(id);