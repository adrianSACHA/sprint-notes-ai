
-- Sprints table
CREATE TABLE public.sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notes table
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  text text NOT NULL CHECK (char_length(text) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sprints_user ON public.sprints(user_id, start_date DESC);
CREATE INDEX idx_notes_sprint_date ON public.notes(sprint_id, date);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Sprints policies
CREATE POLICY "Users select own sprints" ON public.sprints FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sprints" ON public.sprints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sprints" ON public.sprints FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sprints" ON public.sprints FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users select own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
