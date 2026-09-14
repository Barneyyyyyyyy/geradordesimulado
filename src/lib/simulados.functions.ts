import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateObject, generateText } from "ai";
import { z } from "zod";

const AREA_LABEL: Record<string, string> = {
  matematica: "Matemática e suas Tecnologias",
  linguagens: "Linguagens, Códigos e suas Tecnologias",
  humanas: "Ciências Humanas e suas Tecnologias",
  natureza: "Ciências da Natureza e suas Tecnologias",
  todas: "Misturada — todas as áreas do conhecimento",
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
  area: z.enum(["matematica", "linguagens", "humanas", "natureza", "todas"]),
  materia: z.string().trim().max(80).optional(),
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
  explicacao: z.string().min(10),
});

function extractJsonArray(text: string): any[] | null {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    .trim();

  const tryParse = (s: string): any[] | null => {
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
      if (p && typeof p === "object") {
        for (const k of Object.keys(p)) if (Array.isArray((p as any)[k])) return (p as any)[k];
      }
    } catch {}
    return null;
  };

  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end > start) {
    const candidate = cleaned.slice(start, end + 1);
    const fixed = candidate
      .replace(/\\(?!["\\/bfnrtu])/g, "\\\\")
      .replace(/,\s*([}\]])/g, "$1");
    const r = tryParse(fixed) ?? tryParse(candidate);
    if (r) return r;

    // Recover from truncation: keep up to last complete object
    const lastObjEnd = fixed.lastIndexOf("}");
    if (lastObjEnd > 0) {
      const r2 = tryParse(fixed.slice(0, lastObjEnd + 1) + "]");
      if (r2) return r2;
    }
  }

  return tryParse(cleaned);
}

async function generateQuestions(input: z.infer<typeof CreateInput>): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(apiKey);

  const prompt = `Você é um especialista em vestibulares brasileiros (ENEM, FUVEST, UNICAMP, UNESP, ITA, IME, ESA, EsPCEx, AFA, EFOMM) com conhecimento profundo das provas reais.

Gere ${input.quantidade} questões INÉDITAS de múltipla escolha (5 alternativas A-E) ${input.area === "todas" ? "MISTURANDO TODAS AS ÁREAS DO CONHECIMENTO (Matemática, Linguagens, Ciências Humanas e Ciências da Natureza) — distribua as questões de forma equilibrada entre as quatro áreas" : `da área ${AREA_LABEL[input.area]}`}${input.materia ? `, FOCO EXCLUSIVO na matéria/assunto: \"${input.materia}\" (todas as ${input.quantidade} questões devem ser estritamente desse conteúdo)` : ""}, banca-alvo ${BANCA_LABEL[input.banca]}, dificuldade ${DIF_LABEL[input.dificuldade]}.

QUALIDADE E AUTENTICIDADE:
- Use questões reais da banca como INSPIRAÇÃO ESTRUTURAL apenas. PRESERVE: habilidade avaliada, raciocínio exigido, nível de dificuldade, estilo da banca.
- ALTERE OBRIGATORIAMENTE: contexto, personagens, cenários, dados numéricos, textos-base e exemplos. NUNCA copie integralmente uma questão real.
- A questão deve ser INÉDITA mas com o mesmo padrão cognitivo das provas originais.

PADRÃO DE ENUNCIADO:
- PRIORIZE: reportagens, gráficos (descritos textualmente), tabelas, trechos de livros, artigos científicos, documentos históricos, charges/tirinhas (descritas), situações-problema contextualizadas.
- EVITE enunciados didáticos. O aluno deve interpretar e aplicar conceitos.

CONSTRUÇÃO DAS ALTERNATIVAS:
1. Resolva internamente passo a passo e determine o VALOR/RESULTADO correto.
2. Gere DISTRATORES plausíveis representando erros comuns.
3. Garanta EXATAMENTE UMA alternativa correta.
4. CONFERÊNCIA DO GABARITO: após calcular o resultado final, percorra as 5 alternativas (A-E) e identifique explicitamente qual delas contém esse valor. Defina o campo "gabarito" como a letra dessa alternativa. Se nenhuma alternativa corresponder ao valor calculado, DESCARTE a questão e gere outra. Nunca marque como gabarito uma letra cujo conteúdo não bate com o resultado.

DIVERSIDADE (REGRA OBRIGATÓRIA):
- DISTRIBUIÇÃO DOS GABARITOS: as letras corretas devem ser distribuídas de forma equilibrada e VARIADA entre A, B, C, D e E ao longo das ${input.quantidade} questões — cada letra deve aparecer como gabarito aproximadamente ${Math.max(1, Math.round(input.quantidade / 5))} vez(es). É PROIBIDO concentrar gabaritos na mesma letra ou usar sequências previsíveis (A,B,C,D,E ou C,C,B,B...). Embaralhe de forma irregular.
- POSIÇÃO DA RESPOSTA: para cada questão, decida a letra do gabarito ANTES de escrever as alternativas, sorteando entre A-E, e posicione a resposta correta nessa letra.
- VARIEDADE ESTRUTURAL: NÃO repita o mesmo padrão de enunciado entre as questões. Alterne os formatos: situação-problema, texto-base, tabela, gráfico descrito, charge descrita, citação, caso histórico, experimento. Evite começar enunciados sempre da mesma forma.
- VARIEDADE DE TAMANHO: alterne enunciados curtos, médios e longos; alternativas curtas e longas. Evite que a alternativa correta seja sempre a mais longa/detalhada (padrão manjado) — às vezes a correta deve ser a mais curta.

VALIDAÇÃO INTERNA: gabarito conferido, cálculos verificados, coerência, uma só correta, distratores plausíveis, nível da banca. Se falhar, regenere ou omita.

REGENERAÇÃO OBRIGATÓRIA — se durante a resolução for detectado que:
- um ponto não existe;
- uma reta não pode ser definida;
- nenhuma alternativa corresponde ao resultado;
- a solução encontrada não satisfaz TODAS as condições do enunciado;
- o enunciado contém inconsistências (dados faltando, contradições, ambiguidade);
então DESCARTE a questão e gere outra no lugar. NUNCA escolha a alternativa "mais próxima", NUNCA arredonde para forçar encaixe e NUNCA tente justificar um gabarito incompatível com o cálculo.

ESTILO POR BANCA:
- ENEM: cotidiano, interdisciplinar, interpretação.
- FUVEST: técnico, direto, conceitual.
- UNICAMP: texto-base, raciocínio.
- UNESP: claros, textos científicos/literários.

CAMPO "explicacao" — use \\n: "**Gabarito:** [letra]\\n**Resolução:** [passo a passo]\\n**Erros comuns:** [por que cada distrator falha]"

CAMPO "assunto": tema + referência (ex: "Funções quadráticas (inspirado em FUVEST 2019)").

Português brasileiro. Retorne APENAS um array JSON válido, sem markdown, sem texto antes ou depois:
[{"assunto":"...","enunciado":"...","alternativas":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"gabarito":"A","explicacao":"..."}]`;

  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    prompt,
    temperature: 1,
    maxOutputTokens: Math.max(8000, input.quantidade * 1000),
  });

  const raw = extractJsonArray(text);
  if (!raw) {
    console.error("[simulados] AI response não parseável:", text.slice(0, 1500));
    throw new Error("Resposta da IA inválida. Tente novamente.");
  }

  const valid: GeneratedQuestion[] = [];
  for (const q of raw) {
    const parsed = GeneratedQuestionSchema.safeParse(q);
    if (parsed.success) valid.push(parsed.data);
  }
  return valid;
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

export const getAnaliseEvolucao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: simIds } = await supabase
      .from("simulados")
      .select("id, area")
      .eq("user_id", userId)
      .eq("status", "finalizado");

    if (!simIds || simIds.length === 0) {
      return { porAssunto: [], piores: [], totalAcertos: 0, totalErros: 0 };
    }
    const areaMap: Record<string, string> = {};
    for (const s of simIds) areaMap[s.id] = s.area;

    const { data: questoes } = await supabase
      .from("questoes")
      .select("simulado_id, assunto, acertou, resposta_aluno")
      .in("simulado_id", simIds.map((s) => s.id));

    const agg: Record<string, { area: string; assunto: string; acertos: number; total: number }> = {};
    let totalAcertos = 0;
    let totalErros = 0;

    for (const q of questoes ?? []) {
      if (q.resposta_aluno == null) continue;
      const area = areaMap[q.simulado_id] ?? "—";
      const key = `${area}::${q.assunto}`;
      if (!agg[key]) agg[key] = { area, assunto: q.assunto, acertos: 0, total: 0 };
      agg[key].total += 1;
      if (q.acertou) {
        agg[key].acertos += 1;
        totalAcertos += 1;
      } else {
        totalErros += 1;
      }
    }

    const porAssunto = Object.values(agg)
      .map((x) => ({ ...x, taxa: x.total > 0 ? Math.round((x.acertos / x.total) * 100) : 0 }))
      .sort((a, b) => a.taxa - b.taxa);

    const piores = porAssunto.filter((x) => x.total >= 2 && x.taxa < 70).slice(0, 5);
    const melhores = [...porAssunto]
      .filter((x) => x.total >= 2 && x.taxa >= 70)
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 5);

    return { porAssunto, piores, melhores, totalAcertos, totalErros };
  });
