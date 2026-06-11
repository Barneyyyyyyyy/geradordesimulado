import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHistorico } from "@/lib/simulados.functions";

const AREA: Record<string, string> = { matematica: "Matemática", linguagens: "Linguagens", humanas: "Humanas", natureza: "Natureza" };

export const Route = createFileRoute("/_authenticated/estatisticas")({
  component: Estatisticas,
});

function Estatisticas() {
  const fetchHist = useServerFn(getHistorico);
  const { data } = useQuery({ queryKey: ["historico"], queryFn: () => fetchHist() });
  const finalizados = (data ?? []).filter((s) => s.status === "finalizado");
  const totalQ = finalizados.reduce((s, x) => s + x.quantidade_questoes, 0);
  const totalAc = finalizados.reduce((s, x) => s + x.acertos, 0);
  const taxa = totalQ > 0 ? Math.round((totalAc / totalQ) * 100) : 0;

  // por área
  const byArea: Record<string, { ac: number; tot: number }> = {};
  for (const s of finalizados) {
    if (!byArea[s.area]) byArea[s.area] = { ac: 0, tot: 0 };
    byArea[s.area].ac += s.acertos;
    byArea[s.area].tot += s.quantidade_questoes;
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      <h1 className="font-display text-3xl">Evolução</h1>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card label="Simulados" value={String(finalizados.length)} />
        <Card label="Questões" value={String(totalQ)} />
        <Card label="Acerto" value={`${taxa}%`} accent />
      </div>

      <h2 className="mt-8 mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Desempenho por área</h2>
      <div className="space-y-2">
        {Object.entries(byArea).length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            Termine um simulado para ver suas estatísticas.
          </div>
        )}
        {Object.entries(byArea).map(([a, v]) => {
          const pct = v.tot > 0 ? Math.round((v.ac / v.tot) * 100) : 0;
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
            </div>
          );
        })}
      </div>

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
