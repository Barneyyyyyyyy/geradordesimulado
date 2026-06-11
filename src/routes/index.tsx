import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
    }
    throw redirect({ to: "/app" });
  },
  component: () => (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <Loader2 className="size-6 animate-spin text-accent" />
    </div>
  ),
});
