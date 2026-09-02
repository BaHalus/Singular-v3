import { signedTraitCost } from '../core/rules.js';
import { escapeHtml } from '../core/html.js';
import { uid } from '../core/state.js';

function emptyModifier() {
  return { id: uid('mod'), target: '', amount: 0 };
}

function emptyTrait() {
  return {
    id: uid('trait'),
    name: 'Novo traço',
    type: 'advantage',
    cost: 5,
    level: 1,
    notes: '',
    modifiers: [emptyModifier()]
  };
}

export default {
  id: 'traits',
  title: 'Vantagens e desvantagens',
  defaultActive: true,
  mount(ctx) {
    const render = (state) => {
      ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Traços</h2>
            <p class="subtitle">Crie vantagens, desvantagens e bônus automáticos por alvo.</p>
          </div>
          <button type="button" data-add-trait>Adicionar traço</button>
        </div>
        <div class="entry-list">
          ${(state.traits ?? []).map((trait, index) => `
            <article class="entry-card" data-trait-id="${trait.id}">
              <div class="entry-card__grid">
                <label class="field wide">
                  <span>Nome</span>
                  <input type="text" value="${escapeHtml(trait.name)}" data-field="name">
                </label>
                <label class="field">
                  <span>Tipo</span>
                  <select data-field="type">
                    ${['advantage', 'disadvantage', 'quirk'].map((type) => `
                      <option value="${type}" ${trait.type === type ? 'selected' : ''}>${type}</option>
                    `).join('')}
                  </select>
                </label>
                <label class="field">
                  <span>Custo base</span>
                  <input type="number" value="${trait.cost}" data-field="cost">
                </label>
                <label class="field">
                  <span>Níveis</span>
                  <input type="number" min="1" value="${trait.level}" data-field="level">
                </label>
                <div class="field">
                  <span>Total</span>
                  <div class="stat-pill">${signedTraitCost(trait)}</div>
                </div>
                <button type="button" class="ghost" data-remove-trait="${index}">Remover</button>
                <label class="field full">
                  <span>Notas</span>
                  <textarea rows="2" data-field="notes">${escapeHtml(trait.notes ?? '')}</textarea>
                </label>
              </div>
              <div class="inline-toolbar" style="margin-top:0.75rem;">
                <strong>Modificadores automáticos</strong>
                <button type="button" class="ghost" data-add-modifier>Adicionar bônus</button>
              </div>
              <div class="modifier-list">
                ${(trait.modifiers ?? []).map((modifier, modIndex) => `
                  <div class="modifier-row" data-modifier-id="${modifier.id}">
                    <input type="text" placeholder="attribute.st, skill.all, spell.Nome" value="${escapeHtml(modifier.target ?? '')}" data-mod-field="target" data-mod-index="${modIndex}">
                    <input type="number" step="0.25" value="${modifier.amount ?? 0}" data-mod-field="amount" data-mod-index="${modIndex}">
                    <button type="button" class="ghost" data-remove-modifier="${modIndex}">Remover</button>
                  </div>
                `).join('')}
              </div>
            </article>
          `).join('')}
        </div>
      `;

      ctx.host.querySelector('[data-add-trait]').addEventListener('click', () => {
        ctx.store.update((draft) => {
          draft.traits.push(emptyTrait());
        });
      });

      ctx.host.querySelectorAll('[data-trait-id]').forEach((card) => {
        const traitId = card.dataset.traitId;
        const index = state.traits.findIndex((trait) => trait.id === traitId);
        if (index < 0) return;

        card.querySelectorAll('[data-field]').forEach((field) => {
          field.addEventListener('input', () => {
            ctx.store.update((draft) => {
              const target = draft.traits[index];
              const key = field.dataset.field;
              target[key] = ['cost', 'level'].includes(key) ? Number(field.value) || 0 : field.value;
            });
          });
        });

        card.querySelector('[data-remove-trait]').addEventListener('click', () => {
          ctx.store.update((draft) => {
            draft.traits.splice(index, 1);
          });
        });

        card.querySelector('[data-add-modifier]').addEventListener('click', () => {
          ctx.store.update((draft) => {
            draft.traits[index].modifiers.push(emptyModifier());
          });
        });

        card.querySelectorAll('[data-mod-field]').forEach((field) => {
          field.addEventListener('input', () => {
            const modIndex = Number(field.dataset.modIndex);
            ctx.store.update((draft) => {
              const modifier = draft.traits[index].modifiers[modIndex];
              if (!modifier) return;
              const key = field.dataset.modField;
              modifier[key] = key === 'amount' ? Number(field.value) || 0 : field.value;
            });
          });
        });

        card.querySelectorAll('[data-remove-modifier]').forEach((button) => {
          button.addEventListener('click', () => {
            const modIndex = Number(button.dataset.removeModifier);
            ctx.store.update((draft) => {
              draft.traits[index].modifiers.splice(modIndex, 1);
            });
          });
        });
      });
    };

    const unsubscribe = ctx.store.subscribe(render);
    render(ctx.store.getState());
    return () => unsubscribe();
  }
};
