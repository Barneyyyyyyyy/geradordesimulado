import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { corrigirRedacao, listarRedacoes, apagarRedacao } from "@/lib/redacoes.functions";
import { AIDisclaimer } from "@/components/ai-disclaimer";

type Modelo = "enem" | "vestibular";

export const Route = createFileRoute("/_authenticated/redacao")({
  component: RedacaoPage,
});

function RedacaoPage() {
  const navigate = useNavigate();
  const corrigir = useServerFn(corrigirRedacao);
  const listar = useServerFn(listarRedacoes);
  const apagar = useServerFn(apagarRedacao);

  const [modelo, setModelo] = useState<Modelo>("enem");
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: historico, refetch } = useQuery({
    queryKey: ["redacoes"],
    queryFn: () => listar(),
  });

  const palavras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
  const minOk = texto.trim().length >= 200;

  async function enviar() {
    if (!tema.trim() || tema.trim().length < 3) {
      toast.error("Informe o tema proposto");
      return;
    }
    if (!minOk) {
      toast.error("A redação está muito curta (mínimo ~200 caracteres)");
      return;
    }
    setLoading(true);
    try {
      const res = await corrigir({ data: { modelo, tema: tema.trim(), texto: texto.trim() } });
      navigate({ to: "/redacao/$id", params: { id: res.id } });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao corrigir");
      setLoading(false);
    }
  }

  async function remover(id: string) {
    if (!confirm("Apagar esta redação?")) return;
    try {
      await apagar({ data: { id } });
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao apagar");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 pt-6 pb-12">
      <header className="flex items-center gap-3">
        <Link to="/app" className="grid size-10 place-items-center rounded-full border border-border">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-2xl">Correção de redação</h1>
      </header>

      <main className="mt-8 space-y-7">
        <AIDisclaimer />

        <Section label="Modelo de correção">
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "enem", l: "ENEM", s: "5 competências · 0–1000" },
              { v: "vestibular", l: "Vestibular", s: "FUVEST / USP / UNICAMP" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setModelo(o.v as Modelo)}
                className={`rounded-2xl border-2 p-4 text-left transition ${
                  modelo === o.v ? "border-brand bg-brand/10" : "border-border bg-card"
                }`}
              >
                <p className="font-display text-base">{o.l}</p>
                <p className="text-[11px] text-muted-foreground">{o.s}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Tema proposto">
          <input
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder='Ex.: "Desafios para a valorização da cultura indígena no Brasil"'
            className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-brand focus:outline-none"
          />
        </Section>

        <Section label={`Texto da redação · ${palavras} palavra${palavras === 1 ? "" : "s"}`}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={14}
            placeholder="Cole ou digite sua redação aqui…"
            className="w-full resize-y rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground focus:border-brand focus:outline-none"
          />
          {!minOk && texto.length > 0 && (
            <p className="text-xs text-energy">A IA precisa de pelo menos ~200 caracteres para corrigir.</p>
          )}
        </Section>

        <button
          onClick={enviar}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-3xl bg-accent py-5 font-display text-xl text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none disabled:opacity-70"
        >
          {loading ? (
            <><Loader2 className="size-5 animate-spin" /> Corrigindo com IA…</>
          ) : (
            <><Sparkles className="size-5" /> Corrigir redação</>
          )}
        </button>
        {loading && (
          <p className="text-center text-xs text-muted-foreground">Pode levar até 40 segundos.</p>
        )}

        {historico && historico.length > 0 && (
          <section className="space-y-3 pt-4">
            <h2 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Minhas redações
            </h2>
            <div className="space-y-2">
              {historico.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <Link
                    to="/redacao/$id"
                    params={{ id: r.id }}
                    className="flex flex-1 items-center gap-3"
                  >
                    <div className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand">
                      <FileText className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.tema}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {r.modelo === "enem" ? "ENEM" : "Vestibular"} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl text-accent">{r.nota_total}</p>
                      <p className="text-[9px] uppercase text-muted-foreground">/ 1000</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => remover(r.id)}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-energy"
                    aria-label="Apagar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
