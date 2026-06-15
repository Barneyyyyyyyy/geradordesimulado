import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const CorrigirInput = z.object({
  modelo: z.enum(["enem", "vestibular"]),
  tema: z.string().trim().min(3).max(300),
  texto: z.string().trim().min(200).max(8000),
});

interface CorrecaoEnem {
  modelo: "enem";
  notas: { c1: number; c2: number; c3: number; c4: number; c5: number };
  comentarios: { c1: string; c2: string; c3: string; c4: string; c5: string };
  nota_total: number;
  pontos_fortes: string[];
  pontos_fracos: string[];
  sugestoes: { trecho: string; sugestao: string }[];
  feedback_geral: string;
}
interface CorrecaoVest {
  modelo: "vestibular";
  notas: { tema: number; tese: number; argumentacao: number; coesao: number; norma: number };
  comentarios: { tema: string; tese: string; argumentacao: string; coesao: string; norma: string };
  nota_total: number;
  pontos_fortes: string[];
  pontos_fracos: string[];
  sugestoes: { trecho: string; sugestao: string }[];
  feedback_geral: string;
}

function buildPromptEnem(tema: string, texto: string) {
  return `Você é um corretor oficial do ENEM, treinado pelo INEP. Corrija a redação abaixo seguindo RIGOROSAMENTE a matriz de referência do ENEM, com as 5 competências valendo 0, 40, 80, 120, 160 ou 200 pontos cada (total 0–1000).

COMPETÊNCIAS:
C1 - Demonstrar domínio da modalidade escrita formal da língua portuguesa.
C2 - Compreender a proposta e aplicar conceitos das várias áreas de conhecimento para desenvolver o tema, dentro dos limites estruturais do texto dissertativo-argumentativo em prosa.
C3 - Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos em defesa de um ponto de vista.
C4 - Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação.
C5 - Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos.

REGRAS DE ZERO:
- Fuga total ao tema → C2 = 0 e nota total = 0.
- Não respeitar a estrutura dissertativo-argumentativa → C2 ≤ 40.
- Cópia de trechos da coletânea/texto motivador → desconsiderar para contagem.
- Texto com menos de 7 linhas → 0.
- Proposta de intervenção que viole direitos humanos → C5 = 0.

TEMA PROPOSTO:
"${tema}"

REDAÇÃO DO ALUNO:
"""
${texto}
"""

Responda APENAS com JSON válido, sem comentários, sem markdown, sem texto antes ou depois. Estrutura exata:
{
  "notas": {"c1": <0|40|80|120|160|200>, "c2": ..., "c3": ..., "c4": ..., "c5": ...},
  "comentarios": {"c1": "...", "c2": "...", "c3": "...", "c4": "...", "c5": "..."},
  "pontos_fortes": ["..."],
  "pontos_fracos": ["..."],
  "sugestoes": [{"trecho": "trecho original do aluno", "sugestao": "reescrita melhorada"}],
  "feedback_geral": "parágrafo de devolutiva geral, honesto e construtivo"
}

Os comentários por competência devem ter pelo menos 2 frases explicando por que aquela nota foi atribuída, citando trechos quando útil. Inclua entre 3 e 6 sugestões de reescrita. Seja rigoroso: não infle notas.`;
}

function buildPromptVest(tema: string, texto: string) {
  return `Você é um corretor experiente de redação de vestibulares (FUVEST/UNICAMP/UNESP/PUC). Corrija a redação dissertativo-argumentativa abaixo. Cada critério vale 0 a 200, total 0 a 1000.

CRITÉRIOS:
- tema: aderência ao tema proposto e à proposta de redação.
- tese: clareza, originalidade e sustentação do ponto de vista defendido.
- argumentacao: qualidade, profundidade e variedade dos argumentos e repertório sociocultural.
- coesao: progressão textual, coerência interna e uso de conectivos.
- norma: domínio da norma culta (ortografia, sintaxe, concordância, regência, pontuação).

TEMA PROPOSTO:
"${tema}"

REDAÇÃO:
"""
${texto}
"""

Responda APENAS com JSON válido, sem markdown:
{
  "notas": {"tema": <0-200>, "tese": ..., "argumentacao": ..., "coesao": ..., "norma": ...},
  "comentarios": {"tema": "...", "tese": "...", "argumentacao": "...", "coesao": "...", "norma": "..."},
  "pontos_fortes": ["..."],
  "pontos_fracos": ["..."],
  "sugestoes": [{"trecho": "...", "sugestao": "..."}],
  "feedback_geral": "..."
}

Seja rigoroso e honesto. Inclua de 3 a 6 sugestões de reescrita citando trechos reais do aluno.`;
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  const i = cleaned.indexOf("{");
  const j = cleaned.lastIndexOf("}");
  if (i >= 0 && j > i) {
    return JSON.parse(cleaned.slice(i, j + 1));
  }
  throw new Error("Resposta da IA não veio em JSON válido");
}

export const corrigirRedacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CorrigirInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-pro");

    const prompt = data.modelo === "enem"
      ? buildPromptEnem(data.tema, data.texto)
      : buildPromptVest(data.tema, data.texto);

    let parsed: any;
    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.2,
      });
      parsed = extractJson(text);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("429")) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns instantes.");
      if (msg.includes("402")) throw new Error("Créditos de IA esgotados no workspace.");
      throw new Error("Falha ao corrigir a redação: " + msg);
    }

    // normaliza
    const notasObj = parsed?.notas ?? {};
    const notas = Object.fromEntries(
      Object.entries(notasObj).map(([k, v]) => [k, Math.max(0, Math.min(200, Math.round(Number(v) || 0)))]),
    );
    const nota_total = Object.values(notas).reduce((s: number, n: any) => s + (Number(n) || 0), 0);

    const row = {
      user_id: context.userId,
      modelo: data.modelo,
      tema: data.tema,
      texto: data.texto,
      nota_total,
      notas,
      comentarios: parsed?.comentarios ?? {},
      pontos_fortes: Array.isArray(parsed?.pontos_fortes) ? parsed.pontos_fortes : [],
      pontos_fracos: Array.isArray(parsed?.pontos_fracos) ? parsed.pontos_fracos : [],
      sugestoes: Array.isArray(parsed?.sugestoes) ? parsed.sugestoes : [],
      feedback_geral: String(parsed?.feedback_geral ?? ""),
    };

    const { data: saved, error } = await context.supabase
      .from("redacoes")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { id: saved.id as string };
  });

export const getRedacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase
      .from("redacoes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return r;
  });

export const listarRedacoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("redacoes")
      .select("id, modelo, tema, nota_total, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data;
  });

export const apagarRedacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("redacoes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
