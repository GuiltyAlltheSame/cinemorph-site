ALTER TABLE public.portfolio_videos
ADD COLUMN IF NOT EXISTS tape_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS tape_title text NULL,
ADD COLUMN IF NOT EXISTS tape_texture text NULL,
ADD COLUMN IF NOT EXISTS tape_sort_order integer NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_videos_tape_texture_check'
      AND conrelid = 'public.portfolio_videos'::regclass
  ) THEN
    ALTER TABLE public.portfolio_videos
    ADD CONSTRAINT portfolio_videos_tape_texture_check
    CHECK (
      tape_texture IS NULL
      OR tape_texture IN (
        'vhs-01',
        'vhs-02',
        'vhs-03',
        'vhs-04',
        'vhs-05',
        'vhs-06',
        'vhs-07',
        'vhs-08',
        'vhs-09',
        'vhs-10'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_videos_tape_title_required_check'
      AND conrelid = 'public.portfolio_videos'::regclass
  ) THEN
    ALTER TABLE public.portfolio_videos
    ADD CONSTRAINT portfolio_videos_tape_title_required_check
    CHECK (
      tape_enabled = false
      OR nullif(btrim(tape_title), '') IS NOT NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_videos_tape_texture_required_check'
      AND conrelid = 'public.portfolio_videos'::regclass
  ) THEN
    ALTER TABLE public.portfolio_videos
    ADD CONSTRAINT portfolio_videos_tape_texture_required_check
    CHECK (
      tape_enabled = false
      OR tape_texture IS NOT NULL
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'portfolio_videos_tape_sort_order_check'
      AND conrelid = 'public.portfolio_videos'::regclass
  ) THEN
    ALTER TABLE public.portfolio_videos
    ADD CONSTRAINT portfolio_videos_tape_sort_order_check
    CHECK (
      tape_sort_order IS NULL
      OR tape_sort_order > 0
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS portfolio_videos_tape_sort_idx
ON public.portfolio_videos (tape_sort_order ASC NULLS LAST, created_at DESC)
WHERE tape_enabled = true;

COMMENT ON COLUMN public.portfolio_videos.tape_enabled IS 'Whether this portfolio video appears as a VHS tape in the TV menu.';
COMMENT ON COLUMN public.portfolio_videos.tape_title IS 'Handwritten label rendered on the VHS tape.';
COMMENT ON COLUMN public.portfolio_videos.tape_texture IS 'Cassette texture key: vhs-01 through vhs-10.';
COMMENT ON COLUMN public.portfolio_videos.tape_sort_order IS 'Independent order for the VHS tape stack. Portfolio sort_order remains separate.';
