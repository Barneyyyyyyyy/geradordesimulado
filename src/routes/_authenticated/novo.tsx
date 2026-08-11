import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createSimulado } from "@/lib/simulados.functions";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIDisclaimer } from "@/components/ai-disclaimer";

type Area = "matematica" | "linguagens" | "humanas" | "natureza" | "todas";
type Banca = "enem" | "fuvest" | "unicamp" | "unesp";
type Dif = "facil" | "medio" | "dificil" | "misto";
type Modo = "area" | "materia" | "unica" | "todas";

type Preset = { key: string; label: string; emoji: string; area: Area; materia: string };
const PRESETS_UNICA: Preset[] = [
  { key: "matematica", label: "Matemática", emoji: "📐", area: "matematica", materia: "Matemática (conteúdo geral do ensino médio)" },
  { key: "fisica", label: "Física", emoji: "⚛️", area: "natureza", materia: "Física (conteúdo geral do ensino médio)" },
  { key: "quimica", label: "Química", emoji: "🧪", area: "natureza", materia: "Química (conteúdo geral do ensino médio)" },
  { key: "biologia", label: "Biologia", emoji: "🧬", area: "natureza", materia: "Biologia (conteúdo geral do ensino médio)" },
  { key: "historia", label: "História", emoji: "🏛️", area: "humanas", materia: "História (Brasil e Geral, conteúdo geral do ensino médio)" },
  { key: "geografia", label: "Geografia", emoji: "🌎", area: "humanas", materia: "Geografia (Brasil e Mundo, conteúdo geral do ensino médio)" },
  { key: "filosofia", label: "Filosofia", emoji: "🤔", area: "humanas", materia: "Filosofia (conteúdo geral do ensino médio)" },
  { key: "sociologia", label: "Sociologia", emoji: "👥", area: "humanas", materia: "Sociologia (conteúdo geral do ensino médio)" },
  { key: "portugues", label: "Português", emoji: "📚", area: "linguagens", materia: "Língua Portuguesa - gramática e interpretação" },
  { key: "literatura", label: "Literatura", emoji: "📖", area: "linguagens", materia: "Literatura Brasileira e Portuguesa" },
  { key: "ingles", label: "Inglês", emoji: "🇬🇧", area: "linguagens", materia: "Inglês - interpretação e gramática" },
  { key: "redacao", label: "Redação", emoji: "✍️", area: "linguagens", materia: "Redação - estrutura dissertativo-argumentativa" },
];

const MATERIAS: Record<Area, string[]> = {
  matematica: [
    "Conjuntos Numéricos", "Razão e Proporção", "Regra de Três", "Porcentagem",
    "Equações do 1º grau", "Equações do 2º grau", "Inequações",
    "Funções (geral)", "Função Afim", "Função Quadrática", "Função Exponencial",
    "Função Logarítmica", "Função Modular", "Logaritmos",
    "Progressão Aritmética (PA)", "Progressão Geométrica (PG)",
    "Trigonometria no Triângulo Retângulo", "Trigonometria no Ciclo",
    "Lei dos Senos e Cossenos", "Geometria Plana", "Áreas de Figuras Planas",
    "Geometria Espacial - Prismas", "Geometria Espacial - Pirâmides",
    "Geometria Espacial - Cilindros", "Geometria Espacial - Cones",
    "Geometria Espacial - Esferas", "Geometria Analítica - Ponto e Reta",
    "Geometria Analítica - Circunferência", "Geometria Analítica - Cônicas",
    "Matrizes", "Determinantes", "Sistemas Lineares",
    "Análise Combinatória", "Probabilidade", "Estatística",
    "Matemática Financeira", "Juros Simples e Compostos",
    "Números Complexos", "Polinômios", "Binômio de Newton",
  ],
  natureza: [
    "Física - Cinemática", "Física - Dinâmica (Leis de Newton)",
    "Física - Energia e Trabalho", "Física - Impulso e Momento",
    "Física - Estática", "Física - Hidrostática", "Física - Gravitação",
    "Física - Termometria", "Física - Calorimetria", "Física - Termodinâmica",
    "Física - Dilatação", "Física - Óptica Geométrica", "Física - Óptica Física",
    "Física - Ondas", "Física - Acústica", "Física - Eletrostática",
    "Física - Eletrodinâmica", "Física - Circuitos Elétricos",
    "Física - Eletromagnetismo", "Física - Indução Eletromagnética",
    "Física Moderna - Relatividade", "Física Moderna - Quântica",
    "Química - Atomística", "Química - Tabela Periódica",
    "Química - Ligações Químicas", "Química - Funções Inorgânicas",
    "Química - Reações Inorgânicas", "Química - Estequiometria",
    "Química - Soluções", "Química - Termoquímica", "Química - Cinética Química",
    "Química - Equilíbrio Químico", "Química - Eletroquímica",
    "Química - Radioatividade", "Química Orgânica - Funções",
    "Química Orgânica - Isomeria", "Química Orgânica - Reações",
    "Bioquímica", "Biologia Celular", "Citologia", "Histologia",
    "Embriologia", "Genética - 1ª Lei de Mendel",
    "Genética - 2ª Lei de Mendel", "Genética Molecular", "Biotecnologia",
    "Evolução", "Ecologia", "Ecossistemas e Biomas",
    "Fisiologia Humana - Sistemas", "Anatomia Humana", "Botânica",
    "Zoologia - Invertebrados", "Zoologia - Vertebrados",
    "Microbiologia", "Parasitologia", "Vírus, Bactérias e Fungos",
  ],
  linguagens: [
    "Interpretação de Texto", "Gêneros Textuais", "Tipologia Textual",
    "Coesão e Coerência", "Gramática - Morfologia", "Gramática - Sintaxe",
    "Concordância Verbal e Nominal", "Regência Verbal e Nominal",
    "Crase", "Pontuação", "Ortografia", "Acentuação Gráfica",
    "Semântica", "Figuras de Linguagem", "Funções da Linguagem",
    "Variação Linguística",
    "Literatura - Trovadorismo", "Literatura - Humanismo",
    "Literatura - Classicismo", "Literatura - Quinhentismo",
    "Literatura - Barroco", "Literatura - Arcadismo",
    "Literatura - Romantismo", "Literatura - Realismo e Naturalismo",
    "Literatura - Parnasianismo", "Literatura - Simbolismo",
    "Literatura - Pré-Modernismo", "Literatura - Modernismo (1ª fase)",
    "Literatura - Modernismo (2ª fase)", "Literatura - Modernismo (3ª fase)",
    "Literatura Contemporânea", "Literatura Portuguesa",
    "Redação - Dissertativo-argumentativa", "Redação - Carta Argumentativa",
    "Inglês - Interpretação", "Inglês - Gramática",
    "Espanhol - Interpretação", "Espanhol - Gramática",
    "Artes - História da Arte", "Artes - Movimentos Artísticos",
    "Artes - Música", "Artes - Teatro e Dança",
    "Educação Física - Esportes", "Educação Física - Saúde e Corpo",
  ],
  humanas: [
    "História do Brasil - Colônia", "História do Brasil - Império",
    "História do Brasil - República Velha", "História do Brasil - Era Vargas",
    "História do Brasil - Ditadura Militar", "História do Brasil - Redemocratização",
    "História Geral - Antiguidade", "História Geral - Idade Média",
    "História Geral - Idade Moderna", "História Geral - Revolução Francesa",
    "História Geral - Revolução Industrial", "História Geral - Imperialismo",
    "História Geral - 1ª Guerra Mundial", "História Geral - Revolução Russa",
    "História Geral - Crise de 1929 e Entreguerras", "História Geral - Nazifascismo",
    "História Geral - 2ª Guerra Mundial", "História Geral - Revolução Chinesa e Cubana",
    "História Geral - Descolonização da África e Ásia",
    "História Geral - Guerra Fria", "História Geral - Mundo Contemporâneo",
    "Geografia - Cartografia", "Geografia - Geologia e Relevo",
    "Geografia - Clima", "Geografia - Hidrografia",
    "Geografia - Vegetação e Biomas", "Geografia - Demografia",
    "Geografia - Urbanização", "Geografia Agrária",
    "Geografia Industrial", "Geografia - Globalização",
    "Geografia do Brasil - Regiões", "Geografia do Brasil - Economia",
    "Geopolítica Mundial", "Geografia - Meio Ambiente e Sustentabilidade",
    "Filosofia Antiga", "Filosofia Medieval", "Filosofia Moderna",
    "Filosofia Contemporânea", "Ética e Política",
    "Sociologia - Clássicos (Marx, Weber, Durkheim)",
    "Sociologia - Cultura e Sociedade", "Sociologia - Trabalho",
    "Sociologia - Movimentos Sociais", "Sociologia - Cidadania e Direitos",
    "Atualidades", "Atualidades - Brasil", "Atualidades - Mundo",
  ],
};

export const Route = createFileRoute("/_authenticated/novo")({
  component: NovoSimulado,
});

function NovoSimulado() {
  const navigate = useNavigate();
  const create = useServerFn(createSimulado);
  const [modo, setModo] = useState<Modo>("area");
  const [area, setArea] = useState<Area>("matematica");
  const [materia, setMateria] = useState<string>("");
  const [banca, setBanca] = useState<Banca>("enem");
  const [dificuldade, setDificuldade] = useState<Dif>("medio");
  const [quantidade, setQuantidade] = useState(5);
  const [loading, setLoading] = useState(false);

  const [presetKey, setPresetKey] = useState<string>("");

  async function start() {
    let finalArea = area;
    let finalMateria: string | undefined;
    if (modo === "materia") {
      if (!materia) { toast.error("Selecione uma matéria"); return; }
      finalMateria = materia;
    } else if (modo === "unica") {
      const p = PRESETS_UNICA.find((x) => x.key === presetKey);
      if (!p) { toast.error("Escolha uma matéria"); return; }
      finalArea = p.area;
      finalMateria = p.materia;
    }
    setLoading(true);
    try {
      const res = await create({
        data: {
          area: finalArea,
          banca,
          dificuldade,
          quantidade,
          ...(finalMateria ? { materia: finalMateria } : {}),
        },
      });
      navigate({ to: "/simulado/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar simulado");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      <header className="flex items-center gap-3">
        <Link to="/app" className="grid size-10 place-items-center rounded-full border border-border">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-2xl">Novo simulado</h1>
      </header>

      <main className="mt-8 space-y-7">
        <AIDisclaimer />

        <Section label="Banca">
          <Grid options={[
            { v: "enem", l: "ENEM" }, { v: "fuvest", l: "FUVEST" },
            { v: "unicamp", l: "UNICAMP" }, { v: "unesp", l: "UNESP" },
          ]} value={banca} onChange={setBanca as any} />
        </Section>


        <Section label="Modo">
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: "area", l: "Por área" },
              { v: "unica", l: "Matéria única" },
              { v: "materia", l: "Tópico específico" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => { setModo(o.v as Modo); setMateria(""); setPresetKey(""); }}
                className={`rounded-2xl border-2 p-3 text-xs font-semibold transition ${
                  modo === o.v ? "border-brand bg-brand/10 text-foreground" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </Section>

        {modo === "unica" && (
          <Section label="Escolha a matéria">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS_UNICA.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPresetKey(p.key)}
                  className={`flex items-center gap-2 rounded-2xl border-2 p-3.5 text-sm font-semibold transition ${
                    presetKey === p.key
                      ? "border-brand bg-brand/10 text-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span> {p.label}
                </button>
              ))}
            </div>
          </Section>
        )}

        {(modo === "area" || modo === "materia") && (
          <Section label="Área do conhecimento">
            <Grid options={[
              { v: "matematica", l: "Matemática" }, { v: "linguagens", l: "Linguagens" },
              { v: "humanas", l: "Humanas" }, { v: "natureza", l: "Natureza" },
            ]} value={area} onChange={(v) => { setArea(v as Area); setMateria(""); }} />
          </Section>
        )}

        {modo === "materia" && (
          <Section label="Tópico específico">
            <div className="flex flex-wrap gap-2">
              {MATERIAS[area].map((m) => (
                <button
                  key={m}
                  onClick={() => setMateria(m)}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    materia === m
                      ? "bg-brand text-white"
                      : "border border-border bg-card text-muted-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section label="Dificuldade">
          <Grid options={[
            { v: "facil", l: "Fácil" }, { v: "medio", l: "Médio" },
            { v: "dificil", l: "Difícil" }, { v: "misto", l: "Misto" },
          ]} value={dificuldade} onChange={setDificuldade as any} />
        </Section>

        <Section label="Quantidade de questões">
          <div className="flex flex-wrap gap-2">
            {[5, 10, 20, 45].map((n) => (
              <button
                key={n}
                onClick={() => setQuantidade(n)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
                  quantidade === n
                    ? "bg-accent text-accent-foreground"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Section>

        <button
          onClick={start}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-accent py-5 font-display text-xl text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none disabled:opacity-70"
        >
          {loading ? (
            <><Loader2 className="size-5 animate-spin" /> Gerando questões com IA…</>
          ) : (
            <><Sparkles className="size-5" /> Começar agora</>
          )}
        </button>
        {loading && (
          <p className="text-center text-xs text-muted-foreground">Isso pode levar até 20 segundos.</p>
        )}
      </main>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Grid({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-2xl border-2 p-3.5 text-sm font-semibold transition ${
            value === o.v
              ? "border-brand bg-brand/10 text-foreground"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
