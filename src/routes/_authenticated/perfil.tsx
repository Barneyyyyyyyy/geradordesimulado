import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/simulados.functions";
import { Flame, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: Perfil,
});

function Perfil() {
  const fetchDash = useServerFn(getDashboard);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

  const nome = data?.profile?.nome ?? "Estudante";
  const stats = data?.stats;

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      <h1 className="font-display text-3xl">Perfil</h1>

      <div className="mt-6 flex items-center gap-4 rounded-3xl border border-border bg-card p-5">
        <div className="grid size-14 place-items-center rounded-full bg-brand font-display text-2xl text-brand-foreground">
          {nome[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-display text-xl">{nome}</p>
          <p className="text-xs text-muted-foreground">Nível {stats?.nivel ?? 1} · {stats?.xp ?? 0} XP</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <Flame className="size-5 text-energy" />
          <p className="mt-2 font-display text-2xl">{stats?.streak_dias ?? 0}</p>
          <p className="text-xs text-muted-foreground">dias de streak</p>
        </div>
        <div className="rounded-3xl border border-border bg-card p-5">
          <Zap className="size-5 text-accent" />
          <p className="mt-2 font-display text-2xl">{stats?.xp ?? 0}</p>
          <p className="text-xs text-muted-foreground">XP totais</p>
        </div>
      </div>
    </div>
  );
}
