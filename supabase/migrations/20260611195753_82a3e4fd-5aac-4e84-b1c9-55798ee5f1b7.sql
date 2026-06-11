
-- ENUMS
CREATE TYPE public.area_conhecimento AS ENUM ('matematica', 'linguagens', 'humanas', 'natureza');
CREATE TYPE public.banca_vestibular AS ENUM ('enem', 'fuvest', 'unicamp', 'unesp');
CREATE TYPE public.dificuldade AS ENUM ('facil', 'medio', 'dificil', 'misto');
CREATE TYPE public.simulado_status AS ENUM ('em_andamento', 'finalizado');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Estudante',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprio perfil" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- USER_STATS (gamificação)
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  nivel INTEGER NOT NULL DEFAULT 1,
  streak_dias INTEGER NOT NULL DEFAULT 0,
  ultima_atividade DATE,
  meta_diaria INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprias stats" ON public.user_stats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SIMULADOS
CREATE TABLE public.simulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banca public.banca_vestibular NOT NULL,
  area public.area_conhecimento NOT NULL,
  dificuldade public.dificuldade NOT NULL,
  quantidade_questoes INTEGER NOT NULL,
  status public.simulado_status NOT NULL DEFAULT 'em_andamento',
  acertos INTEGER NOT NULL DEFAULT 0,
  tempo_segundos INTEGER NOT NULL DEFAULT 0,
  feedback_ia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizado_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.simulados TO authenticated;
GRANT ALL ON public.simulados TO service_role;
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprios simulados" ON public.simulados FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_simulados_user_created ON public.simulados(user_id, created_at DESC);

-- QUESTOES
CREATE TABLE public.questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulado_id UUID NOT NULL REFERENCES public.simulados(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  assunto TEXT NOT NULL,
  enunciado TEXT NOT NULL,
  alternativas JSONB NOT NULL, -- {"A":"...","B":"...","C":"...","D":"...","E":"..."}
  gabarito TEXT NOT NULL, -- "A"-"E"
  explicacao TEXT NOT NULL,
  resposta_aluno TEXT,
  acertou BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questoes TO authenticated;
GRANT ALL ON public.questoes TO service_role;
ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário acessa questões dos próprios simulados" ON public.questoes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.simulados s WHERE s.id = simulado_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.simulados s WHERE s.id = simulado_id AND s.user_id = auth.uid()));
CREATE INDEX idx_questoes_simulado ON public.questoes(simulado_id, ordem);

-- TRIGGER: criar profile + stats no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
