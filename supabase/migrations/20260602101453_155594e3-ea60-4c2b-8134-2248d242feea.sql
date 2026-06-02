
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS review_highlight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_type_check CHECK (type IN ('task','bug','review','meeting','blocker','note')),
  ADD CONSTRAINT notes_status_check CHECK (status IN ('in_progress','done','blocked','handoff_testing','info'));

CREATE OR REPLACE FUNCTION public.set_notes_edited_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.text IS DISTINCT FROM OLD.text
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.review_highlight IS DISTINCT FROM OLD.review_highlight THEN
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS notes_set_edited_at ON public.notes;
CREATE TRIGGER notes_set_edited_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_notes_edited_at();
