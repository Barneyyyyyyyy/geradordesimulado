import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { perguntarSobreQuestao } from "@/lib/duvidas.functions";
import { MessageCircleQuestion, Loader2, Send } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Explique de outro jeito, bem simples",
  "Por que a minha alternativa está errada?",
  "Mostre o passo a passo do cálculo",
  "Acho que o gabarito está errado, confere?",
];

export function DuvidaIA({ questaoId, className = "" }: { questaoId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ask = useServerFn(perguntarSobreQuestao);

  async function send(pergunta: string) {
    const texto = pergunta.trim();
    if (!texto || loading) return;
    setErro(null);
    setInput("");
    const historico = msgs;
    setMsgs([...historico, { role: "user", content: texto }]);
    setLoading(true);
    try {
      const r = await ask({ data: { questaoId, historico, pergunta: texto } });
      setMsgs((m) => [...m, { role: "assistant", content: r.resposta }]);
    } catch (e: any) {
      setErro(e?.message ?? "Não consegui responder agora. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-brand/40 bg-brand/10 py-3 font-display text-sm text-brand ${className}`}
      >
        <MessageCircleQuestion className="size-4" /> Tirar dúvida com a IA
      </button>
    );
  }

  return (
    <div className={`rounded-3xl border-2 border-brand/40 bg-brand/5 p-4 ${className}`}>
      <div className="flex items-center gap-2 text-brand">
        <MessageCircleQuestion className="size-4" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Tutor IA · dúvidas desta questão</span>
      </div>

      {msgs.length > 0 && (
        <div className="mt-3 space-y-2.5">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-6 bg-brand/15 text-foreground"
                  : "mr-2 border border-border bg-card text-muted-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" /> pensando...
        </div>
      )}
      {erro && <p className="mt-3 text-xs text-destructive">{erro}</p>}

      {msgs.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte o que não entendeu..."
          className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-brand-foreground disabled:opacity-40"
          aria-label="Enviar pergunta"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
