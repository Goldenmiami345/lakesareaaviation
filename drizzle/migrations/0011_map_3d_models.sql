ALTER TABLE public.site_settings
  ADD COLUMN map_3d_models boolean NOT NULL DEFAULT true,
  ADD COLUMN map_3d_aircraft text[] NOT NULL DEFAULT ARRAY['N8570B','N4383P','N46201']::text[];
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_map_3d_aircraft_size CHECK (cardinality(map_3d_aircraft) <= 20);