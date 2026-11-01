ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS traffic_pattern_mode text NOT NULL DEFAULT 'pulse';
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_traffic_pattern_mode_check CHECK (traffic_pattern_mode IN ('off', 'pulse', 'always'));
COMMENT ON COLUMN public.site_settings.traffic_pattern_mode IS 'Owner setting for the drawn traffic pattern on the homepage airport maps: off, pulse (fades in briefly every ~7 s, default) or always.';
COMMENT ON COLUMN public.site_settings.show_traffic_pattern IS 'DEPRECATED: replaced by traffic_pattern_mode.';