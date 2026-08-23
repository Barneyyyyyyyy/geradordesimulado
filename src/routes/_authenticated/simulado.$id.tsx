import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSimulado, answerQuestion, finalizeSimulado } from "@/lib/simulados.functions";
import { useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight, Loader2 } from "lucide-react";
import { AIDisclaimer } from "@/components/ai-disclaimer";
import { ReportErrorButton } from "@/components/report-error-button";
import { DuvidaIA } from "@/components/duvida-ia";

export const Route = createFileRoute("/_authenticated/simulado/$id")({
  component: ResponderSimulado,
});

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const BANCA: Record<string, string> = { enem: "ENEM", fuvest: "FUVEST", unicamp: "UNICAMP", unesp: "UNESP" };

function ResponderSimulado() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchSim = useServerFn(getSimulado);
  const answer = useServerFn(answerQuestion);
  const finalize = useServerFn(finalizeSimulado);

  const { data, isLoading } = useQuery({
    queryKey: ["simulado", id],
    queryFn: () => fetchSim({ data: { id } }),
  });

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState<null | { acertou: boolean; gabarito: string }>(null);
  const [finishing, setFinishing] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => { startRef.current = Date.now(); }, []);

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-accent" /></div>;
  }

  const questoes = data.questoes;
  const q = questoes[idx];
  const total = questoes.length;
  const progress = ((idx + (reveal ? 1 : 0)) / total) * 100;
  const alts = q.alternativas as Record<string, string>;

  async function confirm() {
    if (!selected || reveal) return;
    const r = await answer({ data: { questaoId: q.id, resposta: selected as any } });
    setReveal(r);
  }

  async function next() {
    if (idx + 1 < total) {
      setIdx(idx + 1);
      setSelected(null);
      setReveal(null);
    } else {
      setFinishing(true);
      const tempo = Math.floor((Date.now() - startRef.current) / 1000);
      await finalize({ data: { id, tempo_segundos: tempo } });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/resultado/$id", params: { id } });
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="font-display text-sm tabular-nums">{String(idx + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
      </div>

      {/* Question card */}
      <div className="mt-6 rounded-3xl bg-white p-6 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="rounded bg-brand/15 px-2 py-1 text-[10px] font-bold text-brand">{BANCA[data.banca]}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{q.assunto}</span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-pretty">{q.enunciado}</p>
      </div>

      {/* Alternativas */}
      <div className="mt-5 space-y-2.5">
        {LETTERS.map((L) => {
          const isPick = selected === L;
          const isRight = reveal && L === reveal.gabarito;
          const isWrongPick = reveal && isPick && !reveal.acertou;
          let cls = "border-border bg-card text-foreground";
          if (reveal) {
            if (isRight) cls = "border-accent bg-accent/15 text-foreground";
            else if (isWrongPick) cls = "border-destructive bg-destructive/15 text-foreground";
            else cls = "border-border bg-card opacity-60";
          } else if (isPick) {
            cls = "border-brand bg-brand/15 text-foreground";
          }
          return (
            <button
              key={L}
              disabled={!!reveal}
              onClick={() => setSelected(L)}
              className={`flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left text-sm transition ${cls}`}
            >
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg font-display ${
                isRight ? "bg-accent text-accent-foreground" : isWrongPick ? "bg-destructive text-destructive-foreground" : isPick ? "bg-brand text-brand-foreground" : "bg-secondary"
              }`}>
                {reveal && isRight ? <Check className="size-5" /> : reveal && isWrongPick ? <X className="size-5" /> : L}
              </span>
              <span>{alts[L]}</span>
            </button>
          );
        })}
      </div>

      {/* Explicação */}
      {reveal && (
        <>
          <div className="mt-5 rounded-3xl border border-border bg-card p-5">
            <p className={`mb-2 font-display text-lg ${reveal.acertou ? "text-accent" : "text-energy"}`}>
              {reveal.acertou ? "Mandou bem! 🎯" : "Quase! Vamos revisar."}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{q.explicacao}</p>
            <div className="mt-4 flex justify-end">
              <ReportErrorButton
                ctx={{
                  questaoId: q.id,
                  enunciado: q.enunciado,
                  alternativas: alts,
                  gabarito: reveal.gabarito,
                  resposta_aluno: selected,
                  explicacao: q.explicacao,
                  area: data.area,
                  assunto: q.assunto,
                }}
              />
            </div>
          </div>
          <DuvidaIA questaoId={q.id} className="mt-3" />
          <AIDisclaimer className="mt-3" />
        </>
      )}

      {/* Action */}
      <div className="mt-6 pb-2">
        {!reveal ? (
          <button
            onClick={confirm}
            disabled={!selected}
            className="w-full rounded-3xl bg-accent py-4 font-display text-lg text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none disabled:opacity-40 disabled:shadow-none"
          >
            Confirmar resposta
          </button>
        ) : (
          <button
            onClick={next}
            disabled={finishing}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-brand py-4 font-display text-lg text-brand-foreground shadow-pop-brand active:translate-y-1.5 active:shadow-none disabled:opacity-70"
          >
            {finishing ? <Loader2 className="size-5 animate-spin" /> : (
              <>{idx + 1 < total ? "Próxima questão" : "Ver resultado"} <ArrowRight className="size-5" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
