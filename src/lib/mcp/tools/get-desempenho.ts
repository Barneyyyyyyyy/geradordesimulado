import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_desempenho",
  title: "Desempenho do estudante",
  description:
    "Retorna o perfil, XP/nível/streak e um resumo de desempenho por área, banca e assunto do usuário autenticado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [{ data: profile }, { data: stats }, { data: simulados }, { data: questoes }] =
      await Promise.all([
        supabase.from("profiles").select("nome, avatar_url").maybeSingle(),
        supabase.from("user_stats").select("*").maybeSingle(),
        supabase
          .from("simulados")
          .select("id, banca, area, materia, quantidade_questoes, acertos, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("questoes")
          .select("assunto, dificuldade, correta, resposta_usuario, gabarito")
          .limit(1000),
      ]);

    const porAssunto: Record<string, { total: number; acertos: number }> = {};
    for (const q of questoes ?? []) {
      const key = (q as { assunto?: string }).assunto ?? "Geral";
      const bucket = (porAssunto[key] ??= { total: 0, acertos: 0 });
      bucket.total += 1;
      if ((q as { correta?: boolean }).correta) bucket.acertos += 1;
    }
    const assuntos = Object.entries(porAssunto)
      .map(([assunto, v]) => ({
        assunto,
        total: v.total,
        acertos: v.acertos,
        taxa: v.total ? Math.round((v.acertos / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.taxa - b.taxa);

    const payload = {
      profile: profile ?? null,
      stats: stats ?? null,
      simulados: simulados ?? [],
      pontosFracos: assuntos.slice(0, 10),
      pontosFortes: [...assuntos].reverse().slice(0, 10),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
