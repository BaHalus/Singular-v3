import { escapeHtml } from '../core/html.js';

export default {
  id: 'io',
  title: 'Importação / exportação',
  defaultActive: true,
  mount(ctx) {
    const render = (state) => {
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Integração .gcs</h2>
            <p class="subtitle">A versão standalone exporta e importa o estado normalizado da ficha em JSON com extensão <span class="mono">.gcs</span>.</p>
          </div>
        </div>
        <div class="module-grid cols-2">
          <div class="entry-card">
            <h3>Estrutura persistida</h3>
            <p>Nome: <strong>${escapeHtml(state.meta.name || '—')}</strong></p>
            <p>Traços: <strong>${state.traits.length}</strong></p>
            <p>Perícias: <strong>${state.skills.length}</strong></p>
            <p>Magias: <strong>${state.spells.length}</strong></p>
            <p>Equipamentos: <strong>${state.equipment.length}</strong></p>
          </div>
          <div class="entry-card">
            <h3>Formato</h3>
            <p class="hint">Use os botões da barra superior para importar ou exportar.</p>
            <p class="hint">Campos principais: <span class="mono">meta</span>, <span class="mono">attributes</span>, <span class="mono">resources</span>, <span class="mono">traits</span>, <span class="mono">skills</span>, <span class="mono">spells</span> e <span class="mono">equipment</span>.</p>
          </div>
        </div>
      `;
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
