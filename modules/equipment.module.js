import { uid } from '../core/state.js';
import { escapeHtml } from '../core/html.js';

function emptyItem() {
  return {
    id: uid('item'),
    name: 'Novo item',
    qty: 1,
    weight: 0,
    cost: 0,
    carried: true,
    notes: ''
  };
}

export default {
  id: 'equipment',
  title: 'Equipamentos',
  defaultActive: true,
  mount(ctx) {
    const render = (state) => {
      const { encumbrance } = ctx.calculateDerived(state);
      const totalCost = state.equipment.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.cost) || 0), 0);
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Equipamentos</h2>
            <p class="subtitle">Peso e custo totais atualizados em tempo real.</p>
          </div>
          <button type="button" data-add-item>Adicionar item</button>
        </div>
        <div class="pill-row" style="margin-bottom:0.75rem;">
          <span class="stat-pill"><strong>Peso carregado</strong> ${encumbrance.carriedWeight} kg</span>
          <span class="stat-pill"><strong>Custo total</strong> ${totalCost}</span>
          <span class="stat-pill"><strong>Nível de carga</strong> ${encumbrance.active.name}</span>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Peso</th>
              <th>Custo</th>
              <th>Carregado</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.equipment.map((item, index) => `
              <tr data-item-id="${item.id}">
                <td><input type="text" value="${escapeHtml(item.name)}" data-field="name"></td>
                <td><input type="number" min="0" value="${item.qty}" data-field="qty"></td>
                <td><input type="number" step="0.1" value="${item.weight}" data-field="weight"></td>
                <td><input type="number" step="0.01" value="${item.cost}" data-field="cost"></td>
                <td><input type="checkbox" ${item.carried !== false ? 'checked' : ''} data-field="carried"></td>
                <td><input type="text" value="${escapeHtml(item.notes ?? '')}" data-field="notes"></td>
                <td><button type="button" class="ghost" data-remove-item="${index}">Remover</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      ctx.host.querySelector('[data-add-item]').addEventListener('click', () => {
        ctx.store.update((draft) => {
          draft.equipment.push(emptyItem());
        });
      });

      ctx.host.querySelectorAll('[data-item-id]').forEach((row) => {
        const itemId = row.dataset.itemId;
        const index = state.equipment.findIndex((item) => item.id === itemId);
        if (index < 0) return;

        row.querySelectorAll('[data-field]').forEach((field) => {
          const eventName = field.type === 'checkbox' ? 'change' : 'input';
          field.addEventListener(eventName, () => {
            ctx.store.update((draft) => {
              const target = draft.equipment[index];
              const key = field.dataset.field;
              if (field.type === 'checkbox') target[key] = field.checked;
              else target[key] = ['qty', 'weight', 'cost'].includes(key) ? Number(field.value) || 0 : field.value;
            });
          });
        });

        row.querySelector('[data-remove-item]').addEventListener('click', () => {
          ctx.store.update((draft) => {
            draft.equipment.splice(index, 1);
          });
        });
      });
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
