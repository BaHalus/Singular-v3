import { calculateDerived } from './rules.js';
import { createModuleLoader } from './module-loader.js';
import { escapeHtml } from './html.js';
import {
  createDefaultCharacter,
  createStore,
  loadCustomModules,
  loadStoredCharacter,
  loadStoredModulePrefs,
  saveCustomModules,
  saveStoredModulePrefs
} from './state.js';
import { downloadGCS, readCharacterFile } from './gcs.js';

function createNotifier(element) {
  let timeoutId;
  return (message, type = 'info') => {
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = false;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      element.hidden = true;
      element.textContent = '';
    }, 3500);
  };
}

function formatSigned(value) {
  return `${value > 0 ? '+' : ''}${value}`;
}

function renderQuickSummary(container, state) {
  const derived = calculateDerived(state);
  container.innerHTML = `
    <dl>
      <div><dt>Pontos gastos</dt><dd>${derived.points.spent}</dd></div>
      <div><dt>Pontos livres</dt><dd>${derived.points.unspent}</dd></div>
      <div><dt>PV / PF</dt><dd>${state.resources.hpCurrent}/${derived.points.hpMax} · ${state.resources.fpCurrent}/${derived.points.fpMax}</dd></div>
      <div><dt>Carga</dt><dd>${derived.encumbrance.carriedWeight} kg · ${derived.encumbrance.active.name}</dd></div>
      <div><dt>DX / IQ efetivos</dt><dd>${derived.effective.dx} / ${derived.effective.iq}</dd></div>
    </dl>
  `;
}

function renderSocialSummary(container, state) {
  const derived = calculateDerived(state);
  container.innerHTML = `
    <span>Jogador: <b>${escapeHtml(state.meta.player || '—')}</b></span>
    <span>Campanha: <b>${escapeHtml(state.meta.campaign || '—')}</b></span>
    <span>Total: <b>${derived.points.spent}</b> pts</span>
    <span>Livres: <b class="${derived.points.unspent < 0 ? 'danger' : ''}">${formatSigned(derived.points.unspent)}</b></span>
    <span>PV/PF: <b>${state.resources.hpCurrent}/${derived.points.hpMax} · ${state.resources.fpCurrent}/${derived.points.fpMax}</b></span>
    <span>Carga: <b>${derived.encumbrance.active.name}</b></span>
  `;
}

function bindMetaFields(store) {
  const ids = ['name', 'player', 'campaign', 'notes'];
  ids.forEach((key) => {
    const element = document.getElementById(`meta-${key}`);
    element.addEventListener('input', () => {
      store.update((draft) => {
        draft.meta[key] = element.value;
      });
    });
  });

  return (state) => {
    ids.forEach((key) => {
      const element = document.getElementById(`meta-${key}`);
      if (document.activeElement !== element) element.value = state.meta[key] ?? '';
    });
  };
}

export async function startApp(registry) {
  const store = createStore(loadStoredCharacter());
  const moduleHost = document.getElementById('module-host');
  const floatingRoot = document.getElementById('floating-root');
  const notify = createNotifier(document.getElementById('status-banner'));
  const quickSummary = document.getElementById('quick-summary');
  const socialSummary = document.getElementById('social-summary');
  const moduleList = document.getElementById('module-list');

  const persistedCustomModules = loadCustomModules();
  const allRegistry = [...registry, ...persistedCustomModules];

  const loader = createModuleLoader({
    host: moduleHost,
    floatingRoot,
    registry: allRegistry,
    contextFactory: ({ descriptor, host, floatingRoot: floatRoot }) => ({
      id: descriptor.id,
      title: descriptor.title,
      host,
      floatingRoot: floatRoot,
      store,
      notify,
      calculateDerived
    })
  });

  const syncMeta = bindMetaFields(store);

  async function setModuleState(id, enabled) {
    try {
      if (enabled) {
        await loader.mount(id);
      } else {
        await loader.unmount(id);
      }
      saveStoredModulePrefs(loader.activeIds());
      renderModuleList();
    } catch (error) {
      notify(error.message, 'error');
      renderModuleList();
    }
  }

  function renderModuleList() {
    const active = new Set(loader.activeIds());
    moduleList.innerHTML = '';

    loader.list().forEach((descriptor) => {
      const row = document.createElement('label');
      row.className = 'module-item';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = active.has(descriptor.id);

      const text = document.createElement('span');
      text.innerHTML = `<strong>${escapeHtml(descriptor.title)}</strong><small>${escapeHtml(descriptor.id)}</small>`;

      checkbox.addEventListener('change', (event) => {
        setModuleState(descriptor.id, event.target.checked);
      });

      row.append(checkbox, text);
      moduleList.appendChild(row);
    });
  }

  async function registerCustomModule(path) {
    const normalized = path.trim();
    if (!normalized) return;
    if (/^[a-z]+:\/\//i.test(normalized)) {
      notify('Use apenas caminhos locais relativos para módulos customizados.', 'error');
      return;
    }
    if (!normalized.endsWith('.js')) {
      notify('O módulo customizado precisa apontar para um arquivo .js.', 'error');
      return;
    }
    const inferredId = normalized.split('/').pop()?.replace(/\.module\.js$/i, '').replace(/[^a-z0-9-]/gi, '-') || `custom-${Date.now()}`;
    const descriptor = { id: inferredId.toLowerCase(), title: inferredId, path: normalized };
    loader.register(descriptor);
    saveCustomModules(loader.list().filter((item) => !registry.some((base) => base.id === item.id)));
    renderModuleList();
    notify(`Módulo registrado: ${normalized}`);
  }

  document.getElementById('register-module-btn').addEventListener('click', () => {
    const input = document.getElementById('custom-module-path');
    registerCustomModule(input.value);
    input.value = '';
  });

  document.getElementById('reload-modules-btn').addEventListener('click', async () => {
    await Promise.all(loader.activeIds().map((id) => loader.reload(id)));
    notify('Módulos recarregados.');
  });

  document.getElementById('new-character-btn').addEventListener('click', () => {
    store.replace(createDefaultCharacter());
    notify('Novo personagem carregado.');
  });

  document.getElementById('export-gcs-btn').addEventListener('click', () => {
    downloadGCS(store.getState());
    notify('Arquivo .gcs exportado.');
  });

  const fileInput = document.getElementById('gcs-file-input');
  document.getElementById('import-gcs-btn').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const [file] = fileInput.files ?? [];
    if (!file) return;
    try {
      const character = await readCharacterFile(file);
      store.replace(character);
      notify(`Arquivo importado: ${file.name}`);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      fileInput.value = '';
    }
  });

  store.subscribe((state) => {
    syncMeta(state);
    renderQuickSummary(quickSummary, state);
    renderSocialSummary(socialSummary, state);
  });

  syncMeta(store.getState());
  renderQuickSummary(quickSummary, store.getState());
  renderSocialSummary(socialSummary, store.getState());

  const defaults = loader.list().filter((item) => item.defaultActive !== false).map((item) => item.id);
  const preferred = loadStoredModulePrefs(defaults).filter((id) => loader.list().some((item) => item.id === id));
  const initial = preferred.length ? preferred : defaults;

  for (const id of initial) {
    await loader.mount(id);
  }
  saveStoredModulePrefs(loader.activeIds());
  renderModuleList();
  notify(`Singular v3 iniciado com ${loader.activeIds().length} módulos. ${formatSigned(calculateDerived(store.getState()).points.unspent)} pontos livres.`);
}
