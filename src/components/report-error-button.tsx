import { useState } from "react";
import { Flag, Copy, Mail, Instagram, X } from "lucide-react";
import { toast } from "sonner";

export type ReportContext = {
  questaoId: string;
  enunciado: string;
  alternativas: Record<string, string>;
  gabarito: string;
  resposta_aluno?: string | null;
  explicacao?: string;
  area?: string;
  assunto?: string;
};

const TIPOS = [
  "Erro no enunciado",
  "Alternativa incorreta",
  "Gabarito errado",
  "Resolução incorreta",
  "Erro de cálculo",
  "Outro",
];

export function ReportErrorButton({ ctx, className = "" }: { ctx: ReportContext; className?: string }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [comentario, setComentario] = useState("");

  function buildSummary() {
    const alts = Object.entries(ctx.alternativas).map(([k, v]) => `${k}) ${v}`).join("\n");
    return `Questão: ${ctx.enunciado}\n\nAlternativas:\n${alts}\n\nGabarito: ${ctx.gabarito}\nResposta do aluno: ${ctx.resposta_aluno ?? "—"}\nÁrea: ${ctx.area ?? "—"}\nAssunto: ${ctx.assunto ?? "—"}\n\nResolução:\n${ctx.explicacao ?? "—"}`;
  }

  function save() {
    const report = {
      ...ctx,
      tipo,
      comentario,
      timestamp: new Date().toISOString(),
    };
    try {
      const prev = JSON.parse(localStorage.getItem("reports") || "[]");
      prev.push(report);
      localStorage.setItem("reports", JSON.stringify(prev));
      toast.success("Relato salvo. Obrigado pelo feedback!");
      setOpen(false);
      setComentario("");
    } catch {
      toast.error("Não foi possível salvar o relato.");
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(buildSummary());
      toast.success("Questão copiada para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground ${className}`}
      >
        <Flag className="size-3.5" /> Reportar erro
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-background p-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg">Reportar erro</h3>
              <button onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full border border-border">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipo de erro</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                >
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comentário</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={4}
                  placeholder="Descreva o problema..."
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                />
              </div>

              <button
                onClick={copyAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold"
              >
                <Copy className="size-3.5" /> Copiar questão completa
              </button>

              <div className="rounded-xl border border-border bg-card p-3 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Envie também por:</p>
                <a href="mailto:filipezanetti14@gmail.com" className="flex items-center gap-2 text-brand">
                  <Mail className="size-3" /> filipezanetti14@gmail.com
                </a>
                <a href="https://instagram.com/filipeznet" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand">
                  <Instagram className="size-3" /> @filipeznet
                </a>
              </div>

              <button
                onClick={save}
                className="w-full rounded-2xl bg-accent py-3 font-display text-sm text-accent-foreground shadow-pop active:translate-y-1 active:shadow-none"
              >
                Salvar relato
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
