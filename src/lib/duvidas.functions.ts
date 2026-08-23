import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const AskInput = z.object({
  questaoId: z.string().uuid(),
  historico: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(20)
    .default([]),
  pergunta: z.string().trim().min(2).max(1000),
});

export const perguntarSobreQuestao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: q, error } = await supabase
      .from("questoes")
      .select("enunciado, alternativas, gabarito, explicacao, assunto, resposta_aluno")
      .eq("id", data.questaoId)
      .single();
    if (error || !q) throw new Error("Questão não encontrada");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("IA indisponível no momento.");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const alts = q.alternativas as Record<string, string>;
    const alternativasTxt = Object.entries(alts)
      .map(([k, v]) => `${k}) ${v}`)
      .join("\n");

    const contexto = `QUESTÃO (assunto: ${q.assunto})
${q.enunciado}

ALTERNATIVAS:
${alternativasTxt}

GABARITO OFICIAL: ${q.gabarito}
RESPOSTA DO ALUNO: ${q.resposta_aluno ?? "não respondeu ainda"}
RESOLUÇÃO GERADA: ${q.explicacao}`;

    const conversa = data.historico
      .map((m) => `${m.role === "user" ? "ALUNO" : "TUTOR"}: ${m.content}`)
      .join("\n\n");

    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      prompt: `Você é um tutor particular de vestibular, paciente e didático. Responda em português brasileiro, com no máximo 8 linhas, usando **negrito** para destacar pontos-chave.

Regras:
- Explique o raciocínio passo a passo quando for cálculo.
- Se o aluno apontar um possível erro no gabarito ou na resolução, refaça a questão do zero e diga honestamente se o gabarito está correto ou não.
- Não invente dados que não estão no enunciado.
- Termine com uma frase curta de incentivo apenas quando fizer sentido.

${contexto}

${conversa ? `CONVERSA ANTERIOR:\n${conversa}\n\n` : ""}NOVA PERGUNTA DO ALUNO: ${data.pergunta}`,
    });

    return { resposta: text };
  });
