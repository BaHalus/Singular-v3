# Singular-v3

Protótipo de ficha GURPS em HTML standalone modular.

## Estrutura

- `index.html` — núcleo da aplicação
- `core/` — estado, regras, loader e estilos
- `modules/` — módulos incorporáveis/desincorporáveis em tempo de execução
- `characters/` — exemplos de personagens `.gcs`
- `scripts/` — bootstrap e manifesto dos módulos

## Como usar

- Versão modular: abra `/home/runner/work/Singular-v3/Singular-v3/index.html`
- Versão 100% única: abra `/home/runner/work/Singular-v3/Singular-v3/Singular-v3.html`

Se você abrir `index.html` direto via `file://`, a página usa automaticamente o bootstrap standalone em `scripts/standalone.js` para carregar os módulos incorporados sem depender de imports ES externos. Em servidor HTTP, o fluxo modular original continua ativo.

`Singular-v3.html` já embute HTML, CSS e JavaScript em um único arquivo, sem dependências externas.

Recursos incluídos:

- editor de atributos, traços, perícias, magias e equipamentos;
- bônus automáticos por modificadores de traços;
- painel persistente de PV/PF;
- importação e exportação de `.gcs` em JSON;
- loader dinâmico para ativar, desativar e registrar módulos locais.
