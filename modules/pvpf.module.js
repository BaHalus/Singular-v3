function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default {
  id: 'pvpf',
  title: 'PV / PF flutuantes',
  defaultActive: true,
  mount(ctx) {
    const wrapper = document.createElement('div');
    ctx.floatingRoot.appendChild(wrapper);

    const render = (state) => {
      const { points } = ctx.calculateDerived(state);
      wrapper.innerHTML = `
        <section class="floating-card">
          <div class="module-header">
            <div>
              <h3>PV / PF</h3>
              <p class="subtitle">Painel persistente de recursos.</p>
            </div>
          </div>
          <div class="resource-grid">
            <div class="entry-card">
              <span class="hint">PV</span>
              <div class="resource-value">${state.resources.hpCurrent}/${points.hpMax}</div>
              <div class="resource-controls">
                <button type="button" data-hp-delta="-1">-1</button>
                <button type="button" data-hp-delta="+1">+1</button>
              </div>
            </div>
            <div class="entry-card">
              <span class="hint">PF</span>
              <div class="resource-value">${state.resources.fpCurrent}/${points.fpMax}</div>
              <div class="resource-controls">
                <button type="button" data-fp-delta="-1">-1</button>
                <button type="button" data-fp-delta="+1">+1</button>
              </div>
            </div>
          </div>
        </section>
      `;

      wrapper.querySelectorAll('[data-hp-delta]').forEach((button) => {
        button.addEventListener('click', () => {
          const delta = Number(button.dataset.hpDelta);
          ctx.store.update((draft) => {
            const max = ctx.calculateDerived(draft).points.hpMax;
            draft.resources.hpCurrent = clamp((draft.resources.hpCurrent ?? max) + delta, 0, max);
          });
        });
      });

      wrapper.querySelectorAll('[data-fp-delta]').forEach((button) => {
        button.addEventListener('click', () => {
          const delta = Number(button.dataset.fpDelta);
          ctx.store.update((draft) => {
            const max = ctx.calculateDerived(draft).points.fpMax;
            draft.resources.fpCurrent = clamp((draft.resources.fpCurrent ?? max) + delta, 0, max);
          });
        });
      });
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => {
      unsubscribe();
      wrapper.remove();
    };
  }
};
