import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHistorico } from "@/lib/simulados.functions";
import { ChevronRight } from "lucide-react";

const BANCA: Record<string, string> = { enem: "ENEM", fuvest: "FUVEST", unicamp: "UNICAMP", unesp: "UNESP" };
const AREA: Record<string, string> = { matematica: "Matemática", linguagens: "Linguagens", humanas: "Humanas", natureza: "Natureza" };

export const Route = createFileRoute("/_authenticated/historico")({
  component: Historico,
});

function Historico() {
  const fetchHist = useServerFn(getHistorico);
  const { data, isLoading } = useQuery({ queryKey: ["historico"], queryFn: () => fetchHist() });

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      <h1 className="font-display text-3xl">Histórico</h1>
      <p className="mt-1 text-sm text-muted-foreground">Seus simulados recentes</p>

      <div className="mt-6 space-y-2">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />)}
        {data?.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum simulado ainda.</p>
            <Link to="/novo" className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground">Criar primeiro</Link>
          </div>
        )}
        {data?.map((s) => {
          const finalizado = s.status === "finalizado";
          const pct = finalizado && s.quantidade_questoes > 0 ? Math.round((s.acertos / s.quantidade_questoes) * 100) : null;
          const target = finalizado ? "/resultado/$id" : "/simulado/$id";
          return (
            <Link
              key={s.id}
              to={target as any}
              params={{ id: s.id }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 active:scale-[0.99]"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{BANCA[s.banca]}</p>
                <p className="truncate font-display text-base">{AREA[s.area]}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {s.quantidade_questoes} questões</p>
              </div>
              <div className="flex items-center gap-2">
                {pct !== null ? (
                  <span className="font-display text-lg text-accent">{pct}%</span>
                ) : (
                  <span className="rounded-full bg-energy/20 px-2 py-0.5 text-[10px] font-bold uppercase text-energy">Em andamento</span>
                )}
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
