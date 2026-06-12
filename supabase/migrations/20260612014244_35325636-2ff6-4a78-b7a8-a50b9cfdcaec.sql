DROP POLICY IF EXISTS "Usuário gerencia próprias stats" ON public.user_stats;
CREATE POLICY "Usuário gerencia próprias stats" ON public.user_stats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário gerencia próprios simulados" ON public.simulados;
CREATE POLICY "Usuário gerencia próprios simulados" ON public.simulados FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuário gerencia próprio perfil" ON public.profiles;
CREATE POLICY "Usuário gerencia próprio perfil" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário acessa questões dos próprios simulados" ON public.questoes;
CREATE POLICY "Usuário acessa questões dos próprios simulados" ON public.questoes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM simulados s WHERE s.id = questoes.simulado_id AND s.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM simulados s WHERE s.id = questoes.simulado_id AND s.user_id = auth.uid()));