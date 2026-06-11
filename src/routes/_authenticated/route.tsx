import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, BarChart3, History, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Outlet />
      <BottomNav pathname={pathname} />
    </div>
  );
}

function NavItem({
  to, label, Icon, active,
}: { to: string; label: string; Icon: typeof Home; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 transition ${active ? "text-accent" : "text-muted-foreground"}`}
    >
      <div className={`grid size-9 place-items-center rounded-xl ${active ? "bg-accent/15" : ""}`}>
        <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </Link>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-6 py-3">
        <NavItem to="/app" label="Início" Icon={Home} active={pathname === "/app"} />
        <NavItem to="/historico" label="Histórico" Icon={History} active={pathname.startsWith("/historico")} />
        <NavItem to="/estatisticas" label="Evolução" Icon={BarChart3} active={pathname.startsWith("/estatisticas")} />
        <NavItem to="/perfil" label="Perfil" Icon={User} active={pathname.startsWith("/perfil")} />
      </div>
    </nav>
  );
}
