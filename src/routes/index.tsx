import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Brain, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Aprovado — Simulados ENEM, FUVEST, UNICAMP e UNESP com IA" },
      { name: "description", content: "Pratique para o ENEM e principais vestibulares com simulados gerados por IA, correção inteligente e um tutor pessoal que acompanha sua evolução." },
      { property: "og:title", content: "Aprovado — Simulados com IA para vestibulares" },
      { property: "og:description", content: "Simulados personalizados de ENEM, FUVEST, UNICAMP e UNESP com correção por IA." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-lg text-brand-foreground">A</div>
          <span className="font-display text-lg">Aprovado</span>
        </div>
        <Link to="/auth" className="rounded-full border border-border/60 px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary">
          Entrar
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-20">
        <section className="pt-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
            <Sparkles className="size-3.5" /> Tutor pessoal com IA
          </span>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] text-balance">
            Treine para o <span className="text-accent">ENEM</span> e vestibulares como nunca.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Simulados personalizados de FUVEST, UNICAMP, UNESP e ENEM gerados na hora.
            A IA corrige, explica e te diz exatamente o que estudar a seguir.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              to="/auth"
              className="w-full rounded-3xl bg-accent py-4 text-center font-display text-lg text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none"
            >
              Começar grátis 🚀
            </Link>
            <p className="text-center text-xs text-muted-foreground">Sem cartão. Sem enrolação.</p>
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 gap-3">
          <FeatureCard icon={Brain} title="Correção inteligente" desc="A IA explica passo a passo por que a alternativa correta é correta — e onde você se confundiu." />
          <FeatureCard icon={Trophy} title="Streak e XP" desc="Mantenha sua sequência de estudos, ganhe XP e suba de nível a cada acerto." />
          <FeatureCard icon={Sparkles} title="Feedback personalizado" desc="Recomendações de revisão com base nos seus erros mais frequentes." />
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof Sparkles; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="font-display text-lg">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  );
}
