import { useState } from "react";
import { AlertTriangle, ChevronDown, Mail, Instagram } from "lucide-react";

type Variant = "full" | "compact" | "footer";

export function AIDisclaimer({ variant = "full", className = "" }: { variant?: Variant; className?: string }) {
  const [open, setOpen] = useState(variant === "footer");

  if (variant === "footer") {
    return (
      <footer className={`mx-auto max-w-2xl px-5 py-8 ${className}`}>
        <AIDisclaimer variant="compact" />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Aprovado · Simulados com IA
        </p>
      </footer>
    );
  }

  return (
    <div className={`rounded-2xl border border-energy/40 bg-energy/10 ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
        aria-expanded={open}
      >
        <AlertTriangle className="size-4 shrink-0 text-energy" />
        <span className="flex-1 text-xs font-semibold text-foreground">
          Aviso: questões geradas por IA podem conter erros
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-energy/30 p-4 text-xs leading-relaxed text-muted-foreground">
          <p>
            As questões deste aplicativo são <strong className="text-foreground">geradas e corrigidas com auxílio de Inteligência Artificial</strong>. Embora existam mecanismos automáticos de validação, podem ocorrer erros em enunciados, alternativas, gabaritos, resoluções e cálculos.
          </p>
          <p>
            Inconsistências tendem a ocorrer com mais frequência em:{" "}
            <span className="rounded bg-energy/20 px-1.5 py-0.5 font-bold text-energy">Matemática</span>{" "}
            <span className="rounded bg-energy/20 px-1.5 py-0.5 font-bold text-energy">Física</span>{" "}
            <span className="rounded bg-energy/20 px-1.5 py-0.5 font-bold text-energy">Química</span>.
          </p>
          <p className="text-foreground">Sugestões e correções:</p>
          <div className="space-y-1.5">
            <a href="mailto:filipezanetti14@gmail.com" className="flex items-center gap-2 text-brand hover:underline">
              <Mail className="size-3.5" /> filipezanetti14@gmail.com
            </a>
            <a href="https://instagram.com/filipeznet" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand hover:underline">
              <Instagram className="size-3.5" /> @filipeznet
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
