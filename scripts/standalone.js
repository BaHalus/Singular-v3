(() => {
  // core/rules.js
  var ATTRIBUTE_COSTS = { st: 10, dx: 20, iq: 20, ht: 10 };
  var DIFFICULTY_OFFSETS = { E: 0, A: -1, H: -2, VH: -3 };
  var round2 = (value) => Math.round(value * 100) / 100;
  var num = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  function collectBonuses(character) {
    const bonuses = {};
    for (const trait of character.traits ?? []) {
      for (const modifier of trait.modifiers ?? []) {
        const key = (modifier.target || "").trim();
        if (!key) continue;
        bonuses[key] = (bonuses[key] ?? 0) + num(modifier.amount, 0);
      }
    }
    return bonuses;
  }
  function getBonus(bonuses, key) {
    return num(bonuses[key], 0);
  }
  function calculateDerived(character) {
    const attributes = character.attributes ?? {};
    const bonuses = collectBonuses(character);
    const effective = {
      st: num(attributes.st, 10) + getBonus(bonuses, "attribute.st"),
      dx: num(attributes.dx, 10) + getBonus(bonuses, "attribute.dx"),
      iq: num(attributes.iq, 10) + getBonus(bonuses, "attribute.iq"),
      ht: num(attributes.ht, 10) + getBonus(bonuses, "attribute.ht")
    };
    effective.hp = num(attributes.hp, effective.st) + getBonus(bonuses, "attribute.hp");
    effective.fp = num(attributes.fp, effective.ht) + getBonus(bonuses, "attribute.fp");
    effective.will = num(attributes.will, effective.iq) + getBonus(bonuses, "attribute.will");
    effective.per = num(attributes.per, effective.iq) + getBonus(bonuses, "attribute.per");
    effective.speed = round2(num(attributes.speed, (effective.dx + effective.ht) / 4) + getBonus(bonuses, "attribute.speed"));
    effective.move = num(attributes.move, Math.floor(effective.speed)) + getBonus(bonuses, "attribute.move");
    const points = calculatePointBreakdown(character, effective);
    const encumbrance = calculateEncumbrance(character, effective.st);
    return { bonuses, effective, points, encumbrance };
  }
  function calculatePointBreakdown(character, effective) {
    const base = character.attributes ?? {};
    const primary = Object.entries(ATTRIBUTE_COSTS).reduce(
      (total, [key, cost]) => total + (num(base[key], 10) - 10) * cost,
      0
    );
    const secondary = (num(base.hp, num(base.st, 10)) - num(base.st, 10)) * 3 + (num(base.fp, num(base.ht, 10)) - num(base.ht, 10)) * 3 + (num(base.will, num(base.iq, 10)) - num(base.iq, 10)) * 5 + (num(base.per, num(base.iq, 10)) - num(base.iq, 10)) * 5 + round2((num(base.speed, (num(base.dx, 10) + num(base.ht, 10)) / 4) - (num(base.dx, 10) + num(base.ht, 10)) / 4) * 20) + (num(base.move, Math.floor(num(base.speed, 5))) - Math.floor(num(base.speed, 5))) * 5;
    const traitTotal = (character.traits ?? []).reduce((total, trait) => total + signedTraitCost(trait), 0);
    const skillTotal = (character.skills ?? []).reduce((total, skill) => total + num(skill.points, 0), 0);
    const spellTotal = (character.spells ?? []).reduce((total, spell) => total + num(spell.points, 0), 0);
    const spent = primary + secondary + traitTotal + skillTotal + spellTotal;
    const budget = num(character.points?.budget, 0);
    const unspent = budget - spent;
    return {
      primary,
      secondary,
      traitTotal,
      skillTotal,
      spellTotal,
      spent,
      budget,
      unspent,
      hpMax: effective.hp,
      fpMax: effective.fp
    };
  }
  function signedTraitCost(trait) {
    const level = Math.max(1, num(trait.level, 1));
    const base = Math.abs(num(trait.cost, 0)) * level;
    if (trait.type === "disadvantage" || trait.type === "quirk") return -base;
    return base;
  }
  function calculateRelativeLevel(points, difficulty) {
    const p = num(points, 0);
    const diff = String(difficulty || "A").toUpperCase();
    if (p <= 0) return null;
    if (diff === "E") {
      if (p === 1) return 0;
      if (p === 2) return 1;
      if (p === 3) return 1;
      if (p === 4) return 2;
      return 2 + Math.floor((p - 4) / 4);
    }
    if (diff === "A") {
      if (p === 1) return -1;
      if (p === 2) return 0;
      if (p === 3) return 0;
      if (p === 4) return 1;
      return 1 + Math.floor((p - 4) / 4);
    }
    if (diff === "H") {
      if (p === 1) return -2;
      if (p === 2 || p === 3) return -1;
      if (p === 4) return 0;
      if (p <= 7) return 0;
      if (p === 8) return 1;
      return 1 + Math.floor((p - 8) / 4);
    }
    if (p === 1) return -3;
    if (p === 2 || p === 3) return -2;
    if (p === 4) return -1;
    if (p <= 7) return -1;
    if (p === 8 || p <= 11) return 0;
    if (p === 12) return 1;
    return 1 + Math.floor((p - 12) / 4);
  }
  function calculateSkillLevel(entry, effectiveAttributes, bonuses) {
    const key = String(entry.attribute || "IQ").toLowerCase();
    const baseAttribute = num(effectiveAttributes[key], 10);
    const relative = calculateRelativeLevel(entry.points, entry.difficulty);
    const scoped = getBonus(bonuses, `skill.${entry.name}`);
    const shared = getBonus(bonuses, "skill.all");
    if (relative === null) return "\u2014";
    return baseAttribute + relative + num(entry.bonus, 0) + shared + scoped;
  }
  function calculateSpellLevel(entry, effectiveAttributes, bonuses) {
    const key = String(entry.attribute || "IQ").toLowerCase();
    const baseAttribute = num(effectiveAttributes[key], 10);
    const relative = calculateRelativeLevel(entry.points, entry.difficulty || "H");
    const scoped = getBonus(bonuses, `spell.${entry.name}`);
    const shared = getBonus(bonuses, "spell.all");
    if (relative === null) return "\u2014";
    return baseAttribute + relative + num(entry.bonus, 0) + shared + scoped;
  }
  function calculateEncumbrance(character, st) {
    const carriedWeight = (character.equipment ?? []).filter((item) => item.carried !== false).reduce((total, item) => total + num(item.qty, 1) * num(item.weight, 0), 0);
    const basicLiftKg = round2(st * st / 10);
    const levels = [
      { name: "Sem carga", max: basicLiftKg * 1, moveMod: 0, dodgeMod: 0 },
      { name: "Leve", max: basicLiftKg * 2, moveMod: -1, dodgeMod: -1 },
      { name: "M\xE9dia", max: basicLiftKg * 3, moveMod: -2, dodgeMod: -2 },
      { name: "Pesada", max: basicLiftKg * 6, moveMod: -3, dodgeMod: -3 },
      { name: "Muito pesada", max: basicLiftKg * 10, moveMod: -4, dodgeMod: -4 }
    ];
    const active = levels.find((level) => carriedWeight <= level.max) ?? levels.at(-1);
    return {
      carriedWeight: round2(carriedWeight),
      basicLiftKg,
      active,
      levels
    };
  }
  function difficultyOptions() {
    return Object.keys(DIFFICULTY_OFFSETS);
  }

  // core/module-loader.js
  function createModuleLoader({ host, floatingRoot, registry, contextFactory }) {
    const loaded = /* @__PURE__ */ new Map();
    const knownRegistry = [...registry];
    const getDescriptor = (id) => knownRegistry.find((entry) => entry.id === id);
    async function importDescriptor(descriptor) {
      const imported = descriptor.module ? descriptor.module : await import(new URL(descriptor.path, window.location.href).href);
      const moduleApi = imported.default ?? imported;
      return {
        ...descriptor,
        ...moduleApi,
        id: moduleApi.id ?? descriptor.id,
        title: moduleApi.title ?? descriptor.title
      };
    }
    async function mount(id) {
      if (loaded.has(id)) return loaded.get(id);
      const descriptor = getDescriptor(id);
      if (!descriptor) throw new Error(`M\xF3dulo desconhecido: ${id}`);
      const moduleApi = await importDescriptor(descriptor);
      const template = document.getElementById("module-card-template");
      const element = template.content.firstElementChild.cloneNode(true);
      element.dataset.moduleId = id;
      host.appendChild(element);
      const ctx = contextFactory({
        descriptor: moduleApi,
        host: element.querySelector(".module-card__body"),
        floatingRoot
      });
      const cleanup = await moduleApi.mount(ctx);
      const loadedRecord = { descriptor: moduleApi, element, cleanup };
      loaded.set(id, loadedRecord);
      return loadedRecord;
    }
    async function unmount(id) {
      const record = loaded.get(id);
      if (!record) return;
      record.cleanup?.();
      record.element.remove();
      loaded.delete(id);
    }
    async function reload(id) {
      if (!loaded.has(id)) return mount(id);
      await unmount(id);
      return mount(id);
    }
    function register(descriptor) {
      const exists = knownRegistry.some((entry) => entry.id === descriptor.id || entry.path === descriptor.path);
      if (!exists) knownRegistry.push(descriptor);
    }
    function list() {
      return [...knownRegistry];
    }
    function activeIds() {
      return [...loaded.keys()];
    }
    return {
      mount,
      unmount,
      reload,
      register,
      list,
      activeIds
    };
  }

  // core/html.js
  var ENTITY_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (match) => ENTITY_MAP[match]);
  }

  // core/state.js
  var STORAGE_KEY = "singular-v3.character";
  var MODULE_PREFS_KEY = "singular-v3.active-modules";
  var CUSTOM_MODULES_KEY = "singular-v3.custom-modules";
  function uid(prefix = "id") {
    const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `${prefix}-${value}`;
  }
  function deepClone(value) {
    return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }
  function createDefaultCharacter() {
    return {
      version: 3,
      meta: {
        name: "Novo personagem",
        player: "",
        campaign: "",
        notes: "",
        techLevel: "3"
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
          id: uid("trait"),
          name: "Aptid\xE3o M\xE1gica",
          type: "advantage",
          cost: 10,
          level: 1,
          notes: "Exemplo de vantagem com b\xF4nus autom\xE1tico.",
          modifiers: [
            { id: uid("mod"), target: "spell.all", amount: 1 }
          ]
        }
      ],
      skills: [
        {
          id: uid("skill"),
          name: "Espadas Curtas",
          attribute: "DX",
          difficulty: "A",
          points: 2,
          bonus: 0,
          notes: ""
        }
      ],
      spells: [
        {
          id: uid("spell"),
          name: "Luz",
          college: "Luz e Trevas",
          attribute: "IQ",
          difficulty: "H",
          points: 1,
          bonus: 0,
          notes: ""
        }
      ],
      equipment: [
        {
          id: uid("item"),
          name: "Espada curta",
          qty: 1,
          weight: 1,
          cost: 400,
          carried: true,
          notes: ""
        }
      ]
    };
  }
  function loadStoredCharacter() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultCharacter();
      return deepClone(JSON.parse(raw));
    } catch {
      return createDefaultCharacter();
    }
  }
  function saveStoredCharacter(character) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
  }
  function loadStoredModulePrefs(fallbackIds) {
    try {
      const raw = localStorage.getItem(MODULE_PREFS_KEY);
      if (!raw) return [...fallbackIds];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [...fallbackIds];
    } catch {
      return [...fallbackIds];
    }
  }
  function saveStoredModulePrefs(activeIds) {
    localStorage.setItem(MODULE_PREFS_KEY, JSON.stringify(activeIds));
  }
  function loadCustomModules() {
    try {
      const raw = localStorage.getItem(CUSTOM_MODULES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  function saveCustomModules(registryItems) {
    localStorage.setItem(CUSTOM_MODULES_KEY, JSON.stringify(registryItems));
  }
  function createStore(initialState) {
    let state = deepClone(initialState);
    const listeners = /* @__PURE__ */ new Set();
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

  // core/gcs.js
  var number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }
  function normalizeTrait(trait = {}) {
    return {
      id: trait.id ?? uid("trait"),
      name: trait.name ?? trait.description ?? "Novo tra\xE7o",
      type: trait.type ?? (number(trait.points, 0) < 0 ? "disadvantage" : "advantage"),
      cost: Math.abs(number(trait.cost ?? trait.points, 0)),
      level: Math.max(1, number(trait.level, 1)),
      notes: trait.notes ?? "",
      modifiers: ensureArray(trait.modifiers).map((modifier) => ({
        id: modifier.id ?? uid("mod"),
        target: modifier.target ?? "",
        amount: number(modifier.amount, 0)
      }))
    };
  }
  function normalizeSkill(skill = {}) {
    return {
      id: skill.id ?? uid("skill"),
      name: skill.name ?? "Nova per\xEDcia",
      attribute: skill.attribute ?? skill.attr ?? "IQ",
      difficulty: String(skill.difficulty ?? skill.diff ?? "A").toUpperCase(),
      points: number(skill.points, 0),
      bonus: number(skill.bonus, 0),
      notes: skill.notes ?? ""
    };
  }
  function normalizeSpell(spell = {}) {
    return {
      id: spell.id ?? uid("spell"),
      name: spell.name ?? "Nova magia",
      college: spell.college ?? "",
      attribute: spell.attribute ?? spell.attr ?? "IQ",
      difficulty: String(spell.difficulty ?? spell.diff ?? "H").toUpperCase(),
      points: number(spell.points, 0),
      bonus: number(spell.bonus, 0),
      notes: spell.notes ?? ""
    };
  }
  function normalizeEquipment(item = {}) {
    return {
      id: item.id ?? uid("item"),
      name: item.name ?? "Novo item",
      qty: Math.max(0, number(item.qty, 1)),
      weight: number(item.weight, 0),
      cost: number(item.cost, 0),
      carried: item.carried !== false,
      notes: item.notes ?? ""
    };
  }
  function mapAttributes(source = {}) {
    if (Array.isArray(source)) {
      const picked = {};
      for (const attribute of source) {
        const key = String(attribute.id ?? attribute.attr_id ?? attribute.name ?? "").toLowerCase();
        const value = number(attribute.value ?? attribute.score, void 0);
        if (!Number.isFinite(value)) continue;
        if (["st", "dx", "iq", "ht", "hp", "fp", "will", "per", "speed", "move"].includes(key)) {
          picked[key] = value;
        }
      }
      return picked;
    }
    return {
      st: number(source.st, 10),
      dx: number(source.dx, 10),
      iq: number(source.iq, 10),
      ht: number(source.ht, 10),
      hp: number(source.hp, number(source.st, 10)),
      fp: number(source.fp, number(source.ht, 10)),
      will: number(source.will, number(source.iq, 10)),
      per: number(source.per, number(source.iq, 10)),
      speed: number(source.speed, 5),
      move: number(source.move, 5)
    };
  }
  function normalizeCharacter(input) {
    const base = createDefaultCharacter();
    const payload = input.character ? input.character : input;
    const normalized = deepClone(base);
    normalized.meta = {
      ...normalized.meta,
      name: payload.meta?.name ?? payload.name ?? payload.profile?.name ?? normalized.meta.name,
      player: payload.meta?.player ?? payload.player ?? "",
      campaign: payload.meta?.campaign ?? payload.campaign ?? "",
      notes: payload.meta?.notes ?? payload.notes ?? "",
      techLevel: String(payload.meta?.techLevel ?? payload.techLevel ?? "3")
    };
    normalized.points = {
      budget: number(payload.points?.budget ?? payload.budget, base.points.budget),
      unspent: number(payload.points?.unspent, 0)
    };
    normalized.attributes = {
      ...normalized.attributes,
      ...mapAttributes(payload.attributes ?? payload.stats ?? {})
    };
    normalized.resources = {
      hpCurrent: number(payload.resources?.hpCurrent, normalized.attributes.hp),
      fpCurrent: number(payload.resources?.fpCurrent, normalized.attributes.fp)
    };
    normalized.traits = ensureArray(payload.traits ?? payload.advantages ?? []).map(normalizeTrait);
    normalized.skills = ensureArray(payload.skills).map(normalizeSkill);
    normalized.spells = ensureArray(payload.spells).map(normalizeSpell);
    normalized.equipment = ensureArray(payload.equipment ?? payload.items).map(normalizeEquipment);
    return normalized;
  }
  function serializeCharacter(character) {
    return JSON.stringify({
      type: "SingularV3Character",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      character
    }, null, 2);
  }
  async function readCharacterFile(file) {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("O arquivo .gcs precisa estar em JSON para esta vers\xE3o standalone.");
    }
    return normalizeCharacter(parsed);
  }
  function downloadGCS(character) {
    const blob = new Blob([serializeCharacter(character)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(character.meta?.name || "personagem").replace(/[^\w.-]+/g, "_")}.gcs`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // core/app.js
  function createNotifier(element) {
    let timeoutId;
    return (message, type = "info") => {
      element.textContent = message;
      element.dataset.type = type;
      element.hidden = false;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        element.hidden = true;
        element.textContent = "";
      }, 3500);
    };
  }
  function formatSigned(value) {
    return `${value > 0 ? "+" : ""}${value}`;
  }
  function renderQuickSummary(container, state) {
    const derived = calculateDerived(state);
    container.innerHTML = `
    <dl>
      <div><dt>Pontos gastos</dt><dd>${derived.points.spent}</dd></div>
      <div><dt>Pontos livres</dt><dd>${derived.points.unspent}</dd></div>
      <div><dt>PV / PF</dt><dd>${state.resources.hpCurrent}/${derived.points.hpMax} \xB7 ${state.resources.fpCurrent}/${derived.points.fpMax}</dd></div>
      <div><dt>Carga</dt><dd>${derived.encumbrance.carriedWeight} kg \xB7 ${derived.encumbrance.active.name}</dd></div>
      <div><dt>DX / IQ efetivos</dt><dd>${derived.effective.dx} / ${derived.effective.iq}</dd></div>
    </dl>
  `;
  }
  function renderSocialSummary(container, state) {
    const derived = calculateDerived(state);
    container.innerHTML = `
    <span>Jogador: <b>${escapeHtml(state.meta.player || "\u2014")}</b></span>
    <span>Campanha: <b>${escapeHtml(state.meta.campaign || "\u2014")}</b></span>
    <span>Total: <b>${derived.points.spent}</b> pts</span>
    <span>Livres: <b class="${derived.points.unspent < 0 ? "danger" : ""}">${formatSigned(derived.points.unspent)}</b></span>
    <span>PV/PF: <b>${state.resources.hpCurrent}/${derived.points.hpMax} \xB7 ${state.resources.fpCurrent}/${derived.points.fpMax}</b></span>
    <span>Carga: <b>${derived.encumbrance.active.name}</b></span>
  `;
  }
  function bindMetaFields(store) {
    const ids = ["name", "player", "campaign", "notes"];
    ids.forEach((key) => {
      const element = document.getElementById(`meta-${key}`);
      element.addEventListener("input", () => {
        store.update((draft) => {
          draft.meta[key] = element.value;
        });
      });
    });
    return (state) => {
      ids.forEach((key) => {
        const element = document.getElementById(`meta-${key}`);
        if (document.activeElement !== element) element.value = state.meta[key] ?? "";
      });
    };
  }
  async function startApp(registry) {
    const store = createStore(loadStoredCharacter());
    const moduleHost = document.getElementById("module-host");
    const floatingRoot = document.getElementById("floating-root");
    const notify = createNotifier(document.getElementById("status-banner"));
    const quickSummary = document.getElementById("quick-summary");
    const socialSummary = document.getElementById("social-summary");
    const moduleList = document.getElementById("module-list");
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
        notify(error.message, "error");
        renderModuleList();
      }
    }
    function renderModuleList() {
      const active = new Set(loader.activeIds());
      moduleList.innerHTML = "";
      loader.list().forEach((descriptor) => {
        const row = document.createElement("label");
        row.className = "module-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = active.has(descriptor.id);
        const text = document.createElement("span");
        text.innerHTML = `<strong>${escapeHtml(descriptor.title)}</strong><small>${escapeHtml(descriptor.id)}</small>`;
        checkbox.addEventListener("change", (event) => {
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
        notify("Use apenas caminhos locais relativos para m\xF3dulos customizados.", "error");
        return;
      }
      if (!normalized.endsWith(".js")) {
        notify("O m\xF3dulo customizado precisa apontar para um arquivo .js.", "error");
        return;
      }
      const inferredId = normalized.split("/").pop()?.replace(/\.module\.js$/i, "").replace(/[^a-z0-9-]/gi, "-") || `custom-${Date.now()}`;
      const descriptor = { id: inferredId.toLowerCase(), title: inferredId, path: normalized };
      loader.register(descriptor);
      saveCustomModules(loader.list().filter((item) => !registry.some((base) => base.id === item.id)));
      renderModuleList();
      notify(`M\xF3dulo registrado: ${normalized}`);
    }
    document.getElementById("register-module-btn").addEventListener("click", () => {
      const input = document.getElementById("custom-module-path");
      registerCustomModule(input.value);
      input.value = "";
    });
    document.getElementById("reload-modules-btn").addEventListener("click", async () => {
      await Promise.all(loader.activeIds().map((id) => loader.reload(id)));
      notify("M\xF3dulos recarregados.");
    });
    document.getElementById("new-character-btn").addEventListener("click", () => {
      store.replace(createDefaultCharacter());
      notify("Novo personagem carregado.");
    });
    document.getElementById("export-gcs-btn").addEventListener("click", () => {
      downloadGCS(store.getState());
      notify("Arquivo .gcs exportado.");
    });
    const fileInput = document.getElementById("gcs-file-input");
    document.getElementById("import-gcs-btn").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const [file] = fileInput.files ?? [];
      if (!file) return;
      try {
        const character = await readCharacterFile(file);
        store.replace(character);
        notify(`Arquivo importado: ${file.name}`);
      } catch (error) {
        notify(error.message, "error");
      } finally {
        fileInput.value = "";
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
    notify(`Singular v3 iniciado com ${loader.activeIds().length} m\xF3dulos. ${formatSigned(calculateDerived(store.getState()).points.unspent)} pontos livres.`);
  }

  // modules/summary.module.js
  var summary_module_default = {
    id: "summary",
    title: "Resumo do personagem",
    defaultActive: true,
    mount(ctx) {
      const render = (state) => {
        const { effective, points, encumbrance } = ctx.calculateDerived(state);
        ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Resumo do personagem</h2>
            <p class="subtitle">Vis\xE3o consolidada dos totais e efeitos autom\xE1ticos.</p>
          </div>
        </div>
        <div class="module-grid cols-2">
          <div class="entry-card">
            <h3>Atributos efetivos</h3>
            <div class="pill-row">
              ${["st", "dx", "iq", "ht", "hp", "fp", "will", "per", "speed", "move"].map((key) => `<span class="stat-pill"><strong>${key.toUpperCase()}</strong> ${effective[key]}</span>`).join("")}
            </div>
          </div>
          <div class="entry-card">
            <h3>Pontos</h3>
            <div class="quick-summary">
              <dl>
                <div><dt>Or\xE7amento</dt><dd>${points.budget}</dd></div>
                <div><dt>Prim\xE1rios</dt><dd>${points.primary}</dd></div>
                <div><dt>Secund\xE1rios</dt><dd>${points.secondary}</dd></div>
                <div><dt>Tra\xE7os</dt><dd>${points.traitTotal}</dd></div>
                <div><dt>Per\xEDcias</dt><dd>${points.skillTotal}</dd></div>
                <div><dt>Magias</dt><dd>${points.spellTotal}</dd></div>
                <div><dt>Total gasto</dt><dd>${points.spent}</dd></div>
                <div><dt>Restante</dt><dd class="${points.unspent < 0 ? "danger" : ""}">${points.unspent}</dd></div>
              </dl>
            </div>
          </div>
          <div class="entry-card">
            <h3>Recursos atuais</h3>
            <p class="resource-value">${state.resources.hpCurrent}/${points.hpMax} PV \xB7 ${state.resources.fpCurrent}/${points.fpMax} PF</p>
            <p class="hint">Os pop-ups de PV/PF s\xE3o persistidos com o personagem em localStorage.</p>
          </div>
          <div class="entry-card">
            <h3>Carga</h3>
            <p><strong>${encumbrance.carriedWeight} kg</strong> transportados.</p>
            <p>Carga ativa: <strong>${encumbrance.active.name}</strong></p>
            <p class="hint">Levantamento b\xE1sico aproximado: ${encumbrance.basicLiftKg} kg.</p>
          </div>
        </div>
      `;
      };
      const unsubscribe = ctx.store.subscribe(render);
      render(ctx.store.getState());
      return () => unsubscribe();
    }
  };

  // modules/attributes.module.js
  var ATTRIBUTES = [
    { key: "st", label: "ST", cost: "10/n\xEDvel" },
    { key: "dx", label: "DX", cost: "20/n\xEDvel" },
    { key: "iq", label: "IQ", cost: "20/n\xEDvel" },
    { key: "ht", label: "HT", cost: "10/n\xEDvel" },
    { key: "hp", label: "PV", cost: "3/n\xEDvel" },
    { key: "fp", label: "PF", cost: "3/n\xEDvel" },
    { key: "will", label: "Vontade", cost: "5/n\xEDvel" },
    { key: "per", label: "Percep\xE7\xE3o", cost: "5/n\xEDvel" },
    { key: "speed", label: "Velocidade", cost: "5/0,25" },
    { key: "move", label: "Deslocamento", cost: "5/n\xEDvel" }
  ];
  var attributes_module_default = {
    id: "attributes",
    title: "Atributos",
    defaultActive: true,
    mount(ctx) {
      const bind = () => {
        ctx.host.querySelectorAll("[data-attribute]").forEach((input) => {
          input.addEventListener("input", () => {
            const key = input.dataset.attribute;
            const value = input.type === "number" ? Number(input.value) : input.value;
            ctx.store.update((draft) => {
              draft.attributes[key] = value;
              if (key === "hp" && draft.resources.hpCurrent > value) draft.resources.hpCurrent = value;
              if (key === "fp" && draft.resources.fpCurrent > value) draft.resources.fpCurrent = value;
            });
          });
        });
        ctx.host.querySelector("[data-points-budget]").addEventListener("input", (event) => {
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
            <h2>Atributos e secund\xE1rios</h2>
            <p class="subtitle">Base edit\xE1vel com aplica\xE7\xE3o autom\xE1tica de b\xF4nus vindos de tra\xE7os.</p>
          </div>
          <label class="field" style="margin:0; min-width: 150px;">
            <span>Or\xE7amento total</span>
            <input type="number" value="${state.points.budget}" data-points-budget>
          </label>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Atributo</th>
              <th>Base</th>
              <th>B\xF4nus</th>
              <th>Efetivo</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            ${ATTRIBUTES.map(({ key, label, cost }) => `
              <tr>
                <td>${label}</td>
                <td><input type="number" step="${key === "speed" ? "0.25" : "1"}" value="${state.attributes[key]}" data-attribute="${key}"></td>
                <td>${bonuses[`attribute.${key}`] ?? 0}</td>
                <td><strong>${effective[key]}</strong></td>
                <td>${cost}</td>
              </tr>
            `).join("")}
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

  // modules/traits.module.js
  function emptyModifier() {
    return { id: uid("mod"), target: "", amount: 0 };
  }
  function emptyTrait() {
    return {
      id: uid("trait"),
      name: "Novo tra\xE7o",
      type: "advantage",
      cost: 5,
      level: 1,
      notes: "",
      modifiers: [emptyModifier()]
    };
  }
  var traits_module_default = {
    id: "traits",
    title: "Vantagens e desvantagens",
    defaultActive: true,
    mount(ctx) {
      const render = (state) => {
        ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Tra\xE7os</h2>
            <p class="subtitle">Crie vantagens, desvantagens e b\xF4nus autom\xE1ticos por alvo.</p>
          </div>
          <button type="button" data-add-trait>Adicionar tra\xE7o</button>
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
                    ${["advantage", "disadvantage", "quirk"].map((type) => `
                      <option value="${type}" ${trait.type === type ? "selected" : ""}>${type}</option>
                    `).join("")}
                  </select>
                </label>
                <label class="field">
                  <span>Custo base</span>
                  <input type="number" value="${trait.cost}" data-field="cost">
                </label>
                <label class="field">
                  <span>N\xEDveis</span>
                  <input type="number" min="1" value="${trait.level}" data-field="level">
                </label>
                <div class="field">
                  <span>Total</span>
                  <div class="stat-pill">${signedTraitCost(trait)}</div>
                </div>
                <button type="button" class="ghost" data-remove-trait="${index}">Remover</button>
                <label class="field full">
                  <span>Notas</span>
                  <textarea rows="2" data-field="notes">${escapeHtml(trait.notes ?? "")}</textarea>
                </label>
              </div>
              <div class="inline-toolbar" style="margin-top:0.75rem;">
                <strong>Modificadores autom\xE1ticos</strong>
                <button type="button" class="ghost" data-add-modifier>Adicionar b\xF4nus</button>
              </div>
              <div class="modifier-list">
                ${(trait.modifiers ?? []).map((modifier, modIndex) => `
                  <div class="modifier-row" data-modifier-id="${modifier.id}">
                    <input type="text" placeholder="attribute.st, skill.all, spell.Nome" value="${escapeHtml(modifier.target ?? "")}" data-mod-field="target" data-mod-index="${modIndex}">
                    <input type="number" step="0.25" value="${modifier.amount ?? 0}" data-mod-field="amount" data-mod-index="${modIndex}">
                    <button type="button" class="ghost" data-remove-modifier="${modIndex}">Remover</button>
                  </div>
                `).join("")}
              </div>
            </article>
          `).join("")}
        </div>
      `;
        ctx.host.querySelector("[data-add-trait]").addEventListener("click", () => {
          ctx.store.update((draft) => {
            draft.traits.push(emptyTrait());
          });
        });
        ctx.host.querySelectorAll("[data-trait-id]").forEach((card) => {
          const traitId = card.dataset.traitId;
          const index = state.traits.findIndex((trait) => trait.id === traitId);
          if (index < 0) return;
          card.querySelectorAll("[data-field]").forEach((field) => {
            field.addEventListener("input", () => {
              ctx.store.update((draft) => {
                const target = draft.traits[index];
                const key = field.dataset.field;
                target[key] = ["cost", "level"].includes(key) ? Number(field.value) || 0 : field.value;
              });
            });
          });
          card.querySelector("[data-remove-trait]").addEventListener("click", () => {
            ctx.store.update((draft) => {
              draft.traits.splice(index, 1);
            });
          });
          card.querySelector("[data-add-modifier]").addEventListener("click", () => {
            ctx.store.update((draft) => {
              draft.traits[index].modifiers.push(emptyModifier());
            });
          });
          card.querySelectorAll("[data-mod-field]").forEach((field) => {
            field.addEventListener("input", () => {
              const modIndex = Number(field.dataset.modIndex);
              ctx.store.update((draft) => {
                const modifier = draft.traits[index].modifiers[modIndex];
                if (!modifier) return;
                const key = field.dataset.modField;
                modifier[key] = key === "amount" ? Number(field.value) || 0 : field.value;
              });
            });
          });
          card.querySelectorAll("[data-remove-modifier]").forEach((button) => {
            button.addEventListener("click", () => {
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

  // modules/skills.module.js
  var ATTRS = ["ST", "DX", "IQ", "HT", "WILL", "PER"];
  function emptySkill() {
    return {
      id: uid("skill"),
      name: "Nova per\xEDcia",
      attribute: "IQ",
      difficulty: "A",
      points: 1,
      bonus: 0,
      notes: ""
    };
  }
  var skills_module_default = {
    id: "skills",
    title: "Per\xEDcias",
    defaultActive: true,
    mount(ctx) {
      const render = (state) => {
        const { effective, bonuses } = ctx.calculateDerived(state);
        ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Per\xEDcias</h2>
            <p class="subtitle">N\xEDvel calculado por atributo, dificuldade, pontos e b\xF4nus autom\xE1ticos.</p>
          </div>
          <button type="button" data-add-skill>Adicionar per\xEDcia</button>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Atributo</th>
              <th>Dificuldade</th>
              <th>Pontos</th>
              <th>B\xF4nus</th>
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
                    ${ATTRS.map((attribute) => `<option value="${attribute}" ${skill.attribute === attribute ? "selected" : ""}>${attribute}</option>`).join("")}
                  </select>
                </td>
                <td>
                  <select data-field="difficulty">
                    ${difficultyOptions().map((difficulty) => `<option value="${difficulty}" ${skill.difficulty === difficulty ? "selected" : ""}>${difficulty}</option>`).join("")}
                  </select>
                </td>
                <td><input type="number" min="0" value="${skill.points}" data-field="points"></td>
                <td><input type="number" value="${skill.bonus}" data-field="bonus"></td>
                <td><strong>${calculateSkillLevel(skill, effective, bonuses)}</strong></td>
                <td><input type="text" value="${escapeHtml(skill.notes ?? "")}" data-field="notes"></td>
                <td><button type="button" class="ghost" data-remove-skill="${index}">Remover</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
        ctx.host.querySelector("[data-add-skill]").addEventListener("click", () => {
          ctx.store.update((draft) => {
            draft.skills.push(emptySkill());
          });
        });
        ctx.host.querySelectorAll("[data-skill-id]").forEach((row) => {
          const skillId = row.dataset.skillId;
          const index = state.skills.findIndex((item) => item.id === skillId);
          if (index < 0) return;
          row.querySelectorAll("[data-field]").forEach((field) => {
            field.addEventListener("input", () => {
              ctx.store.update((draft) => {
                const target = draft.skills[index];
                const key = field.dataset.field;
                target[key] = ["points", "bonus"].includes(key) ? Number(field.value) || 0 : field.value;
              });
            });
          });
          row.querySelector("[data-remove-skill]").addEventListener("click", () => {
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

  // modules/spells.module.js
  var ATTRS2 = ["IQ", "WILL", "HT"];
  function emptySpell() {
    return {
      id: uid("spell"),
      name: "Nova magia",
      college: "",
      attribute: "IQ",
      difficulty: "H",
      points: 1,
      bonus: 0,
      notes: ""
    };
  }
  var spells_module_default = {
    id: "spells",
    title: "Magias",
    defaultActive: true,
    mount(ctx) {
      const render = (state) => {
        const { effective, bonuses } = ctx.calculateDerived(state);
        ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Magias</h2>
            <p class="subtitle">Compat\xEDvel com b\xF4nus globais como <span class="mono">spell.all</span>.</p>
          </div>
          <button type="button" data-add-spell>Adicionar magia</button>
        </div>
        <table class="table-grid">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Col\xE9gio</th>
              <th>Atributo</th>
              <th>Dificuldade</th>
              <th>Pontos</th>
              <th>B\xF4nus</th>
              <th>NH</th>
              <th>Notas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${state.spells.map((spell, index) => `
              <tr data-spell-id="${spell.id}">
                <td><input type="text" value="${escapeHtml(spell.name)}" data-field="name"></td>
                <td><input type="text" value="${escapeHtml(spell.college ?? "")}" data-field="college"></td>
                <td>
                  <select data-field="attribute">
                    ${ATTRS2.map((attribute) => `<option value="${attribute}" ${spell.attribute === attribute ? "selected" : ""}>${attribute}</option>`).join("")}
                  </select>
                </td>
                <td>
                  <select data-field="difficulty">
                    ${difficultyOptions().map((difficulty) => `<option value="${difficulty}" ${spell.difficulty === difficulty ? "selected" : ""}>${difficulty}</option>`).join("")}
                  </select>
                </td>
                <td><input type="number" min="0" value="${spell.points}" data-field="points"></td>
                <td><input type="number" value="${spell.bonus}" data-field="bonus"></td>
                <td><strong>${calculateSpellLevel(spell, effective, bonuses)}</strong></td>
                <td><input type="text" value="${escapeHtml(spell.notes ?? "")}" data-field="notes"></td>
                <td><button type="button" class="ghost" data-remove-spell="${index}">Remover</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
        ctx.host.querySelector("[data-add-spell]").addEventListener("click", () => {
          ctx.store.update((draft) => {
            draft.spells.push(emptySpell());
          });
        });
        ctx.host.querySelectorAll("[data-spell-id]").forEach((row) => {
          const spellId = row.dataset.spellId;
          const index = state.spells.findIndex((item) => item.id === spellId);
          if (index < 0) return;
          row.querySelectorAll("[data-field]").forEach((field) => {
            field.addEventListener("input", () => {
              ctx.store.update((draft) => {
                const target = draft.spells[index];
                const key = field.dataset.field;
                target[key] = ["points", "bonus"].includes(key) ? Number(field.value) || 0 : field.value;
              });
            });
          });
          row.querySelector("[data-remove-spell]").addEventListener("click", () => {
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

  // modules/equipment.module.js
  function emptyItem() {
    return {
      id: uid("item"),
      name: "Novo item",
      qty: 1,
      weight: 0,
      cost: 0,
      carried: true,
      notes: ""
    };
  }
  var equipment_module_default = {
    id: "equipment",
    title: "Equipamentos",
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
          <span class="stat-pill"><strong>N\xEDvel de carga</strong> ${encumbrance.active.name}</span>
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
                <td><input type="checkbox" ${item.carried !== false ? "checked" : ""} data-field="carried"></td>
                <td><input type="text" value="${escapeHtml(item.notes ?? "")}" data-field="notes"></td>
                <td><button type="button" class="ghost" data-remove-item="${index}">Remover</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
        ctx.host.querySelector("[data-add-item]").addEventListener("click", () => {
          ctx.store.update((draft) => {
            draft.equipment.push(emptyItem());
          });
        });
        ctx.host.querySelectorAll("[data-item-id]").forEach((row) => {
          const itemId = row.dataset.itemId;
          const index = state.equipment.findIndex((item) => item.id === itemId);
          if (index < 0) return;
          row.querySelectorAll("[data-field]").forEach((field) => {
            const eventName = field.type === "checkbox" ? "change" : "input";
            field.addEventListener(eventName, () => {
              ctx.store.update((draft) => {
                const target = draft.equipment[index];
                const key = field.dataset.field;
                if (field.type === "checkbox") target[key] = field.checked;
                else target[key] = ["qty", "weight", "cost"].includes(key) ? Number(field.value) || 0 : field.value;
              });
            });
          });
          row.querySelector("[data-remove-item]").addEventListener("click", () => {
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

  // modules/pvpf.module.js
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  var pvpf_module_default = {
    id: "pvpf",
    title: "PV / PF flutuantes",
    defaultActive: true,
    mount(ctx) {
      const wrapper = document.createElement("div");
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
        wrapper.querySelectorAll("[data-hp-delta]").forEach((button) => {
          button.addEventListener("click", () => {
            const delta = Number(button.dataset.hpDelta);
            ctx.store.update((draft) => {
              const max = ctx.calculateDerived(draft).points.hpMax;
              draft.resources.hpCurrent = clamp((draft.resources.hpCurrent ?? max) + delta, 0, max);
            });
          });
        });
        wrapper.querySelectorAll("[data-fp-delta]").forEach((button) => {
          button.addEventListener("click", () => {
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

  // modules/io.module.js
  var io_module_default = {
    id: "io",
    title: "Importa\xE7\xE3o / exporta\xE7\xE3o",
    defaultActive: true,
    mount(ctx) {
      const render = (state) => {
        ctx.host.innerHTML = `
        <div class="module-header">
          <div>
            <h2>Integra\xE7\xE3o .gcs</h2>
            <p class="subtitle">A vers\xE3o standalone exporta e importa o estado normalizado da ficha em JSON com extens\xE3o <span class="mono">.gcs</span>.</p>
          </div>
        </div>
        <div class="module-grid cols-2">
          <div class="entry-card">
            <h3>Estrutura persistida</h3>
            <p>Nome: <strong>${escapeHtml(state.meta.name || "\u2014")}</strong></p>
            <p>Tra\xE7os: <strong>${state.traits.length}</strong></p>
            <p>Per\xEDcias: <strong>${state.skills.length}</strong></p>
            <p>Magias: <strong>${state.spells.length}</strong></p>
            <p>Equipamentos: <strong>${state.equipment.length}</strong></p>
          </div>
          <div class="entry-card">
            <h3>Formato</h3>
            <p class="hint">Use os bot\xF5es da barra superior para importar ou exportar.</p>
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

  // scripts/standalone-entry.js
  startApp([
    { id: "summary", title: "Resumo do personagem", defaultActive: true, module: summary_module_default },
    { id: "attributes", title: "Atributos", defaultActive: true, module: attributes_module_default },
    { id: "traits", title: "Tra\xE7os", defaultActive: true, module: traits_module_default },
    { id: "skills", title: "Per\xEDcias", defaultActive: true, module: skills_module_default },
    { id: "spells", title: "Magias", defaultActive: true, module: spells_module_default },
    { id: "equipment", title: "Equipamentos", defaultActive: true, module: equipment_module_default },
    { id: "pvpf", title: "PV / PF flutuantes", defaultActive: true, module: pvpf_module_default },
    { id: "io", title: "Importa\xE7\xE3o / exporta\xE7\xE3o", defaultActive: true, module: io_module_default }
  ]);
})();
