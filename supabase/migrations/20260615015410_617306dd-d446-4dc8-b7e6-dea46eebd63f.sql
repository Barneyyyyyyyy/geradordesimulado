
CREATE TABLE public.redacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modelo text NOT NULL CHECK (modelo IN ('enem','vestibular')),
  tema text NOT NULL,
  texto text NOT NULL,
  nota_total integer NOT NULL DEFAULT 0,
  notas jsonb NOT NULL DEFAULT '{}'::jsonb,
  comentarios jsonb NOT NULL DEFAULT '{}'::jsonb,
  pontos_fortes jsonb NOT NULL DEFAULT '[]'::jsonb,
  pontos_fracos jsonb NOT NULL DEFAULT '[]'::jsonb,
  sugestoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback_geral text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.redacoes TO authenticated;
GRANT ALL ON public.redacoes TO service_role;

ALTER TABLE public.redacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia próprias redações"
  ON public.redacoes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX redacoes_user_created_idx ON public.redacoes (user_id, created_at DESC);
