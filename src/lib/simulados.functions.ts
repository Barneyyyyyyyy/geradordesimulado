import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const AREA_LABEL: Record<string, string> = {
  matematica: "Matemática e suas Tecnologias",
  linguagens: "Linguagens, Códigos e suas Tecnologias",
  humanas: "Ciências Humanas e suas Tecnologias",
  natureza: "Ciências da Natureza e suas Tecnologias",
};
const BANCA_LABEL: Record<string, string> = {
  enem: "ENEM (Exame Nacional do Ensino Médio)",
  fuvest: "FUVEST (USP)",
  unicamp: "UNICAMP",
  unesp: "UNESP",
};
const DIF_LABEL: Record<string, string> = {
  facil: "fácil (introdutório)",
  medio: "médio (nível médio de prova real)",
  dificil: "difícil (questões de discriminação)",
  misto: "misto (variar entre fácil, médio e difícil)",
};

const CreateInput = z.object({
  banca: z.enum(["enem", "fuvest", "unicamp", "unesp"]),
  area: z.enum(["matematica", "linguagens", "humanas", "natureza"]),
  dificuldade: z.enum(["facil", "medio", "dificil", "misto"]),
  quantidade: z.number().int().min(5).max(45),
});

interface GeneratedQuestion {
  assunto: string;
  enunciado: string;
  alternativas: { A: string; B: string; C: string; D: string; E: string };
  gabarito: "A" | "B" | "C" | "D" | "E";
  explicacao: string;
}

async function generateQuestions(input: z.infer<typeof CreateInput>): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(apiKey);

  const prompt = `Gere ${input.quantidade} questões inéditas de múltipla escolha (5 alternativas A-E) no estilo da banca ${BANCA_LABEL[input.banca]}, da área ${AREA_LABEL[input.area]}, dificuldade ${DIF_LABEL[input.dificuldade]}.

REGRAS OBRIGATÓRIAS:
- Conteúdo em PORTUGUÊS BRASILEIRO.
- Questões coerentes com o estilo real da banca (ex.: ENEM usa contextos do cotidiano e textos-base; FUVEST/UNICAMP/UNESP costumam ter enunciados mais técnicos e diretos).
- Cada questão deve abordar um assunto específico do programa de ${AREA_LABEL[input.area]}.
- As 5 alternativas devem ser plausíveis, sem repetir o gabarito de forma óbvia.
- A "explicacao" deve ser didática, passo a passo (3-6 frases), explicando por que a correta é correta E por que pelo menos 2 distratores estão errados.
- VARIE os assuntos entre as questões.

Retorne APENAS um array JSON válido, sem markdown, sem texto antes ou depois, no formato:
[
  {
    "assunto": "string curta (ex: 'Funções quadráticas')",
    "enunciado": "string completa do enunciado",
    "alternativas": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
    "gabarito": "A" | "B" | "C" | "D" | "E",
    "explicacao": "string didática"
  }
]`;

  const { text } = await generateText({
    model: gateway("google/gemini-2.5-flash"),
    prompt,
  });

  // Strip markdown fences if present
  let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("IA não retornou JSON válido");
  cleaned = cleaned.slice(start, end + 1);
  // Remove control chars and fix invalid escape sequences from LLM output
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  let parsed: GeneratedQuestion[];
  try {
    parsed = JSON.parse(cleaned) as GeneratedQuestion[];
  } catch {
    const fixed = cleaned.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\");
    parsed = JSON.parse(fixed) as GeneratedQuestion[];
  }

  return parsed.filter(
    (q) =>
      q?.enunciado &&
      q?.alternativas?.A && q.alternativas.B && q.alternativas.C && q.alternativas.D && q.alternativas.E &&
      ["A", "B", "C", "D", "E"].includes(q.gabarito) &&
      q.explicacao
  );
}

export const createSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const questions = await generateQuestions(data);
    if (questions.length < Math.min(data.quantidade, 3)) {
      throw new Error("Não foi possível gerar questões suficientes. Tente novamente.");
    }

    const { data: simulado, error: simErr } = await supabase
      .from("simulados")
      .insert({
        user_id: userId,
        banca: data.banca,
        area: data.area,
        dificuldade: data.dificuldade,
        quantidade_questoes: questions.length,
      })
      .select("id")
      .single();
    if (simErr || !simulado) throw new Error(simErr?.message || "Erro ao criar simulado");

    const { error: qErr } = await supabase.from("questoes").insert(
      questions.map((q, i) => ({
        simulado_id: simulado.id,
        ordem: i + 1,
        assunto: q.assunto,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        explicacao: q.explicacao,
      })),
    );
    if (qErr) throw new Error(qErr.message);

    return { id: simulado.id };
  });

export const getSimulado = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: simulado, error } = await supabase
      .from("simulados")
      .select("*, questoes(*)")
      .eq("id", data.id)
      .single();
    if (error || !simulado) throw new Error("Simulado não encontrado");
    const questoes = (simulado.questoes as any[]).sort((a, b) => a.ordem - b.ordem);
    return { ...simulado, questoes };
  });

export const answerQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      questaoId: z.string().uuid(),
      resposta: z.enum(["A", "B", "C", "D", "E"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: q, error } = await supabase
      .from("questoes")
      .select("gabarito")
      .eq("id", data.questaoId)
      .single();
    if (error || !q) throw new Error("Questão não encontrada");
    const acertou = q.gabarito === data.resposta;
    await supabase
      .from("questoes")
      .update({ resposta_aluno: data.resposta, acertou })
      .eq("id", data.questaoId);
    return { acertou, gabarito: q.gabarito };
  });

export const finalizeSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), tempo_segundos: z.number().int().min(0) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: questoes } = await supabase
      .from("questoes")
      .select("assunto, acertou, gabarito, resposta_aluno")
      .eq("simulado_id", data.id);
    if (!questoes) throw new Error("Sem questões");

    const acertos = questoes.filter((q) => q.acertou).length;

    // Build IA feedback
    const apiKey = process.env.LOVABLE_API_KEY;
    let feedback = "";
    if (apiKey) {
      try {
        const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
        const gateway = createLovableAiGatewayProvider(apiKey);
        const resumo = questoes
          .map((q, i) => `Q${i + 1} [${q.assunto}]: ${q.acertou ? "ACERTOU" : `ERROU (gabarito ${q.gabarito}, marcou ${q.resposta_aluno ?? "—"})`}`)
          .join("\n");
        const { text } = await generateText({
          model: gateway("google/gemini-2.5-flash"),
          prompt: `Você é um tutor de vestibular. Analise o desempenho do aluno neste simulado e gere um feedback CURTO (máx. 6 linhas) em português brasileiro, em tom motivador.

Resultado:
${resumo}

Estruture em:
**Pontos fortes:** (1-2 assuntos onde acertou)
**Pontos a revisar:** (1-3 assuntos onde errou, com dica específica de estudo)
**Próximo passo:** (sugestão concreta)

Não use bullets longos, vá direto ao ponto.`,
        });
        feedback = text;
      } catch (e) {
        console.error("Feedback IA falhou:", e);
      }
    }

    await supabase
      .from("simulados")
      .update({
        status: "finalizado",
        acertos,
        tempo_segundos: data.tempo_segundos,
        feedback_ia: feedback,
        finalizado_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    // Update gamification stats
    const xpGanho = acertos * 10;
    const today = new Date().toISOString().slice(0, 10);
    const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", userId).single();
    if (stats) {
      let newStreak = stats.streak_dias || 0;
      if (stats.ultima_atividade !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        newStreak = stats.ultima_atividade === yesterday ? newStreak + 1 : 1;
      } else if (newStreak === 0) {
        newStreak = 1;
      }
      const newXp = (stats.xp || 0) + xpGanho;
      const newNivel = Math.floor(newXp / 200) + 1;
      await supabase
        .from("user_stats")
        .update({
          xp: newXp,
          nivel: newNivel,
          streak_dias: newStreak,
          ultima_atividade: today,
        })
        .eq("user_id", userId);
    }

    return { acertos, xpGanho };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profileRes, statsRes, ultimoRes, semanaRes] = await Promise.all([
      supabase.from("profiles").select("nome, avatar_url").eq("id", userId).maybeSingle(),
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("simulados")
        .select("id, banca, area, acertos, quantidade_questoes, created_at, status")
        .eq("user_id", userId)
        .eq("status", "finalizado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("simulados")
        .select("acertos, quantidade_questoes, created_at")
        .eq("user_id", userId)
        .eq("status", "finalizado")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);
    return {
      profile: profileRes.data,
      stats: statsRes.data,
      ultimoSimulado: ultimoRes.data,
      semana: semanaRes.data ?? [],
    };
  });

export const getHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("simulados")
      .select("id, banca, area, dificuldade, acertos, quantidade_questoes, created_at, status, tempo_segundos")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });
