import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createSimulado } from "@/lib/simulados.functions";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AIDisclaimer } from "@/components/ai-disclaimer";

type Area = "matematica" | "linguagens" | "humanas" | "natureza";
type Banca = "enem" | "fuvest" | "unicamp" | "unesp";
type Dif = "facil" | "medio" | "dificil" | "misto";

export const Route = createFileRoute("/_authenticated/novo")({
  component: NovoSimulado,
});

function NovoSimulado() {
  const navigate = useNavigate();
  const create = useServerFn(createSimulado);
  const [area, setArea] = useState<Area>("matematica");
  const [banca, setBanca] = useState<Banca>("enem");
  const [dificuldade, setDificuldade] = useState<Dif>("medio");
  const [quantidade, setQuantidade] = useState(5);
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await create({ data: { area, banca, dificuldade, quantidade } });
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

        <Section label="Área do conhecimento">
          <Grid options={[
            { v: "matematica", l: "Matemática" }, { v: "linguagens", l: "Linguagens" },
            { v: "humanas", l: "Humanas" }, { v: "natureza", l: "Natureza" },
          ]} value={area} onChange={setArea as any} />
        </Section>

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
