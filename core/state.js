const STORAGE_KEY = 'singular-v3.character';
const MODULE_PREFS_KEY = 'singular-v3.active-modules';
const CUSTOM_MODULES_KEY = 'singular-v3.custom-modules';

export function uid(prefix = 'id') {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${value}`;
}

export function deepClone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function createDefaultCharacter() {
  return {
    version: 3,
    meta: {
      name: 'Novo personagem',
      player: '',
      campaign: '',
      notes: '',
      techLevel: '3'
    },
    points: {
      budget: 150,
      unspent: 0
    },
    attributes: {
      st: 10,
      dx: 10,
      iq: 10,
      ht: 10,
      hp: 10,
      fp: 10,
      will: 10,
      per: 10,
      speed: 5,
      move: 5
    },
    resources: {
      hpCurrent: 10,
      fpCurrent: 10
    },
    traits: [
      {
        id: uid('trait'),
        name: 'Aptidão Mágica',
        type: 'advantage',
        cost: 10,
        level: 1,
        notes: 'Exemplo de vantagem com bônus automático.',
        modifiers: [
          { id: uid('mod'), target: 'spell.all', amount: 1 }
        ]
      }
    ],
    skills: [
      {
        id: uid('skill'),
        name: 'Espadas Curtas',
        attribute: 'DX',
        difficulty: 'A',
        points: 2,
        bonus: 0,
        notes: ''
      }
    ],
    spells: [
      {
        id: uid('spell'),
        name: 'Luz',
        college: 'Luz e Trevas',
        attribute: 'IQ',
        difficulty: 'H',
        points: 1,
        bonus: 0,
        notes: ''
      }
    ],
    equipment: [
      {
        id: uid('item'),
        name: 'Espada curta',
        qty: 1,
        weight: 1,
        cost: 400,
        carried: true,
        notes: ''
      }
    ]
  };
}

export function loadStoredCharacter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultCharacter();
    return deepClone(JSON.parse(raw));
  } catch {
    return createDefaultCharacter();
  }
}

export function saveStoredCharacter(character) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
}

export function loadStoredModulePrefs(fallbackIds) {
  try {
    const raw = localStorage.getItem(MODULE_PREFS_KEY);
    if (!raw) return [...fallbackIds];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...fallbackIds];
  } catch {
    return [...fallbackIds];
  }
}

export function saveStoredModulePrefs(activeIds) {
  localStorage.setItem(MODULE_PREFS_KEY, JSON.stringify(activeIds));
}

export function loadCustomModules() {
  try {
    const raw = localStorage.getItem(CUSTOM_MODULES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomModules(registryItems) {
  localStorage.setItem(CUSTOM_MODULES_KEY, JSON.stringify(registryItems));
}

export function createStore(initialState) {
  let state = deepClone(initialState);
  const listeners = new Set();

  const emit = () => {
    saveStoredCharacter(state);
    for (const listener of listeners) listener(state);
  };

  return {
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    replace(nextState) {
      state = deepClone(nextState);
      emit();
    },
    update(updater) {
      const draft = deepClone(state);
      updater(draft);
      state = draft;
      emit();
    },
    reset() {
      state = createDefaultCharacter();
      emit();
    }
  };
}
