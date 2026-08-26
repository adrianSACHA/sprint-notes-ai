-- StandupLog — pełny schemat bazy danych
-- Uruchom ten plik jako PIERWSZY w nowym projekcie Supabase (SQL Editor).

-- ============ SPRINTS ============
CREATE TABLE public.sprints (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL,
  name           text NOT NULL,
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  review_summary text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sprints TO authenticated;
GRANT ALL ON public.sprints TO service_role;

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own sprints"
  ON public.sprints FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ NOTES ============
CREATE TABLE public.notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id        uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL,
  date             date NOT NULL,
  text             text NOT NULL,
  type             text NOT NULL DEFAULT 'note',
  status           text NOT NULL DEFAULT 'in_progress',
  review_highlight boolean NOT NULL DEFAULT false,
  edited_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notes"
  ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX notes_sprint_id_idx ON public.notes (sprint_id);
CREATE INDEX notes_user_date_idx ON public.notes (user_id, date);
CREATE INDEX sprints_user_start_idx ON public.sprints (user_id, start_date DESC);
