# ARCHITECTURE.md — mapa transversal região→feature

> Orçamento-alvo: ≤4.800 bytes. Nível 0.5 de leitura: responde "este trecho do código pertence a qual feature?".
> Cobre TODO o código, inclusive o que ainda não tem feature (marque `(sem feature)`).
> Atualize quando uma SPEC mover fronteiras. Detalhe fino vive em `docs/features/<area>.md`.

## Mapa região → feature

| Região (path) | Feature (TAXONOMY) | Nota (1 linha) |
|---|---|---|
| scripts/eval/turn-schema.json | dialogo | Contrato do turno v2 — fonte única, consumida pelo strict mode do Groq e (futuro) pelos tipos do app |
| scripts/eval/turn-validator.mjs | dialogo | Validação de schema (subset de JSON Schema) e de evidência citada |
| scripts/eval/run.mjs | dialogo | Prompt de sistema e runner contra o Groq, com backoff por orçamento de tokens |
| scripts/eval/grade.mjs | dialogo | As 15 checagens mecânicas de qualidade do turno, mais as 5 longitudinais |
| scripts/eval/validate.mjs | dialogo | Validação estrutural offline do dataset e do schema |
| scripts/eval/dataset.jsonl | avaliacao | 45 falas de referência, 17 delas controles para medir sobre-correção |
| scripts/eval/rubric.md | avaliacao | Rubrica de nível N1–N5 × 5 critérios, com evidência obrigatória |
| src/routes/ | (sem feature) | Scaffold TanStack Start — `index.tsx` é a tela de boas-vindas do template |
| src/components/ui/ | (sem feature) | 46 componentes shadcn/ui (new-york) intocados; base de composição das telas futuras |
| src/lib/, src/hooks/ | (sem feature) | Utilitários do scaffold (`cn`, captura de erro, `use-mobile`) |
| src/router.tsx, src/server.ts, src/start.ts | (sem feature) | Bootstrap do TanStack Start |
| src/routeTree.gen.ts | (sem feature) | GERADO pelo router-plugin — fora do lint |
| scripts/specctl.mjs | (sem feature) | CLI do sistema SPEC (harness de processo, não produto) |
| docs/ | (sem feature) | Artefatos do SDD v4: regras, features, programas, SPECs |
| .scratch/ | (sem feature) | Descartável e fora do versionamento — inclui o protótipo normativo decodificado |

## Fluxos transversais

- **Avaliação de um modelo:** `dataset.jsonl` → `run.mjs` (prompt + Groq) → `evidence/<modelo>/` na pasta da SPEC → `grade.mjs` (15 checagens) → relatório + leitura humana. Nada disso toca o app; roda em Node puro.
- **Turno de conversa (planejado, Fase 1):** perfil + sessão → **pedagogia** (`PedagogicalIntent`) → **dialogo** (server function, strict JSON, fallback roteirizado) → **personalidade** (estilo pós-LLM, campos protegidos) → canal texto. Voz (Fase 3) entra e sai pelas pontas, com o mesmo núcleo no meio.
- **Onde vive a decisão:** política pedagógica em **pedagogia** (TypeScript, sem rede); formulação de linguagem no LLM via **dialogo**; tom em **personalidade**. Regra pedagógica em componente de interface ou em texto de prompt é violação da §11 do prompt de desenvolvimento.

## Fronteira ainda não existente

O produto não tem código: `src/` é scaffold puro. Todo código de produto da Fase 1 nasce das SPECs
do programa `emma` — ver `docs/PROGRAMS.md` para a ordem e `specctl next` para o que já é pegável.
