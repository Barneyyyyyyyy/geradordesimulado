import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/app" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { name: nome || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        navigate({ to: "/app" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/app" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/app",
      });
      if (result.error) {
        toast.error("Erro no login com Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/app" });
    } catch {
      toast.error("Erro no login");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <header className="mb-10 flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-brand font-display text-lg text-brand-foreground">A</div>
          <span className="font-display text-lg">Aprovado</span>
        </header>

        <h1 className="font-display text-4xl leading-tight">
          {mode === "signup" ? "Crie sua conta" : "Bem-vindo de volta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signup" ? "Comece a treinar em menos de 1 minuto." : "Bora manter o streak."}
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card py-3.5 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
        >
          <GoogleIcon /> Continuar com Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> ou e-mail <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm outline-none focus:border-brand"
            />
          )}
          <input
            type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm outline-none focus:border-brand"
          />
          <input
            type="password" required minLength={6} placeholder="Senha (mín. 6)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm outline-none focus:border-brand"
          />
          <button
            type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-3xl bg-accent py-4 font-display text-lg text-accent-foreground shadow-pop active:translate-y-1.5 active:shadow-none disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signup" ? "Já tem conta? Entrar" : "Novo por aqui? Criar conta"}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.95l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}
