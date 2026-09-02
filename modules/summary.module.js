export default {
  id: 'summary',
  title: 'Resumo do personagem',
  defaultActive: true,
  mount(ctx) {
    const render = (state) => {
      const { effective, points, encumbrance } = ctx.calculateDerived(state);
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Resumo do personagem</h2>
            <p class="subtitle">Visão consolidada dos totais e efeitos automáticos.</p>
          </div>
        </div>
        <div class="module-grid cols-2">
          <div class="entry-card">
            <h3>Atributos efetivos</h3>
            <div class="pill-row">
              ${['st', 'dx', 'iq', 'ht', 'hp', 'fp', 'will', 'per', 'speed', 'move']
                .map((key) => `<span class="stat-pill"><strong>${key.toUpperCase()}</strong> ${effective[key]}</span>`)
                .join('')}
            </div>
          </div>
          <div class="entry-card">
            <h3>Pontos</h3>
            <div class="quick-summary">
              <dl>
                <div><dt>Orçamento</dt><dd>${points.budget}</dd></div>
                <div><dt>Primários</dt><dd>${points.primary}</dd></div>
                <div><dt>Secundários</dt><dd>${points.secondary}</dd></div>
                <div><dt>Traços</dt><dd>${points.traitTotal}</dd></div>
                <div><dt>Perícias</dt><dd>${points.skillTotal}</dd></div>
                <div><dt>Magias</dt><dd>${points.spellTotal}</dd></div>
                <div><dt>Total gasto</dt><dd>${points.spent}</dd></div>
                <div><dt>Restante</dt><dd class="${points.unspent < 0 ? 'danger' : ''}">${points.unspent}</dd></div>
              </dl>
            </div>
          </div>
          <div class="entry-card">
            <h3>Recursos atuais</h3>
            <p class="resource-value">${state.resources.hpCurrent}/${points.hpMax} PV · ${state.resources.fpCurrent}/${points.fpMax} PF</p>
            <p class="hint">Os pop-ups de PV/PF são persistidos com o personagem em localStorage.</p>
          </div>
          <div class="entry-card">
            <h3>Carga</h3>
            <p><strong>${encumbrance.carriedWeight} kg</strong> transportados.</p>
            <p>Carga ativa: <strong>${encumbrance.active.name}</strong></p>
            <p class="hint">Levantamento básico aproximado: ${encumbrance.basicLiftKg} kg.</p>
          </div>
        </div>
      `;
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
