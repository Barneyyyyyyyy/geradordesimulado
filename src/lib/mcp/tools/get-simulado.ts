import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_simulado",
  title: "Detalhar simulado",
  description: "Retorna um simulado do usuário com todas as suas questões, respostas e gabaritos.",
  inputSchema: { id: z.string().describe("ID do simulado.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: simulado, error } = await supabase
      .from("simulados")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!simulado) {
      return { content: [{ type: "text", text: "Simulado não encontrado." }], isError: true };
    }
    const { data: questoes, error: qErr } = await supabase
      .from("questoes")
      .select("*")
      .eq("simulado_id", id)
      .order("ordem", { ascending: true });
    if (qErr) return { content: [{ type: "text", text: qErr.message }], isError: true };
    const payload = { simulado, questoes: questoes ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
