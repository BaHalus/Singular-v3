import { calculateSkillLevel, difficultyOptions } from '../core/rules.js';
import { escapeHtml } from '../core/html.js';
import { uid } from '../core/state.js';

const ATTRS = ['ST', 'DX', 'IQ', 'HT', 'WILL', 'PER'];

function emptySkill() {
  return {
    id: uid('skill'),
    name: 'Nova perícia',
    attribute: 'IQ',
    difficulty: 'A',
    points: 1,
    bonus: 0,
    notes: ''
  };
}

export default {
  id: 'skills',
  title: 'Perícias',
  defaultActive: true,
  mount(ctx) {
    const render = (state) => {
      const { effective, bonuses } = ctx.calculateDerived(state);
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Perícias</h2>
            <p class="subtitle">Nível calculado por atributo, dificuldade, pontos e bônus automáticos.</p>
          </div>
          <button type="button" data-add-skill>Adicionar perícia</button>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Nome</th>
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
            ${state.skills.map((skill, index) => `
              <tr data-skill-id="${skill.id}">
                <td><input type="text" value="${escapeHtml(skill.name)}" data-field="name"></td>
                <td>
                  <select data-field="attribute">
                    ${ATTRS.map((attribute) => `<option value="${attribute}" ${skill.attribute === attribute ? 'selected' : ''}>${attribute}</option>`).join('')}
                  </select>
                </td>
                <td>
                  <select data-field="difficulty">
                    ${difficultyOptions().map((difficulty) => `<option value="${difficulty}" ${skill.difficulty === difficulty ? 'selected' : ''}>${difficulty}</option>`).join('')}
                  </select>
                </td>
                <td><input type="number" min="0" value="${skill.points}" data-field="points"></td>
                <td><input type="number" value="${skill.bonus}" data-field="bonus"></td>
                <td><strong>${calculateSkillLevel(skill, effective, bonuses)}</strong></td>
                <td><input type="text" value="${escapeHtml(skill.notes ?? '')}" data-field="notes"></td>
                <td><button type="button" class="ghost" data-remove-skill="${index}">Remover</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      ctx.host.querySelector('[data-add-skill]').addEventListener('click', () => {
        ctx.store.update((draft) => {
          draft.skills.push(emptySkill());
        });
      });

      ctx.host.querySelectorAll('[data-skill-id]').forEach((row) => {
        const skillId = row.dataset.skillId;
        const index = state.skills.findIndex((item) => item.id === skillId);
        if (index < 0) return;

        row.querySelectorAll('[data-field]').forEach((field) => {
          field.addEventListener('input', () => {
            ctx.store.update((draft) => {
              const target = draft.skills[index];
              const key = field.dataset.field;
              target[key] = ['points', 'bonus'].includes(key) ? Number(field.value) || 0 : field.value;
            });
          });
        });

        row.querySelector('[data-remove-skill]').addEventListener('click', () => {
          ctx.store.update((draft) => {
            draft.skills.splice(index, 1);
          });
        });
      });
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
