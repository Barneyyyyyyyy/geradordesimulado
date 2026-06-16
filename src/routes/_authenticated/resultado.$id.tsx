import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSimulado } from "@/lib/simulados.functions";
import { Check, X, Loader2, Sparkles, Home, Plus } from "lucide-react";

const BANCA: Record<string, string> = { enem: "ENEM", fuvest: "FUVEST", unicamp: "UNICAMP", unesp: "UNESP" };
const AREA: Record<string, string> = { matematica: "Matemática", linguagens: "Linguagens", humanas: "Humanas", natureza: "Natureza" };

export const Route = createFileRoute("/_authenticated/resultado/$id")({
  component: Resultado,
});

function Resultado() {
  const { id } = Route.useParams();
  const fetchSim = useServerFn(getSimulado);
  const { data, isLoading } = useQuery({ queryKey: ["simulado", id], queryFn: () => fetchSim({ data: { id } }) });

  if (isLoading || !data) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-accent" /></div>;

  const total = data.questoes.length;
  const acertos = data.questoes.filter((q: any) => q.acertou).length;
  const pct = Math.round((acertos / total) * 100);

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{BANCA[data.banca]} · {AREA[data.area]}</p>
        <h1 className="mt-2 font-display text-4xl">{pct >= 70 ? "Você arrasou! 🎉" : pct >= 50 ? "Bom trabalho 💪" : "Bora revisar 📚"}</h1>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Stat label="Acertos" value={`${acertos}/${total}`} />
        <Stat label="Taxa" value={`${pct}%`} accent />
      </div>

      {data.feedback_ia && (
        <div className="mt-6 rounded-3xl border border-brand/40 bg-brand/10 p-5">
          <div className="mb-2 flex items-center gap-2 text-brand">
            <Sparkles className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Feedback do tutor IA</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{data.feedback_ia}</p>
        </div>
      )}

      <h2 className="mt-8 mb-3 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Revisão por questão</h2>
      <div className="space-y-2">
        {data.questoes.map((q: any, i: number) => (
          <details key={q.id} className="rounded-2xl border border-border bg-card">
            <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 list-none">
              <div className="flex items-center gap-3">
                <div className={`grid size-8 place-items-center rounded-lg ${q.acertou ? "bg-accent text-accent-foreground" : "bg-destructive text-destructive-foreground"}`}>
                  {q.acertou ? <Check className="size-4" /> : <X className="size-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold">Questão {i + 1}</p>
                  <p className="text-[10px] text-muted-foreground">{q.assunto}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">ver</span>
            </summary>
            <div className="border-t border-border p-4">
              <p className="mb-3 text-sm text-foreground whitespace-pre-wrap">{q.enunciado}</p>
              <p className="text-xs text-muted-foreground">Sua resposta: <span className="font-bold text-foreground">{q.resposta_aluno ?? "—"}</span> · Gabarito: <span className="font-bold text-accent">{q.gabarito}</span></p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{q.explicacao}</p>
            </div>
          </details>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 pb-6">
        <Link to="/app" className="flex items-center justify-center gap-2 rounded-3xl border border-border bg-card py-4 font-display text-sm">
          <Home className="size-4" /> Início
        </Link>
        <Link to="/novo" className="flex items-center justify-center gap-2 rounded-3xl bg-accent py-4 font-display text-sm text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none">
          <Plus className="size-4" /> Novo
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 text-center ${accent ? "border-accent/40 bg-accent/10" : "border-border bg-card"}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
