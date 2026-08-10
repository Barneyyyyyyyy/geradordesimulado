import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listSimulados from "./tools/list-simulados";
import getSimulado from "./tools/get-simulado";
import getDesempenho from "./tools/get-desempenho";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "gerador-de-simulado",
  title: "Gerador de Simulado",
  version: "0.1.0",
  instructions:
    "Ferramentas do app de simulados para ENEM e vestibulares. Use `list_simulados` para listar simulados do estudante, `get_simulado` para ver questões, respostas e gabaritos de um simulado, e `get_desempenho` para estatísticas, pontos fortes e pontos fracos.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listSimulados, getSimulado, getDesempenho],
});
