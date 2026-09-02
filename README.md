# Singular-v3

Protótipo de ficha GURPS em HTML standalone modular.

## Estrutura

- `index.html` — versão principal 100% única
- `index.modular.html` — entrada modular para desenvolvimento e fallback
- `Singular-v3.html` — snapshot standalone equivalente em arquivo único
- `core/` — estado, regras, loader e estilos
- `modules/` — módulos incorporáveis/desincorporáveis em tempo de execução
- `characters/` — exemplos de personagens `.gcs`
- `scripts/` — bootstrap e manifesto dos módulos

## Como usar

- Versão principal 100% única: abra `/home/runner/work/Singular-v3/Singular-v3/index.html`
- Snapshot único equivalente: abra `/home/runner/work/Singular-v3/Singular-v3/Singular-v3.html`
- Versão modular: abra `/home/runner/work/Singular-v3/Singular-v3/index.modular.html`

`index.html` e `Singular-v3.html` já embutem HTML, CSS e JavaScript em um único arquivo, sem dependências externas.

`index.modular.html` mantém o fluxo modular com `core/`, `modules/` e `scripts/`. Ao abrir esse arquivo direto via `file://`, ele usa automaticamente `scripts/standalone.js`; em HTTP, continua usando `scripts/bootstrap.js`.

Recursos incluídos:

- editor de atributos, traços, perícias, magias e equipamentos;
- bônus automáticos por modificadores de traços;
- painel persistente de PV/PF;
- importação e exportação de `.gcs` em JSON;
- loader dinâmico para ativar, desativar e registrar módulos locais.
