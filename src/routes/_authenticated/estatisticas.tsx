import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHistorico, getAnaliseEvolucao } from "@/lib/simulados.functions";
import { TrendingDown, Target, CheckCircle2, XCircle } from "lucide-react";

const AREA: Record<string, string> = { matematica: "Matemática", linguagens: "Linguagens", humanas: "Humanas", natureza: "Natureza" };

export const Route = createFileRoute("/_authenticated/estatisticas")({
  component: Estatisticas,
});

function Estatisticas() {
  const fetchHist = useServerFn(getHistorico);
  const fetchAnalise = useServerFn(getAnaliseEvolucao);
  const { data } = useQuery({ queryKey: ["historico"], queryFn: () => fetchHist() });
  const { data: analise } = useQuery({ queryKey: ["analise-evolucao"], queryFn: () => fetchAnalise() });
  const finalizados = (data ?? []).filter((s) => s.status === "finalizado");
  const totalQ = finalizados.reduce((s, x) => s + x.quantidade_questoes, 0);
  const totalAc = finalizados.reduce((s, x) => s + x.acertos, 0);
  const taxa = totalQ > 0 ? Math.round((totalAc / totalQ) * 100) : 0;

  const byArea: Record<string, { ac: number; tot: number }> = {};
  for (const s of finalizados) {
    if (!byArea[s.area]) byArea[s.area] = { ac: 0, tot: 0 };
    byArea[s.area].ac += s.acertos;
    byArea[s.area].tot += s.quantidade_questoes;
  }

  const totAc = analise?.totalAcertos ?? 0;
  const totEr = analise?.totalErros ?? 0;
  const totResp = totAc + totEr;
  const pctAc = totResp > 0 ? Math.round((totAc / totResp) * 100) : 0;
  const piores = analise?.piores ?? [];

  // pior assunto por área
  const piorPorArea: Record<string, { assunto: string; taxa: number; total: number }> = {};
  for (const item of analise?.porAssunto ?? []) {
    if (item.total < 2) continue;
    const cur = piorPorArea[item.area];
    if (!cur || item.taxa < cur.taxa) {
      piorPorArea[item.area] = { assunto: item.assunto, taxa: item.taxa, total: item.total };
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-10">
      <h1 className="font-display text-3xl">Evolução</h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card label="Simulados" value={String(finalizados.length)} />
        <Card label="Questões" value={String(totalQ)} />
        <Card label="Acerto" value={`${taxa}%`} accent />
      </div>

      {/* Análise geral */}
      {totResp > 0 && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Análise geral</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-accent/40 bg-accent/10 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-accent" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acertos</p>
              </div>
              <p className="mt-1 font-display text-2xl text-accent">{totAc}</p>
              <p className="text-[10px] text-muted-foreground">{pctAc}% das respondidas</p>
            </div>
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-destructive" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Erros</p>
              </div>
              <p className="mt-1 font-display text-2xl text-destructive">{totEr}</p>
              <p className="text-[10px] text-muted-foreground">{100 - pctAc}% das respondidas</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary flex">
            <div className="h-full bg-accent" style={{ width: `${pctAc}%` }} />
            <div className="h-full bg-destructive" style={{ width: `${100 - pctAc}%` }} />
          </div>
        </section>
      )}

      <h2 className="mt-8 mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Desempenho por área</h2>
      <div className="space-y-2">
        {Object.entries(byArea).length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Termine um simulado para ver suas estatísticas.
          </div>
        )}
        {Object.entries(byArea).map(([a, v]) => {
          const pct = v.tot > 0 ? Math.round((v.ac / v.tot) * 100) : 0;
          const pior = piorPorArea[a];
          return (
            <div key={a} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-base">{AREA[a]}</p>
                <p className="font-display text-lg text-accent">{pct}%</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">{v.ac}/{v.tot} questões</p>
              {pior && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-energy/10 border border-energy/30 px-3 py-2">
                  <Target className="size-3.5 shrink-0 text-energy" />
                  <p className="text-[11px] text-foreground">
                    Foco: <span className="font-semibold">{pior.assunto}</span>{" "}
                    <span className="text-muted-foreground">({pior.taxa}% de acerto)</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* O que mais precisa melhorar */}
      {piores.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <TrendingDown className="size-3.5" /> O que mais precisa melhorar
          </h2>
          <div className="space-y-2">
            {piores.map((p, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm">{p.assunto}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{AREA[p.area] ?? p.area}</p>
                  </div>
                  <p className="font-display text-lg text-destructive">{p.taxa}%</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-destructive" style={{ width: `${p.taxa}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">{p.acertos}/{p.total} questões</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <Link to="/novo" className="mt-8 mb-6 block rounded-3xl bg-accent py-4 text-center font-display text-lg text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none">
        Treinar mais
      </Link>
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${accent ? "border-accent/40 bg-accent/10" : "border-border bg-card"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
