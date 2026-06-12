import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject, generateText } from "ai";
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

const GeneratedQuestionSchema = z.object({
  assunto: z.string().min(3),
  enunciado: z.string().min(20),
  alternativas: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1),
    E: z.string().min(1),
  }),
  gabarito: z.enum(["A", "B", "C", "D", "E"]),
  explicacao: z.string().min(20),
});

function repairJsonArray(text: string): string | null {
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  cleaned = cleaned
    .slice(start, end + 1)
    .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, "\\\\")
    .replace(/,\s*([}\]])/g, "$1");

  return cleaned;
}

async function generateQuestions(input: z.infer<typeof CreateInput>): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(apiKey);

  const prompt = `Você é um especialista em vestibulares brasileiros (ENEM, FUVEST, UNICAMP, UNESP, ITA, IME, ESA, EsPCEx, AFA, EFOMM) com conhecimento profundo das provas reais.

Gere ${input.quantidade} questões INÉDITAS de múltipla escolha (5 alternativas A-E) da área ${AREA_LABEL[input.area]}, banca-alvo ${BANCA_LABEL[input.banca]}, dificuldade ${DIF_LABEL[input.dificuldade]}.

QUALIDADE E AUTENTICIDADE:
- Use questões reais da banca como INSPIRAÇÃO ESTRUTURAL apenas. PRESERVE: habilidade avaliada, raciocínio exigido, nível de dificuldade, estilo da banca.
- ALTERE OBRIGATORIAMENTE: contexto, personagens, cenários, dados numéricos, textos-base e exemplos. NUNCA copie integralmente uma questão real.
- A questão deve ser INÉDITA mas com o mesmo padrão cognitivo das provas originais.

PADRÃO DE ENUNCIADO:
- NÃO crie textos genéricos ou explicações de apostila.
- PRIORIZE: reportagens, gráficos (descritos textualmente), tabelas, mapas (descritos), trechos de livros, artigos científicos, documentos históricos, charges/tirinhas (descritas), campanhas publicitárias, situações-problema contextualizadas.
- EVITE enunciados didáticos que expliquem o conteúdo antes de perguntar. O aluno deve interpretar, relacionar informações e aplicar conceitos.
- Se a questão depende de texto/tabela/gráfico, INCLUA dentro do "enunciado".

CONSTRUÇÃO DAS ALTERNATIVAS (CRÍTICO):
1. Resolva a questão internamente passo a passo.
2. Determine o gabarito correto com certeza absoluta.
3. Gere DISTRATORES plausíveis — cada um representando um ERRO COMUM de estudante (cálculo errado, conceito invertido, interpretação parcial).
4. Reverifique cálculos, unidades, arredondamentos e conversões.
5. Garanta que exista EXATAMENTE UMA alternativa correta — proibido: duas corretas, nenhuma correta, gabarito ambíguo.
6. A alternativa correta NÃO pode ser identificada apenas por repetir palavras do texto-base.
7. Evite alternativas absurdas ou obviamente erradas.

VALIDAÇÃO INTERNA (execute antes de incluir a questão):
✓ Gabarito verificado resolvendo do zero
✓ Cálculos, unidades e conversões conferidos
✓ Coerência do enunciado
✓ Apenas UMA alternativa correta
✓ Distratores plausíveis
✓ Nível compatível com a banca
✓ Estilo da banca preservado
Se QUALQUER verificação falhar, REGENERE. Se ainda assim não tiver certeza, NÃO inclua — prefira gerar menos.

ESTILO POR BANCA:
- ENEM: contextos do cotidiano, interdisciplinar, foco em interpretação.
- FUVEST: técnico, direto, exige domínio conceitual profundo.
- UNICAMP: contextualizado com texto-base, raciocínio e interpretação.
- UNESP: enunciados claros, textos científicos/literários.
- ITA/IME: alto rigor matemático/físico, múltiplas etapas.
- ESA/EsPCEx/AFA/EFOMM: objetivo, aplicação direta de conceitos.

CAMPO "explicacao" — análise pedagógica COMPLETA, estruturada assim (use \\n para quebras):
"**Gabarito:** [letra]\\n**Área:** [área]\\n**Competência/Habilidade:** [descrição]\\n**Dificuldade:** [Fácil/Médio/Difícil]\\n**Resolução:** [passo a passo detalhado]\\n**Erros comuns:** [explique brevemente qual erro leva a cada distrator]"

CAMPO "assunto": tema + referência de banca/ano de inspiração (ex: "Funções quadráticas (inspirado em FUVEST 2019)").

Português brasileiro. Varie os assuntos. Retorne APENAS um array JSON válido, sem markdown:
[
  {
    "assunto": "tema + referência",
    "enunciado": "enunciado completo com texto-base se houver",
    "alternativas": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
    "gabarito": "A" | "B" | "C" | "D" | "E",
    "explicacao": "análise pedagógica estruturada conforme especificado"
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
