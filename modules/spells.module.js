import { calculateSpellLevel, difficultyOptions } from '../core/rules.js';
import { escapeHtml } from '../core/html.js';
import { uid } from '../core/state.js';

const ATTRS = ['IQ', 'WILL', 'HT'];

function emptySpell() {
  return {
    id: uid('spell'),
    name: 'Nova magia',
    college: '',
    attribute: 'IQ',
    difficulty: 'H',
    points: 1,
    bonus: 0,
    notes: ''
  };
}

export default {
  id: 'spells',
  title: 'Magias',
  defaultActive: true,
  mount(ctx) {
    const render = (state) => {
      const { effective, bonuses } = ctx.calculateDerived(state);
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Magias</h2>
            <p class="subtitle">Compatível com bônus globais como <span class="mono">spell.all</span>.</p>
          </div>
          <button type="button" data-add-spell>Adicionar magia</button>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Colégio</th>
              <th>Atributo</th>
              <th>Dificuldade</th>
              <th>Pontos</th>
              <th>Bônus</th>
              <th>NH</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.spells.map((spell, index) => `
              <tr data-spell-id="${spell.id}">
                <td><input type="text" value="${escapeHtml(spell.name)}" data-field="name"></td>
                <td><input type="text" value="${escapeHtml(spell.college ?? '')}" data-field="college"></td>
                <td>
                  <select data-field="attribute">
                    ${ATTRS.map((attribute) => `<option value="${attribute}" ${spell.attribute === attribute ? 'selected' : ''}>${attribute}</option>`).join('')}
                  </select>
                </td>
                <td>
                  <select data-field="difficulty">
                    ${difficultyOptions().map((difficulty) => `<option value="${difficulty}" ${spell.difficulty === difficulty ? 'selected' : ''}>${difficulty}</option>`).join('')}
                  </select>
                </td>
                <td><input type="number" min="0" value="${spell.points}" data-field="points"></td>
                <td><input type="number" value="${spell.bonus}" data-field="bonus"></td>
                <td><strong>${calculateSpellLevel(spell, effective, bonuses)}</strong></td>
                <td><input type="text" value="${escapeHtml(spell.notes ?? '')}" data-field="notes"></td>
                <td><button type="button" class="ghost" data-remove-spell="${index}">Remover</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      ctx.host.querySelector('[data-add-spell]').addEventListener('click', () => {
        ctx.store.update((draft) => {
          draft.spells.push(emptySpell());
        });
      });

      ctx.host.querySelectorAll('[data-spell-id]').forEach((row) => {
        const spellId = row.dataset.spellId;
        const index = state.spells.findIndex((item) => item.id === spellId);
        if (index < 0) return;

        row.querySelectorAll('[data-field]').forEach((field) => {
          field.addEventListener('input', () => {
            ctx.store.update((draft) => {
              const target = draft.spells[index];
              const key = field.dataset.field;
              target[key] = ['points', 'bonus'].includes(key) ? Number(field.value) || 0 : field.value;
            });
          });
        });

        row.querySelector('[data-remove-spell]').addEventListener('click', () => {
          ctx.store.update((draft) => {
            draft.spells.splice(index, 1);
          });
        });
      });
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
