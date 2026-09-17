# Digest — SPEC-20260916-1652-motor-de-dialogo: Motor de diálogo — server function, strict JSON e fallback
<!-- ≤2000 bytes LF; a ferramenta mede -->

**Resumo:** Transforma `PedagogicalIntent` em turno de conversa por server function no Groq, com schema estrito, retry e fallback roteirizado — e a chave de API nunca no cliente.
**Porte:** G · **Features:** dialogo · **Criada:** 2026-09-16 16:52 · **Concluída:** 2026-09-17 15:53
**Critérios:** 9/9 fechados · **Commit final:** `ef7ba66`
**Entregue:** 9 critérios evidenciados; pronto para fechar
**Decisões:**
- Porte G: pipeline so tasks, execucao autonoma, invariantes por teste e nao por gate humano

_Contexto completo: journal.md + main.md nesta pasta._
