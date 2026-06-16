import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHistorico, getAnaliseEvolucao } from "@/lib/simulados.functions";
import { TrendingDown, TrendingUp, Target, CheckCircle2, XCircle, Trophy, Clock, Calendar, Flame, BarChart3, Award } from "lucide-react";

const AREA: Record<string, string> = { matematica: "Matemática", linguagens: "Linguagens", humanas: "Humanas", natureza: "Natureza" };
const BANCA: Record<string, string> = { enem: "ENEM", fuvest: "FUVEST", unicamp: "UNICAMP", unesp: "UNESP" };
const DIF: Record<string, string> = { facil: "Fácil", medio: "Médio", dificil: "Difícil", misto: "Misto" };

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
  const totalTempo = finalizados.reduce((s, x) => s + (x.tempo_segundos ?? 0), 0);
  const tempoMedioPorQ = totalQ > 0 ? Math.round(totalTempo / totalQ) : 0;

  const byArea: Record<string, { ac: number; tot: number }> = {};
  const byBanca: Record<string, { ac: number; tot: number; n: number }> = {};
  const byDif: Record<string, { ac: number; tot: number; n: number }> = {};
  for (const s of finalizados) {
    if (!byArea[s.area]) byArea[s.area] = { ac: 0, tot: 0 };
    byArea[s.area].ac += s.acertos;
    byArea[s.area].tot += s.quantidade_questoes;
    if (!byBanca[s.banca]) byBanca[s.banca] = { ac: 0, tot: 0, n: 0 };
    byBanca[s.banca].ac += s.acertos;
    byBanca[s.banca].tot += s.quantidade_questoes;
    byBanca[s.banca].n += 1;
    if (!byDif[s.dificuldade]) byDif[s.dificuldade] = { ac: 0, tot: 0, n: 0 };
    byDif[s.dificuldade].ac += s.acertos;
    byDif[s.dificuldade].tot += s.quantidade_questoes;
    byDif[s.dificuldade].n += 1;
  }

  const totAc = analise?.totalAcertos ?? 0;
  const totEr = analise?.totalErros ?? 0;
  const totResp = totAc + totEr;
  const pctAc = totResp > 0 ? Math.round((totAc / totResp) * 100) : 0;
  const piores = analise?.piores ?? [];
  const melhores = (analise as any)?.melhores ?? [];

  // pior assunto por área
  const piorPorArea: Record<string, { assunto: string; taxa: number; total: number }> = {};
  for (const item of analise?.porAssunto ?? []) {
    if (item.total < 2) continue;
    const cur = piorPorArea[item.area];
    if (!cur || item.taxa < cur.taxa) {
      piorPorArea[item.area] = { assunto: item.assunto, taxa: item.taxa, total: item.total };
    }
  }

  // Evolução simulado a simulado (cronológico)
  const evolucao = [...finalizados]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((s) => ({
      taxa: s.quantidade_questoes > 0 ? Math.round((s.acertos / s.quantidade_questoes) * 100) : 0,
      data: s.created_at,
    }));
  const ultimos5 = evolucao.slice(-5);
  const anteriores5 = evolucao.slice(-10, -5);
  const mediaUlt = ultimos5.length ? Math.round(ultimos5.reduce((s, x) => s + x.taxa, 0) / ultimos5.length) : 0;
  const mediaAnt = anteriores5.length ? Math.round(anteriores5.reduce((s, x) => s + x.taxa, 0) / anteriores5.length) : 0;
  const delta = mediaUlt - mediaAnt;

  // Melhor e pior simulado
  const ordenadosPorTaxa = [...finalizados].map((s) => ({
    ...s,
    taxa: s.quantidade_questoes > 0 ? Math.round((s.acertos / s.quantidade_questoes) * 100) : 0,
  }));
  const melhorSim = ordenadosPorTaxa.reduce<typeof ordenadosPorTaxa[number] | null>((a, b) => (!a || b.taxa > a.taxa ? b : a), null);

  // Dias ativos
  const diasAtivos = new Set(finalizados.map((s) => s.created_at.slice(0, 10))).size;

  // Total de assuntos estudados
  const assuntosEstudados = (analise?.porAssunto ?? []).length;

  // Sparkline
  const sparkW = 300, sparkH = 60;
  const sparkPts = evolucao.length > 1
    ? evolucao.map((p, i) => {
        const x = (i / (evolucao.length - 1)) * sparkW;
        const y = sparkH - (p.taxa / 100) * sparkH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ")
    : "";

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-10">
      <h1 className="font-display text-3xl">Evolução</h1>
      <p className="mt-1 text-sm text-muted-foreground">Visão completa do seu desempenho</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card label="Simulados" value={String(finalizados.length)} />
        <Card label="Questões" value={String(totalQ)} />
        <Card label="Acerto" value={`${taxa}%`} accent />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Card label="Dias ativos" value={String(diasAtivos)} icon={<Calendar className="size-3.5" />} />
        <Card label="Assuntos" value={String(assuntosEstudados)} icon={<BarChart3 className="size-3.5" />} />
        <Card label="Tempo/q" value={tempoMedioPorQ > 0 ? `${tempoMedioPorQ}s` : "—"} icon={<Clock className="size-3.5" />} />
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

      {/* Evolução temporal */}
      {evolucao.length >= 2 && (
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Linha do tempo</h2>
            {anteriores5.length > 0 && (
              <div className={`flex items-center gap-1 text-xs font-bold ${delta >= 0 ? "text-accent" : "text-destructive"}`}>
                {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {delta >= 0 ? "+" : ""}{delta}% vs. anteriores
              </div>
            )}
          </div>
          <svg viewBox={`0 0 ${sparkW} ${sparkH}`} className="mt-3 w-full" preserveAspectRatio="none" style={{ height: 60 }}>
            <line x1="0" y1={sparkH / 2} x2={sparkW} y2={sparkH / 2} stroke="currentColor" className="text-border" strokeDasharray="2 3" />
            <polyline fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" points={sparkPts} />
            {evolucao.map((p, i) => {
              const x = evolucao.length > 1 ? (i / (evolucao.length - 1)) * sparkW : sparkW / 2;
              const y = sparkH - (p.taxa / 100) * sparkH;
              return <circle key={i} cx={x} cy={y} r="2.5" className="fill-accent" />;
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>1º simulado: {evolucao[0].taxa}%</span>
            <span>Último: {evolucao[evolucao.length - 1].taxa}%</span>
          </div>
        </section>
      )}

      {/* Recorde */}
      {melhorSim && (
        <section className="mt-6 rounded-3xl border border-energy/40 bg-energy/10 p-5">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-energy" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seu recorde</h2>
          </div>
          <p className="mt-2 font-display text-3xl text-energy">{melhorSim.taxa}%</p>
          <p className="text-xs text-muted-foreground">
            {melhorSim.acertos}/{melhorSim.quantidade_questoes} acertos em {AREA[melhorSim.area]} · {BANCA[melhorSim.banca]}
          </p>
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

      {/* Por banca */}
      {Object.keys(byBanca).length > 0 && (
        <>
          <h2 className="mt-8 mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Por banca</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(byBanca).map(([b, v]) => {
              const pct = v.tot > 0 ? Math.round((v.ac / v.tot) * 100) : 0;
              return (
                <div key={b} className="rounded-2xl border border-border bg-card p-3">
                  <p className="font-display text-sm">{BANCA[b] ?? b}</p>
                  <p className="mt-1 font-display text-xl text-accent">{pct}%</p>
                  <p className="text-[10px] text-muted-foreground">{v.n} simulado{v.n > 1 ? "s" : ""} · {v.ac}/{v.tot}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Por dificuldade */}
      {Object.keys(byDif).length > 0 && (
        <>
          <h2 className="mt-8 mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Por dificuldade</h2>
          <div className="space-y-2">
            {Object.entries(byDif).map(([d, v]) => {
              const pct = v.tot > 0 ? Math.round((v.ac / v.tot) * 100) : 0;
              return (
                <div key={d} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="font-display text-sm">{DIF[d] ?? d}</p>
                    <p className="font-display text-base text-accent">{pct}%</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{v.n} simulado{v.n > 1 ? "s" : ""} · {v.ac}/{v.tot}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Melhores assuntos */}
      {melhores.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Award className="size-3.5" /> Seus pontos fortes
          </h2>
          <div className="space-y-2">
            {melhores.map((p: any, i: number) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm">{p.assunto}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{AREA[p.area] ?? p.area}</p>
                  </div>
                  <p className="font-display text-lg text-accent">{p.taxa}%</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-accent" style={{ width: `${p.taxa}%` }} />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">{p.acertos}/{p.total} questões</p>
              </div>
            ))}
          </div>
        </section>
      )}

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

      {/* Últimos simulados */}
      {finalizados.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Flame className="size-3.5" /> Últimos simulados
          </h2>
          <div className="space-y-2">
            {finalizados.slice(0, 5).map((s) => {
              const pct = s.quantidade_questoes > 0 ? Math.round((s.acertos / s.quantidade_questoes) * 100) : 0;
              return (
                <Link
                  key={s.id}
                  to="/resultado/$id"
                  params={{ id: s.id }}
                  className="block rounded-2xl border border-border bg-card p-3 active:translate-y-0.5 transition-transform"
                >
                  <div className="flex items-baseline justify-between">
                    <p className="font-display text-sm">{AREA[s.area]} · {BANCA[s.banca]}</p>
                    <p className={`font-display text-base ${pct >= 70 ? "text-accent" : pct >= 50 ? "text-energy" : "text-destructive"}`}>{pct}%</p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {s.acertos}/{s.quantidade_questoes} · {new Date(s.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Link to="/novo" className="mt-8 mb-6 block rounded-3xl bg-accent py-4 text-center font-display text-lg text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none">
        Treinar mais
      </Link>
    </div>
  );
}

function Card({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${accent ? "border-accent/40 bg-accent/10" : "border-border bg-card"}`}>
      <div className="flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`mt-1 font-display text-xl ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
