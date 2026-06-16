import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/simulados.functions";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Zap, Plus, TrendingUp } from "lucide-react";

const AREA_LABEL: Record<string, string> = {
  matematica: "Matemática", linguagens: "Linguagens", humanas: "Humanas", natureza: "Natureza",
};
const BANCA_LABEL: Record<string, string> = { enem: "ENEM", fuvest: "FUVEST", unicamp: "UNICAMP", unesp: "UNESP" };

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
});

function Dashboard() {
  const fetchDashboard = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });
  const navigate = useNavigate();

  const nome = data?.profile?.nome ?? "Estudante";
  const streak = data?.stats?.streak_dias ?? 0;
  const xp = data?.stats?.xp ?? 0;
  const nivel = data?.stats?.nivel ?? 1;
  const ultimo = data?.ultimoSimulado;
  const semana = data?.semana ?? [];

  const acertosSemana = semana.reduce((s: number, x: any) => s + (x.acertos || 0), 0);
  const totalSemana = semana.reduce((s: number, x: any) => s + (x.quantidade_questoes || 0), 0);
  const taxaSemana = totalSemana > 0 ? Math.round((acertosSemana / totalSemana) * 100) : 0;

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={logout} className="grid size-10 place-items-center rounded-full bg-brand font-display text-lg text-brand-foreground">
            {nome[0]?.toUpperCase()}
          </button>
          <div>
            <p className="text-xs text-muted-foreground">Olá,</p>
            <p className="font-display text-base leading-none">{nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
          <Flame className="size-4 text-energy" />
          <span className="font-display text-sm">{streak} {streak === 1 ? "DIA" : "DIAS"}</span>
        </div>
      </header>

      <main className="mt-8 space-y-6">
        {/* Stats row */}
        <section className="grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-3xl bg-brand p-5">
            <div className="absolute -right-4 -top-4 size-20 rounded-full bg-white/10 blur-2xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">Nível</p>
            <h3 className="font-display text-3xl text-white">{nivel}</h3>
            <p className="mt-1 text-xs text-white/80">{xp} XP totais</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acerto semana</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-3xl">{taxaSemana}%</span>
              {taxaSemana >= 60 && <TrendingUp className="size-4 text-accent" />}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{acertosSemana}/{totalSemana} questões</p>
          </div>
        </section>

        {/* CTA */}
        <Link
          to="/novo"
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-accent py-5 font-display text-xl text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none"
        >
          <Plus className="size-6" strokeWidth={3} /> CRIAR NOVO SIMULADO
        </Link>


        {/* Último simulado */}
        <section>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Último simulado</h2>
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-3xl bg-card" />
          ) : ultimo ? (
            <Link to="/resultado/$id" params={{ id: ultimo.id }} className="block rounded-3xl border border-border bg-card p-5 transition active:scale-[0.99]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{BANCA_LABEL[ultimo.banca]}</p>
                  <h3 className="mt-1 font-display text-lg">{AREA_LABEL[ultimo.area]}</h3>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-accent">{ultimo.acertos}/{ultimo.quantidade_questoes}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">acertos</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-6 text-center">
              <Zap className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Crie seu primeiro simulado e dispare o streak 🔥</p>
            </div>
          )}
        </section>

        {/* Mini chart semana */}
        {semana.length > 0 && (
          <section className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Últimos 7 dias</h2>
            <div className="flex h-20 items-end justify-between gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
                const dia = semana.filter((s: any) => s.created_at?.startsWith(day));
                const ac = dia.reduce((s: number, x: any) => s + (x.acertos || 0), 0);
                const tot = dia.reduce((s: number, x: any) => s + (x.quantidade_questoes || 0), 0);
                const pct = tot > 0 ? (ac / tot) * 100 : 0;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-16 w-full items-end">
                      <div
                        className={`w-full rounded-t-md ${pct > 0 ? "bg-accent" : "bg-secondary"}`}
                        style={{ height: `${Math.max(pct, 6)}%` }}
                      />
                    </div>
                    <span className="text-[9px] uppercase text-muted-foreground">{["D","S","T","Q","Q","S","S"][new Date(day).getDay()]}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
