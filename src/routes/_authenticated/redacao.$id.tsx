import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRedacao } from "@/lib/redacoes.functions";
import { ArrowLeft, CheckCircle2, AlertCircle, Lightbulb, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/redacao/$id")({
  component: ResultadoRedacao,
});

const LABELS_ENEM: Record<string, string> = {
  c1: "C1 · Norma culta",
  c2: "C2 · Compreensão do tema",
  c3: "C3 · Argumentação",
  c4: "C4 · Coesão",
  c5: "C5 · Proposta de intervenção",
};
const LABELS_VEST: Record<string, string> = {
  tema: "Tema",
  tese: "Tese",
  argumentacao: "Argumentação",
  coesao: "Coesão",
  norma: "Norma culta",
};

function ResultadoRedacao() {
  const { id } = Route.useParams();
  const fetchOne = useServerFn(getRedacao);
  const { data, isLoading } = useQuery({
    queryKey: ["redacao", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const r: any = data;
  const labels = r.modelo === "enem" ? LABELS_ENEM : LABELS_VEST;
  const total = Number(r.nota_total ?? 0);
  const pct = Math.round((total / 1000) * 100);
  const cor = pct >= 75 ? "text-accent" : pct >= 50 ? "text-brand" : "text-energy";

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-16">
      <header className="flex items-center gap-3">
        <Link to="/redacao" className="grid size-10 place-items-center rounded-full border border-border">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-2xl">Resultado</h1>
      </header>

      <main className="mt-8 space-y-6">
        <section className="rounded-3xl border border-border bg-card p-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {r.modelo === "enem" ? "Padrão ENEM" : "Padrão Vestibular"}
          </p>
          <p className={`mt-2 font-display text-6xl ${cor}`}>{total}</p>
          <p className="text-xs text-muted-foreground">de 1000 pontos</p>
          <p className="mt-3 line-clamp-2 text-sm">{r.tema}</p>
        </section>

        <section className="space-y-3">
          <h2 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Notas por critério
          </h2>
          <div className="space-y-2">
            {Object.entries(r.notas ?? {}).map(([k, v]) => {
              const nota = Number(v);
              const ppct = (nota / 200) * 100;
              return (
                <div key={k} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">{labels[k] ?? k}</p>
                    <p className="font-display text-lg">{nota}<span className="text-xs text-muted-foreground">/200</span></p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${ppct}%` }} />
                  </div>
                  {r.comentarios?.[k] && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.comentarios[k]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {r.pontos_fortes?.length > 0 && (
          <Block title="Pontos fortes" icon={<CheckCircle2 className="size-4 text-accent" />} items={r.pontos_fortes} tone="accent" />
        )}
        {r.pontos_fracos?.length > 0 && (
          <Block title="A melhorar" icon={<AlertCircle className="size-4 text-energy" />} items={r.pontos_fracos} tone="energy" />
        )}

        {Array.isArray(r.sugestoes) && r.sugestoes.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Lightbulb className="size-3.5 text-brand" /> Sugestões de reescrita
            </h2>
            <div className="space-y-3">
              {r.sugestoes.map((s: any, i: number) => (
                <div key={i} className="space-y-2 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trecho original</p>
                    <p className="mt-1 text-sm italic text-foreground/80">"{s.trecho}"</p>
                  </div>
                  <div className="rounded-xl bg-brand/10 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-brand">Sugestão</p>
                    <p className="mt-1 text-sm">{s.sugestao}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {r.feedback_geral && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Devolutiva geral</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{r.feedback_geral}</p>
          </section>
        )}

        <details className="rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ver redação enviada
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{r.texto}</p>
        </details>
      </main>
    </div>
  );
}

function Block({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: string[]; tone: "accent" | "energy" }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon} {title}
      </h2>
      <ul className={`space-y-1.5 rounded-2xl border border-border bg-card p-4 text-sm`}>
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={tone === "accent" ? "text-accent" : "text-energy"}>•</span>
            <span className="flex-1">{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
