ALTER TABLE public.portfolio_videos
ADD COLUMN IF NOT EXISTS poster_time numeric NULL,
ADD COLUMN IF NOT EXISTS poster_mode text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_videos_poster_mode_check'
  ) THEN
    ALTER TABLE public.portfolio_videos
    ADD CONSTRAINT portfolio_videos_poster_mode_check
    CHECK (poster_mode IN ('manual', 'vimeo_time') OR poster_mode IS NULL);
  END IF;
END $$;
