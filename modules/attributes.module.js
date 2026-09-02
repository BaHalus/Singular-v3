const ATTRIBUTES = [
  { key: 'st', label: 'ST', cost: '10/nível' },
  { key: 'dx', label: 'DX', cost: '20/nível' },
  { key: 'iq', label: 'IQ', cost: '20/nível' },
  { key: 'ht', label: 'HT', cost: '10/nível' },
  { key: 'hp', label: 'PV', cost: '3/nível' },
  { key: 'fp', label: 'PF', cost: '3/nível' },
  { key: 'will', label: 'Vontade', cost: '5/nível' },
  { key: 'per', label: 'Percepção', cost: '5/nível' },
  { key: 'speed', label: 'Velocidade', cost: '5/0,25' },
  { key: 'move', label: 'Deslocamento', cost: '5/nível' }
];

export default {
  id: 'attributes',
  title: 'Atributos',
  defaultActive: true,
  mount(ctx) {
    const bind = () => {
      ctx.host.querySelectorAll('[data-attribute]').forEach((input) => {
        input.addEventListener('input', () => {
          const key = input.dataset.attribute;
          const value = input.type === 'number' ? Number(input.value) : input.value;
          ctx.store.update((draft) => {
            draft.attributes[key] = value;
            if (key === 'hp' && draft.resources.hpCurrent > value) draft.resources.hpCurrent = value;
            if (key === 'fp' && draft.resources.fpCurrent > value) draft.resources.fpCurrent = value;
          });
        });
      });

      ctx.host.querySelector('[data-points-budget]').addEventListener('input', (event) => {
        ctx.store.update((draft) => {
          draft.points.budget = Number(event.target.value) || 0;
        });
      });
    };

    const render = (state) => {
      const { effective, bonuses } = ctx.calculateDerived(state);
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Atributos e secundários</h2>
            <p class="subtitle">Base editável com aplicação automática de bônus vindos de traços.</p>
          </div>
          <label class="field" style="margin:0; min-width: 150px;">
            <span>Orçamento total</span>
            <input type="number" value="${state.points.budget}" data-points-budget>
          </label>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Atributo</th>
              <th>Base</th>
              <th>Bônus</th>
              <th>Efetivo</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            ${ATTRIBUTES.map(({ key, label, cost }) => `
              <tr>
                <td>${label}</td>
                <td><input type="number" step="${key === 'speed' ? '0.25' : '1'}" value="${state.attributes[key]}" data-attribute="${key}"></td>
                <td>${bonuses[`attribute.${key}`] ?? 0}</td>
                <td><strong>${effective[key]}</strong></td>
                <td>${cost}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      bind();
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
